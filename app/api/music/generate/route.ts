import { after, type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { PlaylistJobService } from "@/src/lib/queue/playlist-job-service"
import { spotifyService } from "@/src/lib/spotify-service"

const generateSchema = z.object({
  type: z.enum(["top-tracks", "artist-mix", "discovery", "hybrid"]),
  // Para top-tracks
  timeRange: z.enum(["short_term", "medium_term", "long_term"]).optional(),
  // Para artist-mix
  artistIds: z.array(z.string()).optional(),
  // Para hybrid
  topTracksRatio: z.number().min(0).max(1).optional(),
  // Configurações gerais
  playlistSize: z.number().int().min(10).max(100).default(30),
  includeRecommendations: z.boolean().default(true),
  refineWithGemini: z.boolean().default(true),
  excludeStoredTracks: z.boolean().default(true),
})

/**
 * POST /api/music/generate
 * Enfileira geração de playlist (processamento assíncrono com BullMQ)
 *
 * Resposta imediata com ID do job para polling
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Validar body
    const body = await request.json()
    let params: z.infer<typeof generateSchema>

    try {
      params = generateSchema.parse(body)
    } catch (error) {
      return NextResponse.json(
        {
          error: "Parâmetros inválidos",
          details: error instanceof z.ZodError ? error.issues : null,
        },
        { status: 400 }
      )
    }

    // Verificar conexão com Spotify antes de enfileirar
    try {
      await spotifyService.ensureConnection(session.user.id)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Erro de conexão com Spotify" },
        { status: 403 }
      )
    }

    // Enfileirar job (não esperar conclusão)
    const jobId = await PlaylistJobService.enqueueJob({
      userId: session.user.id,
      type: params.type,
      timeRange: params.timeRange,
      artistIds: params.artistIds,
      topTracksRatio: params.topTracksRatio,
      playlistSize: params.playlistSize,
      includeRecommendations: params.includeRecommendations,
      refineWithGemini: params.refineWithGemini,
      excludeStoredTracks: params.excludeStoredTracks,
    })

    // Processa o job APÓS enviar a resposta ao cliente
    // Isso melhora a percepção de velocidade - cliente recebe resposta imediatamente
    after(async () => {
      try {
        await PlaylistJobService.processJob(jobId)
      } catch (err) {
        logger.error("Error in after-response job processing", { jobId }, err as Error)
      }
    })

    return NextResponse.json(
      {
        status: "queued",
        jobId,
        estimatedWaitTime: "2-5 minutos",
        message:
          "Sua playlist está sendo gerada. Você receberá uma notificação quando estiver pronta.",
        pollUrl: `/api/music/generate/${jobId}`,
      },
      { status: 202 } // 202 Accepted
    )
  } catch (error) {
    logger.error("Erro ao enfileirar playlist", { userId: undefined }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao gerar playlist"
    let status = 500

    if (message.includes("não autorizado") || message.includes("Não autorizado")) {
      status = 401
    } else if (message.includes("Selecione") || message.includes("inválid")) {
      status = 400
    }

    return NextResponse.json({ error: message }, { status })
  }
}
