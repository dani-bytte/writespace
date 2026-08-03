"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { useAuth, useUserId } from "@/src/lib/hooks/auth/use-auth"

// Types
export interface SpotifyProfile {
  id: string
  displayName: string
  email: string
  image: string | null
  spotifyUrl: string
}

export interface SpotifyStatus {
  connected: boolean
  profile: SpotifyProfile | null
  restricted?: boolean
  restrictionCode?: string
  restrictionMessage?: string
}

export interface SpotifyTrackUI {
  id: string
  name: string
  artists: { id: string; name: string }[]
  album: {
    id: string
    name: string
    image: string | null
  }
  duration_ms: number
  popularity: number
  previewUrl: string | null
  explicit?: boolean
  spotifyUrl: string
  uri: string
}

export interface SpotifyArtistUI {
  id: string
  name: string
  genres: string[]
  image: string | null
  popularity: number
  spotifyUrl: string
}

export interface MusicAnalysis {
  genres: string[]
  mood: string
  description: string
  recommendations: string[]
}

export interface TopTracksResponse {
  tracks: SpotifyTrackUI[]
  artists: SpotifyArtistUI[]
  timeRange: string
  timeRangeLabel: string
  total: number
  analysis: MusicAnalysis | null
}

export interface GeneratedPlaylist {
  tracks: SpotifyTrackUI[]
  seeds: { artists?: string[]; tracks?: string[] }
  nameSuggestions: string[]
  refinement: {
    wasRefined: boolean
    removedTracks?: {
      name: string
      artists: string[]
      reason: string
      originalTrack?: string
    }[]
    suggestions?: string
  }
  meta: {
    type: string
    requestedSize: number
    actualSize: number
    includeRecommendations: boolean
  }
}

export interface CreatedPlaylist {
  id: string
  name: string
  description: string | null
  trackCount: number
  spotifyUrl: string
  uri: string
  image: string | null
}

export interface PlaylistHistory {
  id: string
  name: string
  description: string | null
  spotifyPlaylistId: string | null
  spotifyPlaylistUrl: string | null
  trackCount: number
  generationType: string
  wasRefined: boolean
  status: string
  createdAt: string
}

// Query keys
export const musicKeys = {
  all: ["music"] as const,
  status: () => [...musicKeys.all, "status"] as const,
  topTracks: (timeRange?: string) => [...musicKeys.all, "top-tracks", { timeRange }] as const,
  artistSearch: (query: string) => [...musicKeys.all, "artist-search", query] as const,
  history: () => [...musicKeys.all, "history"] as const,
}

// API Functions
async function fetchSpotifyStatus(): Promise<SpotifyStatus> {
  const response = await fetch("/api/music/status")

  let data: unknown
  try {
    data = await response.json()
  } catch (_jsonError) {
    const text = await response.text()
    console.error("Resposta não é JSON válido:", {
      status: response.status,
      text: text.substring(0, 200),
    })
    throw new Error(`Erro na resposta do servidor: ${response.status}`)
  }

  if (!response.ok) {
    const errorData = data as { error?: string }
    throw new Error(errorData.error || "Erro ao verificar status do Spotify")
  }

  return data as SpotifyStatus
}

async function fetchTopTracks(
  userId: string,
  timeRange = "medium_term",
  includeAnalysis = false
): Promise<TopTracksResponse> {
  // Check local cache first
  const cacheKey = `writespace:music:top-tracks:${userId}:${timeRange}`
  const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data as TopTracksResponse
      }
    }
  } catch (e) {
    // Ignore cache errors
    console.warn("Failed to read from cache", e)
  }

  const url = new URL("/api/music/top-tracks", window.location.origin)
  url.searchParams.set("timeRange", timeRange)
  url.searchParams.set("includeAnalysis", includeAnalysis.toString())

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao buscar músicas")
  }

  // Save to cache
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    )
  } catch (e) {
    console.warn("Failed to save to cache", e)
  }

  return data
}

async function searchArtists(
  query: string
): Promise<{ artists: SpotifyArtistUI[]; total: number }> {
  if (!query.trim()) {
    return { artists: [], total: 0 }
  }

  const url = new URL("/api/music/artists/search", window.location.origin)
  url.searchParams.set("q", query.trim())

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao buscar artistas")
  }

  return data
}

