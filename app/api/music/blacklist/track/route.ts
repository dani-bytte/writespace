import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

const addTrackSchema = z.object({
  spotifyTrackId: z.string().min(1),
  trackName: z.string().min(1),
  artistName: z.string().min(1),
  reason: z.string().optional(),
})

/**
 * POST /api/music/blacklist/track
 * Adiciona uma track à blacklist
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const params = addTrackSchema.parse(body)

    await spotifyService.addTrackToBlacklist(
      session.user.id,
      params.spotifyTrackId,
      params.trackName,
      params.artistName,
      params.reason
    )

    return NextResponse.json({
      success: true,
      message: `"${params.trackName}" adicionada à blacklist`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: error.issues },
        { status: 400 }
      )
    }

    logger.error("Erro ao adicionar track à blacklist", {}, error as Error)
    return NextResponse.json({ error: "Erro ao adicionar à blacklist" }, { status: 500 })
  }
}
