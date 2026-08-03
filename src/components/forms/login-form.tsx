"use client"

import { useId } from "react"
import { AuthFormBase } from "@/src/components/forms/auth-form-base"
import { FormField } from "@/src/components/ui/form-field"
import { useLoginForm } from "@/src/lib/hooks/auth/use-auth-form"

interface LoginFormProps {
  onLogin: () => void
  onSwitchToRegister?: () => void
}

export function LoginForm({ onLogin, onSwitchToRegister }: LoginFormProps) {
  const emailId = useId()
  const passwordId = useId()
  const loginForm = useLoginForm(onLogin)

  return (
    <AuthFormBase
      description="Entre na sua conta para continuar"
      submitText="Entrar"
      switchText={onSwitchToRegister ? "Não tem uma conta? Criar conta" : undefined}
      error={loginForm.submitError}
      isLoading={loginForm.isSubmitting}
      onSubmit={loginForm.handleSubmit}
      onSwitch={onSwitchToRegister}
      onAuth={onLogin}
    >
      <FormField
        id={emailId}
        label="Email"
        type="email"
        placeholder="seu@email.com"
        value={loginForm.values.email}
        onChange={value => loginForm.setValue("email", value)}
        disabled={loginForm.isSubmitting}
      />
      <FormField
        id={passwordId}
        label="Senha"
        type="password"
        placeholder="••••••••"
        value={loginForm.values.password}
        onChange={value => loginForm.setValue("password", value)}
        disabled={loginForm.isSubmitting}
      />
    </AuthFormBase>
  )
}
