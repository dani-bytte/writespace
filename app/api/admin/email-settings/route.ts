import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/lib/db"
import { emailSettings } from "@/src/lib/db/schema"
import { emailService } from "@/src/lib/email-service"
import { encrypt } from "@/src/lib/encryption"
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

    // Get email settings (exclude sensitive fields)
    const settings = await db
      .select({
        id: emailSettings.id,
        apiKey: emailSettings.apiKey,
        fromEmail: emailSettings.fromEmail,
        fromName: emailSettings.fromName,
        isActive: emailSettings.isActive,
        emailSubjectTemplate: emailSettings.emailSubjectTemplate,
        emailBodyTemplate: emailSettings.emailBodyTemplate,
        useCustomTemplate: emailSettings.useCustomTemplate,
        createdAt: emailSettings.createdAt,
        updatedAt: emailSettings.updatedAt,
        // SECURITY: Never expose apiKey to frontend
      })
      .from(emailSettings)
      .where(eq(emailSettings.id, "default"))
      .limit(1)

    return NextResponse.json({
      settings:
        settings.length > 0
          ? {
              id: settings[0].id,
              hasApiKey: Boolean(settings[0].apiKey),
              fromEmail: settings[0].fromEmail,
              fromName: settings[0].fromName,
              isActive: settings[0].isActive,
              emailSubjectTemplate: settings[0].emailSubjectTemplate,
              emailBodyTemplate: settings[0].emailBodyTemplate,
              useCustomTemplate: settings[0].useCustomTemplate,
              createdAt: settings[0].createdAt,
              updatedAt: settings[0].updatedAt,
            }
          : null,
    })
  } catch (error) {
    logger.error(
      "Error fetching email settings",
      { action: "get_email_settings" },
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

    const {
      apiKey,
      fromEmail,
      fromName,
      isActive,
      emailSubjectTemplate,
      emailBodyTemplate,
      useCustomTemplate,
    } = await request.json()

    if (!fromEmail || !fromName) {
      return NextResponse.json({ error: "From email and name are required" }, { status: 400 })
    }

    // Check if settings exist
    const existingSettings = await db
      .select({ id: emailSettings.id, apiKey: emailSettings.apiKey })
      .from(emailSettings)
      .where(eq(emailSettings.id, "default"))
      .limit(1)

    if (existingSettings.length > 0) {
      // Update existing settings
      const [updated] = await db
        .update(emailSettings)
        .set({
          ...(apiKey ? { apiKey: encrypt(apiKey) } : {}),
          fromEmail,
          fromName,
          isActive,
          emailSubjectTemplate,
          emailBodyTemplate,
          useCustomTemplate,
          updatedAt: new Date(),
        })
        .where(eq(emailSettings.id, "default"))
        .returning()

      // Filter sensitive data before sending response
      const filteredSettings = {
        id: updated.id,
        hasApiKey: Boolean(updated.apiKey),
        fromEmail: updated.fromEmail,
        fromName: updated.fromName,
        isActive: updated.isActive,
        emailSubjectTemplate: updated.emailSubjectTemplate,
        emailBodyTemplate: updated.emailBodyTemplate,
        useCustomTemplate: updated.useCustomTemplate,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        // SECURITY: Never return apiKey
      }

      return NextResponse.json({
        message: "Settings updated successfully",
        settings: filteredSettings,
      })
    } else {
      if (!apiKey) {
        return NextResponse.json({ error: "Resend API key is required" }, { status: 400 })
      }

      // Create new settings
      const [created] = await db
        .insert(emailSettings)
        .values({
          id: "default",
          apiKey: encrypt(apiKey), // Encrypt key
          fromEmail,
          fromName,
          isActive,
          emailSubjectTemplate,
          emailBodyTemplate,
          useCustomTemplate,
        })
        .returning()

      // Filter sensitive data before sending response
      const filteredSettings = {
        id: created.id,
        hasApiKey: Boolean(created.apiKey),
        fromEmail: created.fromEmail,
        fromName: created.fromName,
        isActive: created.isActive,
        emailSubjectTemplate: created.emailSubjectTemplate,
        emailBodyTemplate: created.emailBodyTemplate,
        useCustomTemplate: created.useCustomTemplate,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        // SECURITY: Never return apiKey
      }

      return NextResponse.json({
        message: "Settings created successfully",
        settings: filteredSettings,
      })
    }
  } catch (error) {
    logger.error(
      "Error saving email settings",
      { action: "save_email_settings" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(_request: Request) {
  try {
    // Check authentication and role
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user || (session.user as { role?: string }).role !== "dev") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    let body: any
    try {
      body = await _request.json()
    } catch (parseError) {
      logger.error(
        "Failed to parse request JSON",
        { action: "test_email" },
        parseError instanceof Error ? parseError : new Error(String(parseError))
      )
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { testEmail } = body

    if (!testEmail || typeof testEmail !== "string") {
      return NextResponse.json({ error: "Valid test email address is required" }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json({ error: "Invalid email address format" }, { status: 400 })
    }

    // Test email functionality
    try {
      logger.info("Starting email test", {
        testEmail,
        action: "test_email",
        securityEvent: true,
      })

      const result = await emailService.testConfiguration(testEmail)

      logger.info("Email test completed successfully", {
        testEmail,
        action: "test_email",
        securityEvent: true,
      })

      return NextResponse.json({
        message: "Email de teste enviado com sucesso via Resend",
        success: true,
        details: result,
      })
    } catch (emailError) {
      logger.error(
        "Email test failed",
        {
          testEmail,
          action: "test_email",
          securityEvent: true,
        },
        emailError instanceof Error ? emailError : new Error(String(emailError))
      )

      return NextResponse.json(
        {
          error: "Failed to send test email",
          message: emailError instanceof Error ? emailError.message : "Unknown error",
          success: false,
          details:
            emailError instanceof Error
              ? {
                  name: emailError.name,
                  message: emailError.message,
                  stack: process.env.NODE_ENV === "development" ? emailError.stack : undefined,
                }
              : null,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error(
      "Error testing email",
      { action: "test_email" },
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 })
  }
}
