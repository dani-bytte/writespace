import { eq } from "drizzle-orm"
import { db } from "@/src/lib/db"
import { playlistGenerationJobs } from "@/src/lib/db/schema"
import { geminiService, type RefinedPlaylistResult } from "@/src/lib/gemini-service"
import { logger } from "@/src/lib/logger"
import { type SpotifyTrack, spotifyService } from "@/src/lib/spotify-service"

export interface PlaylistJobData {
  userId: string
  type: "top-tracks" | "artist-mix" | "discovery" | "hybrid"
  timeRange?: "short_term" | "medium_term" | "long_term"
  artistIds?: string[]
  playlistSize: number
  includeRecommendations: boolean
  refineWithGemini: boolean
  excludeStoredTracks: boolean
  topTracksRatio?: number
}

interface PlaylistResult {
  tracks: SpotifyTrack[]
  seeds: { artists?: string[]; tracks?: string[] }
  refined?: RefinedPlaylistResult
  nameSuggestions?: string[]
}

/**
 * Database-backed job queue service
 * Replaces BullMQ to eliminate need for separate worker process
 */
export const PlaylistJobService = {
  /**
   * Enqueue a new job
   */
  async enqueueJob(data: PlaylistJobData) {
    // Para tipo hybrid, armazena topTracksRatio no campo artistIds como JSON
    let artistIdsValue: string | null = null
    if (data.type === "hybrid" && data.topTracksRatio !== undefined) {
      artistIdsValue = JSON.stringify({ ratio: data.topTracksRatio })
    } else if (data.artistIds) {
      artistIdsValue = JSON.stringify(data.artistIds)
    }

    const job = await db
      .insert(playlistGenerationJobs)
      .values({
        userId: data.userId,
        type: data.type,
        timeRange: data.timeRange,
        artistIds: artistIdsValue,
        playlistSize: data.playlistSize,
        includeRecommendations: data.includeRecommendations,
        refineWithGemini: data.refineWithGemini,
        excludeStoredTracks: data.excludeStoredTracks,
        status: "pending",
      })
      .returning()

    const jobId = job[0].id
    logger.info("🎵 Playlist generation job enqueued", {
      jobId,
      userId: data.userId,
      type: data.type,
      playlistSize: data.playlistSize,
    })

    return jobId
  },

  /**
   * Get job by ID
   */
  async getJob(jobId: string) {
    const job = await db
      .select()
      .from(playlistGenerationJobs)
      .where(eq(playlistGenerationJobs.id, jobId))
      .then(results => results[0])

    return job
  },

  /**
   * Get pending jobs (for background processor)
   */
  async getPendingJobs(limit = 5) {
    const jobs = await db
      .select()
      .from(playlistGenerationJobs)
      .where(eq(playlistGenerationJobs.status, "pending"))
      .orderBy(playlistGenerationJobs.createdAt)
      .limit(limit)

    return jobs
  },

  /**
   * Mark job as processing
   */
  async startProcessing(jobId: string) {
    await db
      .update(playlistGenerationJobs)
      .set({
        status: "processing",
        startedAt: new Date(),
        attempts:
          (await db
            .select({ attempts: playlistGenerationJobs.attempts })
            .from(playlistGenerationJobs)
            .where(eq(playlistGenerationJobs.id, jobId))
            .then(r => r[0]?.attempts || 0)) + 1,
      })
      .where(eq(playlistGenerationJobs.id, jobId))
  },

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result: PlaylistResult) {
    await db
      .update(playlistGenerationJobs)
      .set({
        status: "completed",
        result,
        completedAt: new Date(),
        progress: 100,
      })
      .where(eq(playlistGenerationJobs.id, jobId))

    logger.info("Job completado", { jobId })
  },

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string, maxRetries = 3) {
    const job = await db
      .select()
      .from(playlistGenerationJobs)
      .where(eq(playlistGenerationJobs.id, jobId))
      .then(results => results[0])

    if (!job) return

    // If retries left, mark as pending again
    if ((job.attempts ?? 0) < maxRetries) {
      await db
        .update(playlistGenerationJobs)
        .set({
          status: "pending",
          error,
        })
        .where(eq(playlistGenerationJobs.id, jobId))

      logger.warn("Job falhou, tentando novamente", {
        jobId,
        attempts: (job.attempts ?? 0) + 1,
        error,
      })
    } else {
      // Max retries exceeded
      await db
        .update(playlistGenerationJobs)
        .set({
          status: "failed",
          error,
          completedAt: new Date(),
        })
        .where(eq(playlistGenerationJobs.id, jobId))

      logger.error("Job falhou permanentemente", {
        jobId,
        error,
      })
    }
  },

  /**
   * Process a single job (called from background endpoint)
   */
  async processJob(jobId: string) {
    const job = await this.getJob(jobId)
    if (!job) {
      logger.error("Job not found", { jobId })
      return
    }

    logger.info("Job ativo", { jobId })

    try {
      // Mark as processing
      await this.startProcessing(jobId)

      // Parse stored data - para hybrid, artistIds contém {ratio: number}
      let artistIds: string[] = []
      let topTracksRatio: number | undefined

      if (job.artistIds) {
        try {
          const parsed = JSON.parse(job.artistIds)
          if (parsed && typeof parsed === "object" && "ratio" in parsed) {
            // É um objeto com ratio (tipo hybrid)
            topTracksRatio = parsed.ratio
          } else if (Array.isArray(parsed)) {
            // É um array de artistIds normal
            artistIds = parsed
          }
        } catch {
          // Fallback
        }
      }

      // Ensure Spotify connection
      await spotifyService.ensureConnection(job.userId)

      let result: PlaylistResult

      // Se refinamento está ativado, solicitar mais músicas para compensar remoções
      const bufferSize = job.refineWithGemini ? Math.ceil(job.playlistSize * 1.3) : job.playlistSize

      // Generate based on type
      if (job.type === "top-tracks") {
        result = await spotifyService.generatePlaylistFromTopTracks(job.userId, {
          timeRange: (job.timeRange as "short_term" | "medium_term" | "long_term") || "medium_term",
          playlistSize: bufferSize,
          includeRecommendations: job.includeRecommendations ?? true,
          excludeStoredTracks: job.excludeStoredTracks ?? false,
        })
      } else if (job.type === "artist-mix") {
        if (!artistIds.length) {
          throw new Error("Selecione ao menos um artista")
        }
        result = await spotifyService.generatePlaylistFromArtists(job.userId, artistIds, {
          playlistSize: bufferSize,
          includeTopTracks: true,
          includeRecommendations: job.includeRecommendations ?? true,
        })
      } else if (job.type === "discovery") {
        result = await spotifyService.generateDiscoveryPlaylist(job.userId, {
          playlistSize: bufferSize,
          includeRecommendations: true,
        })
      } else if (job.type === "hybrid") {
        const hybridResult = await spotifyService.generateHybridPlaylist(job.userId, {
          playlistSize: bufferSize,
          topTracksRatio: topTracksRatio ?? 0.5,
          timeRange: (job.timeRange as "short_term" | "medium_term" | "long_term") || "medium_term",
        })
        result = {
          tracks: hybridResult.tracks,
          seeds: hybridResult.seeds,
        }
      } else {
        throw new Error(`Tipo de playlist inválido: ${job.type}`)
      }

      // Refine with Gemini if requested
      if (job.refineWithGemini && result.tracks?.length > 0) {
        try {
          let context = ""
          if (job.type === "top-tracks") {
            const labels: Record<string, string> = {
              short_term: "ultimas 4 semanas",
              medium_term: "ultimos 6 meses",
              long_term: "todo o historico",
            }
            context = `Playlist das musicas mais ouvidas (${labels[job.timeRange || "medium_term"]}). Objetivo: criar experiencia nostalgica e personalizada.`
          } else if (job.type === "discovery") {
            context = "Playlist de descoberta - explorar novas musicas baseado no historico"
          } else {
            context = "Playlist com artistas selecionados"
          }

          const refined = await geminiService.refinePlaylist(result.tracks, {
            context,
          })
          result.refined = {
            keptTracks: refined.keptTracks,
            removedTracks: refined.removedTracks,
            suggestions: refined.suggestions,
          }
        } catch (error) {
          logger.warn("Erro ao refinar com Gemini, continuando sem refinamento", {
            jobId,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          })
          // Continue without refinement - don't fail the job
        }
      }

      // Ajustar para o tamanho solicitado após refinamento
      if (result.tracks?.length > job.playlistSize) {
        result.tracks = result.tracks.slice(0, job.playlistSize)
        logger.info("Playlist ajustada para o tamanho solicitado", {
          jobId,
          original: result.tracks.length + (result.tracks.length - job.playlistSize),
          final: job.playlistSize,
        })
      }

      // Suggest playlist names (non-fatal on error)
      try {
        const nameResp = await geminiService.suggestPlaylistName(result.tracks, {
          baseArtists: artistIds,
        })
        if (Array.isArray(nameResp?.names)) {
          result.nameSuggestions = nameResp.names
        }
      } catch (e) {
        logger.warn("Erro ao sugerir nomes com Gemini, usando padrão", {
          jobId,
          error: e instanceof Error ? e.message : "Erro desconhecido",
        })
      }

      // Mark as completed
      await this.completeJob(jobId, result)

      logger.info("Playlist gerada com sucesso", {
        jobId,
        userId: job.userId,
        type: job.type,
        trackCount: result.tracks?.length,
        timeElapsed: Date.now() - (job.startedAt?.getTime() || Date.now()),
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      await this.failJob(jobId, errorMessage)
    }
  },
}
