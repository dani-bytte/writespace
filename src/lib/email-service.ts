import { eq } from "drizzle-orm"
import { Resend } from "resend"
import { db } from "@/src/lib/db"
import { emailSettings } from "@/src/lib/db/schema"
import { decrypt } from "@/src/lib/encryption"
import { BETTER_AUTH_URL } from "@/src/lib/env"
import { logger } from "@/src/lib/logger"

interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  idempotencyKey?: string
}

interface InviteEmailData {
  recipientEmail: string
  documentTitle: string
  inviteToken: string
  inviterName?: string
  customMessage?: string
  /** URL path segment before the token. Defaults to '/invite'. Use '/shared' for document share links. */
  urlPath?: string
}

interface TestEmailData {
  recipientEmail: string
}

interface VerificationEmailData {
  recipientEmail: string
  verificationUrl: string
  userName?: string
}

class EmailService {
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g")
      result = result.replace(regex, value)
    }
    return result
  }

  private async getEmailSettings() {
    const settings = await db
      .select()
      .from(emailSettings)
      .where(eq(emailSettings.id, "default"))
      .limit(1)

    if (!settings.length || !settings[0].isActive) {
      throw new Error("No active email configuration found")
    }

    return settings[0]
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private isRetryable(error: any): boolean {
    if (!error) return false

    if (error.name === "AbortError" || error.name === "TimeoutError") return true

    const statusCode = error.statusCode || error.status || error.error?.statusCode
    if (statusCode) {
      return statusCode >= 500 || statusCode === 429
    }

    if (error.code === "ETIMEDOUT" || error.code === "ECONNRESET") return true

    return false
  }

  private async sendEmail(payload: EmailPayload) {
    const settings = await this.getEmailSettings()

    if (!settings.apiKey) {
      throw new Error("Resend API key not configured")
    }

    let apiKey: string
    try {
      apiKey = decrypt(settings.apiKey)
    } catch (error) {
      logger.error(
        "Failed to decrypt email provider credentials",
        { action: "decrypt_email_credentials" },
        error instanceof Error ? error : new Error(String(error))
      )
      throw new Error("Email provider credentials are invalid or unavailable")
    }

    const resend = new Resend(apiKey)
    const maxRetries = 3

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info(`Sending email via Resend (Attempt ${attempt + 1}/${maxRetries})`, {
          to: payload.to,
          subject: payload.subject,
          fromEmail: settings.fromEmail,
          securityEvent: true,
          idempotencyKey: payload.idempotencyKey,
        })

        const emailData: any = {
          from: `${settings.fromName} <${settings.fromEmail}>`,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }

        if (payload.idempotencyKey) {
          emailData.headers = {
            "Idempotency-Key": payload.idempotencyKey,
          }
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        let result: any
        try {
          const sendPromise = resend.emails.send(emailData)
          const timeoutPromise = new Promise((_, reject) => {
            const err = new Error("Email request timed out")
            err.name = "TimeoutError"
            controller.signal.addEventListener("abort", () => reject(err))
          })

          result = await Promise.race([sendPromise, timeoutPromise])
        } finally {
          clearTimeout(timeoutId)
        }

        if (result?.error) {
          const err = new Error(
            `Resend API error: ${result.error.message} (status ${result.error.name})`
          )
          ;(err as any).statusCode = result.error.statusCode || result.error.status
          throw err
        }

        return { success: true, messageId: result?.data?.id }
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1

        if (!this.isRetryable(error) || isLastAttempt) {
          logger.error(
            "Failed to send email via Resend",
            {
              to: payload.to,
              subject: payload.subject,
              attempt: attempt + 1,
              securityEvent: true,
            },
            error instanceof Error ? error : new Error(String(error))
          )
          throw error
        }

        // Exponential backoff with jitter
        const delay = Math.min(1000 * 2 ** attempt, 8000)
        const jitter = Math.random() * 1000
        logger.warn(
          `Email sending failed temporarily, retrying in ${Math.round(delay + jitter)}ms...`,
          { error: String(error) }
        )
        await this.sleep(delay + jitter)
      }
    }

    throw new Error("Failed to send email after multiple attempts")
  }

  async sendInviteEmail(data: InviteEmailData) {
    const settings = await this.getEmailSettings()
    const urlPath = data.urlPath ?? "/invite"
    const inviteUrl = `${BETTER_AUTH_URL}${urlPath}/${data.inviteToken}`

    // Deterministic idempotency key based on the business event
    const idempotencyKey = `invite-${data.inviteToken}`

    // Use custom template if enabled
    let subject: string
    let html: string

    if (settings.useCustomTemplate && settings.emailSubjectTemplate && settings.emailBodyTemplate) {
      // Replace variables in custom template
      subject = this.replaceVariables(settings.emailSubjectTemplate, {
        documentTitle: data.documentTitle,
        inviterName: data.inviterName || "",
        customMessage: data.customMessage || "",
      })

      html = this.replaceVariables(settings.emailBodyTemplate, {
        documentTitle: data.documentTitle,
        inviterName: data.inviterName || "",
        customMessage: data.customMessage || "",
        inviteUrl,
      })
    } else {
      // Use default template
      subject = `Convite para visualizar: ${data.documentTitle}`

      html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
        .custom-message { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✍️ WriteSpace</h1>
            <p>Você foi convidado para visualizar um documento</p>
        </div>

        <div class="content">
            <h2>Convite para: ${data.documentTitle}</h2>

            ${data.inviterName ? `<p><strong>Convidado por:</strong> ${data.inviterName}</p>` : ""}

            ${
              data.customMessage
                ? `
                <div class="custom-message">
                    <strong>Mensagem personalizada:</strong><br>
                    ${data.customMessage}
                </div>
            `
                : ""
            }

            <p>Clique no botão abaixo para acessar o documento:</p>

            <a href="${inviteUrl}" class="button">Visualizar Documento</a>

            <p>Ou copie e cole este link no seu navegador:</p>
            <p><code>${inviteUrl}</code></p>

            <p><strong>Importante:</strong> Este convite expira em 7 dias.</p>
        </div>

        <div class="footer">
            <p>Este é um email automático do WriteSpace. Se você não esperava este convite, pode ignorá-lo com segurança.</p>
            <p>© 2025 WriteSpace - Seu espaço para escrever</p>
        </div>
    </div>
</body>
</html>
    `
    }

    // Generate plain text version
    const text = `
WriteSpace - Convite para Documento

Você foi convidado para visualizar: ${data.documentTitle}

${data.inviterName ? `Convidado por: ${data.inviterName}\n` : ""}
${data.customMessage ? `Mensagem: ${data.customMessage}\n` : ""}

Link de acesso: ${inviteUrl}

Este convite expira em 7 dias.

Se você não esperava este convite, pode ignorá-lo com segurança.
    `

    return await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text,
      idempotencyKey,
    })
  }

  async sendTestEmail(data: TestEmailData) {
    const subject = "✅ Teste de Configuração de Email - WriteSpace"

    // UUID for the test email idempotency (generated once per call)
    const idempotencyKey = `test-${crypto.randomUUID()}`

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px 0; }
        .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ WriteSpace</h1>
            <p>Teste de Configuração de Email</p>
        </div>

        <div class="content">
            <div class="success">
                <strong>Sucesso!</strong> Sua configuração de email está funcionando corretamente.
            </div>

            <p>Este email foi enviado automaticamente pelo sistema WriteSpace para testar as configurações de email.</p>

            <p><strong>Data/Hora:</strong> ${new Date().toLocaleString("pt-BR")}</p>
            <p><strong>Provedor:</strong> Resend</p>

            <p>Se você recebeu este email, significa que:</p>
            <ul>
                <li>✅ A API key do Resend está correta</li>
                <li>✅ A conectividade está funcionando</li>
                <li>✅ O sistema está pronto para enviar convites</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `

    const text = `
WriteSpace - Teste de Email

Sucesso! Sua configuração de email está funcionando corretamente.

Data/Hora: ${new Date().toLocaleString("pt-BR")}
Provedor: Resend

Este email confirma que a configuração do Resend está funcionando e o sistema está pronto para enviar convites.
    `

    return await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text,
      idempotencyKey,
    })
  }

  async sendVerificationEmail(data: VerificationEmailData) {
    const subject = "Verifique seu email - WriteSpace"

    // Derive deterministic idempotency key from verification URL or use UUID fallback
    const verificationHash = Buffer.from(data.verificationUrl).toString("base64").substring(0, 20)
    const idempotencyKey = `verify-${data.recipientEmail}-${verificationHash}`

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✍️ WriteSpace</h1>
            <p>Verificação de Email</p>
        </div>

        <div class="content">
            <h2>Bem-vindo ao WriteSpace${data.userName ? `, ${data.userName}` : ""}!</h2>

            <p>Para completar seu cadastro e começar a usar o WriteSpace, você precisa verificar seu email.</p>

            <p>Clique no botão abaixo para verificar seu email:</p>

            <a href="${data.verificationUrl}" class="button">Verificar Email</a>

            <p>Ou copie e cole este link no seu navegador:</p>
            <p><code>${data.verificationUrl}</code></p>

            <p><strong>Importante:</strong> Este link expira em 24 horas por motivos de segurança.</p>
        </div>

        <div class="footer">
            <p>Se você não criou uma conta no WriteSpace, pode ignorar este email com segurança.</p>
            <p>© 2025 WriteSpace - Seu espaço para escrever</p>
        </div>
    </div>
</body>
</html>
    `

    const text = `
WriteSpace - Verificação de Email

Bem-vindo ao WriteSpace${data.userName ? `, ${data.userName}` : ""}!

Para completar seu cadastro, você precisa verificar seu email.

Link de verificação: ${data.verificationUrl}

Este link expira em 24 horas.

Se você não criou uma conta no WriteSpace, pode ignorar este email com segurança.
    `

    return await this.sendEmail({
      to: data.recipientEmail,
      subject,
      html,
      text,
      idempotencyKey,
    })
  }

  async testConfiguration(recipientEmail: string) {
    try {
      const result = await this.sendTestEmail({ recipientEmail })

      logger.info("Email test completed successfully", {
        recipientEmail,
        action: "test_email_config",
        securityEvent: true,
      })

      return { success: true, result }
    } catch (error) {
      logger.error(
        "Email test failed",
        {
          recipientEmail,
          action: "test_email_config",
          securityEvent: true,
        },
        error instanceof Error ? error : new Error(String(error))
      )

      throw error
    }
  }
}

export const emailService = new EmailService()
