"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Dashboard } from "@/src/components/dashboard"
import { LoginForm } from "@/src/components/forms/login-form"
import { RegisterForm } from "@/src/components/forms/register-form"
import { useAuth } from "@/src/lib/hooks/auth/use-auth"

export default function Home() {
  const { isAuthenticated, isPending } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect")
  const [isRegistering, setIsRegistering] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Check for redirect parameter when user logs in
  useEffect(() => {
    if (isAuthenticated && !isPending) {
      if (redirect) {
        // SECURITY: Validate redirect URL to prevent open redirect attacks
        try {
          const redirectUrl = new URL(redirect, window.location.origin)
          // Only allow redirects to the same origin
          if (redirectUrl.origin === window.location.origin) {
            router.replace(redirect)
          } else {
            console.warn("Blocked redirect to external origin:", redirectUrl.origin)
          }
        } catch (_error) {
          console.warn("Invalid redirect URL:", redirect)
        }
      }
    }
  }, [isAuthenticated, isPending, redirect, router])

  const handleLogin = () => {
    // Better Auth já atualiza a sessão automaticamente através do useSession hook
    // The useEffect above will handle redirecting to the intended page
  }

  const handleLogout = () => {
    // Better Auth já atualiza a sessão automaticamente através do useSession hook
    // Não é necessário fazer reload manual da página
  }

  const handleRegister = () => {
    // Better Auth já atualiza a sessão automaticamente através do useSession hook
    // Não é necessário fazer reload manual da página
  }

  if (!isMounted || isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted px-4">
        <div role="status" aria-live="polite" aria-atomic="true" className="text-center">
          <p className="editorial-kicker mb-2">WriteSpace</p>
          <div className="mx-auto mt-6 mb-3 size-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Carregando seu espaço…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : isRegistering ? (
        <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setIsRegistering(false)} />
      ) : (
        <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setIsRegistering(true)} />
      )}
    </>
  )
}
