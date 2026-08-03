import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

/**
 * POST /api/music/refresh-cache
 *
 * Limpa o cache de conexão Spotify para forçar verificação fresca do banco
 * Deve ser chamado após OAuth bem-sucedido para garantir que a sessão
 * atualizada seja detectada imediatamente
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Limpar cache de conexão Spotify
    spotifyService.clearConnectionCache(session.user.id)

    logger.info("Spotify cache cleared for session refresh", {
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: "Cache Spotify limpo com sucesso",
    })
  } catch (error) {
    logger.error("Erro ao limpar cache Spotify", {}, error as Error)

    return NextResponse.json({ error: "Erro ao limpar cache" }, { status: 500 })
  }
}
