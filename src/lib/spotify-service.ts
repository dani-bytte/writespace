import { eq } from "drizzle-orm"
import { db } from "@/src/lib/db"
import {
  account,
  generatedPlaylists,
  spotifyArtistBlacklist,
  spotifyTrackBlacklist,
} from "@/src/lib/db/schema"
import { logger } from "@/src/lib/logger"

// Spotify API Types
export interface SpotifyTrack {
  id: string
  name: string
  artists: { id: string; name: string }[]
  album: {
    id: string
    name: string
    images: { url: string; height: number; width: number }[]
  }
  duration_ms: number
  popularity: number
  preview_url: string | null
  explicit?: boolean
  external_urls: { spotify: string }
  uri: string
}

export interface SpotifyArtist {
  id: string
  name: string
  genres: string[]
  images: { url: string; height: number; width: number }[]
  popularity: number
  external_urls: { spotify: string }
  uri: string
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string | null
  external_urls: { spotify: string }
  images: { url: string }[]
  tracks: { total: number }
  uri: string
}

export interface TopTracksResponse {
  items: SpotifyTrack[]
  total: number
  limit: number
  offset: number
}

export interface TopArtistsResponse {
  items: SpotifyArtist[]
  total: number
  limit: number
  offset: number
}

export interface RecommendationsResponse {
  tracks: SpotifyTrack[]
  seeds: {
    id: string
    type: "ARTIST" | "TRACK" | "GENRE"
    initialPoolSize: number
    afterFilteringSize: number
    afterRelinkingSize: number
  }[]
}

export interface SearchArtistsResponse {
  artists: {
    items: SpotifyArtist[]
    total: number
    limit: number
    offset: number
  }
}

export interface SearchTracksResponse {
  tracks: {
    items: SpotifyTrack[]
    total: number
    limit: number
    offset: number
  }
}

// Álbum simplificado retornado pela API de álbuns do artista
export interface SpotifyAlbumSimplified {
  id: string
  name: string
  album_type: "album" | "single" | "compilation"
  release_date: string
  total_tracks: number
  images: { url: string; height: number; width: number }[]
  external_urls: { spotify: string }
  uri: string
}

// Resposta da API de álbuns do artista
export interface SpotifyAlbumsResponse {
  items: SpotifyAlbumSimplified[]
  total: number
  limit: number
  offset: number
  next: string | null
}

// Track simplificada retornada pela API de tracks do álbum
export interface SpotifyAlbumTrack {
  id: string
  name: string
  artists: { id: string; name: string }[]
  duration_ms: number
  track_number: number
  explicit?: boolean
  external_urls: { spotify: string }
  uri: string
}

// Resposta da API de tracks do álbum
export interface SpotifyAlbumTracksResponse {
  items: SpotifyAlbumTrack[]
  total: number
  limit: number
  offset: number
  next: string | null
}

export interface SpotifyUser {
  id: string
  display_name: string
  email: string
  images: { url: string }[]
  external_urls: { spotify: string }
}

type TimeRange = "short_term" | "medium_term" | "long_term"

// Cache simples em memória para conexões verificadas
// Evita chamadas repetidas ao banco para verificar isConnected
interface ConnectionCache {
  isConnected: boolean
  profile: SpotifyUser | null
  expiresAt: number
}

const connectionCache = new Map<string, ConnectionCache>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export const SPOTIFY_OWNER_PREMIUM_REQUIRED_CODE = "SPOTIFY_OWNER_PREMIUM_REQUIRED"

function isOwnerPremiumRequiredError(errorText: string): boolean {
  return /active premium subscription required for the owner of the app/i.test(errorText)
}

class SpotifyService {
  private readonly baseUrl = "https://api.spotify.com/v1"

  /**
   * Limpa o cache de conexão de um usuário
   * Deve ser chamado quando o usuário desconecta ou reconecta
   */
  clearConnectionCache(userId: string): void {
    connectionCache.delete(userId)
  }

  /**
   * Limpa todo o cache de conexões (útil para testes)
   */
  clearAllCache(): void {
    connectionCache.clear()
  }

  /**
   * Busca o access token do Spotify para um usuário
   * O Better Auth salva automaticamente na tabela account
   */
  private async getAccessToken(userId: string): Promise<string | null> {
    try {
      const spotifyAccount = await db
        .select()
        .from(account)
        .where(eq(account.userId, userId))
        .then(accounts => accounts.find(acc => acc.providerId === "spotify"))

      if (!spotifyAccount?.accessToken) {
        logger.warn("Spotify account not connected", { userId })
        return null
      }

      // Verificar se o token expirou
      if (spotifyAccount.accessTokenExpiresAt) {
        const expiresAt = new Date(spotifyAccount.accessTokenExpiresAt)
        if (expiresAt < new Date()) {
          // Token expirado - tentar refresh
          const newToken = await this.refreshAccessToken(userId, spotifyAccount.refreshToken)
          return newToken
        }
      }

      return spotifyAccount.accessToken
    } catch (error) {
      logger.error("Failed to get Spotify access token", { userId }, error as Error)
      return null
    }
  }

  /**
   * Renova o access token usando o refresh token
   */
  private async refreshAccessToken(
    userId: string,
    refreshToken: string | null
  ): Promise<string | null> {
    if (!refreshToken) {
      logger.error("No refresh token available", { userId })
      return null
    }

    try {
      const clientId = process.env.SPOTIFY_CLIENT_ID
      const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        logger.error("Spotify credentials not configured")
        return null
      }

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        logger.error("Failed to refresh Spotify token", { userId, error, status: response.status })

        // Se for 400 Bad Request com "invalid_grant", o refresh token está expirado
        if (response.status === 400 && error.error === "invalid_grant") {
          logger.warn("Refresh token expired or invalid, need to reconnect Spotify", { userId })
          // Limpar a conexão para forçar reconexão
          await db
            .delete(account)
            .where(eq(account.userId, userId) && eq(account.providerId, "spotify"))
          this.clearConnectionCache(userId)
        }

        return null
      }

      const data = await response.json()

      // Atualizar token no banco
      await db
        .update(account)
        .set({
          accessToken: data.access_token,
          accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
          ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
        })
        .where(eq(account.userId, userId))

