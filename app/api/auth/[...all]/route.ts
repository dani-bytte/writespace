import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/src/lib/auth"
import { validateEmailFormat, validateStrongPassword } from "@/src/lib/validation/auth-validation"

const handlers = toNextJsHandler(auth.handler)

export const GET = handlers.GET

export async function POST(request: Request) {
  const isSignUpEmailEndpoint = request.url.endsWith("/api/auth/sign-up/email")

  if (!isSignUpEmailEndpoint) {
    return handlers.POST(request)
  }

  const rawBody = await request.text()
  const contentType = request.headers.get("content-type") ?? ""

  let email = ""
  let password = ""

  try {
    if (contentType.includes("application/json")) {
      const parsedBody = JSON.parse(rawBody) as { email?: string; password?: string }
      email = parsedBody.email ?? ""
      password = parsedBody.password ?? ""
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const parsedBody = new URLSearchParams(rawBody)
      email = parsedBody.get("email") ?? ""
      password = parsedBody.get("password") ?? ""
    }
  } catch {
    return Response.json({ message: "Payload de cadastro invalido" }, { status: 400 })
  }

  const emailError = validateEmailFormat(email)
  if (emailError) {
    return Response.json({ message: emailError }, { status: 400 })
  }

  const passwordErrors = validateStrongPassword(password)
  if (passwordErrors.length > 0) {
    return Response.json(
      { message: passwordErrors[0], validationErrors: passwordErrors },
      { status: 400 }
    )
  }

  const forwardedRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: rawBody,
  })

  return handlers.POST(forwardedRequest)
}
