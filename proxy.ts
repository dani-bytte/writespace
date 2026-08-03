import { type NextRequest, NextResponse } from "next/server"
import { logger } from "./src/lib/logger"
import {
  apiRateLimit,
  authRateLimit,
  sessionCheckRateLimit,
  shareRateLimit,
} from "./src/lib/rate-limit"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle React DevTools source map requests (development only)
  if (pathname === "/installHook.js.map") {
    return new NextResponse(
      JSON.stringify({
        version: 3,
        sources: [],
        mappings: "",
        names: [],
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    )
  }

  // Security logging for sensitive endpoints
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/admin")) {
    logger.security("debug", "Sensitive endpoint access", {
      action: "endpoint_access",
      resource: pathname,
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      requestId: crypto.randomUUID(),
    })
  }

  // Apply rate limiting based on endpoint
  let rateLimitResponse: NextResponse | null = null

  if (pathname.startsWith("/api/auth")) {
    // Endpoints de verificação de sessão têm rate limit mais permissivo
    const sessionEndpoints = ["/api/auth/get-session", "/api/auth/session"]
    const isSessionCheck = sessionEndpoints.some(ep => pathname.startsWith(ep))

    if (isSessionCheck) {
      // Rate limit permissivo para verificação de sessão (chamado frequentemente)
      rateLimitResponse = await sessionCheckRateLimit(request)
    } else {
      // Rate limit restritivo para login/registro/reset password
      rateLimitResponse = await authRateLimit(request)
    }
  } else if (pathname.startsWith("/api/documents") && pathname.includes("/share")) {
    // Rate limit document sharing
    rateLimitResponse = await shareRateLimit(request)
  } else if (pathname.startsWith("/api/")) {
    // General API rate limiting
    rateLimitResponse = await apiRateLimit(request)
  }

  // If rate limit was exceeded, log and return the rate limit response
  if (rateLimitResponse) {
    logger.security("warn", "Rate limit exceeded", {
      action: "rate_limit_exceeded",
      resource: pathname,
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
    })
    return rateLimitResponse
  }

  // Add security headers to all responses
  const response = NextResponse.next()

  // Additional runtime security headers
  response.headers.set("X-DNS-Prefetch-Control", "off")
  response.headers.set("X-Download-Options", "noopen")

  // Remove server information
  response.headers.delete("Server")
  response.headers.delete("X-Powered-By")

  return response
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match source map requests (for React DevTools)
    "/installHook.js.map",
    // Match all pages except static files and images
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
