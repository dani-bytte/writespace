# WriteSpace Production Dockerfile
# Multi-stage build for optimized Next.js standalone application

ARG BUN_VERSION=1.2.21

# Stage 1: Builder
FROM oven/bun:${BUN_VERSION}-alpine AS builder
WORKDIR /app

# Install Node.js in the Bun image to support worker_threads API
# Required for Next.js build (webpack/turbopack parallelism)
RUN apk add --no-cache nodejs

# Copy package files first — separate layer for better cache reuse.
# This layer is only invalidated when dependencies change, not source code.
COPY package.json bun.lock ./

# Install all dependencies (including devDependencies for build).
# Clean bun cache after install to keep the intermediate layer lean.
RUN bun install --frozen-lockfile && bun pm cache rm

# Copy source code (invalidates cache only on code changes, not dep changes)
COPY . .

# Build-time environment variables
ENV CI=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN bun run build

# Stage 2: Runner (Production)
FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security (single RUN to minimize layers)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary artifacts from the builder stage.
# standalone/ contains the minimal server + node_modules subset.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Health check — verify the HTTP server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1

# Start using Bun runtime (faster startup + lower memory vs Node)
CMD ["bun", "server.js"]
