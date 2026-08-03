import { betterAuth } from "better-auth"

import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { BETTER_AUTH_URL } from "@/src/lib/env"
import { db } from "./db"
import * as schema from "./db/schema"
import { emailService } from "./email-service"

const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || BETTER_AUTH_URL
const isProduction = process.env.NODE_ENV === "production"
const isHTTPS = baseURL.startsWith("https://")

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: isProduction,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    sendVerificationEmail: async ({ user, url }) => {
      void emailService
        .sendVerificationEmail({
          recipientEmail: user.email,
          verificationUrl: url,
          userName: user.name,
        })
        .catch(error => {
          console.error("Failed to send verification email:", error)
        })
    },
  },
  socialProviders: {
    // Configurar Google OAuth apenas se as credenciais estiverem disponíveis
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectURI: `${baseURL}/api/auth/callback/google`,
          },
        }
      : {}),
    // Configurar Discord OAuth apenas se as credenciais estiverem disponíveis
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? {
          discord: {
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            redirectURI: `${baseURL}/api/auth/callback/discord`,
          },
        }
      : {}),
    // Configurar Spotify OAuth apenas se as credenciais estiverem disponíveis
    ...(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
      ? {
          spotify: {
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectURI: `${baseURL}/api/auth/callback/spotify`,
            scope: [
              "user-read-email",
              "user-read-private",
              "user-top-read",
              "playlist-modify-public",
              "playlist-modify-private",
            ],
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Don't allow input during registration
      },
    },
  },
  // Habilitar vinculação de contas - permite conectar múltiplos provedores OAuth à mesma conta
  account: {
    accountLinking: {
      enabled: true,
      // Vincular automaticamente se o email for o mesmo e estiver verificado
      trustedProviders: ["google", "discord", "spotify"],
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    (() => {
      // Allow build-time execution without secret (CI or build phase)
      const isBuildTime =
        process.env.CI === "true" || process.env.NEXT_PHASE === "phase-production-build"

      if (isProduction && !isBuildTime) {
        throw new Error("BETTER_AUTH_SECRET é obrigatório em produção")
      }
      // Em desenvolvimento ou build, gerar uma chave aleatória temporária
      return `build-temp-${Math.random().toString(36).substring(2, 15)}-${Date.now()}`
    })(),
  baseURL,
  // Trusted origins - production URL always included, localhost only in development
  trustedOrigins: [
    baseURL,
    "https://writespace.blasiusy.site",
    // Only allow localhost in development
    ...(!isProduction ? ["http://localhost:3000", "http://127.0.0.1:3000"] : []),
  ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
  // Session configuration with data exposure controls
  session: {
    // Session expiry (7 days)
    expiresIn: 60 * 60 * 24 * 7,
    // Refresh session if more than 1 day old
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    // Configurações de cookies para produção com HTTPS
    cookieOptions: {
      secure: isHTTPS, // true em HTTPS, false em desenvolvimento
      sameSite: isHTTPS ? "lax" : "lax",
      httpOnly: true,
      path: "/",
      // Em produção, não definir domain permite que cookies funcionem em subdomínios
    },
    // Configurações de cross-origin para OAuth
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: isProduction ? ".blasiusy.site" : undefined,
    },
  },
})
