"use client"

import { signIn } from "@/src/lib/auth-client"
import { useFormState } from "@/src/lib/hooks/ui/use-form-state"
import { logger } from "@/src/lib/logger"
import { validateEmailFormat, validateStrongPassword } from "@/src/lib/validation/auth-validation"

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export function useLoginForm(onSuccess: () => void) {
  const form = useFormState<LoginFormData>({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.values.email || !form.values.password) {
      form.setSubmitErrorMessage("Email e senha são obrigatórios")
      return
    }

    form.startSubmit()

    try {
      const { data, error } = await signIn.email({
        email: form.values.email,
        password: form.values.password,
      })

      if (error) {
        form.setSubmitErrorMessage(error.message || "Credenciais inválidas")
        return
      }

      if (data && "user" in data && data.user) {
        onSuccess()
      }
    } catch (err) {
      logger.auth("error", "Erro no login", {
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      form.setSubmitErrorMessage(err instanceof Error ? err.message : "Erro ao fazer login")
    } finally {
      form.endSubmit()
    }
  }

  return {
    ...form,
    handleSubmit,
  }
}

export function useRegisterForm(
  onSuccess: () => void,
  onVerificationNeeded: (email: string) => void
) {
  const form = useFormState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const validateForm = (): boolean => {
    form.clearAllErrors()
    let isValid = true

    if (!form.values.email || !form.values.password || !form.values.name) {
      form.setSubmitErrorMessage("Todos os campos são obrigatórios")
      isValid = false
    }

    const emailError = validateEmailFormat(form.values.email)
    if (emailError) {
      form.setFieldError("email", emailError)
      isValid = false
    }

    if (form.values.password !== form.values.confirmPassword) {
      form.setFieldError("confirmPassword", "As senhas não conferem")
      isValid = false
    }

    const passwordErrors = validateStrongPassword(form.values.password)
    if (passwordErrors.length > 0) {
      form.setFieldError("password", passwordErrors[0])
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    form.startSubmit()

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.values.email,
          password: form.values.password,
          name: form.values.name,
          callbackURL: "/",
        }),
      })
      const { data, error } = await res.json()

      logger.auth("info", "Signup response received", {
        hasData: Boolean(data),
        hasError: Boolean(error),
        hasUser: Boolean(data && "user" in data && data.user),
      })

      if (error) {
        form.setSubmitErrorMessage(error.message || "Erro ao criar conta")
        return
      }

      if (data?.user) {
        // Check if email verification is required
        if (process.env.NODE_ENV === "production" && !data.user.emailVerified) {
          onVerificationNeeded(form.values.email)
        } else {
          onSuccess()
        }
        return
      }

      // Better Auth can return success without user payload (email enumeration protection)
      // Preserve UX by showing verification-needed state instead of doing nothing.
      onVerificationNeeded(form.values.email)
    } catch (err) {
      logger.auth("error", "Erro na criação de conta", {
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      form.setSubmitErrorMessage(err instanceof Error ? err.message : "Erro ao criar conta")
    } finally {
      form.endSubmit()
    }
  }

  return {
    ...form,
    handleSubmit,
  }
}
