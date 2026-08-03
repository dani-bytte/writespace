import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { geminiService } from "@/src/lib/gemini-service"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

const querySchema = z.object({
  timeRange: z.enum(["short_term", "medium_term", "long_term"]).default("medium_term"),
  limit: z.number().int().min(1).max(50).default(50),
  includeAnalysis: z.boolean().default(false),
})

/**
 * GET /api/music/top-tracks
 * Busca as músicas mais ouvidas do usuário no Spotify
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
        timeRange: url.searchParams.get("timeRange") || "medium_term",
        limit: Number.parseInt(url.searchParams.get("limit") || "50", 10),
        includeAnalysis: url.searchParams.get("includeAnalysis") === "true",
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

    // Buscar top tracks
    const topTracks = await spotifyService.getTopTracks(
      session.user.id,
      params.timeRange,
      params.limit
    )

    if (!topTracks) {
      return NextResponse.json({ error: "Não foi possível buscar suas músicas" }, { status: 500 })
    }

    // Buscar top artists também
    const topArtists = await spotifyService.getTopArtists(session.user.id, params.timeRange, 20)

    // Análise do perfil musical com Gemini (opcional)
    let analysis = null
    if (params.includeAnalysis && topTracks.items.length > 0) {
      analysis = await geminiService.analyzeMusicalProfile(topTracks.items)
    }

    const timeRangeLabels = {
      short_term: "Últimas 4 semanas",
      medium_term: "Últimos 6 meses",
      long_term: "Desde sempre",
    }

    return NextResponse.json({
      tracks: topTracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => ({ id: a.id, name: a.name })),
        album: {
          id: track.album.id,
          name: track.album.name,
          image: track.album.images?.[0]?.url,
        },
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
        uri: track.uri,
      })),
      artists:
        topArtists?.items.map(artist => ({
          id: artist.id,
          name: artist.name,
          genres: artist.genres,
          image: artist.images?.[0]?.url,
          popularity: artist.popularity,
          spotifyUrl: artist.external_urls.spotify,
        })) || [],
      timeRange: params.timeRange,
      timeRangeLabel: timeRangeLabels[params.timeRange],
      total: topTracks.total,
      analysis,
    })
  } catch (error) {
    logger.error("Erro ao buscar top tracks", { userId: session?.user?.id }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao buscar músicas"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
