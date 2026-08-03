import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

const querySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(20),
})

/**
 * GET /api/music/tracks/search
 * Busca músicas pelo nome no Spotify
 */
export async function GET(request: NextRequest) {
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Validar parâmetros
    const url = new URL(request.url)
    let params: z.infer<typeof querySchema>

    try {
      params = querySchema.parse({
        q: url.searchParams.get("q") || "",
        limit: Number.parseInt(url.searchParams.get("limit") || "20", 10),
      })
    } catch (error) {
      return NextResponse.json(
        {
          error: "Parâmetros inválidos",
          details: error instanceof z.ZodError ? error.issues : null,
        },
        { status: 400 }
      )
    }

    // Verificar conexão com Spotify
    const isConnected = await spotifyService.isConnected(session.user.id)
    if (!isConnected) {
      return NextResponse.json(
        { error: "Spotify não conectado. Por favor, conecte sua conta Spotify." },
        { status: 403 }
      )
    }

    // Buscar músicas
    const result = await spotifyService.searchTracks(session.user.id, params.q, params.limit)

    if (!result) {
      return NextResponse.json({ error: "Não foi possível buscar músicas" }, { status: 500 })
    }

    return NextResponse.json({
      tracks: result.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => ({ id: a.id, name: a.name })),
        album: {
          id: track.album.id,
          name: track.album.name,
          image: track.album.images?.[0]?.url || null,
        },
        duration_ms: track.duration_ms,
        explicit: track.explicit ?? false,
        preview_url: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
      })),
      total: result.tracks.total,
    })
  } catch (error) {
    logger.error("Erro ao buscar músicas", { userId: session?.user?.id }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao buscar músicas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
