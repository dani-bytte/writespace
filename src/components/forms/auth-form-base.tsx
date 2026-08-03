"use client"

import type React from "react"
import { AuthLayout } from "@/src/components/ui/auth-layout"
import { Button } from "@/src/components/ui/button"
import { ErrorBanner } from "@/src/components/ui/error-banner"
import { Separator } from "@/src/components/ui/separator"
import { useOAuth } from "@/src/lib/hooks/auth/use-oauth"

interface OAuthButtonProps {
  provider: "discord"
  isLoading: boolean
  onClick: () => void
}

function OAuthButton({ provider, isLoading, onClick }: OAuthButtonProps) {
  const icons = {
    discord: (
      <svg className="mr-2 size-4" viewBox="0 0 24 24" role="img" aria-label="Discord logo">
        <title>Discord</title>
        <path
          fill="currentColor"
          d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
        />
      </svg>
    ),
  }

  const labels = {
    discord: "Continuar com Discord",
  }

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={isLoading}
      className="w-full hover:bg-accent/20"
    >
      {icons[provider]}
      {labels[provider]}
    </Button>
  )
}

interface AuthFormBaseProps {
  description: string
  submitText: string
  switchText?: string
  error?: string | null
  isLoading: boolean
  onSubmit: (e: React.FormEvent) => void
  onSwitch?: () => void
  onAuth: () => void
  children: React.ReactNode
}

export function AuthFormBase({
  description,
  submitText,
  switchText,
  error,
  isLoading,
  onSubmit,
  onSwitch,
  onAuth,
  children,
}: AuthFormBaseProps) {
  const oauth = useOAuth(onAuth)

  return (
    <AuthLayout description={description}>
      <ErrorBanner error={error || oauth.error} />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {children}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {isLoading ? `${submitText.replace("ar", "ando")}…` : submitText}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <OAuthButton
          provider="discord"
          isLoading={oauth.isLoading}
          onClick={() => oauth.handleOAuthLogin("discord")}
        />
      </div>

      {onSwitch && switchText && (
        <div className="text-center">
          <Button variant="link" onClick={onSwitch} disabled={isLoading}>
            {switchText}
          </Button>
        </div>
      )}
    </AuthLayout>
  )
}