async function enqueuePlaylistGeneration(params: {
  type: "top-tracks" | "artist-mix" | "discovery" | "hybrid"
  timeRange?: string
  artistIds?: string[]
  playlistSize?: number
  includeRecommendations?: boolean
  refineWithGemini?: boolean
  excludeStoredTracks?: boolean
  topTracksRatio?: number
}): Promise<{ status: string; jobId: string; estimatedWaitTime: string }> {
  const response = await fetch("/api/music/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  let data: { status: string; jobId: string; estimatedWaitTime: string; error?: string }
  try {
    data = await response.json()
  } catch (_jsonError) {
    const text = await response.text()
    console.error("Resposta não é JSON válido:", {
      status: response.status,
      contentType: response.headers.get("content-type"),
      text: text.substring(0, 200),
    })
    throw new Error(`Erro na resposta do servidor: ${response.status}`)
  }

  if (!response.ok) {
    throw new Error(data.error || `Erro ao enfileirar playlist (${response.status})`)
  }

  return data
}

async function pollPlaylistGeneration(
  jobId: string,
  onProgress?: (status: { status: string; progress?: number; result?: GeneratedPlaylist }) => void
): Promise<GeneratedPlaylist> {
  let attempts = 0
  const maxAttempts = 120 * 6 // 2 horas em polling a cada 10 segundos
  const pollInterval = 10000 // 10 segundos

  return new Promise((resolve, reject) => {
    const pollFn = async () => {
      try {
        const response = await fetch(`/api/music/generate/${jobId}`)
        const data = await response.json()

        // Chamar callback de progresso
        if (onProgress) {
          onProgress(data)
        }

        if (data.status === "completed") {
          clearInterval(intervalId)
          resolve(data.result)
          return
        }

        if (data.status === "failed") {
          clearInterval(intervalId)
          reject(new Error(data.error || "Falha na geração da playlist"))
          return
        }

        // Continuar polling
        attempts++
        if (attempts >= maxAttempts) {
          clearInterval(intervalId)
          reject(new Error("Timeout na geração da playlist (2 horas excedidas)"))
        }
      } catch (error) {
        clearInterval(intervalId)
        reject(error)
      }
    }

    // Poll imediatamente e depois em intervalos
    pollFn()
    const intervalId = setInterval(pollFn, pollInterval)
  })
}

async function generatePlaylist(params: {
  type: "top-tracks" | "artist-mix" | "discovery" | "hybrid"
  timeRange?: string
  artistIds?: string[]
  playlistSize?: number
  includeRecommendations?: boolean
  refineWithGemini?: boolean
  excludeStoredTracks?: boolean
  topTracksRatio?: number
  onProgress?: (status: { status: string; progress?: number; result?: GeneratedPlaylist }) => void
}): Promise<GeneratedPlaylist> {
  // Enfileirar a geração
  const { jobId } = await enqueuePlaylistGeneration(params)

  // Fazer polling até completar
  return pollPlaylistGeneration(jobId, params.onProgress)
}

async function createPlaylist(params: {
  name: string
  description?: string
  trackUris: string[]
  isPublic?: boolean
  generationType?: "top-tracks" | "artist-mix" | "custom" | "discovery"
  seedArtists?: string[]
  seedTracks?: string[]
  wasRefined?: boolean
  removedDuplicates?: { name: string; reason: string }[]
}): Promise<{ success: boolean; playlist: CreatedPlaylist; historyId: string }> {
  const response = await fetch("/api/music/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao criar playlist")
  }

  return data
}

async function fetchPlaylistHistory(): Promise<{ playlists: PlaylistHistory[] }> {
  const response = await fetch("/api/music/history")
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao buscar histórico")
  }

  return data
}

// Hooks

/**
 * Hook para verificar status da conexão com Spotify
 *
 * IMPORTANTE: Agressivo em refetch após OAuth para detectar conexão imediatamente
 */
export function useSpotifyStatus() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: musicKeys.status(),
    queryFn: fetchSpotifyStatus,
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 segundos (reduzido de 10 min para detectar mudanças rápidas)
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true, // ATIVADO: Refetch quando volta para a janela
    refetchOnMount: true, // ATIVADO: Refetch quando componente monta (essencial após OAuth)
    refetchOnReconnect: true, // ATIVADO: Refetch ao reconectar internet
  })
}

/**
 * Hook para buscar top tracks do usuário
 */
export function useTopTracks(timeRange = "medium_term", includeAnalysis = false) {
  const { userId, hasUserId } = useUserId()

  return useQuery({
    queryKey: musicKeys.topTracks(timeRange),
    queryFn: () => {
      // Usar a variável do closure para evitar dependência instável
      if (!userId) throw new Error("User ID not found")
      return fetchTopTracks(userId, timeRange, includeAnalysis)
    },
    enabled: hasUserId,
    staleTime: 60 * 60 * 1000, // 1 hora (aumentado)
    gcTime: 24 * 60 * 60 * 1000, // 24 horas em cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })
}

/**
 * Hook para buscar artistas
 */
export function useArtistSearch(query: string) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: musicKeys.artistSearch(query),
    queryFn: () => searchArtists(query),
    enabled: isAuthenticated && query.trim().length >= 2,
    staleTime: 10 * 60 * 1000, // 10 minutos - resultados de busca são estáveis
    gcTime: 30 * 60 * 1000, // 30 minutos em cache
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook para gerar playlist (com polling)
 */
export function useGeneratePlaylistMutation() {
  return useMutation({
    mutationFn: (params: Parameters<typeof generatePlaylist>[0]) => generatePlaylist(params),
    onError: error => {
      console.error("[useGeneratePlaylistMutation] Playlist generation failed:", error)
    },
  })
}

/**
 * Hook para criar playlist no Spotify
 */
export function useCreatePlaylistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPlaylist,
    onSuccess: () => {
      // Invalidar histórico para mostrar a nova playlist
      queryClient.invalidateQueries({ queryKey: musicKeys.history() })
    },
  })
}

