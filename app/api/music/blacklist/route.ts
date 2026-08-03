import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

/**
 * GET /api/music/blacklist
 * Obtém a blacklist do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const blacklistInfo = await spotifyService.getUserBlacklistInfo(session.user.id)

    return NextResponse.json({
      success: true,
      tracks: blacklistInfo.tracks,
      artists: blacklistInfo.artists,
      stats: {
        totalBlockedTracks: blacklistInfo.tracks.length,
        totalBlockedArtists: blacklistInfo.artists.length,
      },
    })
  } catch (error) {
    logger.error("Erro ao buscar blacklist", {}, error as Error)
    return NextResponse.json({ error: "Erro ao buscar blacklist" }, { status: 500 })
  }
}

/**
 * POST /api/music/blacklist/track
 * Adiciona uma track à blacklist
 */
const addTrackSchema = z.object({
  spotifyTrackId: z.string().min(1),
  trackName: z.string().min(1),
  artistName: z.string().min(1),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()

    // Determinar tipo de operação pela URL
    const url = new URL(request.url)
    const pathname = url.pathname

    if (pathname.includes("/track")) {
      // Adicionar track à blacklist
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
    } else if (pathname.includes("/artist")) {
      // Adicionar artista à blacklist
      const schema = z.object({
        spotifyArtistId: z.string().min(1),
        artistName: z.string().min(1),
        reason: z.string().optional(),
      })

      const params = schema.parse(body)

      await spotifyService.addArtistToBlacklist(
        session.user.id,
        params.spotifyArtistId,
        params.artistName,
        params.reason
      )

      return NextResponse.json({
        success: true,
        message: `"${params.artistName}" adicionado à blacklist`,
      })
    } else {
      return NextResponse.json({ error: "Tipo de blacklist inválido" }, { status: 400 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Parâmetros inválidos", details: error.issues },
        { status: 400 }
      )
    }

    logger.error("Erro ao adicionar à blacklist", {}, error as Error)
    return NextResponse.json({ error: "Erro ao adicionar à blacklist" }, { status: 500 })
  }
}