      logger.info("Spotify token refreshed successfully", { userId })
      this.clearConnectionCache(userId) // Limpar cache para usar novo token
      return data.access_token
    } catch (error) {
      logger.error("Error refreshing Spotify token", { userId }, error as Error)
      return null
    }
  }

  /**
   * Faz uma requisição autenticada para a API do Spotify
   */
  private async spotifyFetch<T>(
    userId: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T | null> {
    const accessToken = await this.getAccessToken(userId)
    if (!accessToken) {
      // Limpar cache pois a conexão não é mais válida
      this.clearConnectionCache(userId)
      throw new Error(
        "Spotify não conectado. Por favor, reconecte sua conta Spotify no painel de configurações."
      )
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()

      if (response.status === 401) {
        logger.error("Spotify API error", { endpoint, status: response.status, error })
        // Token inválido - limpar cache e forçar reconexão
        this.clearConnectionCache(userId)
        throw new Error("Sessão do Spotify expirada. Por favor, reconecte sua conta Spotify.")
      }

      if (response.status === 403) {
        if (isOwnerPremiumRequiredError(error)) {
          logger.warn("Spotify blocked: app owner premium required", {
            endpoint,
            status: response.status,
          })

          throw new Error(
            `[${SPOTIFY_OWNER_PREMIUM_REQUIRED_CODE}] A integracao com Spotify esta temporariamente indisponivel: a conta dona do app precisa de assinatura Premium ativa.`
          )
        }

        logger.error("Spotify API error", { endpoint, status: response.status, error })
        throw new Error(
          "Acesso negado pelo Spotify. Verifique se você deu as permissões necessárias."
        )
      }

      if (response.status === 429) {
        const retryAfter = Number.parseInt(response.headers.get("Retry-After") || "60", 10)
        logger.warn("Spotify rate limit hit", { userId, retryAfter })

        // Ao invés de fazer retry, retornar erro informativo
        throw new Error(
          `Limite de requisições do Spotify atingido. Tente novamente em ${retryAfter} segundos.`
        )
      }

      logger.error("Spotify API error", { endpoint, status: response.status, error })

      throw new Error(
        `Erro na API do Spotify (${response.status}): ${error || "Erro desconhecido"}`
      )
    }

    return response.json()
  }

  /**
   * Garante que o usuário está conectado e lança erro se não estiver.
   * Ideal para usar em rotas de API.
   */
  async ensureConnection(userId: string): Promise<void> {
    const isConnected = await this.isConnected(userId)
    if (!isConnected) {
      throw new Error("Spotify não conectado. Por favor, conecte sua conta Spotify.")
    }
  }

  /**
   * Verifica se o usuário tem conta Spotify conectada
   * Usa cache em memória para evitar chamadas repetidas ao banco
   */
  async isConnected(userId: string): Promise<boolean> {
    // Verificar cache primeiro
    const cached = connectionCache.get(userId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.isConnected
    }

    try {
      const spotifyAccount = await db
        .select()
        .from(account)
        .where(eq(account.userId, userId))
        .then(accounts => accounts.find(acc => acc.providerId === "spotify"))

      const isConnected = Boolean(spotifyAccount?.accessToken)

      // Salvar no cache
      connectionCache.set(userId, {
        isConnected,
        profile: null, // Será preenchido quando getProfile for chamado
        expiresAt: Date.now() + CACHE_TTL,
      })

      return isConnected
    } catch (error) {
      logger.error("Error checking Spotify connection", { userId }, error as Error)
      return false
    }
  }

  /**
   * Busca informações do perfil do usuário no Spotify
   * Usa cache para evitar chamadas repetidas
   */
  async getProfile(userId: string): Promise<SpotifyUser | null> {
    // Verificar cache primeiro
    const cached = connectionCache.get(userId)
    if (cached?.profile && cached.expiresAt > Date.now()) {
      return cached.profile
    }

    const profile = await this.spotifyFetch<SpotifyUser>(userId, "/me")

    // Atualizar cache com o perfil
    if (profile) {
      const existingCache = connectionCache.get(userId)
      connectionCache.set(userId, {
        isConnected: true,
        profile,
        expiresAt: existingCache?.expiresAt || Date.now() + CACHE_TTL,
      })
    }

    return profile
  }

  /**
   * Busca as músicas mais ouvidas do usuário
   * @param timeRange - short_term (4 semanas), medium_term (6 meses), long_term (vários anos)
   */
  async getTopTracks(
    userId: string,
    timeRange: TimeRange = "medium_term",
    limit = 50,
    offset = 0
  ): Promise<TopTracksResponse | null> {
    const params = new URLSearchParams({
      time_range: timeRange,
      limit: Math.min(limit, 50).toString(),
      offset: offset.toString(),
    })

    return this.spotifyFetch<TopTracksResponse>(userId, `/me/top/tracks?${params}`)
  }

  /**
   * Busca os artistas mais ouvidos do usuário
   */
  async getTopArtists(
    userId: string,
    timeRange: TimeRange = "medium_term",
    limit = 50,
    offset = 0
  ): Promise<TopArtistsResponse | null> {
    const params = new URLSearchParams({
      time_range: timeRange,
      limit: Math.min(limit, 50).toString(),
      offset: offset.toString(),
    })

    return this.spotifyFetch<TopArtistsResponse>(userId, `/me/top/artists?${params}`)
  }

  /**
   * Gera recomendações baseadas em artistas (usando top tracks dos artistas)
   * Substituição para o endpoint /recommendations que foi descontinuado
   * Nota: /related-artists também foi descontinuado, então usamos apenas top tracks
   */
  async getRecommendationsAlternative(
    userId: string,
    options: {
      seedArtists?: string[]
      seedTracks?: string[]
      limit?: number
    }
  ): Promise<{ tracks: SpotifyTrack[] } | null> {
    const { seedArtists = [], seedTracks = [], limit = 30 } = options

    const tracks: SpotifyTrack[] = []
    const usedTrackIds = new Set<string>()

    // Se tiver seed artists, buscar top tracks de cada um
    // Aumentar o número de tracks buscadas por artista para garantir que conseguiremos o limite
    if (seedArtists.length > 0) {
      // Calcular tracks por artista: pedir mais do que o necessário para compensar duplicatas
      const tracksPerArtist = Math.max(50, Math.ceil(limit / Math.max(1, seedArtists.length)) * 2)

      for (const artistId of seedArtists) {
        try {
          const artistTracks = await this.getArtistTopTracks(userId, artistId)
          if (artistTracks?.tracks) {
            for (const track of artistTracks.tracks.slice(0, tracksPerArtist)) {
              if (!usedTrackIds.has(track.id) && tracks.length < limit) {
                tracks.push(track)
                usedTrackIds.add(track.id)
              }
            }
          }
        } catch (error) {
          logger.warn("Error fetching artist top tracks", { artistId, error })
        }
      }
    }

    // Se tiver seed tracks, extrair os artistas e buscar mais músicas deles
    if (seedTracks.length > 0 && tracks.length < limit) {
      for (const trackId of seedTracks.slice(0, 5)) {
        try {
          const trackInfo = await this.spotifyFetch<SpotifyTrack>(userId, `/tracks/${trackId}`)
          if (trackInfo?.artists?.[0]) {
            const artistId = trackInfo.artists[0].id
            const artistTracks = await this.getArtistTopTracks(userId, artistId)
            if (artistTracks?.tracks) {
              // Pedir mais tracks para garantir que conseguiremos preencher
              const neededTracks = limit - tracks.length + 20
              for (const track of artistTracks.tracks.slice(0, neededTracks)) {
                if (!usedTrackIds.has(track.id) && tracks.length < limit) {
                  tracks.push(track)
                  usedTrackIds.add(track.id)
                }
              }
            }
          }
        } catch (error) {
          logger.warn("Error fetching track info", { trackId, error })
        }
      }
    }

    // Embaralhar para variar a ordem
    const shuffled = tracks.sort(() => Math.random() - 0.5)

    return { tracks: shuffled.slice(0, limit) }
  }

  /**
   * @deprecated O endpoint /recommendations foi descontinuado pelo Spotify em nov/2024
   * Use getRecommendationsAlternative em vez disso
   */
  async getRecommendations(
    userId: string,
    options: {
      seedArtists?: string[]
      seedTracks?: string[]
      seedGenres?: string[]
      limit?: number
      targetEnergy?: number
      targetDanceability?: number
      targetPopularity?: number
    }
  ): Promise<RecommendationsResponse | null> {
    const { seedArtists = [], seedTracks = [], seedGenres = [], limit = 50 } = options

    // Verificar limite de 5 seeds
    const totalSeeds = seedArtists.length + seedTracks.length + seedGenres.length
    if (totalSeeds === 0) {
      throw new Error("Pelo menos uma seed (artista, track ou gênero) é necessária")
    }
    if (totalSeeds > 5) {
      throw new Error("Máximo de 5 seeds permitidas no total")
    }

    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
    })

    if (seedArtists.length > 0) {
      params.set("seed_artists", seedArtists.join(","))
    }
    if (seedTracks.length > 0) {
      params.set("seed_tracks", seedTracks.join(","))
    }
    if (seedGenres.length > 0) {
      params.set("seed_genres", seedGenres.join(","))
    }

    // Parâmetros opcionais de ajuste
    if (options.targetEnergy !== undefined) {
      params.set("target_energy", options.targetEnergy.toString())
    }
    if (options.targetDanceability !== undefined) {
      params.set("target_danceability", options.targetDanceability.toString())
    }
    if (options.targetPopularity !== undefined) {
      params.set("target_popularity", options.targetPopularity.toString())
    }

    return this.spotifyFetch<RecommendationsResponse>(userId, `/recommendations?${params}`)
  }

  /**
   * Busca as top tracks de um artista específico
   */
  async getArtistTopTracks(
    userId: string,
    artistId: string,
    market = "BR"
  ): Promise<{ tracks: SpotifyTrack[] } | null> {
    return this.spotifyFetch<{ tracks: SpotifyTrack[] }>(
      userId,
      `/artists/${artistId}/top-tracks?market=${market}`
    )
  }

  /**
   * Busca os álbuns de um artista
   * @param includeGroups - Tipos de álbuns a incluir (album, single, compilation, appears_on)
   */
  async getArtistAlbums(
    userId: string,
    artistId: string,
    options: {
      includeGroups?: ("album" | "single" | "compilation" | "appears_on")[]
      limit?: number
      offset?: number
      market?: string
    } = {}
  ): Promise<SpotifyAlbumsResponse | null> {
    const { includeGroups = ["album", "single"], limit = 50, offset = 0, market = "BR" } = options

    const params = new URLSearchParams({
      include_groups: includeGroups.join(","),
      limit: limit.toString(),
      offset: offset.toString(),
      market,
    })

    return this.spotifyFetch<SpotifyAlbumsResponse>(userId, `/artists/${artistId}/albums?${params}`)
  }

  /**
   * Busca as tracks de um álbum específico
   */
  async getAlbumTracks(
    userId: string,
    albumId: string,
    options: { limit?: number; offset?: number; market?: string } = {}
  ): Promise<SpotifyAlbumTracksResponse | null> {
    const { limit = 50, offset = 0, market = "BR" } = options

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      market,
    })

    return this.spotifyFetch<SpotifyAlbumTracksResponse>(
      userId,
      `/albums/${albumId}/tracks?${params}`
    )
  }

  /**
   * Busca todas as tracks de um artista (top tracks + álbuns)
   * Permite obter muito mais músicas do que apenas as 10 top tracks
   *
   * @param targetCount - Número alvo de músicas a retornar
   * @returns Array de SpotifyTrack com todas as músicas encontradas
   */
  async getArtistAllTracks(
    userId: string,
    artistId: string,
    targetCount = 50
  ): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = []
    const usedTrackIds = new Set<string>()

    // 1. Primeiro, buscar top tracks (mais populares)
    const topTracks = await this.getArtistTopTracks(userId, artistId)
    if (topTracks?.tracks) {
      for (const track of topTracks.tracks) {
        if (!usedTrackIds.has(track.id)) {
          tracks.push(track)
          usedTrackIds.add(track.id)
        }
      }
    }

    // Se já tem o suficiente, retornar
    if (tracks.length >= targetCount) {
      return tracks.slice(0, targetCount)
    }

    // 2. Buscar álbuns do artista (priorizando álbuns completos, depois singles)
    const albums = await this.getArtistAlbums(userId, artistId, {
      includeGroups: ["album", "single"],
      limit: 20, // Limitar a 20 álbuns para não sobrecarregar
    })

    if (!albums?.items?.length) {
      return tracks
    }

    // Ordenar: albums primeiro, depois singles, por data de lançamento (mais recentes primeiro)
    const sortedAlbums = albums.items.sort((a, b) => {
      // Albums antes de singles
      if (a.album_type === "album" && b.album_type !== "album") return -1
      if (a.album_type !== "album" && b.album_type === "album") return 1
      // Mais recentes primeiro
      return b.release_date.localeCompare(a.release_date)
    })

    // 3. Buscar tracks de cada álbum até atingir o target
    for (const album of sortedAlbums) {
      if (tracks.length >= targetCount) break

      try {
        const albumTracks = await this.getAlbumTracks(userId, album.id)
        if (albumTracks?.items) {
          for (const albumTrack of albumTracks.items) {
            if (tracks.length >= targetCount) break
            if (usedTrackIds.has(albumTrack.id)) continue

            // Verificar se o artista principal é o artista que estamos buscando
            const isMainArtist = albumTrack.artists.some(a => a.id === artistId)
            if (!isMainArtist) continue

            // Converter SpotifyAlbumTrack para SpotifyTrack
            const fullTrack: SpotifyTrack = {
              id: albumTrack.id,
              name: albumTrack.name,
              artists: albumTrack.artists,
              album: {
                id: album.id,
                name: album.name,
                images: album.images,
              },
              duration_ms: albumTrack.duration_ms,
              popularity: 50, // Valor padrão já que não temos essa info na track simplificada
              preview_url: null,
              explicit: albumTrack.explicit,
              external_urls: albumTrack.external_urls,
              uri: albumTrack.uri,
            }

            tracks.push(fullTrack)
            usedTrackIds.add(albumTrack.id)
          }
        }
      } catch (error) {
        logger.warn("Error fetching album tracks", {
          albumId: album.id,
          error: error instanceof Error ? error.message : "Unknown",
        })
      }
    }

    return tracks
  }

  /**
   * Busca artistas pelo nome
   */
  async searchArtists(
    userId: string,
    query: string,
    limit = 10
  ): Promise<SearchArtistsResponse | null> {
    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: limit.toString(),
    })

    return this.spotifyFetch<SearchArtistsResponse>(userId, `/search?${params}`)
  }

  /**
   * Busca músicas pelo nome
   */
  async searchTracks(
    userId: string,
    query: string,
    limit = 20
  ): Promise<SearchTracksResponse | null> {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: limit.toString(),
      market: "BR",
    })

    return this.spotifyFetch<SearchTracksResponse>(userId, `/search?${params}`)
  }

  /**
   * Cria uma nova playlist no Spotify do usuário
   */
  async createPlaylist(
    userId: string,
    name: string,
    description?: string,
    isPublic = true
  ): Promise<SpotifyPlaylist | null> {
    // Primeiro, buscar o spotify user ID
    const profile = await this.getProfile(userId)
    if (!profile) {
      throw new Error("Não foi possível obter o perfil do Spotify")
    }

    return this.spotifyFetch<SpotifyPlaylist>(userId, `/users/${profile.id}/playlists`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description:
          description ||
          `Playlist criada pelo WriteSpace em ${new Date().toLocaleDateString("pt-BR")}`,
        public: isPublic,
      }),
    })
  }

  /**
   * Adiciona músicas a uma playlist existente
   */
  async addTracksToPlaylist(
    userId: string,
    playlistId: string,
    trackUris: string[]
  ): Promise<{ snapshot_id: string } | null> {
    // Spotify permite adicionar até 100 tracks por vez
    const chunks = []
    for (let i = 0; i < trackUris.length; i += 100) {
      chunks.push(trackUris.slice(i, i + 100))
    }

    let snapshotId = ""

    for (const chunk of chunks) {
      const result = await this.spotifyFetch<{ snapshot_id: string }>(
        userId,
        `/playlists/${playlistId}/tracks`,
        {
          method: "POST",
          body: JSON.stringify({ uris: chunk }),
        }
      )

      if (result) {
        snapshotId = result.snapshot_id
      }
    }

    return { snapshot_id: snapshotId }
  }

  /**
   * Cria uma playlist completa (cria e adiciona as músicas)
   */
  async createPlaylistWithTracks(
    userId: string,
    name: string,
    trackUris: string[],
    description?: string,
    isPublic = true
  ): Promise<SpotifyPlaylist | null> {
    // Criar a playlist
    const playlist = await this.createPlaylist(userId, name, description, isPublic)
    if (!playlist) {
      throw new Error("Não foi possível criar a playlist")
    }

    // Adicionar as músicas
    if (trackUris.length > 0) {
      await this.addTracksToPlaylist(userId, playlist.id, trackUris)
    }

    logger.info("Playlist created successfully", {
      userId,
      playlistId: playlist.id,
      trackCount: trackUris.length,
    })

    return playlist
  }

  /**
   * Remove/deixa de seguir uma playlist do Spotify
   * Nota: O Spotify não permite deletar playlists permanentemente.
   * Esta função "unfollow" remove a playlist da biblioteca do usuário.
   */
  async unfollowPlaylist(userId: string, playlistId: string): Promise<boolean> {
    try {
      await this.spotifyFetch(userId, `/playlists/${playlistId}/followers`, {
        method: "DELETE",
      })

      logger.info("Playlist unfollowed successfully", {
        userId,
        playlistId,
      })

      return true
    } catch (error) {
      logger.error("Failed to unfollow playlist", { userId, playlistId }, error as Error)
      return false
    }
  }

  /**
   * Gera uma playlist baseada nas top tracks do usuário (otimizado)
   */
  async generatePlaylistFromTopTracks(
    userId: string,
    options: {
      timeRange?: TimeRange
      playlistSize?: number
      includeRecommendations?: boolean
      excludeStoredTracks?: boolean
    } = {}
  ): Promise<{
    tracks: SpotifyTrack[]
    seeds: { artists: string[]; tracks: string[] }
  }> {
    const {
      timeRange = "medium_term",
      playlistSize = 30,
      includeRecommendations = true,
      excludeStoredTracks = true,
    } = options

    // Paralelizar: buscar top tracks (2 páginas), tracks armazenadas e blacklist
    const [
      topTracksPage1,
      topTracksPage2,
      storedTrackIds,
      blacklistedTrackIds,
      blacklistedArtistIds,
    ] = await Promise.all([
      this.getTopTracks(userId, timeRange, 50, 0),
      this.getTopTracks(userId, timeRange, 50, 50),
      excludeStoredTracks ? this.getStoredUserTracks(userId) : Promise.resolve(new Set<string>()),
      this.getUserTrackBlacklist(userId),
      this.getUserArtistBlacklist(userId),
    ])

    const allTopTracks = [...(topTracksPage1?.items ?? []), ...(topTracksPage2?.items ?? [])]

    if (allTopTracks.length === 0) {
      throw new Error("Nenhuma música encontrada no seu histórico")
    }

    const tracks: SpotifyTrack[] = []
    const usedTrackIds = new Set<string>()
    let remaining = playlistSize

    // Métricas de debug para entender perdas de faixas
    const metrics = {
      stage1: {
        added: 0,
        skippedDuplicate: 0,
        skippedStored: 0,
        skippedBlacklist: 0,
      },
      stage2: {
        added: 0,
        skippedDuplicate: 0,
        skippedStored: 0,
        skippedBlacklist: 0,
      },
      fallbackAdded: 0,
      recommendationsRequested: 0,
      recommendationsReceived: 0,
      totals: {
        topTracks: allTopTracks.length,
        stored: storedTrackIds.size,
        blacklistedTracks: blacklistedTrackIds.size,
        blacklistedArtists: blacklistedArtistIds.size,
      },
    }

    // Etapa 1: Preencher com top tracks - break quando atinge o limite
    for (const track of allTopTracks) {
      if (remaining <= 0) break
      // Verificar blacklist de tracks e artistas
      const isBlacklisted =
        blacklistedTrackIds.has(track.id) || track.artists.some(a => blacklistedArtistIds.has(a.id))
      const isDuplicate = usedTrackIds.has(track.id)
      const isStored = storedTrackIds.has(track.id)

      if (!isDuplicate && !isStored && !isBlacklisted) {
        tracks.push(track)
        usedTrackIds.add(track.id)
        remaining--
        metrics.stage1.added++
      } else {
        if (isDuplicate) metrics.stage1.skippedDuplicate++
        else if (isStored) metrics.stage1.skippedStored++
        else if (isBlacklisted) metrics.stage1.skippedBlacklist++
      }
    }

    // Etapa 2: Se precisa de recomendações
    if (remaining > 0 && includeRecommendations) {
      const seedArtists = [...new Set(allTopTracks.flatMap(t => t.artists.map(a => a.id)))].slice(
        0,
        5
      )

      metrics.recommendationsRequested = remaining + 20
      const recommendations = await this.getRecommendationsAlternative(userId, {
        seedArtists,
        limit: metrics.recommendationsRequested,
      })

      if (recommendations) {
        metrics.recommendationsReceived = recommendations.tracks.length
        for (const track of recommendations.tracks) {
          if (remaining <= 0) break
          // Verificar blacklist
          const isBlacklisted =
            blacklistedTrackIds.has(track.id) ||
            track.artists.some(a => blacklistedArtistIds.has(a.id))
          const isDuplicate = usedTrackIds.has(track.id)
          const isStored = storedTrackIds.has(track.id)

          if (!isDuplicate && !isStored && !isBlacklisted) {
            tracks.push(track)
            usedTrackIds.add(track.id)
            remaining--
            metrics.stage2.added++
          } else {
            if (isDuplicate) metrics.stage2.skippedDuplicate++
            else if (isStored) metrics.stage2.skippedStored++
            else if (isBlacklisted) metrics.stage2.skippedBlacklist++
          }
        }
      }
    }

    // Etapa 3: Fallback - completar com top tracks mesmo que repetidas
    if (remaining > 0) {
      for (const track of allTopTracks) {
        if (remaining <= 0) break
        const isBlacklisted =
          blacklistedTrackIds.has(track.id) ||
          track.artists.some(a => blacklistedArtistIds.has(a.id))
        if (!usedTrackIds.has(track.id) && !isBlacklisted) {
          tracks.push(track)
          usedTrackIds.add(track.id)
          remaining--
          metrics.fallbackAdded++
        }
      }
    }

    // Extrair seeds uma única vez
    const seedArtistsFinal = [...new Set(tracks.slice(0, 5).flatMap(t => t.artists.map(a => a.id)))]

    // Log detalhado para diagnosticar perdas de tamanho de playlist
    logger.info("generatePlaylistFromTopTracks.debug", {
      userId,
      timeRange,
      requestedSize: playlistSize,
      finalSize: tracks.length,
      remaining,
      includeRecommendations,
      excludeStoredTracks,
      metrics,
    })

    return {
      tracks,
      seeds: {
        artists: seedArtistsFinal,
        tracks: allTopTracks.slice(0, 5).map(t => t.id),
      },
    }
  }

  /**
   * Padrões regex para identificar versões/variações de músicas
   * Usados para normalizar nomes e detectar duplicatas semânticas
   */
  private readonly VERSION_PATTERNS = [
    // Remixes e edits
    /\s*[-–—]\s*(Remix|Club Mix|Radio Edit|Extended|Extended Mix|Dub Mix|VIP Mix)/i,
    /\s*\((Remix|Club Mix|Radio Edit|Extended|Extended Mix|Dub Mix|VIP Mix)(\s+by\s+.+?)?\)/i,
    // Velocidade alterada
    /\s*[-–—]\s*(Sped Up|Sped-Up|Slowed|Slow|Nightcore|Daycore)/i,
    /\s*\((Sped Up|Sped-Up|Slowed|Slow|Nightcore|Daycore)(\s+Ver\.?|\s+Version)?\)/i,
    // Acústico e ao vivo
    /\s*[-–—]\s*(Acoustic|Live|Unplugged|Piano|Orchestra|Orchestral)/i,
    /\s*\((Acoustic|Live|Unplugged|Piano|Orchestra|Orchestral)(\s+Ver\.?|\s+Version)?(\s+.+?)?\)/i,
    // Versões em outros idiomas
    /\s*\((English|Japanese|Korean|Chinese|Spanish|Portuguese|French|German)\s*(Ver\.?|Version)\)/i,
    /\s*[-–—]\s*(English|Japanese|Korean|Chinese|Spanish|Portuguese|French|German)\s*(Ver\.?|Version)/i,
    // Versões especiais de K-pop
    /\s*\((Member|Solo|Dance|Performance|MV|Music Video)\s*(Ver\.?|Version)\)/i,
    /\s*[-–—]\s*(Member|Solo|Dance|Performance|MV|Music Video)\s*(Ver\.?|Version)/i,
    // Remaster
    /\s*[-–—]\s*(Remaster|Remastered)(\s+\d{4})?/i,
    /\s*\((Remaster|Remastered)(\s+\d{4})?\)/i,
    // Instrumental
    /\s*[-–—]\s*(Instrumental|Inst\.?|Karaoke)/i,
    /\s*\((Instrumental|Inst\.?|Karaoke)\)/i,
    // Demo/Bonus
    /\s*[-–—]\s*(Demo|Bonus Track|Bonus|Deluxe)/i,
    /\s*\((Demo|Bonus Track|Bonus|Deluxe)\)/i,
  ]

  /**
   * Normaliza o nome de uma música removendo sufixos de versão
   * Isso permite agrupar músicas que são a mesma, mas em versões diferentes
   */
  private normalizeTrackName(name: string): string {
    let normalized = name.trim()

    // Aplicar cada padrão para remover sufixos
    for (const pattern of this.VERSION_PATTERNS) {
      normalized = normalized.replace(pattern, "")
    }

    // Remover espaços extras e limpar
    normalized = normalized.trim()

    // Normalizar caixa para comparação
    return normalized.toLowerCase()
  }

  /**
   * Detecta se uma música é uma versão/variação (remix, sped up, etc)
   */
  private isVersionTrack(name: string): boolean {
    return this.VERSION_PATTERNS.some(pattern => pattern.test(name))
  }

  /**
   * Filtra versões duplicadas de músicas, mantendo apenas uma versão de cada
   *
   * Prioridade de versões (do melhor para pior):
   * 1. Versão "original" (sem sufixo de versão)
   * 2. Remaster (geralmente melhor qualidade)
   * 3. Outras versões (remix, sped up, etc)
   *
   * @param tracks - Array de tracks para filtrar
   * @returns Array filtrado sem versões duplicadas
   */
  filterDuplicateVersions(tracks: SpotifyTrack[]): {
    filtered: SpotifyTrack[]
    removed: { track: SpotifyTrack; reason: string; originalTrack?: string }[]
  } {
    const trackGroups = new Map<string, SpotifyTrack[]>()
    const removed: { track: SpotifyTrack; reason: string; originalTrack?: string }[] = []

    // Agrupar tracks por nome normalizado + artista principal
    for (const track of tracks) {
      const normalizedName = this.normalizeTrackName(track.name)
      const mainArtist = track.artists[0]?.name.toLowerCase() || ""
      const groupKey = `${normalizedName}::${mainArtist}`

      if (!trackGroups.has(groupKey)) {
        trackGroups.set(groupKey, [])
      }
      trackGroups.get(groupKey)!.push(track)
    }

    const filtered: SpotifyTrack[] = []

    // Para cada grupo, escolher a melhor versão
    for (const [_groupKey, groupTracks] of trackGroups) {
      if (groupTracks.length === 1) {
        // Sem duplicatas, manter a única track
        filtered.push(groupTracks[0])
      } else {
        // Múltiplas versões encontradas, escolher a melhor
        // Ordenar por prioridade
        const sorted = groupTracks.sort((a, b) => {
          const aIsVersion = this.isVersionTrack(a.name)
          const bIsVersion = this.isVersionTrack(b.name)

          // Prioridade 1: Originais primeiro
          if (!aIsVersion && bIsVersion) return -1
          if (aIsVersion && !bIsVersion) return 1

          // Prioridade 2: Maior popularidade
          return (b.popularity || 0) - (a.popularity || 0)
        })

        // Manter a primeira (melhor versão)
        const kept = sorted[0]
        filtered.push(kept)

        // Registrar as removidas
        for (let i = 1; i < sorted.length; i++) {
          const track = sorted[i]
          const reason = this.getVersionType(track.name)
          removed.push({
            track,
            reason: reason || "Versão duplicada",
            originalTrack: kept.name,
          })
        }

        // Log para debug
        if (sorted.length > 1) {
          logger.debug("filterDuplicateVersions: found duplicate versions", {
            kept: kept.name,
            removedCount: sorted.length - 1,
            removed: sorted.slice(1).map(t => t.name),
          })
        }
      }
    }

    if (removed.length > 0) {
      logger.info("filterDuplicateVersions: completed", {
        original: tracks.length,
        filtered: filtered.length,
        removedCount: removed.length,
      })
    }

    return { filtered, removed }
  }

  /**
   * Identifica o tipo de versão de uma música
   */
  private getVersionType(name: string): string | null {
    if (/remix/i.test(name)) return "Remix"
    if (/sped.?up|nightcore/i.test(name)) return "Sped Up"
    if (/slow|slowed|daycore/i.test(name)) return "Slowed"
    if (/acoustic|unplugged|piano/i.test(name)) return "Acústico"
    if (/live/i.test(name)) return "Ao vivo"
    if (/remaster/i.test(name)) return "Remaster"
    if (/instrumental|karaoke/i.test(name)) return "Instrumental"
    if (/english\s*ver/i.test(name)) return "English Version"
    if (/japanese\s*ver/i.test(name)) return "Japanese Version"
    if (/korean\s*ver/i.test(name)) return "Korean Version"
    if (/member\s*ver|solo\s*ver/i.test(name)) return "Member/Solo Version"
    if (/dance\s*ver|performance\s*ver/i.test(name)) return "Dance/Performance Version"
    return null
  }

  /**
   * Gera uma playlist baseada em artistas selecionados
   * Usa a nova função getArtistAllTracks para buscar muito mais músicas por artista
   */
  async generatePlaylistFromArtists(
    userId: string,
    artistIds: string[],
    options: {
      playlistSize?: number
      includeTopTracks?: boolean
      includeRecommendations?: boolean
    } = {}
  ): Promise<{
    tracks: SpotifyTrack[]
    seeds: { artists: string[] }
  }> {
    const { playlistSize = 30, includeRecommendations = true } = options

    if (artistIds.length === 0) {
      throw new Error("Selecione pelo menos um artista")
    }

    // Buscar blacklist em paralelo
    const [blacklistedTrackIds, blacklistedArtistIds] = await Promise.all([
      this.getUserTrackBlacklist(userId),
      this.getUserArtistBlacklist(userId),
    ])

    const tracks: SpotifyTrack[] = []
    const usedTrackIds = new Set<string>()

    // Calcular quantas músicas precisamos por artista
    // Pedir mais do que o necessário para compensar possíveis duplicatas/blacklist
    const tracksPerArtist = Math.ceil((playlistSize * 1.5) / artistIds.length)

    logger.info("generatePlaylistFromArtists: starting", {
      userId,
      artistCount: artistIds.length,
      playlistSize,
      tracksPerArtist,
    })

    // Buscar todas as tracks de cada artista em paralelo
    const allArtistTracks = await Promise.all(
      artistIds.map(artistId => this.getArtistAllTracks(userId, artistId, tracksPerArtist))
    )

    // Mesclar tracks usando round-robin para balancear entre artistas
    // Isso garante que cada artista tenha representação proporcional
    const _artistIndex = 0
    const trackIndexPerArtist = artistIds.map(() => 0)
    let addedThisRound = true

    while (tracks.length < playlistSize && addedThisRound) {
      addedThisRound = false

      for (let i = 0; i < artistIds.length; i++) {
        if (tracks.length >= playlistSize) break

        const artistTracks = allArtistTracks[i]
        const currentIndex = trackIndexPerArtist[i]

        // Encontrar próxima track válida deste artista
        while (currentIndex + trackIndexPerArtist[i] - currentIndex < artistTracks.length) {
          const trackIdx = trackIndexPerArtist[i]
          if (trackIdx >= artistTracks.length) break

          const track = artistTracks[trackIdx]
          trackIndexPerArtist[i]++

          // Verificar blacklist e duplicatas
          const isBlacklisted =
            blacklistedTrackIds.has(track.id) ||
            track.artists.some(a => blacklistedArtistIds.has(a.id))

          if (!usedTrackIds.has(track.id) && !isBlacklisted) {
            tracks.push(track)
            usedTrackIds.add(track.id)
            addedThisRound = true
            break
          }
        }
      }
    }

    logger.info("generatePlaylistFromArtists: after artist tracks", {
      tracksCollected: tracks.length,
      needed: playlistSize,
    })

    // Se ainda precisa de mais músicas, usar recomendações
    if (includeRecommendations && tracks.length < playlistSize) {
      const seedArtists = artistIds.slice(0, 5)
      const remaining = playlistSize - tracks.length

      logger.info("generatePlaylistFromArtists: fetching recommendations", {
        remaining,
        seedArtists: seedArtists.length,
      })

      const recommendations = await this.getRecommendationsAlternative(userId, {
        seedArtists,
        limit: remaining + 30, // Buffer extra
      })

      if (recommendations) {
        for (const track of recommendations.tracks) {
          if (tracks.length >= playlistSize) break
          // Verificar blacklist
          const isBlacklisted =
            blacklistedTrackIds.has(track.id) ||
            track.artists.some(a => blacklistedArtistIds.has(a.id))
          if (!usedTrackIds.has(track.id) && !isBlacklisted) {
            tracks.push(track)
            usedTrackIds.add(track.id)
          }
        }
      }
    }

    logger.info("generatePlaylistFromArtists: final result", {
      requestedSize: playlistSize,
      finalSize: tracks.length,
    })

    // Filtrar versões duplicadas (remix, sped up, English ver., etc)
    const { filtered: filteredTracks, removed: removedVersions } =
      this.filterDuplicateVersions(tracks)

    logger.info("generatePlaylistFromArtists: after duplicate filtering", {
      beforeFilter: tracks.length,
      afterFilter: filteredTracks.length,
      removedVersions: removedVersions.length,
    })

    // Embaralhar as músicas para não ficar agrupado por artista
    const shuffled = filteredTracks.sort(() => Math.random() - 0.5)

    return {
      tracks: shuffled.slice(0, playlistSize),
      seeds: { artists: artistIds },
    }
  }

  /**
   * Recupera todos os IDs de músicas de playlists geradas anteriormente pelo usuário
   */
  private async getStoredUserTracks(userId: string): Promise<Set<string>> {
    const playlists = await db
      .select({ tracks: generatedPlaylists.tracks })
      .from(generatedPlaylists)
      .where(eq(generatedPlaylists.userId, userId))

    const storedTrackIds = new Set<string>()

    for (const playlist of playlists) {
      if (playlist.tracks) {
        try {
          const trackUris = JSON.parse(playlist.tracks) as string[]
          // Extrair ID do URI (spotify:track:ID) -> ID
          trackUris.forEach(uri => {
            const id = uri.split(":").pop()
            if (id) storedTrackIds.add(id)
          })
        } catch (e) {
          logger.warn("Error parsing playlist tracks", {
            error: e instanceof Error ? e.message : String(e),
          })
        }
      }
    }

    return storedTrackIds
  }

  /**
   * Gera uma playlist de descoberta (novas músicas baseadas no gosto) - otimizado
   */
  async generateDiscoveryPlaylist(
    userId: string,
    options: {
      playlistSize?: number
      includeRecommendations?: boolean
    } = {}
  ): Promise<{
    tracks: SpotifyTrack[]
    seeds: { artists: string[]; tracks: string[] }
  }> {
    const { playlistSize = 30 } = options

    // Paralelizar: buscar tracks recentes, long-term, armazenadas e blacklist
    const [
      recentTracks,
      longTermTracks,
      storedTrackIds,
      blacklistedTrackIds,
      blacklistedArtistIds,
    ] = await Promise.all([
      this.getTopTracks(userId, "short_term", 50),
      this.getTopTracks(userId, "long_term", 50),
      this.getStoredUserTracks(userId),
      this.getUserTrackBlacklist(userId),
      this.getUserArtistBlacklist(userId),
    ])

    if (!recentTracks || recentTracks.items.length === 0) {
      throw new Error("Não foi possível analisar seu gosto musical recente")
    }

    // Criar set de tracks conhecidas
    const knownTrackIds = new Set(storedTrackIds)
    if (longTermTracks) {
      for (const t of longTermTracks.items) {
        knownTrackIds.add(t.id)
      }
    }

    // Extrair seeds uma única vez
    const uniqueArtists = [...new Set(recentTracks.items.flatMap(t => t.artists.map(a => a.id)))]
    const seedArtists = uniqueArtists.sort(() => Math.random() - 0.5).slice(0, 5)

    const tracks: SpotifyTrack[] = []
    const usedTrackIds = new Set<string>()
    let remaining = playlistSize

    // Buscar recomendações uma única vez com seeds otimizadas
    const recommendations = await this.getRecommendationsAlternative(userId, {
      seedTracks: [],
      seedArtists: seedArtists,
      limit: remaining * 3, // Buffer menor (3x ao invés de 4x)
    })

    if (recommendations) {
      // Priorizar novas descobertas
      for (const track of recommendations.tracks) {
        if (remaining <= 0) break
        // Verificar blacklist
        const isBlacklisted =
          blacklistedTrackIds.has(track.id) ||
          track.artists.some(a => blacklistedArtistIds.has(a.id))
        if (!usedTrackIds.has(track.id) && !isBlacklisted) {
          // Preferir novas descobertas, mas aceitar conhecidas se necessário
          tracks.push(track)
          usedTrackIds.add(track.id)
          remaining--
        }
      }
    }

    return {
      tracks,
      seeds: {
        artists: seedArtists,
        tracks: [],
      },
    }
  }

  /**
   * Gera uma playlist híbrida misturando top tracks conhecidas com descobertas novas
   *
   * @param topTracksRatio - Proporção de músicas conhecidas (0.0 a 1.0, padrão 0.5)
   */
  async generateHybridPlaylist(
    userId: string,
    options: {
      playlistSize?: number
      topTracksRatio?: number
      timeRange?: "short_term" | "medium_term" | "long_term"
    } = {}
  ): Promise<{
    tracks: SpotifyTrack[]
    seeds: { artists: string[]; tracks: string[] }
    composition: { topTracks: number; discoveries: number }
  }> {
    const { playlistSize = 30, topTracksRatio = 0.5, timeRange = "medium_term" } = options

    // Calcular quantas músicas de cada tipo
    const topTracksCount = Math.round(playlistSize * topTracksRatio)
    const discoveryCount = playlistSize - topTracksCount

    // Paralelizar buscas
    const [topTracks, recentTracks, storedTrackIds, blacklistedTrackIds, blacklistedArtistIds] =
      await Promise.all([
        this.getTopTracks(userId, timeRange, 50),
        this.getTopTracks(userId, "short_term", 50),
        this.getStoredUserTracks(userId),
        this.getUserTrackBlacklist(userId),
        this.getUserArtistBlacklist(userId),
      ])

    if (!topTracks || topTracks.items.length === 0) {
      throw new Error("Não foi possível buscar suas músicas mais ouvidas")
    }

    const tracks: SpotifyTrack[] = []
    const usedTrackIds = new Set<string>()

    // 1. Adicionar top tracks (filtrar blacklist)
    const validTopTracks = topTracks.items.filter(track => {
      const isBlacklisted =
        blacklistedTrackIds.has(track.id) || track.artists.some(a => blacklistedArtistIds.has(a.id))
      return !isBlacklisted
    })

    // Shuffle e pegar a quantidade certa de top tracks
    const shuffledTopTracks = validTopTracks.sort(() => Math.random() - 0.5)
    for (const track of shuffledTopTracks) {
      if (tracks.length >= topTracksCount) break
      if (!usedTrackIds.has(track.id)) {
        tracks.push(track)
        usedTrackIds.add(track.id)
      }
    }

    const actualTopCount = tracks.length

    // 2. Buscar descobertas
    if (discoveryCount > 0) {
      // Extrair artistas para seeds
      const sourceForSeeds = recentTracks?.items || topTracks.items
      const uniqueArtists = [...new Set(sourceForSeeds.flatMap(t => t.artists.map(a => a.id)))]
      const seedArtists = uniqueArtists.sort(() => Math.random() - 0.5).slice(0, 5)

      // Set de tracks conhecidas para filtrar
      const knownTrackIds = new Set([
        ...usedTrackIds,
        ...storedTrackIds,
        ...topTracks.items.map(t => t.id),
      ])

      const recommendations = await this.getRecommendationsAlternative(userId, {
        seedTracks: [],
        seedArtists: seedArtists,
        limit: discoveryCount * 4,
      })

      if (recommendations) {
        for (const track of recommendations.tracks) {
          if (tracks.length >= playlistSize) break

          const isBlacklisted =
            blacklistedTrackIds.has(track.id) ||
            track.artists.some(a => blacklistedArtistIds.has(a.id))

          // Filtrar conhecidas e blacklist
          if (!usedTrackIds.has(track.id) && !knownTrackIds.has(track.id) && !isBlacklisted) {
            tracks.push(track)
            usedTrackIds.add(track.id)
          }
        }
      }
    }

    // Shuffle final para misturar conhecidas com novas
    const finalTracks = tracks.sort(() => Math.random() - 0.5)

    return {
      tracks: finalTracks,
      seeds: {
        artists: [],
        tracks: [],
      },
      composition: {
        topTracks: actualTopCount,
        discoveries: finalTracks.length - actualTopCount,
      },
    }
  }

  /**
   * Obtém a blacklist de tracks de um usuário
   */
  async getUserTrackBlacklist(userId: string): Promise<Set<string>> {
    try {
      const blacklist = await db
        .select({ spotifyTrackId: spotifyTrackBlacklist.spotifyTrackId })
        .from(spotifyTrackBlacklist)
        .where(eq(spotifyTrackBlacklist.userId, userId))

      return new Set(blacklist.map(item => item.spotifyTrackId))
    } catch (error) {
      logger.error("Error fetching track blacklist", { userId }, error as Error)
      return new Set()
    }
  }

  /**
   * Obtém a blacklist de artistas de um usuário
   */
  async getUserArtistBlacklist(userId: string): Promise<Set<string>> {
    try {
      const blacklist = await db
        .select({ spotifyArtistId: spotifyArtistBlacklist.spotifyArtistId })
        .from(spotifyArtistBlacklist)
        .where(eq(spotifyArtistBlacklist.userId, userId))

      return new Set(blacklist.map(item => item.spotifyArtistId))
    } catch (error) {
      logger.error("Error fetching artist blacklist", { userId }, error as Error)
      return new Set()
    }
  }

  /**
   * Adiciona uma track à blacklist
   */
  async addTrackToBlacklist(
    userId: string,
    spotifyTrackId: string,
    trackName: string,
    artistName: string,
    reason?: string
  ): Promise<void> {
    try {
      // Verificar se já existe
      const existing = await db
        .select()
        .from(spotifyTrackBlacklist)
        .where(
          eq(spotifyTrackBlacklist.userId, userId) &&
            eq(spotifyTrackBlacklist.spotifyTrackId, spotifyTrackId)
        )
        .then(r => r[0])

      if (existing) {
        logger.info("Track already in blacklist", { userId, spotifyTrackId })
        return
      }

      await db.insert(spotifyTrackBlacklist).values({
        userId,
        spotifyTrackId,
        trackName,
        artistName,
        reason: reason || "user_preference",
      })

      logger.info("Track added to blacklist", { userId, spotifyTrackId, trackName })
    } catch (error) {
      logger.error("Error adding track to blacklist", { userId, spotifyTrackId }, error as Error)
      throw error
    }
  }

  /**
   * Adiciona um artista à blacklist
   */
  async addArtistToBlacklist(
    userId: string,
    spotifyArtistId: string,
    artistName: string,
    reason?: string
  ): Promise<void> {
    try {
      // Verificar se já existe
      const existing = await db
        .select()
        .from(spotifyArtistBlacklist)
        .where(
          eq(spotifyArtistBlacklist.userId, userId) &&
            eq(spotifyArtistBlacklist.spotifyArtistId, spotifyArtistId)
        )
        .then(r => r[0])

      if (existing) {
        logger.info("Artist already in blacklist", { userId, spotifyArtistId })
        return
      }

      await db.insert(spotifyArtistBlacklist).values({
        userId,
        spotifyArtistId,
        artistName,
        reason: reason || "user_preference",
      })

      logger.info("Artist added to blacklist", { userId, spotifyArtistId, artistName })
    } catch (error) {
      logger.error("Error adding artist to blacklist", { userId, spotifyArtistId }, error as Error)
      throw error
    }
  }

  /**
   * Remove uma track da blacklist
   */
  async removeTrackFromBlacklist(userId: string, spotifyTrackId: string): Promise<void> {
    try {
      await db
        .delete(spotifyTrackBlacklist)
        .where(
          eq(spotifyTrackBlacklist.userId, userId) &&
            eq(spotifyTrackBlacklist.spotifyTrackId, spotifyTrackId)
        )

      logger.info("Track removed from blacklist", { userId, spotifyTrackId })
    } catch (error) {
      logger.error(
        "Error removing track from blacklist",
        { userId, spotifyTrackId },
        error as Error
      )
      throw error
    }
  }

  /**
   * Remove um artista da blacklist
   */
  async removeArtistFromBlacklist(userId: string, spotifyArtistId: string): Promise<void> {
    try {
      await db
        .delete(spotifyArtistBlacklist)
        .where(
          eq(spotifyArtistBlacklist.userId, userId) &&
            eq(spotifyArtistBlacklist.spotifyArtistId, spotifyArtistId)
        )

      logger.info("Artist removed from blacklist", { userId, spotifyArtistId })
    } catch (error) {
      logger.error(
        "Error removing artist from blacklist",
        { userId, spotifyArtistId },
        error as Error
      )
      throw error
    }
  }

  /**
   * Obtém informações completas da blacklist do usuário
   */
  async getUserBlacklistInfo(userId: string): Promise<{
    tracks: Array<{ id: string; name: string; artist: string; reason?: string }>
    artists: Array<{ id: string; name: string; reason?: string }>
  }> {
    try {
      const [tracksRaw, artistsRaw] = await Promise.all([
        db
          .select({
            id: spotifyTrackBlacklist.spotifyTrackId,
            name: spotifyTrackBlacklist.trackName,
            artist: spotifyTrackBlacklist.artistName,
            reason: spotifyTrackBlacklist.reason,
          })
          .from(spotifyTrackBlacklist)
          .where(eq(spotifyTrackBlacklist.userId, userId)),
        db
          .select({
            id: spotifyArtistBlacklist.spotifyArtistId,
            name: spotifyArtistBlacklist.artistName,
            reason: spotifyArtistBlacklist.reason,
          })
          .from(spotifyArtistBlacklist)
          .where(eq(spotifyArtistBlacklist.userId, userId)),
      ])

      // Convert null to undefined for type compatibility
      const tracks = tracksRaw.map(t => ({
        id: t.id,
        name: t.name,
        artist: t.artist,
        reason: t.reason ?? undefined,
      }))

      const artists = artistsRaw.map(a => ({
        id: a.id,
        name: a.name,
        reason: a.reason ?? undefined,
      }))

      return { tracks, artists }
    } catch (error) {
      logger.error("Error fetching user blacklist info", { userId }, error as Error)
      return { tracks: [], artists: [] }
    }
  }
}

export const spotifyService = new SpotifyService()
