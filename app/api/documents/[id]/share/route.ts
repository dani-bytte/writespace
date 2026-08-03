import { randomBytes } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { db, documentShares, documents } from "@/src/lib/db"
import { emailService } from "@/src/lib/email-service"
import { BETTER_AUTH_URL } from "@/src/lib/env"
import { logger } from "@/src/lib/logger"

const shareDocumentSchema = z.object({
  shareVia: z.enum(["email", "link"]),
  email: z.string().email().optional(),
  discordId: z.string().optional(),
  validationType: z.enum(["none", "email", "discord", "email_or_discord"]).default("none"),
  expiresIn: z.number().optional(), // dias até expirar
})

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = shareDocumentSchema.parse(body)

    // Verificar se o documento existe e pertence ao usuário
    const [document] = await db
      .select({
        id: documents.id,
        userId: documents.userId,
        title: documents.title,
        // SECURITY: Only select required fields for validation
      })
      .from(documents)
      .where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)))

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    // Generate unique share token with collision detection
    let shareToken: string
    let attempts = 0
    const maxAttempts = 5

    do {
      shareToken = randomBytes(32).toString("hex")
      attempts++

      // Check if token already exists
      const existingToken = await db
        .select({ id: documentShares.id })
        .from(documentShares)
        .where(eq(documentShares.shareToken, shareToken))
        .limit(1)

      if (existingToken.length === 0) {
        break // Token is unique
      }

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: "Falha ao gerar token único. Tente novamente." },
          { status: 500 }
        )
      }
    } while (attempts < maxAttempts)

    // Calcular data de expiração (se especificada)
    let expiresAt: Date | undefined
    if (validatedData.expiresIn) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + validatedData.expiresIn)
    }

    // Criar registro de compartilhamento
    const [_newShare] = await db
      .insert(documentShares)
      .values({
        documentId: params.id,
        sharedWithEmail: validatedData.email || null,
        sharedWithDiscordId: validatedData.discordId || null,
        shareToken,
        validationType: validatedData.validationType,
        expiresAt,
      })
      .returning()

    // Atualizar documento para marcar como compartilhado
    await db
      .update(documents)
      .set({
        shared: true,
        sharedVia: validatedData.shareVia,
        shareToken,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, params.id))

    // Gerar URL de compartilhamento
    const shareUrl = `${BETTER_AUTH_URL}/shared/${shareToken}`

    // Enviar email se for compartilhamento por email
    if (validatedData.shareVia === "email" && validatedData.email) {
      try {
        await emailService.sendInviteEmail({
          recipientEmail: validatedData.email,
          documentTitle: document.title,
          inviteToken: shareToken,
          inviterName: session.user.name || session.user.email,
          urlPath: "/shared",
        })
        logger.info("Invite email sent successfully", {
          userId: session.user.id,
          documentId: params.id,
          recipientEmail: validatedData.email,
          action: "send_document_invite",
        })
      } catch (emailError) {
        logger.error(
          "Failed to send invite email",
          {
            userId: session.user.id,
            documentId: params.id,
            recipientEmail: validatedData.email,
            action: "send_document_invite",
          },
          emailError instanceof Error ? emailError : new Error(String(emailError))
        )

        // Note: We don't fail the sharing process if email fails
        // The share link is still created and can be used
      }
    }

    // Log security event
    logger.securityEvent("Document shared", {
      userId: session.user.id,
      documentId: params.id,
      shareVia: validatedData.shareVia,
      sharedWithEmail: validatedData.email,
      expiresAt: expiresAt?.toISOString(),
    })

    return NextResponse.json({
      shareToken,
      shareUrl,
      expiresAt,
      message:
        validatedData.shareVia === "email"
          ? `Documento compartilhado e convite enviado para ${validatedData.email}`
          : "Documento compartilhado com sucesso",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 })
    }

    logger.error(
      "Erro ao compartilhar documento",
      {
        userId: session?.user?.id,
        documentId: params.id,
        action: "share_document",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // SECURITY: First verify document ownership before allowing deletion
    const [document] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)))

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    // Remover todos os compartilhamentos do documento
    await db.delete(documentShares).where(eq(documentShares.documentId, params.id))

    // Atualizar documento para marcar como não compartilhado
    const [updatedDocument] = await db
      .update(documents)
      .set({
        shared: false,
        sharedVia: null,
        shareToken: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, params.id))
      .returning()

    if (!updatedDocument) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ message: "Compartilhamento removido com sucesso" })
  } catch (error) {
    logger.error(
      "Erro ao remover compartilhamento",
      {
        userId: session?.user?.id,
        documentId: params.id,
        action: "unshare_document",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
