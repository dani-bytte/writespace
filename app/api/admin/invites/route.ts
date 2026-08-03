import { randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { documents, userInvites } from "@/src/lib/db/schema"
import { emailService } from "@/src/lib/email-service"
import { logger } from "@/src/lib/logger"

export async function GET() {
  try {
    // Check authentication and role
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as { role?: string }).role !== "dev") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // Get all invites with document information (exclude sensitive tokens)
    const invites = await db
      .select({
        id: userInvites.id,
        email: userInvites.email,
        documentId: userInvites.documentId,
        documentTitle: documents.title,
        status: userInvites.status,
        expiresAt: userInvites.expiresAt,
        createdAt: userInvites.createdAt,
        // SECURITY: Never expose inviteToken to frontend
      })
      .from(userInvites)
      .leftJoin(documents, eq(userInvites.documentId, documents.id))

    return NextResponse.json({ invites })
  } catch (error) {
    logger.error(
      "Error fetching invites",
      {
        action: "admin_get_invites",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  let email: string | undefined
  let documentId: string | undefined

  try {
    // Check authentication and role
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as { role?: string }).role !== "dev") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const requestData = await request.json()
    email = requestData.email
    documentId = requestData.documentId
    const message = requestData.message

    if (!email || !documentId) {
      return NextResponse.json({ error: "Email and document ID are required" }, { status: 400 })
    }

    // Verify document exists (only select needed fields)
    const document = await db
      .select({
        id: documents.id,
        title: documents.title,
        // SECURITY: Only select required fields
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1)

    if (!document || document.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Generate invite token
    const inviteToken = randomBytes(32).toString("hex")

    // Set expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invite record
    const [invite] = await db
      .insert(userInvites)
      .values({
        email,
        documentId,
        inviteToken,
        createdById: session.user.id,
        expiresAt,
      })
      .returning()

    // Send email invitation
    let emailSent = false
    let emailWarning: string | undefined
    try {
      await emailService.sendInviteEmail({
        recipientEmail: email,
        documentTitle: document[0].title,
        inviteToken,
        inviterName: session.user.name || undefined,
        customMessage: message || undefined,
      })

      emailSent = true
      logger.info("Invite email sent successfully", {
        email,
        documentTitle: document[0].title,
        message: message ? "Custom message provided" : "No custom message",
        action: "send_invite",
        securityEvent: true,
        // SECURITY: Never log inviteToken
      })
    } catch (emailError) {
      logger.error(
        "Failed to send invite email",
        {
          email,
          documentTitle: document[0].title,
          action: "send_invite_email",
          securityEvent: true,
        },
        emailError instanceof Error ? emailError : new Error(String(emailError))
      )

      emailWarning =
        "Convite criado, mas o email não pôde ser enviado. Verifique as configurações de email."
    }

    return NextResponse.json({
      message: emailSent ? "Convite enviado com sucesso" : "Convite criado, mas email não enviado",
      emailSent,
      ...(emailWarning && { warning: emailWarning }),
      invite: {
        id: invite.id,
        email: invite.email,
        documentTitle: document[0].title,
        status: invite.status,
      },
    })
  } catch (error) {
    logger.error(
      "Error sending invite",
      {
        email,
        documentId,
        action: "admin_send_invite",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
