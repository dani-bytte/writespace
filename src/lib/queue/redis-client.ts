/**
 * Redis Client Configuration
 * Suporta autenticação com senha via REDIS_URL
 */

import { Redis as IORedis } from "ioredis"
import { logger } from "@/src/lib/logger"

function createRedisClient(): IORedis {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    throw new Error("REDIS_URL não configurada. Configure no .env.local")
  }

  try {
    // Redis URL format: redis://:password@host:port/db
    const redis = new IORedis(redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      enableOfflineQueue: true,
      retryStrategy: times => {
        const delay = Math.min(times * 50, 2000)
        logger.warn(`Redis reconectando em ${delay}ms`, { attempt: times })
        return delay
      },
      connectTimeout: 10000,
      commandTimeout: 5000,
      reconnectOnError: err => {
        return err.message.includes("READONLY")
      },
    })

    redis.on("connect", () => logger.info("✅ Redis conectado"))
    redis.on("error", err => logger.error("❌ Redis erro", {}, err as Error))
    redis.on("close", () => logger.warn("⚠️ Redis fechado"))
    redis.on("reconnecting", () => logger.info("🔄 Redis reconectando..."))

    return redis
  } catch (error) {
    logger.error("Erro ao conectar Redis", {}, error as Error)
    throw error
  }
}

let redisInstance: IORedis | null = null

export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL

  if (!redisUrl) {
    throw new Error("REDIS_URL não configurada. Configure no .env.local")
  }

  const url = new URL(redisUrl)
  const db = Number(url.pathname.replace("/", "") || "0")

  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number.isNaN(db) ? 0 : db,
    tls: url.protocol === "rediss:" ? {} : undefined,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
  }
}

export function getRedisClient(): IORedis {
  if (!redisInstance) {
    redisInstance = createRedisClient()
  }
  return redisInstance
}

export async function testRedisConnection(): Promise<boolean> {
  try {
    return (await getRedisClient().ping()) === "PONG"
  } catch (error) {
    logger.error("Redis ping falhou", {}, error as Error)
    return false
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit()
      logger.info("Redis desconectado")
      redisInstance = null
    } catch (error) {
      logger.error("Erro ao fechar Redis", {}, error as Error)
    }
  }
}
