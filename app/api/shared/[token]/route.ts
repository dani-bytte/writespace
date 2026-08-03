import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { account, db, documentShares, documents } from "@/src/lib/db"
import { sanitizeHtml } from "@/src/lib/html-utils"
import { logger } from "@/src/lib/logger"

interface RouteContext {
  params: Promise<{
    token: string
  }>
}

const GENERIC_ERROR = "Recurso não encontrado"
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  try {
    if (!TOKEN_PATTERN.test(params.token)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    const [share] = await db
      .select({
        documentId: documentShares.documentId,
        expiresAt: documentShares.expiresAt,
        sharedWithEmail: documentShares.sharedWithEmail,
        sharedWithDiscordId: documentShares.sharedWithDiscordId,
        validationType: documentShares.validationType,
      })
      .from(documentShares)
      .where(eq(documentShares.shareToken, params.token))

    if (!share || (share.expiresAt && share.expiresAt < new Date())) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    if (share.validationType !== "none") {
      const session = await auth.api.getSession({ headers: request.headers })
      if (!session?.user) {
        return NextResponse.json(
          {
            error: "Autenticação necessária",
            requiresAuth: true,
            validationType: share.validationType,
          },
          { status: 401 }
        )
      }

      let hasAccess = false
      switch (share.validationType) {
        case "email":
          hasAccess = session.user.email.toLowerCase() === share.sharedWithEmail?.toLowerCase()
          break
        case "discord":
        case "email_or_discord": {
          hasAccess =
            share.validationType === "email_or_discord" &&
            session.user.email.toLowerCase() === share.sharedWithEmail?.toLowerCase()

          if (!hasAccess && share.sharedWithDiscordId) {
            const [discordAccount] = await db
              .select({ accountId: account.accountId })
              .from(account)
              .where(and(eq(account.userId, session.user.id), eq(account.providerId, "discord")))
            hasAccess = discordAccount?.accountId === share.sharedWithDiscordId
          }
          break
        }
        default:
          hasAccess = false
      }

      if (!hasAccess) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
      }
    }

    const [document] = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(eq(documents.id, share.documentId), eq(documents.shared, true)))

    if (!document) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    // SECURITY: Sanitize content on read as defense in depth for shared documents
    return NextResponse.json({
      document: { ...document, content: sanitizeHtml(document.content) },
      expiresAt: share.expiresAt,
    })
  } catch (error) {
    logger.error(
      "Erro ao buscar documento compartilhado",
      {
        tokenFingerprint: params.token.slice(0, 12),
        action: "get_shared_document",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
