"use client"

import { createAuthClient } from "better-auth/client"

// Detectar automaticamente a URL base - garantindo consistência entre localhost e 127.0.0.1
function getBaseURL(): string {
  // 1. Em produção (browser), detectar a origem atual
  if (typeof window !== "undefined") {
    // Usar a mesma origem do navegador para evitar problemas de CORS
    return window.location.origin
  }

  // 2. Se NEXT_PUBLIC_BETTER_AUTH_URL estiver definido, usar ele
  if (process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
    return process.env.NEXT_PUBLIC_BETTER_AUTH_URL
  }

  // 3. Fallback para desenvolvimento - usar 127.0.0.1 para consistência
  return "http://127.0.0.1:3000"
}

// Criar cliente do Better Auth
// IMPORTANTE: O baseURL deve ser o mesmo configurado no servidor
const baseURL = getBaseURL()

export const authClient = createAuthClient({
  baseURL,
  // Configurações de sessão para evitar refetches desnecessários que causam re-renders
  sessionOptions: {
    // Desabilitar refetch ao focar a janela - isso estava causando reloads
    refetchOnWindowFocus: false,
    // Não fazer polling automático (0 = desabilitado)
    refetchInterval: 0,
    // Não refetch quando offline
    refetchWhenOffline: false,
  },
})

// Exportar métodos e atoms individualmente para compatibilidade
export const { signIn, signUp, signOut, useSession, getSession } = authClient
