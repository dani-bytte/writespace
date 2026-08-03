import { and, eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { db, documents } from "@/src/lib/db"
import { htmlToPlainText, isHtmlContent, sanitizeHtml } from "@/src/lib/html-utils"
import { logger } from "@/src/lib/logger"

const updateDocumentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").optional(),
  content: z.string().optional(),
  contentType: z.enum(["rich", "plain"]).optional(),
  shared: z.boolean().optional(),
  sharedVia: z.enum(["email", "link"]).nullable().optional(),
})

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const [document] = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        userId: documents.userId,
        shared: documents.shared,
        sharedVia: documents.sharedVia,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        // SECURITY: Never expose shareToken to frontend
      })
      .from(documents)
      .where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)))

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    logger.error(
      "Erro ao buscar documento",
      { documentId: params.id, action: "get_document" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const params = await context.params
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateDocumentSchema.parse(body)

    // SECURITY: Sanitize HTML content before persisting to prevent stored XSS
    const content =
      validatedData.content !== undefined &&
      (validatedData.contentType || "rich") === "rich" &&
      isHtmlContent(validatedData.content)
        ? sanitizeHtml(validatedData.content)
        : validatedData.content

    // If content is being updated, also update plain text content
    const updateData: any = {
      ...validatedData,
      ...(content !== undefined ? { content } : {}),
      updatedAt: new Date(),
    }

    if (content !== undefined) {
      const contentType = validatedData.contentType || "rich"
      updateData.plainTextContent =
        contentType === "rich" && isHtmlContent(content) ? htmlToPlainText(content) : content
    }

    const [updatedDocument] = await db
      .update(documents)
      .set(updateData)
      .where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)))
      .returning()

    if (!updatedDocument) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ document: updatedDocument })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 })
    }

    logger.error(
      "Erro ao atualizar documento",
      { documentId: params.id, action: "update_document" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const params = await context.params
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const [deletedDocument] = await db
      .delete(documents)
      .where(and(eq(documents.id, params.id), eq(documents.userId, session.user.id)))
      .returning()

    if (!deletedDocument) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ message: "Documento excluído com sucesso" })
  } catch (error) {
    logger.error(
      "Erro ao excluir documento",
      { documentId: params.id, action: "delete_document" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
