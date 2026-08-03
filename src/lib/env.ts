/**
 * Validação centralizada de variáveis de ambiente.
 *
 * - Em runtime de produção: falha se variável obrigatória estiver ausente.
 * - Durante build (ex.: `next build` em Docker): permite fallback para não quebrar a compilação.
 * - Em desenvolvimento: usa fallback local com aviso.
 *
 * Importe deste arquivo em módulos server-side.
 * NÃO importe em componentes client — use `NEXT_PUBLIC_*` variáveis lá.
 */

const isProduction = process.env.NODE_ENV === "production"
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-production-export" ||
  process.env.npm_lifecycle_event === "build"

interface RequireEnvOptions {
  allowFallbackDuringBuild?: boolean
}

function requireEnv(name: string, devFallback?: string, options: RequireEnvOptions = {}): string {
  const value = process.env[name]
  if (value) return value

  if (devFallback !== undefined) {
    if (!isProduction) {
      console.warn(
        `[env] Variável ${name} não definida. Usando fallback de desenvolvimento: ${devFallback}`
      )
      return devFallback
    }

    if (isBuildPhase && options.allowFallbackDuringBuild) {
      console.warn(
        `[env] Variável ${name} não definida durante build. ` +
          `Usando fallback temporário para compilação: ${devFallback}`
      )
      return devFallback
    }
  }

  throw new Error(
    `[env] Variável de ambiente obrigatória não definida: ${name}. ` +
      `Configure-a antes de iniciar a aplicação.`
  )
}

/** URL base da aplicação. Obrigatória em runtime de produção. */
export const BETTER_AUTH_URL = requireEnv("BETTER_AUTH_URL", "http://127.0.0.1:3000", {
  allowFallbackDuringBuild: true,
})

/** String de conexão com o banco de dados. Obrigatória em runtime de produção. */
export const DATABASE_URL = requireEnv("DATABASE_URL", "postgresql://localhost:5431/writespace", {
  allowFallbackDuringBuild: true,
})

/**
 * Chave AES-256 para credenciais armazenadas.
 * Obrigatória em produção — nunca usar fallback conhecido fora do desenvolvimento local.
 */
export const ENCRYPTION_KEY = requireEnv(
  "ENCRYPTION_KEY",
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
)
