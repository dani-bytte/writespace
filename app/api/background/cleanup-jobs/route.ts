import { and, eq, lt, lte, or } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/src/lib/db"
import { playlistGenerationJobs } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"
import { validateInternalToken } from "@/src/lib/security/auth-guards"

export async function POST(request: NextRequest) {
  try {
    const tokenValidation = validateInternalToken(request, process.env.INTERNAL_API_TOKEN)
    if (!tokenValidation.authorized) {
      return NextResponse.json(
        { error: tokenValidation.status === 503 ? "Internal cleanup unavailable" : "Unauthorized" },
        { status: tokenValidation.status }
      )
    }

    const now = Date.now()
    const ts72h = new Date(now - 72 * 60 * 60 * 1000)
    const ts24h = new Date(now - 24 * 60 * 60 * 1000)
    const ts7d = new Date(now - 7 * 24 * 60 * 60 * 1000)

    // Deletar completed/cancelled antigos
    const completedCancelled = await db
      .delete(playlistGenerationJobs)
      .where(
        and(
          or(
            eq(playlistGenerationJobs.status, "completed"),
            eq(playlistGenerationJobs.status, "cancelled")
          ),
          lt(playlistGenerationJobs.updatedAt, ts72h)
        )
      )
      .returning({ id: playlistGenerationJobs.id })

    // Deletar failed com mais de 7 dias
    const failedOld = await db
      .delete(playlistGenerationJobs)
      .where(
        and(eq(playlistGenerationJobs.status, "failed"), lt(playlistGenerationJobs.updatedAt, ts7d))
      )
      .returning({ id: playlistGenerationJobs.id })

    // Deletar pending/processing com mais de 24h (zumbis)
    const zombies = await db
      .delete(playlistGenerationJobs)
      .where(
        and(
          or(
            eq(playlistGenerationJobs.status, "pending"),
            eq(playlistGenerationJobs.status, "processing")
          ),
          lt(playlistGenerationJobs.updatedAt, ts24h)
        )
      )
      .returning({ id: playlistGenerationJobs.id })

    logger.info("Cleanup jobs executed", {
      completedCancelledDeleted: completedCancelled.length,
      failedDeleted: failedOld.length,
      zombieDeleted: zombies.length,
    })

    return NextResponse.json({
      status: "ok",
      deleted: {
        completedCancelled: completedCancelled.length,
        failed: failedOld.length,
        zombies: zombies.length,
      },
    })
  } catch (error) {
    logger.error("Error cleaning up jobs", {}, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/background/cleanup-jobs
 *
 * Relatório rápido de quantos candidatos à limpeza existem.
 */
export async function GET(request: NextRequest) {
  try {
    const tokenValidation = validateInternalToken(request, process.env.INTERNAL_API_TOKEN)
    if (!tokenValidation.authorized) {
      return NextResponse.json(
        { error: tokenValidation.status === 503 ? "Internal cleanup unavailable" : "Unauthorized" },
        { status: tokenValidation.status }
      )
    }

    const now = Date.now()
    const ts72h = new Date(now - 72 * 60 * 60 * 1000)
    const ts24h = new Date(now - 24 * 60 * 60 * 1000)
    const ts7d = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const completedCancelledCount = await db
      .select({ id: playlistGenerationJobs.id })
      .from(playlistGenerationJobs)
      .where(
        and(
          or(
            eq(playlistGenerationJobs.status, "completed"),
            eq(playlistGenerationJobs.status, "cancelled")
          ),
          lte(playlistGenerationJobs.updatedAt, ts72h)
        )
      )

    const failedCount = await db
      .select({ id: playlistGenerationJobs.id })
      .from(playlistGenerationJobs)
      .where(
        and(
          eq(playlistGenerationJobs.status, "failed"),
          lte(playlistGenerationJobs.updatedAt, ts7d)
        )
      )

    const zombieCount = await db
      .select({ id: playlistGenerationJobs.id })
      .from(playlistGenerationJobs)
      .where(
        and(
          or(
            eq(playlistGenerationJobs.status, "pending"),
            eq(playlistGenerationJobs.status, "processing")
          ),
          lte(playlistGenerationJobs.updatedAt, ts24h)
        )
      )

    return NextResponse.json({
      status: "ok",
      candidates: {
        completedCancelled: completedCancelledCount.length,
        failed: failedCount.length,
        zombies: zombieCount.length,
      },
    })
  } catch (error) {
    logger.error("Error reporting cleanup candidates", {}, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
