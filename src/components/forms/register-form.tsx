"use client"

import { Circle, Eye, EyeOff } from "lucide-react"
import type React from "react"
import { useId, useMemo, useState } from "react"
import { ThemeToggle } from "@/src/components/theme-toggle"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ErrorBanner } from "@/src/components/ui/error-banner"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { logger } from "@/src/lib/logger"
import { validateEmailFormat, validateStrongPassword } from "@/src/lib/validation/auth-validation"

interface RegisterFormProps {
  onRegister: () => void
  onSwitchToLogin: () => void
}

export function RegisterForm({ onRegister, onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const nameId = useId()
  const emailId = useId()
  const passwordId = useId()
  const confirmPasswordId = useId()
  const nameErrorId = useId()
  const emailErrorId = useId()
  const passwordErrorId = useId()
  const confirmPasswordErrorId = useId()
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  })

  const nameError = useMemo(() => {
    if (!name.trim()) return "Informe seu nome"
    return null
  }, [name])

  const emailError = useMemo(() => {
    if (!email.trim()) return "Informe seu email"
    return validateEmailFormat(email)
  }, [email])

  const passwordError = useMemo(() => {
    if (!password) return "Informe uma senha"
    const passwordErrors = validateStrongPassword(password)
    return passwordErrors.length > 0 ? passwordErrors[0] : null
  }, [password])

  const confirmPasswordError = useMemo(() => {
    if (!confirmPassword) return "Confirme sua senha"
    if (password !== confirmPassword) return "As senhas não conferem"
    return null
  }, [confirmPassword, password])

  const hasClientValidationErrors = Boolean(
    nameError || emailError || passwordError || confirmPasswordError
  )

  const passwordChecks = useMemo(
    () => [
      { label: "Pelo menos 8 caracteres", valid: password.length >= 8 },
      { label: "No máximo 64 caracteres", valid: password.length <= 64 },
      { label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
      { label: "Uma letra minúscula", valid: /[a-z]/.test(password) },
      { label: "Um número", valid: /[0-9]/.test(password) },
      { label: "Um caractere especial", valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  )

  const missingPasswordChecks = useMemo(
    () => passwordChecks.filter(check => !check.valid),
    [passwordChecks]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    })

    if (hasClientValidationErrors) {
      setError(nameError || emailError || passwordError || confirmPasswordError)
      return
    }

    setError(null)

    setIsLoading(true)

    try {
      const requestTimeoutMs = 15000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "A solicitação de cadastro demorou demais para responder. Tente novamente em instantes."
            )
          )
        }, requestTimeoutMs)
      })

      const registerRequestPromise = fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, callbackURL: "/" }),
      }).then(async res => {
        const payload = await res.json()
        return { data: payload.data, error: payload.error }
      })

      const { data, error } = await Promise.race([registerRequestPromise, timeoutPromise])

      logger.auth("info", "Signup response received", {
        hasData: Boolean(data),
        hasError: Boolean(error),
        hasUser: Boolean(data && "user" in data && data.user),
      })

      if (error) {
        setError(error.message || "Erro ao criar conta")
        return
      }

      if (!data) {
        setError("Não foi possível concluir o cadastro. Tente novamente.")
        return
      }

      if (data?.user) {
        // Check if email verification is required
        if (process.env.NODE_ENV === "production" && !data.user.emailVerified) {
          setNeedsVerification(true)
        } else {
          onRegister()
        }
        return
      }

      // Better Auth can return success without user payload (email enumeration protection)
      // In this case, show the same verification guidance to avoid silent UX.
      setNeedsVerification(true)
    } catch (err) {
      logger.auth("error", "Erro na criação de conta", {
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      setError(err instanceof Error ? err.message : "Erro ao criar conta")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="editorial-card w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 text-center">
          <span className="editorial-kicker">WriteSpace</span>
          <CardTitle className="editorial-title text-3xl font-semibold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            WriteSpace
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Crie sua conta para começar
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ErrorBanner error={error} />

          {needsVerification && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-lg bg-primary/10 p-4 text-sm text-primary"
            >
              <div className="font-semibold mb-2">📧 Verifique seu email</div>
              <p>
                Enviamos um link de verificação para <strong>{email}</strong>. Verifique sua caixa
                de entrada e clique no link para ativar sua conta.
              </p>
              <p className="mt-2 text-xs">
                Não recebeu o email? Verifique a pasta de spam ou tente criar a conta novamente.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={nameId}>Nome</Label>
              <Input
                id={nameId}
                name="name"
                type="text"
                placeholder="Seu nome completo"
                autoComplete="name"
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  if (error) setError(null)
                }}
                onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                aria-invalid={touched.name && Boolean(nameError)}
                aria-describedby={touched.name && nameError ? nameErrorId : undefined}
                disabled={isLoading}
              />
              {touched.name && nameError && (
                <p id={nameErrorId} className="text-xs text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={emailId}>Email</Label>
              <Input
                id={emailId}
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                aria-invalid={touched.email && Boolean(emailError)}
                aria-describedby={touched.email && emailError ? emailErrorId : undefined}
                disabled={isLoading}
              />
              {touched.email && emailError && (
                <p id={emailErrorId} className="text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={passwordId}>Senha</Label>
              <div className="relative">
                <Input
                  id={passwordId}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => {
                    setIsPasswordFocused(false)
                    setTouched(prev => ({ ...prev, password: true }))
                  }}
                  aria-invalid={touched.password && Boolean(passwordError)}
                  aria-describedby={touched.password && passwordError ? passwordErrorId : undefined}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {isPasswordFocused && missingPasswordChecks.length > 0 && (
                <div className="rounded-md border border-border/60 bg-background/70 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Ainda falta sua senha ter:
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {missingPasswordChecks.map(check => (
                      <li key={check.label} className="flex items-center gap-2 text-xs">
                        <Circle className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="text-muted-foreground">{check.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {touched.password && passwordError && (
                <p id={passwordErrorId} className="text-xs text-destructive">
                  {passwordError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={confirmPasswordId}>Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id={confirmPasswordId}
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, confirmPassword: true }))}
                  aria-invalid={touched.confirmPassword && Boolean(confirmPasswordError)}
                  aria-describedby={
                    touched.confirmPassword && confirmPasswordError
                      ? confirmPasswordErrorId
                      : undefined
                  }
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmacao de senha"
                      : "Mostrar confirmacao de senha"
                  }
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {touched.confirmPassword && confirmPasswordError && (
                <p id={confirmPasswordErrorId} className="text-xs text-destructive">
                  {confirmPasswordError}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={
                isLoading ||
                !email ||
                !password ||
                !name ||
                !confirmPassword ||
                hasClientValidationErrors
              }
              className="w-full bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Criando conta…" : "Criar Conta"}
            </Button>
          </form>

          <div className="text-center">
            <Button variant="link" onClick={onSwitchToLogin} disabled={isLoading}>
              Já tem uma conta? Faça login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
