import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

/**
 * DELETE /api/music/blacklist/track/[id]
 * Remove uma track da blacklist
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const trackId = params.id

    if (!trackId) {
      return NextResponse.json({ error: "ID de track é obrigatório" }, { status: 400 })
    }

    await spotifyService.removeTrackFromBlacklist(session.user.id, trackId)

    return NextResponse.json({
      success: true,
      message: "Track removida da blacklist",
    })
  } catch (error) {
    logger.error("Erro ao remover track da blacklist", {}, error as Error)
    return NextResponse.json({ error: "Erro ao remover track" }, { status: 500 })
  }
}
