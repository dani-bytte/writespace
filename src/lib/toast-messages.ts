/**
 * Mensagens de toast padronizadas para consistência em toda a aplicação
 */

// Mensagens de sucesso
export const TOAST_SUCCESS = {
  // Documentos
  documentCreated: "Documento criado com sucesso!",
  documentSaved: "Documento salvo!",
  documentDeleted: "Documento excluído!",
  documentShared: "Documento compartilhado!",
  shareRemoved: "Compartilhamento removido!",
  linkCopied: "Link copiado para a área de transferência!",

  // Playlists
  playlistGenerated: (count: number) => `Playlist gerada com ${count} músicas!`,
  playlistCreated: "Playlist criada no Spotify!",
  playlistDeleted: "Playlist removida!",
  historyDeleted: "Removido do histórico!",

  // Spotify
  spotifyConnected: "Spotify conectado!",
  spotifyDisconnected: "Spotify desconectado!",

  // Blacklist
  trackBlocked: "Música bloqueada!",
  artistBlocked: "Artista bloqueado!",
  trackUnblocked: "Música desbloqueada!",
  artistUnblocked: "Artista desbloqueado!",

  // Auth
  loggedOut: "Você saiu da conta!",
  profileUpdated: "Perfil atualizado!",
} as const

// Mensagens de erro
export const TOAST_ERROR = {
  // Genéricas
  generic: "Algo deu errado. Tente novamente.",
  networkError: "Erro de conexão. Verifique sua internet.",
  unauthorized: "Você precisa estar logado para fazer isso.",

  // Documentos
  documentNotFound: "Documento não encontrado.",
  documentSaveError: "Erro ao salvar documento.",
  documentDeleteError: "Erro ao excluir documento.",
  documentShareError: "Erro ao compartilhar documento.",

  // Playlists
  playlistGenerateError: "Erro ao gerar playlist.",
  playlistCreateError: "Erro ao criar playlist no Spotify.",
  noArtistsSelected: "Selecione pelo menos um artista.",

  // Spotify
  spotifyConnectionError: "Erro ao conectar com Spotify.",
  spotifyDisconnectError: "Erro ao desconectar Spotify.",
  tokenExpired: "Sessão do Spotify expirada. Reconecte sua conta.",

  // Blacklist
  blockError: "Erro ao bloquear item.",
  unblockError: "Erro ao desbloquear item.",
} as const

// Mensagens de aviso/warning
export const TOAST_WARNING = {
  generationInterrupted: "Uma geração de playlist foi interrompida. Tente novamente.",
  unsavedChanges: "Você tem alterações não salvas.",
  slowConnection: "A conexão está lenta. Aguarde...",
} as const

// Mensagens informativas
export const TOAST_INFO = {
  autoSaving: "Salvando automaticamente...",
  loading: "Carregando...",
  processing: "Processando...",
} as const

/**
 * Helper para criar mensagem de erro a partir de uma exceção
 */
export function getErrorMessage(error: unknown, fallback = TOAST_ERROR.generic): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  return fallback
}
