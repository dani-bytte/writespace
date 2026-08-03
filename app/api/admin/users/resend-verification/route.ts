import { inArray } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { user } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"

export async function POST(request: Request) {
  try {
    // Verificar autenticação e role
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as { role?: string }).role !== "dev") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()

    // Aceita um único userId ou uma lista de userIds (bulk)
    const userIds: string[] = body.userId
      ? [body.userId]
      : Array.isArray(body.userIds)
        ? body.userIds
        : []

    if (userIds.length === 0) {
      return NextResponse.json({ error: "Informe ao menos um userId ou userIds" }, { status: 400 })
    }

    // Buscar usuários no banco (apenas campos necessários)
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      })
      .from(user)
      .where(inArray(user.id, userIds))

    if (users.length === 0) {
      return NextResponse.json({ error: "Nenhum usuário encontrado" }, { status: 404 })
    }

    let sent = 0
    let failed = 0
    const errors: { email: string; reason: string }[] = []

    for (const targetUser of users) {
      // Não reenviar para usuários já verificados
      if (targetUser.emailVerified) {
        logger.info("Skipping already verified user on resend-verification", {
          userId: targetUser.id,
          action: "resend_verification",
        })
        continue
      }

      try {
        // Importante: chamar sem cookies de sessão do admin.
        // Assim o Better Auth segue o fluxo "sem sessão" e gera token válido de verificação.
        await auth.api.sendVerificationEmail({
          body: { email: targetUser.email, callbackURL: "/" },
          headers: new Headers(),
        })

        logger.info("Verification email resent via Better Auth (no-session flow)", {
          userId: targetUser.id,
          email: targetUser.email,
          action: "resend_verification",
          securityEvent: true,
        })
        sent++
      } catch (betterAuthErr) {
        failed++
        const reason =
          betterAuthErr instanceof Error ? betterAuthErr.message : String(betterAuthErr)
        errors.push({ email: targetUser.email, reason })
        logger.error(
          "Failed to resend verification email",
          {
            userId: targetUser.id,
            email: targetUser.email,
            action: "resend_verification",
            securityEvent: true,
          },
          betterAuthErr instanceof Error ? betterAuthErr : new Error(String(betterAuthErr))
        )
      }
    }

    // Retorna resultado consolidado
    if (failed > 0 && sent === 0) {
      return NextResponse.json(
        {
          error: "Falha ao reenviar emails de verificação",
          sent,
          failed,
          errors,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message:
        sent > 0
          ? `Email(s) de verificação reenviado(s) com sucesso`
          : "Nenhum email reenviado (usuários já verificados?)",
      sent,
      failed,
      ...(errors.length > 0 && { warnings: errors }),
    })
  } catch (error) {
    logger.error(
      "Error in resend-verification endpoint",
      { action: "resend_verification" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
