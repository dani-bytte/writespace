"use client"

import { useStore } from "@nanostores/react"
import { useMemo } from "react"
import { useSession as useSessionAtom } from "@/src/lib/auth-client"

/**
 * Hook centralizado para autenticação.
 * Encapsula a lógica de sessão do Better Auth e fornece uma interface estável.
 *
 * Benefícios:
 * - Evita múltiplas subscriptions ao mesmo átomo
 * - Fornece valores derivados estáveis (isAuthenticated, userId)
 * - Facilita testes e mocking
 * - Previne re-renders desnecessários com useMemo
 */
export function useAuth() {
  const sessionState = useStore(useSessionAtom)

  // Memoizar valores derivados para evitar re-renders
  // quando a referência do objeto session muda mas os valores não
  const authState = useMemo(() => {
    const session = sessionState.data
    const user = session?.user

    return {
      // Estado de loading
      isPending: sessionState.isPending,
      isLoading: sessionState.isPending, // alias

      // Dados da sessão
      session,
      user,

      // Valores derivados estáveis
      userId: user?.id ?? null,
      userEmail: user?.email ?? null,
      userName: user?.name ?? null,
      userRole: (user as { role?: string })?.role ?? "user",

      // Estado de autenticação
      isAuthenticated: Boolean(user?.id),
      isAdmin: (user as { role?: string })?.role === "dev",

      // Estado completo (para casos avançados)
      error: sessionState.error,
    }
  }, [sessionState.data, sessionState.isPending, sessionState.error])

  return authState
}

/**
 * Hook simplificado para verificar apenas se o usuário está autenticado.
 * Útil para guards e condicionais simples.
 */
export function useIsAuthenticated() {
  const { isAuthenticated, isPending } = useAuth()

  return useMemo(
    () => ({
      isAuthenticated,
      isPending,
      // Combinação comum: autenticado E não carregando
      isReady: !isPending && isAuthenticated,
    }),
    [isAuthenticated, isPending]
  )
}

/**
 * Hook para obter apenas o userId de forma estável.
 * Útil para hooks que precisam do userId como dependência.
 */
export function useUserId() {
  const { userId, isPending } = useAuth()

  return useMemo(
    () => ({
      userId,
      isPending,
      hasUserId: Boolean(userId),
    }),
    [userId, isPending]
  )
}

// Re-export do signOut para conveniência
export { getSession, signIn, signOut, signUp } from "@/src/lib/auth-client"
