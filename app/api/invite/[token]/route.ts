import { and, eq, gt, ilike } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { documents, user, userInvites } from "@/src/lib/db/schema"
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
  const token = params.token

  try {
    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
    }

    const invite = await db
      .select({
        id: userInvites.id,
        email: userInvites.email,
        documentId: userInvites.documentId,
        status: userInvites.status,
        expiresAt: userInvites.expiresAt,
        documentTitle: documents.title,
        documentContent: documents.content,
        createdByName: user.name,
        createdByEmail: user.email,
      })
      .from(userInvites)
      .leftJoin(documents, eq(userInvites.documentId, documents.id))
      .leftJoin(user, eq(userInvites.createdById, user.id))
      .where(eq(userInvites.inviteToken, token))
      .limit(1)

    if (!invite.length) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    const inviteData = invite[0]
    const isExpired = inviteData.expiresAt <= new Date()

    if (isExpired && inviteData.status === "pending") {
      await db
        .update(userInvites)
        .set({ status: "expired" })
        .where(and(eq(userInvites.inviteToken, token), eq(userInvites.status, "pending")))
    }

    if (
      isExpired ||
      inviteData.status !== "pending" ||
      inviteData.email.toLowerCase() !== session.user.email?.toLowerCase()
    ) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    return NextResponse.json({
      document: {
        title: inviteData.documentTitle,
        content: sanitizeHtml(inviteData.documentContent ?? ""),
        sharedBy: inviteData.createdByName,
        sharedByEmail:
          inviteData.email === inviteData.createdByEmail ? inviteData.createdByEmail : undefined,
      },
      invite: {
        email: inviteData.email,
        expiresAt: inviteData.expiresAt,
        status: inviteData.status,
      },
    })
  } catch (error) {
    logger.error(
      "Error accessing shared document",
      { action: "get_invite" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params
  const token = params.token

  try {
    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user) {
      return NextResponse.json({ error: "Autenticação necessária" }, { status: 401 })
    }

    const { action } = await request.json()
    if (action !== "accept") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const [invite] = await db
      .select({ email: userInvites.email, expiresAt: userInvites.expiresAt })
      .from(userInvites)
      .where(and(eq(userInvites.inviteToken, token), eq(userInvites.status, "pending")))
      .limit(1)

    if (
      !invite ||
      invite.expiresAt <= new Date() ||
      invite.email.toLowerCase() !== session.user.email?.toLowerCase()
    ) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    const [updatedInvite] = await db
      .update(userInvites)
      .set({ status: "accepted" })
      .where(
        and(
          eq(userInvites.inviteToken, token),
          eq(userInvites.status, "pending"),
          gt(userInvites.expiresAt, new Date()),
          ilike(userInvites.email, session.user.email.replace(/([%_])/g, "\\$1"))
        )
      )
      .returning({ id: userInvites.id })

    if (!updatedInvite) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 404 })
    }

    return NextResponse.json({ message: "Invite accepted successfully" })
  } catch (error) {
    logger.error(
      "Error processing invite action",
      { action: "process_invite_action" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
