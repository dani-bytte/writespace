import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

const querySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(20).default(10),
})

/**
 * GET /api/music/artists/search
 * Busca artistas pelo nome no Spotify
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
        limit: Number.parseInt(url.searchParams.get("limit") || "10", 10),
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

    // Buscar artistas
    const result = await spotifyService.searchArtists(session.user.id, params.q, params.limit)

    if (!result) {
      return NextResponse.json({ error: "Não foi possível buscar artistas" }, { status: 500 })
    }

    return NextResponse.json({
      artists: result.artists.items.map(artist => ({
        id: artist.id,
        name: artist.name,
        genres: artist.genres.slice(0, 3),
        image: artist.images?.[0]?.url || null,
        popularity: artist.popularity,
        spotifyUrl: artist.external_urls.spotify,
      })),
      total: result.artists.total,
    })
  } catch (error) {
    logger.error("Erro ao buscar artistas", { userId: session?.user?.id }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao buscar artistas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
