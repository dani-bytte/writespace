import { z } from "zod"

const emailSchema = z.email("Informe um email valido")

export function validateEmailFormat(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  const result = emailSchema.safeParse(normalized)
  return result.success ? null : "Informe um email valido"
}

export function validateStrongPassword(password: string): string[] {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("A senha deve ter pelo menos 8 caracteres")
  }

  if (password.length > 64) {
    errors.push("A senha deve ter no maximo 64 caracteres")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve incluir pelo menos uma letra maiuscula")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve incluir pelo menos uma letra minuscula")
  }

  if (!/[0-9]/.test(password)) {
    errors.push("A senha deve incluir pelo menos um numero")
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("A senha deve incluir pelo menos um caractere especial")
  }

  return errors
}
