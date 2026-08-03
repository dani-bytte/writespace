/**
 * Constantes de cache para React Query
 * Centraliza tempos de stale e gc para consistência
 */

// Tempos em milissegundos
export const CACHE_TIME = {
  // Dados que mudam frequentemente
  REALTIME: 0, // Sem cache
  SHORT: 30 * 1000, // 30 segundos

  // Dados moderadamente estáveis
  MEDIUM: 2 * 60 * 1000, // 2 minutos
  STANDARD: 5 * 60 * 1000, // 5 minutos

  // Dados quase estáticos
  LONG: 15 * 60 * 1000, // 15 minutos
  VERY_LONG: 30 * 60 * 1000, // 30 minutos

  // Dados que raramente mudam
  HOUR: 60 * 60 * 1000, // 1 hora
  DAY: 24 * 60 * 60 * 1000, // 1 dia
  WEEK: 7 * 24 * 60 * 60 * 1000, // 1 semana
} as const

// Garbage collection time (tempo mantido em memória após stale)
export const GC_TIME = {
  SHORT: 5 * 60 * 1000, // 5 minutos
  STANDARD: 10 * 60 * 1000, // 10 minutos
  LONG: 30 * 60 * 1000, // 30 minutos
} as const

/**
 * Configurações recomendadas por tipo de dado
 */
export const QUERY_CONFIG = {
  // Status de conexão (verificar frequentemente)
  connection: {
    staleTime: CACHE_TIME.MEDIUM,
    gcTime: GC_TIME.STANDARD,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  },

  // Listas de items (documentos, playlists)
  list: {
    staleTime: CACHE_TIME.STANDARD,
    gcTime: GC_TIME.STANDARD,
    refetchOnMount: true,
  },

  // Dados de perfil do usuário
  profile: {
    staleTime: CACHE_TIME.LONG,
    gcTime: GC_TIME.LONG,
    refetchOnMount: false,
  },

  // Dados de música (tracks, artistas)
  music: {
    staleTime: CACHE_TIME.VERY_LONG,
    gcTime: GC_TIME.LONG,
  },

  // Busca (resultados efêmeros)
  search: {
    staleTime: CACHE_TIME.SHORT,
    gcTime: GC_TIME.SHORT,
  },

  // Histórico (raramente muda exceto por ações do usuário)
  history: {
    staleTime: CACHE_TIME.LONG,
    gcTime: GC_TIME.LONG,
  },

  // Configurações de admin
  admin: {
    staleTime: CACHE_TIME.MEDIUM,
    gcTime: GC_TIME.STANDARD,
  },
} as const

/**
 * Query keys centralizadas
 */
export const queryKeys = {
  // Auth
  auth: {
    all: ["auth"] as const,
    session: () => [...queryKeys.auth.all, "session"] as const,
  },

  // Documentos
  documents: {
    all: ["documents"] as const,
    list: (userId: string) => [...queryKeys.documents.all, "list", userId] as const,
    shared: (userId: string) => [...queryKeys.documents.all, "shared", userId] as const,
    detail: (id: string) => [...queryKeys.documents.all, "detail", id] as const,
  },

  // Música
  music: {
    all: ["music"] as const,
    status: () => [...queryKeys.music.all, "status"] as const,
    topTracks: (timeRange: string) => [...queryKeys.music.all, "top-tracks", timeRange] as const,
    artistSearch: (query: string) => [...queryKeys.music.all, "artist-search", query] as const,
    history: () => [...queryKeys.music.all, "history"] as const,
    blacklist: () => [...queryKeys.music.all, "blacklist"] as const,
  },

  // Admin
  admin: {
    all: ["admin"] as const,
    users: () => [...queryKeys.admin.all, "users"] as const,
    invites: () => [...queryKeys.admin.all, "invites"] as const,
    emailSettings: () => [...queryKeys.admin.all, "email-settings"] as const,
  },
} as const
