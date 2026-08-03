import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/src/lib/logger"
import { PlaylistJobService } from "@/src/lib/queue/playlist-job-service"
import { validateInternalToken } from "@/src/lib/security/auth-guards"

/**
 * POST /api/background/process-jobs
 *
 * Process pending playlist generation jobs
 * This runs inline in the Next.js application (no separate worker needed)
 *
 * Can be called via:
 * 1. API endpoint directly for immediate processing
 * 2. Scheduled via cron job service
 * 3. Within API routes when job completes
 */
export async function POST(request: NextRequest) {
  try {
    const tokenValidation = validateInternalToken(request, process.env.INTERNAL_API_TOKEN)
    if (!tokenValidation.authorized) {
      return NextResponse.json(
        {
          error: tokenValidation.status === 503 ? "Internal processor unavailable" : "Unauthorized",
        },
        { status: tokenValidation.status }
      )
    }

    // Get pending jobs
    const pendingJobs = await PlaylistJobService.getPendingJobs(1) // Process one at a time

    if (pendingJobs.length === 0) {
      logger.debug("No pending jobs to process")
      return NextResponse.json({
        processed: 0,
        queued: 0,
      })
    }

    logger.info(`Processing ${pendingJobs.length} pending job(s)`)

    let processed = 0
    let failed = 0

    for (const job of pendingJobs) {
      try {
        await PlaylistJobService.processJob(job.id)
        processed++
      } catch (error) {
        logger.error("Error processing job", { jobId: job.id }, error as Error)
        failed++
      }
    }

    return NextResponse.json({
      processed,
      failed,
      queued: (await PlaylistJobService.getPendingJobs(1)).length > 0 ? 1 : 0,
    })
  } catch (error) {
    logger.error("Error in background job processor", {}, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

/**
 * GET /api/background/process-jobs
 *
 * Health check / status endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const tokenValidation = validateInternalToken(request, process.env.INTERNAL_API_TOKEN)
    if (!tokenValidation.authorized) {
      return NextResponse.json(
        {
          error: tokenValidation.status === 503 ? "Internal processor unavailable" : "Unauthorized",
        },
        { status: tokenValidation.status }
      )
    }

    const pendingJobs = await PlaylistJobService.getPendingJobs(100)

    return NextResponse.json({
      status: "ok",
      pendingJobsCount: pendingJobs.length,
    })
  } catch (error) {
    logger.error("Error in health check", {}, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
