import { Queue, Worker } from "bullmq"
import { geminiService, type TrackForAnalysis } from "@/src/lib/gemini-service"
import { logger } from "@/src/lib/logger"
import { type SpotifyTrack, spotifyService } from "@/src/lib/spotify-service"
import { getRedisConnectionOptions } from "./redis-client"

export interface PlaylistGenerationJob {
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

export interface PlaylistGenerationResult {
  tracks: SpotifyTrack[]
  seeds: { artists?: string[]; tracks?: string[] }
  nameSuggestions: string[]
  refinement: {
    wasRefined: boolean
    removedTracks?: {
      name: string
      artists: string[]
      reason: string
      originalTrack?: string
    }[]
    suggestions?: string
  }
  meta: {
    type: string
    requestedSize: number
    actualSize: number
    includeRecommendations: boolean
    geminiUsed: boolean
    processingTime: number
  }
}

// Queue with concurrency control
export const playlistQueue = new Queue<PlaylistGenerationJob>("playlist-generation", {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: false,
    removeOnFail: false,
  },
})

// Worker: process max 3 jobs simultaneously
export const playlistWorker = new Worker<PlaylistGenerationJob, PlaylistGenerationResult>(
  "playlist-generation",
  async job => {
    logger.info("Iniciando geracao de playlist", {
      jobId: job.id,
      userId: job.data.userId,
      type: job.data.type,
    })

    const startTime = Date.now()

    try {
      const {
        userId,
        type,
        timeRange,
        artistIds,
        playlistSize,
        includeRecommendations,
        refineWithGemini,
        excludeStoredTracks,
      } = job.data

      let result: { tracks: SpotifyTrack[]; seeds: { artists?: string[]; tracks?: string[] } }

      await spotifyService.ensureConnection(userId)

      if (type === "top-tracks") {
        result = await spotifyService.generatePlaylistFromTopTracks(userId, {
          timeRange: timeRange || "medium_term",
          playlistSize,
          includeRecommendations,
          excludeStoredTracks,
        })
      } else if (type === "artist-mix") {
        if (!artistIds?.length) {
          throw new Error("Selecione ao menos um artista")
        }
        result = await spotifyService.generatePlaylistFromArtists(userId, artistIds, {
          playlistSize,
          includeTopTracks: true,
          includeRecommendations,
        })
      } else if (type === "discovery") {
        result = await spotifyService.generateDiscoveryPlaylist(userId, {
          playlistSize,
          includeRecommendations: true,
        })
      } else if (type === "hybrid") {
        const hybridResult = await spotifyService.generateHybridPlaylist(userId, {
          playlistSize,
          topTracksRatio: job.data.topTracksRatio ?? 0.5,
          timeRange: timeRange || "medium_term",
        })
        result = {
          tracks: hybridResult.tracks,
          seeds: hybridResult.seeds,
        }
      } else {
        throw new Error(`Tipo de playlist inválido: ${type}`)
      }

      let refinedResult = null
      let removedTracks: { track: TrackForAnalysis; reason: string; originalTrack?: string }[] = []

      if (refineWithGemini && result.tracks.length > 0) {
        try {
          let context = ""
          if (type === "top-tracks") {
            const labels = {
              short_term: "ultimas 4 semanas",
              medium_term: "ultimos 6 meses",
              long_term: "todo o historico",
            }
            context = `Playlist das musicas mais ouvidas (${labels[timeRange || "medium_term"]}). Objetivo: criar experiencia nostalgica e personalizada.`
          } else if (type === "discovery") {
            context = "Playlist de descoberta com musicas novas baseadas no gosto recente"
          } else {
            context = "Playlist mix baseada nos artistas selecionados"
          }

          refinedResult = await geminiService.refinePlaylist(result.tracks, {
            context,
          })

          const tracksById = new Map(result.tracks.map(t => [t.id, t]))
          const reorderedTracks = refinedResult.keptTracks
            .map(kt => tracksById.get(kt.id))
            .filter((t): t is SpotifyTrack => t !== undefined)

          if (reorderedTracks.length < playlistSize) {
            const usedIds = new Set(reorderedTracks.map(t => t.id))
            for (const track of result.tracks) {
              if (reorderedTracks.length >= playlistSize) break
              if (!usedIds.has(track.id)) {
                reorderedTracks.push(track)
                usedIds.add(track.id)
              }
            }
          }

          result.tracks = reorderedTracks.slice(0, playlistSize)
          removedTracks = refinedResult.removedTracks
        } catch (error) {
          logger.warn("Refinamento falhou, usando playlist original", {
            jobId: job.id,
            error: error instanceof Error ? error.message : "Unknown",
          })
        }
      }

      let nameSuggestions: string[] = ["Minha Playlist"]
      try {
        const suggestions = await geminiService.suggestPlaylistName(result.tracks, {
          baseArtists: artistIds,
        })
        nameSuggestions = suggestions.names
      } catch (error) {
        logger.warn("Sugestao de nomes falhou", {
          jobId: job.id,
          error: error instanceof Error ? error.message : "Unknown",
        })
      }

      const timeElapsed = Date.now() - startTime

      logger.info("Playlist gerada com sucesso", {
        jobId: job.id,
        userId,
        type,
        trackCount: result.tracks.length,
        timeElapsed: `${timeElapsed}ms`,
        refined: !!refinedResult,
      })

      return {
        tracks: result.tracks,
        seeds: result.seeds,
        nameSuggestions,
        refinement: refinedResult
          ? {
              wasRefined: true,
              removedTracks: removedTracks.map(r => ({
                name: r.track.name,
                artists: r.track.artists,
                reason: r.reason,
                originalTrack: r.originalTrack,
              })),
              suggestions: refinedResult.suggestions,
            }
          : { wasRefined: false },
        meta: {
          type,
          requestedSize: playlistSize,
          actualSize: result.tracks.length,
          includeRecommendations,
          geminiUsed: !!refinedResult,
          processingTime: timeElapsed,
        },
      }
    } catch (error) {
      logger.error("Erro ao gerar playlist", {
        jobId: job.id,
        userId: job.data.userId,
        error: error instanceof Error ? error.message : "Unknown",
      })
      throw error
    }
  },
  {
    connection: getRedisConnectionOptions(),
    concurrency: 3,
  }
)

playlistWorker.on("completed", job => {
  logger.info("Job completado", { jobId: job.id })
})

playlistWorker.on("failed", (job, err) => {
  logger.error("Job falhou", { jobId: job?.id, error: err.message })
})

playlistWorker.on("active", job => {
  logger.info("Job ativo", { jobId: job.id })
})

process.on("SIGTERM", async () => {
  logger.info("Encerrando worker...")
  await playlistWorker.close()
  await playlistQueue.close()
})
