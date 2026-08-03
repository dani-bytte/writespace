import { type NextRequest, NextResponse } from "next/server"
import { logger } from "./logger"
import { getRedisClient } from "./queue/redis-client"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
  skipSuccessfulRequests?: boolean
  failClosed?: boolean
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for development. In production, use Redis
class MemoryStore {
  private store = new Map<string, RateLimitEntry>()

  async increment(key: string): Promise<{ count: number; resetTime: number }> {
    const now = Date.now()
    const existing = this.store.get(key)

    if (!existing || now > existing.resetTime) {
      const entry = { count: 1, resetTime: now + 60000 } // 1 minute default
      this.store.set(key, entry)
      return entry
    }

    existing.count++
    this.store.set(key, existing)
    return existing
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

const store = new MemoryStore()

// Cleanup expired entries every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => store.cleanup(), 5 * 60 * 1000)
}

export function createRateLimit(config: RateLimitConfig) {
  return async function rateLimit(
    request: NextRequest,
    identifier?: string
  ): Promise<NextResponse | null> {
    // Get client identifier
    const clientId =
      identifier ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown"

    const key = `rate-limit:${clientId}:${request.nextUrl.pathname}`

    try {
      const result =
        process.env.NODE_ENV === "production"
          ? await incrementRedis(key, config.windowMs)
          : await store.increment(key)

      if (result.count > config.maxRequests) {
        const remaining = Math.max(0, result.resetTime - Date.now())

        // Log rate limit violation
        logger.securityEvent("Rate limit exceeded", {
          ip: clientId,
          path: request.nextUrl.pathname,
          userAgent: request.headers.get("user-agent") || "unknown",
          count: result.count,
          limit: config.maxRequests,
        })

        return NextResponse.json(
          {
            error: config.message || "Too many requests",
            retryAfter: Math.ceil(remaining / 1000),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": Math.ceil(result.resetTime / 1000).toString(),
              "Retry-After": Math.ceil(remaining / 1000).toString(),
            },
          }
        )
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next()
      response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
      response.headers.set("X-RateLimit-Remaining", (config.maxRequests - result.count).toString())
      response.headers.set("X-RateLimit-Reset", Math.ceil(result.resetTime / 1000).toString())

      return null // Continue with the request
    } catch (error) {
      logger.error("Rate limit error", {
        error: error instanceof Error ? error.message : "Unknown",
      })

      if (config.failClosed) {
        return NextResponse.json(
          { error: "Rate limiting unavailable" },
          { status: 503, headers: { "Retry-After": "30" } }
        )
      }

      return null // Allow request on error
    }
  }
}

// Predefined rate limits

// Rate limit restritivo para login/registro (proteção contra brute force)
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 login attempts per 15 minutes
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  failClosed: true,
})

// Rate limit mais permissivo para verificação de sessão (chamado frequentemente)
export const sessionCheckRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  message: "Limite de verificações de sessão excedido.",
})

export const apiRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: "Limite de requisições excedido. Tente novamente em alguns instantes.",
})

export const shareRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 shares per 5 minutes
  message: "Limite de compartilhamentos excedido. Tente novamente em 5 minutos.",
  failClosed: true,
})

async function incrementRedis(
  key: string,
  windowMs: number
): Promise<{ count: number; resetTime: number }> {
  const redis = getRedisClient()
  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000))
  }

  return {
    count,
    resetTime: Date.now() + windowMs,
  }
}
