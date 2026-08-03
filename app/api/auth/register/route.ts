import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/src/lib/auth"
import { validateEmailFormat, validateStrongPassword } from "@/src/lib/validation/auth-validation"

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome valido").max(100, "Nome muito longo"),
  email: z.string().trim().min(1, "Email e obrigatorio"),
  password: z.string().min(1, "Senha e obrigatoria"),
  callbackURL: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: { message: parsed.error.issues[0]?.message || "Dados invalidos" },
        },
        { status: 400 }
      )
    }

    const emailError = validateEmailFormat(parsed.data.email)
    if (emailError) {
      return NextResponse.json(
        {
          data: null,
          error: { message: emailError },
        },
        { status: 400 }
      )
    }

    const passwordErrors = validateStrongPassword(parsed.data.password)
    if (passwordErrors.length > 0) {
      return NextResponse.json(
        {
          data: null,
          error: { message: passwordErrors[0] },
          validationErrors: passwordErrors,
        },
        { status: 400 }
      )
    }

    const data = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email.trim().toLowerCase(),
        password: parsed.data.password,
        callbackURL: parsed.data.callbackURL || "/",
      },
      headers: await headers(),
    })

    return NextResponse.json({ data, error: null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar conta"
    return NextResponse.json({ data: null, error: { message } }, { status: 400 })
  }
}
