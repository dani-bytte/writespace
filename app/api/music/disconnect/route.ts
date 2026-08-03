import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { account } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"
import { spotifyService } from "@/src/lib/spotify-service"

/**
 * POST /api/music/disconnect
 * Desconecta a conta Spotify do usuário
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

    // Remover a conta Spotify do banco de dados
    const result = await db
      .delete(account)
      .where(and(eq(account.userId, session.user.id), eq(account.providerId, "spotify")))
      .returning()

    if (result.length === 0) {
      return NextResponse.json({ error: "Conta Spotify não encontrada" }, { status: 404 })
    }

    // Limpar cache de conexão
    spotifyService.clearConnectionCache(session.user.id)

    logger.info("Spotify account disconnected", {
      userId: session.user.id,
    })

    return NextResponse.json({
      success: true,
      message: "Conta Spotify desconectada com sucesso",
    })
  } catch (error) {
    logger.error("Erro ao desconectar Spotify", { userId: session?.user?.id }, error as Error)

    return NextResponse.json({ error: "Erro ao desconectar conta Spotify" }, { status: 500 })
  }
}
