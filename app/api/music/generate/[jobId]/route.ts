import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { playlistGenerationJobs } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"
import { PlaylistJobService } from "@/src/lib/queue/playlist-job-service"

interface GenerateJobParams {
  params: Promise<{
    jobId: string
  }>
}

/**
 * GET /api/music/generate/[jobId]
 * Verifica o status de um job de geração de playlist
 */
export async function GET(request: NextRequest, { params }: GenerateJobParams) {
  const { jobId } = await params

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const job = await PlaylistJobService.getJob(jobId)

    if (!job) {
      logger.warn("Job not found", { jobId, userId: session.user.id })
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 })
    }

    // Verificar se o job pertence ao usuário (segurança)
    if (job.userId !== session.user.id) {
      logger.warn("Unauthorized job access attempt", {
        jobId,
        userId: session.user.id,
        jobOwnerId: job.userId,
      })
      return NextResponse.json({ error: "Acesso negado a este job" }, { status: 403 })
    }

    const progress = job.progress ?? 0
    const attempts = job.attempts ?? 0
    const maxAttempts = job.maxAttempts ?? 3

    logger.info("Job status check", {
      jobId,
      status: job.status,
      progress,
      attempts,
    })

    // Job completado com sucesso
    if (job.status === "completed") {
      // Normalizar resultado para o formato esperado pelo cliente
      const normalizeResult = (raw: any) => {
        const originalTracks = Array.isArray(raw?.tracks) ? raw.tracks : []
        const refined = raw?.refined
        let tracks = originalTracks

        // Reordenar e filtrar conforme keptTracks do Gemini (se existir)
        if (refined?.keptTracks && Array.isArray(refined.keptTracks) && refined.keptTracks.length) {
          const byId = new Map<string, any>(originalTracks.map((t: any) => [t.id, t]))
          tracks = refined.keptTracks.map((k: any) => byId.get(k.id)).filter(Boolean)
        }

        const refinement = refined
          ? {
              wasRefined: true,
              removedTracks: Array.isArray(refined.removedTracks)
                ? refined.removedTracks.map((r: any) => ({
                    name: r?.track?.name,
                    artists: Array.isArray(r?.track?.artists) ? r.track.artists : [],
                    reason: r?.reason,
                    originalTrack: r?.originalTrack,
                  }))
                : [],
              suggestions: refined?.suggestions,
            }
          : { wasRefined: false, removedTracks: [], suggestions: undefined }

        // Map raw Spotify track to UI shape (cover image, preview/link)
        const mappedTracks = tracks.map((t: any) => ({
          id: t.id,
          name: t.name,
          artists: Array.isArray(t.artists)
            ? t.artists.map((a: any) => ({ id: a.id, name: a.name }))
            : [],
          album: {
            id: t.album?.id,
            name: t.album?.name,
            image: t.album?.images?.[0]?.url ?? null,
          },
          duration_ms: t.duration_ms,
          popularity: t.popularity,
          previewUrl: t.preview_url ?? t.previewUrl ?? null,
          explicit: t.explicit,
          spotifyUrl: t.external_urls?.spotify ?? t.spotifyUrl,
          uri: t.uri,
        }))

        const seeds = raw?.seeds || { artists: [], tracks: [] }
        const nameSuggestions = Array.isArray(raw?.nameSuggestions) ? raw.nameSuggestions : []
        const meta = {
          type: job.type,
          requestedSize: job.playlistSize ?? mappedTracks.length,
          actualSize: mappedTracks.length,
          includeRecommendations: job.includeRecommendations ?? true,
        }

        return { tracks: mappedTracks, seeds, nameSuggestions, refinement, meta }
      }

      return NextResponse.json({
        status: "completed",
        jobId,
        result: normalizeResult(job.result),
        completedAt: job.completedAt?.toISOString(),
      })
    }

    // Job falhado
    if (job.status === "failed") {
      return NextResponse.json(
        {
          status: "failed",
          jobId,
          error: job.error || "Falha desconhecida",
          attempts: `${attempts}/${maxAttempts}`,
          failedAt: job.updatedAt?.toISOString(),
        },
        { status: 422 }
      )
    }

    // Job em progresso ou aguardando
    const pendingJobs = await PlaylistJobService.getPendingJobs()
    const processingJobs = await db.query.playlistGenerationJobs.findMany({
      where: (jobs, { eq }) => eq(jobs.status, "processing"),
    })

    const activeCount = processingJobs.length
    const waitingCount = pendingJobs.length

    // Estimar tempo de espera (3 jobs por minuto = 20 segundos por job)
    const estimatedWaitSeconds =
      job.status === "pending" ? Math.max(20, Math.ceil((waitingCount + 1) * 20)) : 20

    const response = {
      status: job.status === "processing" ? "processing" : "queued",
      jobId,
      state: job.status,
      progress: typeof progress === "number" ? progress : 0,
      attempts: `${attempts}/${maxAttempts}`,
      queue: {
        active: activeCount,
        waiting: waitingCount,
        position: job.status === "pending" ? waitingCount : 0,
      },
      estimatedWaitSeconds,
      estimatedWaitTime: `${Math.ceil(estimatedWaitSeconds / 60)} minuto(s)`,
      pollUrl: `/api/music/generate/${jobId}`,
    }

    return NextResponse.json(response, {
      status: 202, // 202 Accepted - still processing
    })
  } catch (error) {
    logger.error("Erro ao verificar status do job", { jobId }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao verificar status"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/music/generate/[jobId]
 * Cancela um job de geração de playlist
 */
export async function DELETE(request: NextRequest, { params }: GenerateJobParams) {
  const { jobId } = await params

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const job = await PlaylistJobService.getJob(jobId)

    if (!job) {
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 })
    }

    // Verificar se o job pertence ao usuário
    if (job.userId !== session.user.id) {
      logger.warn("Unauthorized job cancellation attempt", {
        jobId,
        userId: session.user.id,
        jobOwnerId: job.userId,
      })
      return NextResponse.json({ error: "Acesso negado a este job" }, { status: 403 })
    }

    // Cancelar o job (apenas se estiver pending ou processing)
    if (job.status === "pending" || job.status === "processing") {
      await db
        .update(playlistGenerationJobs)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(playlistGenerationJobs.id, jobId))

      logger.info("Job cancelled", {
        jobId,
        userId: session.user.id,
      })

      return NextResponse.json({
        status: "cancelled",
        jobId,
        message: "Job foi cancelado com sucesso",
      })
    }

    return NextResponse.json(
      {
        error: `Não é possível cancelar um job com status: ${job.status}`,
      },
      { status: 400 }
    )
  } catch (error) {
    logger.error("Erro ao cancelar job", { jobId }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao cancelar job"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
