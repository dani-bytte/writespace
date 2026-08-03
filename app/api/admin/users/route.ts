import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { user } from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"

export async function GET() {
  let session = null

  try {
    // Check authentication and role
    session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as { role?: string }).role !== "dev") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // SECURITY: Select only safe fields, never expose passwords or sensitive data
    const users = await db
      .select({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // SECURITY: Never expose password, salt, or other sensitive fields
      })
      .from(user)

    return NextResponse.json({ users })
  } catch (error) {
    logger.api(
      "error",
      "Failed to fetch users",
      {
        action: "get_users",
        userId: session?.user?.id,
      },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Check authentication and role
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as { role?: string }).role !== "dev") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const { email, name, role } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create user invitation (actual user creation happens when they accept)
    // For now, just return success
    return NextResponse.json({
      message: "User invitation will be implemented",
      data: { email, name, role },
    })
  } catch (error) {
    logger.error(
      "Error creating user",
      { action: "create_user" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
