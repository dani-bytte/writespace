import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

/**
 * DELETE /api/music/blacklist/artist/[id]
 * Remove um artista da blacklist
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const artistId = params.id

    if (!artistId) {
      return NextResponse.json({ error: "ID de artista é obrigatório" }, { status: 400 })
    }

    await spotifyService.removeArtistFromBlacklist(session.user.id, artistId)

    return NextResponse.json({
      success: true,
      message: "Artista removido da blacklist",
    })
  } catch (error) {
    logger.error("Erro ao remover artista da blacklist", {}, error as Error)
    return NextResponse.json({ error: "Erro ao remover artista" }, { status: 500 })
  }
}
