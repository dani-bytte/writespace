import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { generatedPlaylists } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  trackUris: z.array(z.string()).min(1).max(100),
  isPublic: z.boolean().default(true),
  // Metadados para histórico
  generationType: z
    .enum(["top-tracks", "artist-mix", "custom", "discovery", "hybrid"])
    .default("custom"),
  seedArtists: z.array(z.string()).optional(),
  seedTracks: z.array(z.string()).optional(),
  wasRefined: z.boolean().default(false),
  removedDuplicates: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    )
    .optional(),
})

/**
 * POST /api/music/create
 * Cria uma playlist no Spotify do usuário
 */
export async function POST(request: NextRequest) {
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Validar body
    const body = await request.json()
    let params: z.infer<typeof createPlaylistSchema>

    try {
      params = createPlaylistSchema.parse(body)
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
    try {
      await spotifyService.ensureConnection(session.user.id)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Erro de conexão com Spotify" },
        { status: 403 }
      )
    }

    // Criar playlist no Spotify
    const playlist = await spotifyService.createPlaylistWithTracks(
      session.user.id,
      params.name,
      params.trackUris,
      params.description,
      params.isPublic
    )

    if (!playlist) {
      return NextResponse.json(
        { error: "Não foi possível criar a playlist no Spotify" },
        { status: 500 }
      )
    }

    // Salvar no histórico do banco de dados
    const [savedPlaylist] = await db
      .insert(generatedPlaylists)
      .values({
        userId: session.user.id,
        name: params.name,
        description: params.description,
        spotifyPlaylistId: playlist.id,
        spotifyPlaylistUrl: playlist.external_urls.spotify,
        trackCount: params.trackUris.length.toString(),
        generationType: params.generationType,
        seedArtists: params.seedArtists ? JSON.stringify(params.seedArtists) : null,
        seedTracks: params.seedTracks ? JSON.stringify(params.seedTracks) : null,
        tracks: JSON.stringify(params.trackUris),
        wasRefined: params.wasRefined,
        removedDuplicates: params.removedDuplicates
          ? JSON.stringify(params.removedDuplicates)
          : null,
        status: "created",
      })
      .returning()

    logger.info("Playlist created on Spotify", {
      userId: session.user.id,
      playlistId: playlist.id,
      playlistName: params.name,
      trackCount: params.trackUris.length,
    })

    return NextResponse.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: params.trackUris.length,
        spotifyUrl: playlist.external_urls.spotify,
        uri: playlist.uri,
        image: playlist.images?.[0]?.url,
      },
      historyId: savedPlaylist.id,
    })
  } catch (error) {
    logger.error("Erro ao criar playlist", { userId: session?.user?.id }, error as Error)

    const message = error instanceof Error ? error.message : "Erro ao criar playlist"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
