"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/src/lib/hooks/auth/use-auth"

export interface BlacklistedTrack {
  id: string
  name: string
  artist: string
  reason?: string
}

export interface BlacklistedArtist {
  id: string
  name: string
  reason?: string
}

export interface BlacklistInfo {
  tracks: BlacklistedTrack[]
  artists: BlacklistedArtist[]
  stats: {
    totalBlockedTracks: number
    totalBlockedArtists: number
  }
}

// Query keys
export const blacklistKeys = {
  all: ["blacklist"] as const,
  list: () => [...blacklistKeys.all, "list"] as const,
}

// API Functions
async function fetchBlacklist(): Promise<BlacklistInfo> {
  const response = await fetch("/api/music/blacklist")
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao buscar blacklist")
  }

  return data
}

async function addTrackToBlacklist(
  spotifyTrackId: string,
  trackName: string,
  artistName: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/music/blacklist/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spotifyTrackId,
      trackName,
      artistName,
      reason,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao adicionar track à blacklist")
  }

  return data
}

async function addArtistToBlacklist(
  spotifyArtistId: string,
  artistName: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/music/blacklist/artist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      spotifyArtistId,
      artistName,
      reason,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao adicionar artista à blacklist")
  }

  return data
}

async function removeTrackFromBlacklist(trackId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/music/blacklist/track/${trackId}`, {
    method: "DELETE",
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao remover track")
  }

  return data
}

async function removeArtistFromBlacklist(artistId: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/music/blacklist/artist/${artistId}`, {
    method: "DELETE",
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao remover artista")
  }

  return data
}

// Hooks
export function useBlacklist() {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: blacklistKeys.list(),
    queryFn: fetchBlacklist,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export function useAddTrackToBlacklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      spotifyTrackId,
      trackName,
      artistName,
      reason,
    }: {
      spotifyTrackId: string
      trackName: string
      artistName: string
      reason?: string
    }) => addTrackToBlacklist(spotifyTrackId, trackName, artistName, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKeys.list() })
    },
  })
}

export function useAddArtistToBlacklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      spotifyArtistId,
      artistName,
      reason,
    }: {
      spotifyArtistId: string
      artistName: string
      reason?: string
    }) => addArtistToBlacklist(spotifyArtistId, artistName, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKeys.list() })
    },
  })
}

export function useRemoveTrackFromBlacklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (trackId: string) => removeTrackFromBlacklist(trackId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKeys.list() })
    },
  })
}

export function useRemoveArtistFromBlacklistMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (artistId: string) => removeArtistFromBlacklist(artistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKeys.list() })
    },
  })
}

// Search tracks API function
async function searchTracks(query: string): Promise<{
  tracks: Array<{
    id: string
    name: string
    artists: Array<{ id: string; name: string }>
    album: {
      id: string
      name: string
      image: string | null
    }
    duration_ms: number
    explicit: boolean
    preview_url: string | null
    spotifyUrl: string
  }>
  total: number
}> {
  const params = new URLSearchParams({
    q: query,
    limit: "20",
  })

  const response = await fetch(`/api/music/tracks/search?${params}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao buscar músicas")
  }

  return data
}

// Hook for searching tracks
export function useTrackSearch(query: string) {
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ["trackSearch", query],
    queryFn: () => searchTracks(query),
    enabled: isAuthenticated && query.trim().length >= 2,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
