import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { generatedPlaylists } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

/**
 * DELETE /api/music/history/[id]
 * Remove uma playlist do histórico e opcionalmente do Spotify
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Buscar a playlist do histórico
    const [playlist] = await db
      .select()
      .from(generatedPlaylists)
      .where(and(eq(generatedPlaylists.id, id), eq(generatedPlaylists.userId, session.user.id)))

    if (!playlist) {
      return NextResponse.json({ error: "Playlist não encontrada" }, { status: 404 })
    }

    // Verificar query param para saber se deve deletar do Spotify também
    const url = new URL(request.url)
    const deleteFromSpotify = url.searchParams.get("spotify") === "true"

    let spotifyDeleted = false

    // Se pediu para deletar do Spotify e temos o ID da playlist
    if (deleteFromSpotify && playlist.spotifyPlaylistId) {
      try {
        await spotifyService.ensureConnection(session.user.id)
        spotifyDeleted = await spotifyService.unfollowPlaylist(
          session.user.id,
          playlist.spotifyPlaylistId
        )
      } catch (error) {
        logger.warn("Não foi possível remover playlist do Spotify", {
          playlistId: playlist.spotifyPlaylistId,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        })
        // Continuar mesmo se falhar no Spotify
      }
    }

    // Deletar do nosso banco de dados
    await db.delete(generatedPlaylists).where(eq(generatedPlaylists.id, id))

    logger.info("Playlist deleted from history", {
      userId: session.user.id,
      playlistId: id,
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      spotifyDeleted,
    })

    return NextResponse.json({
      success: true,
      deleted: {
        fromHistory: true,
        fromSpotify: spotifyDeleted,
      },
      message: spotifyDeleted
        ? "Playlist removida do histórico e do Spotify"
        : "Playlist removida do histórico",
    })
  } catch (error) {
    logger.error("Erro ao deletar playlist", { userId: session?.user?.id }, error as Error)

    return NextResponse.json({ error: "Erro ao deletar playlist" }, { status: 500 })
  }
}