async function deletePlaylist(
  historyId: string,
  deleteFromSpotify = true
): Promise<{
  success: boolean
  deleted: { fromHistory: boolean; fromSpotify: boolean }
  message: string
}> {
  const url = `/api/music/history/${historyId}${deleteFromSpotify ? "?spotify=true" : ""}`

  const response = await fetch(url, {
    method: "DELETE",
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao deletar playlist")
  }

  return data
}

/**
 * Hook para deletar playlist do histórico e opcionalmente do Spotify
 */
export function useDeletePlaylistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      historyId,
      deleteFromSpotify = true,
    }: {
      historyId: string
      deleteFromSpotify?: boolean
    }) => deletePlaylist(historyId, deleteFromSpotify),
    onSuccess: () => {
      // Invalidar histórico para atualizar a lista
      queryClient.invalidateQueries({ queryKey: musicKeys.history() })
    },
  })
}

/**
 * Hook para buscar histórico de playlists
 */
export function usePlaylistHistory() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: musicKeys.history(),
    queryFn: fetchPlaylistHistory,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutos (aumentado)
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  })
}

// Flag global para indicar que uma desconexão está em progresso
// Usado para prevenir race conditions com outros hooks que fazem refetch
let disconnectInProgress = false

export function isDisconnectInProgress() {
  return disconnectInProgress
}

/**
 * Hook para desconectar conta Spotify
 */
export function useDisconnectSpotifyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      // Marcar que desconexão está em progresso
      disconnectInProgress = true

      const response = await fetch("/api/music/disconnect", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        disconnectInProgress = false
        throw new Error(data.error || "Erro ao desconectar Spotify")
      }

      return data
    },
    onSuccess: async () => {
      // 1. Cancelar qualquer query em andamento para evitar race conditions
      await queryClient.cancelQueries({ queryKey: musicKeys.all })

      // 2. Limpar cache local do localStorage
      try {
        const keysToRemove = Object.keys(localStorage).filter(key =>
          key.startsWith("writespace:music:")
        )
        for (const key of keysToRemove) {
          localStorage.removeItem(key)
        }
      } catch (e) {
        console.warn("Erro ao limpar cache local", e)
      }

      // 3. Atualizar o status para desconectado IMEDIATAMENTE
      queryClient.setQueryData<SpotifyStatus>(musicKeys.status(), {
        connected: false,
        profile: null,
      })

      // 4. Remover outras queries de música do cache para evitar dados stale
      queryClient.removeQueries({ queryKey: musicKeys.topTracks() })
      queryClient.removeQueries({ queryKey: musicKeys.history() })

      // Manter flag ativa por um curto período para garantir que outros hooks não sobrescrevam
      setTimeout(() => {
        disconnectInProgress = false
      }, 2000)
    },
    onError: () => {
      disconnectInProgress = false
    },
  })
}

/**
 * Hook para monitorar status de um job de geração de playlist
 */
export function usePlaylistJobStatus(jobId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["music", "job", jobId] as const,
    queryFn: async () => {
      if (!jobId) throw new Error("Job ID is required")

      const response = await fetch(`/api/music/generate/${jobId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao verificar status do job")
      }

      return data
    },
    enabled: enabled && !!jobId,
    refetchInterval: query => {
      // Se completado ou falhado, parar de fazer polling
      const data = query.state.data
      if (data?.status === "completed" || data?.status === "failed") {
        return false
      }
      // Fazer polling a cada 5 segundos enquanto estiver em progresso
      return 5000
    },
    staleTime: 0, // Sempre considerar como stale para refetch imediato
  })
}

/**
 * Hook para cancelar um job de geração de playlist
 */
export function useCancelPlaylistJobMutation() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/music/generate/${jobId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao cancelar job")
      }

      return data
    },
  })
}

/**
 * Hook para pré-carregar dados do perfil (top tracks)
 * Otimizado para evitar re-execuções desnecessárias
 */
export function usePrefetchProfile() {
  const queryClient = useQueryClient()
  const { userId } = useUserId()

  useEffect(() => {
    if (!userId) return

    const timeRanges = ["short_term", "medium_term", "long_term"] as const

    for (const range of timeRanges) {
      // Prefetch tracks without analysis first for speed
      queryClient.prefetchQuery({
        queryKey: musicKeys.topTracks(range),
        queryFn: () => {
          return fetchTopTracks(userId, range, false)
        },
        staleTime: 30 * 60 * 1000,
      })
    }
  }, [userId, queryClient])
}
