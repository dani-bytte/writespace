"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { useAuth } from "@/src/lib/hooks/auth/use-auth"
import { isDisconnectInProgress, musicKeys, type SpotifyStatus } from "./use-music"

/**
 * Hook para forçar refresh de sessão Spotify logo após autenticação
 *
 * Problema: Quando o usuário faz OAuth com Spotify e é redirecionado para /music,
 * a sessão é criada no banco mas o cliente não atualiza seu cache React Query.
 *
 * Solução: Este hook detecta quando a sessão muda (OAuth completado) e:
 * 1. Limpa o cache do servidor via /api/music/refresh-cache
 * 2. Força refetch do status Spotify
 *
 * IMPORTANTE: Não faz refetch se:
 * - O status atual já está marcado como desconectado
 * - Uma desconexão está em progresso (evita race conditions)
 *
 * Uso: Colocar em um componente que é renderizado após o OAuth (ex: /music page)
 */
export function useSpotifySessionRefresh() {
  const queryClient = useQueryClient()
  const { session, isAuthenticated } = useAuth()
  const hasRefreshed = useRef(false)
  const lastSessionId = useRef<string | null>(null)

  useEffect(() => {
    // Detectar mudança de sessão (novo login)
    const sessionId = session?.session?.id
    const isNewSession = sessionId && sessionId !== lastSessionId.current

    // Quando autenticação é confirmada e é uma nova sessão
    if (isAuthenticated && session && isNewSession && !hasRefreshed.current) {
      hasRefreshed.current = true
      lastSessionId.current = sessionId

      // Verificar se uma desconexão está em progresso
      if (isDisconnectInProgress()) {
        return
      }

      // Verificar se o status atual já está desconectado
      const currentStatus = queryClient.getQueryData<SpotifyStatus>(musicKeys.status())
      if (currentStatus?.connected === false) {
        return
      }

      // 1. Primeiro limpar cache do servidor
      fetch("/api/music/refresh-cache", { method: "POST" })
        .then(() => {
          // Verificar novamente se desconexão começou enquanto esperávamos
          if (isDisconnectInProgress()) {
            return Promise.resolve()
          }

          return queryClient.refetchQueries({
            queryKey: musicKeys.status(),
          })
        })
        .catch(err => {
          console.error("[useSpotifySessionRefresh] Erro ao refresh:", err)
        })
    }

    // Reset flag quando deslogar
    if (!isAuthenticated) {
      hasRefreshed.current = false
      lastSessionId.current = null
    }
  }, [isAuthenticated, session, queryClient])
}
