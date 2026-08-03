import { desc, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { generatedPlaylists } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"

/**
 * GET /api/music/history
 * Retorna o histórico de playlists geradas pelo usuário
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

    const url = new URL(request.url)
    const limit = Math.min(Number.parseInt(url.searchParams.get("limit") || "20", 10), 50)

    const playlists = await db
      .select()
      .from(generatedPlaylists)
      .where(eq(generatedPlaylists.userId, session.user.id))
      .orderBy(desc(generatedPlaylists.createdAt))
      .limit(limit)

    return NextResponse.json({
      playlists: playlists.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        spotifyPlaylistId: p.spotifyPlaylistId,
        spotifyPlaylistUrl: p.spotifyPlaylistUrl,
        trackCount: Number.parseInt(p.trackCount, 10),
        generationType: p.generationType,
        wasRefined: p.wasRefined,
        status: p.status,
        createdAt: p.createdAt,
      })),
    })
  } catch (error) {
    logger.error(
      "Erro ao buscar histórico de playlists",
      { userId: session?.user?.id },
      error as Error
    )

    return NextResponse.json({ error: "Erro ao buscar histórico" }, { status: 500 })
  }
}
