import { and, eq, or, sql } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { accounts, db, documentShares, documents, userInvites, users } from "@/src/lib/db"
import { logger } from "@/src/lib/logger"

const querySchema = z.object({
  page: z.number().int().positive().max(1000).default(1),
  limit: z.number().int().positive().max(50).default(10),
})

export async function GET(request: NextRequest) {
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Parse and validate query parameters
    const url = new URL(request.url)

    let validatedParams: z.infer<typeof querySchema>
    try {
      const rawParams = {
        page: Number.parseInt(url.searchParams.get("page") || "1", 10),
        limit: Number.parseInt(url.searchParams.get("limit") || "10", 10),
      }

      validatedParams = querySchema.parse(rawParams)
    } catch (error) {
      return NextResponse.json(
        {
          error: "Parâmetros de consulta inválidos",
          details: error instanceof z.ZodError ? error.issues : "Invalid input",
        },
        { status: 400 }
      )
    }

    const { page, limit } = validatedParams
    const offset = (page - 1) * limit

    // Get user's Discord ID from accounts table if they have one
    const userDiscordAccount = await db
      .select({
        discordId: accounts.accountId,
      })
      .from(accounts)
      .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "discord")))
      .limit(1)

    const userDiscordId = userDiscordAccount[0]?.discordId || null

    // Query documents shared with current user via email invites (accepted)
    const invitedDocuments = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        plainTextContent: documents.plainTextContent,
        contentType: documents.contentType,
        userId: documents.userId,
        shared: documents.shared,
        sharedVia: documents.sharedVia,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        ownerName: users.name,
        ownerEmail: users.email,
        shareType: sql<string>`'invite'`,
        shareToken: userInvites.inviteToken,
      })
      .from(userInvites)
      .innerJoin(documents, eq(userInvites.documentId, documents.id))
      .innerJoin(users, eq(documents.userId, users.id))
      .where(and(eq(userInvites.email, session.user.email), eq(userInvites.status, "accepted")))

    // Query documents shared with current user via direct shares (email/discord)
    const directShares = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        plainTextContent: documents.plainTextContent,
        contentType: documents.contentType,
        userId: documents.userId,
        shared: documents.shared,
        sharedVia: documents.sharedVia,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        ownerName: users.name,
        ownerEmail: users.email,
        shareType: sql<string>`'direct'`,
        shareToken: documentShares.shareToken,
      })
      .from(documentShares)
      .innerJoin(documents, eq(documentShares.documentId, documents.id))
      .innerJoin(users, eq(documents.userId, users.id))
      .where(
        userDiscordId
          ? or(
              eq(documentShares.sharedWithEmail, session.user.email),
              eq(documentShares.sharedWithDiscordId, userDiscordId)
            )
          : eq(documentShares.sharedWithEmail, session.user.email)
      )

    // Combine and sort by updatedAt
    const allSharedDocs = [...invitedDocuments, ...directShares]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(offset, offset + limit)

    // For now, use simple count based on the results we already have
    const totalCount = [...invitedDocuments, ...directShares].length
    const hasNextPage = offset + limit < totalCount
    const hasPrevPage = page > 1

    return NextResponse.json({
      documents: allSharedDocs,
      pagination: {
        type: "offset" as const,
        page,
        limit,
        total: totalCount,
        hasNextPage,
        hasPrevPage,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    logger.error(
      "Erro ao buscar documentos compartilhados",
      {
        userId: session?.user?.id,
        action: "list_shared_documents",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
