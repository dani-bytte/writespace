import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { logger } from "@/src/lib/logger"
import { SPOTIFY_OWNER_PREMIUM_REQUIRED_CODE, spotifyService } from "@/src/lib/spotify-service"

function isOwnerPremiumRestriction(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(`[${SPOTIFY_OWNER_PREMIUM_REQUIRED_CODE}]`)
  )
}

/**
 * GET /api/music/status
 * Verifica se o usuário tem conta Spotify conectada
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

    const isConnected = await spotifyService.isConnected(session.user.id)

    if (isConnected) {
      // Buscar perfil do Spotify para exibir informações
      // Se a integração estiver bloqueada por requisito de Premium do owner do app,
      // retornamos um estado de restrição amigável em vez de 500.
      let profile = null

      try {
        profile = await spotifyService.getProfile(session.user.id)
      } catch (error) {
        if (isOwnerPremiumRestriction(error)) {
          logger.warn("Spotify restrito: owner sem Premium ativo", {
            userId: session.user.id,
          })

          return NextResponse.json({
            connected: true,
            profile: null,
            restricted: true,
            restrictionCode: "app_owner_premium_required",
            restrictionMessage:
              "A integracao com Spotify esta temporariamente indisponivel porque a conta dona do app precisa de Premium ativo. Quando a assinatura for regularizada, o acesso pode levar algumas horas para voltar.",
          })
        }

        throw error
      }

      return NextResponse.json({
        connected: true,
        profile: profile
          ? {
              id: profile.id,
              displayName: profile.display_name,
              email: profile.email,
              image: profile.images?.[0]?.url,
              spotifyUrl: profile.external_urls.spotify,
            }
          : null,
        restricted: false,
      })
    }

    return NextResponse.json({
      connected: false,
      profile: null,
      restricted: false,
    })
  } catch (error) {
    if (isOwnerPremiumRestriction(error)) {
      return NextResponse.json({
        connected: true,
        profile: null,
        restricted: true,
        restrictionCode: "app_owner_premium_required",
        restrictionMessage:
          "A integracao com Spotify esta temporariamente indisponivel porque a conta dona do app precisa de Premium ativo. Quando a assinatura for regularizada, o acesso pode levar algumas horas para voltar.",
      })
    }

    logger.error(
      "Erro ao verificar status do Spotify",
      { userId: session?.user?.id },
      error as Error
    )

    return NextResponse.json({ error: "Erro ao verificar conexão com Spotify" }, { status: 500 })
  }
}
