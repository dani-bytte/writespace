import { and, asc, count, desc, eq, gte, ilike, lt, lte, or } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { db, documents } from "@/src/lib/db"
import { htmlToPlainText, isHtmlContent, sanitizeHtml } from "@/src/lib/html-utils"
import { logger } from "@/src/lib/logger"

const createDocumentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  content: z.string().default(""),
  contentType: z.enum(["rich", "plain"]).default("rich"),
})

// Schema for query parameters validation
const queryFiltersSchema = z.object({
  page: z.number().int().positive().max(1000).default(1),
  limit: z.number().int().positive().max(50).default(10),
  search: z.string().max(1000).default(""),
  sortBy: z.enum(["title", "createdAt", "updatedAt"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  sharedOnly: z.boolean().default(false),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
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

    // SECURITY: Validate all query parameters to prevent injection attacks
    let validatedParams: z.infer<typeof queryFiltersSchema>
    try {
      const rawParams = {
        page: Number.parseInt(url.searchParams.get("page") || "1", 10),
        limit: Number.parseInt(url.searchParams.get("limit") || "10", 10),
        search: url.searchParams.get("search") || "",
        sortBy: url.searchParams.get("sortBy") || "updatedAt",
        sortOrder: url.searchParams.get("sortOrder") || "desc",
        sharedOnly: url.searchParams.get("sharedOnly") === "true",
        dateFrom: url.searchParams.get("dateFrom") || undefined,
        dateTo: url.searchParams.get("dateTo") || undefined,
      }

      validatedParams = queryFiltersSchema.parse(rawParams)
    } catch (error) {
      return NextResponse.json(
        {
          error: "Parâmetros de consulta inválidos",
          details: error instanceof z.ZodError ? error.issues : "Invalid input",
        },
        { status: 400 }
      )
    }

    const { page, limit, search, sortBy, sortOrder, sharedOnly, dateFrom, dateTo } = validatedParams

    // Cursor pagination (not validated as it's internal)
    const cursor = url.searchParams.get("cursor")
    const useCursor = url.searchParams.get("pagination") === "cursor"

    // For traditional pagination
    const offset = (page - 1) * limit

    // Build search conditions (search in both title and plain text content)
    let searchConditions: ReturnType<typeof or> | undefined
    if (search) {
      // SECURITY: Sanitize search input to prevent wildcard injection
      const sanitizedSearch = search
        .replace(/[%_\\]/g, "\\$&") // Escape SQL LIKE wildcards
        .trim()

      if (sanitizedSearch.length < 2) {
        return NextResponse.json(
          {
            error: "Termo de busca deve ter pelo menos 2 caracteres",
          },
          { status: 400 }
        )
      }

      searchConditions = or(
        ilike(documents.title, `%${sanitizedSearch}%`),
        ilike(documents.plainTextContent, `%${sanitizedSearch}%`),
        ilike(documents.content, `%${sanitizedSearch}%`)
      )
    }

    // Build cursor conditions
    const cursorConditions =
      cursor && useCursor ? lt(documents.updatedAt, new Date(cursor)) : undefined

    // Build filter conditions with additional validation
    const dateConditions = []
    if (dateFrom) {
      // SECURITY: Additional date validation to prevent invalid date injection
      const fromDate = new Date(dateFrom)
      if (Number.isNaN(fromDate.getTime())) {
        return NextResponse.json({ error: "Data inicial inválida" }, { status: 400 })
      }
      dateConditions.push(gte(documents.createdAt, fromDate))
    }
    if (dateTo) {
      // SECURITY: Additional date validation
      const toDate = new Date(dateTo)
      if (Number.isNaN(toDate.getTime())) {
        return NextResponse.json({ error: "Data final inválida" }, { status: 400 })
      }
      toDate.setHours(23, 59, 59, 999) // Include the entire day
      dateConditions.push(lte(documents.createdAt, toDate))
    }

    // SECURITY: Validate date range logic
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return NextResponse.json(
        {
          error: "Data inicial deve ser anterior à data final",
        },
        { status: 400 }
      )
    }

    // Build sorting configuration
    const sortColumn =
      sortBy === "title"
        ? documents.title
        : sortBy === "createdAt"
          ? documents.createdAt
          : documents.updatedAt
    const sortDirection = sortOrder === "asc" ? asc : desc

    // SECURITY: Define safe document type without shareToken
    type SafeDocument = Omit<typeof documents.$inferSelect, "shareToken">
    let userDocuments: SafeDocument[]
    let totalCount: number
    let nextCursor: string | null = null

    // SECURITY: Always enforce user ownership - even devs should only see their own docs
    // If dev access is needed, implement separate admin endpoint
    const baseConditions = [
      eq(documents.userId, session.user.id),
      ...(sharedOnly ? [eq(documents.shared, true)] : []),
      ...dateConditions,
    ]

    // SECURITY: Log potentially suspicious activity
    if (search.length > 100 || limit > 25) {
      logger.warn("Suspicious query parameters detected", {
        userId: session.user.id,
        searchLength: search.length,
        limit,
        userAgent: request.headers.get("user-agent") || "unknown",
        ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
      })
    }

    // Combine all conditions
    const allConditions = [...baseConditions]
    if (searchConditions) allConditions.push(searchConditions)
    if (cursorConditions) allConditions.push(cursorConditions)

    const finalCondition = allConditions.length > 1 ? and(...allConditions) : allConditions[0]

    if (useCursor) {
      // Cursor-based pagination - more efficient for large datasets
      const baseQuery = db
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
          // SECURITY: shareToken deliberately omitted to prevent exposure
        })
        .from(documents)
        .where(finalCondition)

      userDocuments = await baseQuery.orderBy(sortDirection(sortColumn)).limit(limit + 1) // Get one extra to determine if there's a next page

      // Check if there's a next page
      if (userDocuments.length > limit) {
        userDocuments.pop() // Remove the extra item
        nextCursor = userDocuments[userDocuments.length - 1]?.updatedAt.toISOString() || null
      }

      // For cursor pagination, we don't need total count (expensive query)
      totalCount = -1 // Indicates cursor pagination
    } else {
      // Traditional offset pagination
      const baseQuery = db
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
          // SECURITY: shareToken deliberately omitted to prevent exposure
        })
        .from(documents)
        .where(finalCondition)

      const countQuery = db.select({ count: count() }).from(documents).where(finalCondition)

      // Execute queries in parallel for better performance
      const [documentsResult, countResult] = await Promise.all([
        baseQuery.orderBy(sortDirection(sortColumn)).limit(limit).offset(offset),
        countQuery,
      ])

      userDocuments = documentsResult
      const [{ count: total }] = countResult
      totalCount = total
    }

    const hasNextPage = useCursor ? nextCursor !== null : offset + limit < totalCount
    const hasPrevPage = useCursor ? !!cursor : page > 1

    const paginationInfo = useCursor
      ? {
          type: "cursor" as const,
          limit,
          hasNextPage,
          hasPrevPage,
          nextCursor,
          currentCursor: cursor,
        }
      : {
          type: "offset" as const,
          page,
          limit,
          total: totalCount,
          hasNextPage,
          hasPrevPage,
          totalPages: Math.ceil(totalCount / limit),
        }

    return NextResponse.json({
      documents: userDocuments,
      pagination: paginationInfo,
    })
  } catch (error) {
    logger.error(
      "Erro ao buscar documentos",
      {
        userId: session?.user?.id,
        action: "list_documents",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let session: any

  try {
    session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createDocumentSchema.parse(body)

    // SECURITY: Sanitize HTML content before persisting to prevent stored XSS
    const content =
      validatedData.contentType === "rich" && isHtmlContent(validatedData.content)
        ? sanitizeHtml(validatedData.content)
        : validatedData.content

    // Extract plain text content for search purposes
    const plainTextContent =
      validatedData.contentType === "rich" && isHtmlContent(content)
        ? htmlToPlainText(content)
        : content

    const [newDocument] = await db
      .insert(documents)
      .values({
        ...validatedData,
        content,
        plainTextContent,
        userId: session.user.id,
      })
      .returning()

    return NextResponse.json({ document: newDocument }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.issues }, { status: 400 })
    }

    logger.error(
      "Erro ao criar documento",
      {
        userId: session?.user?.id,
        action: "create_document",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
