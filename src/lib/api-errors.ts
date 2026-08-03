import { NextResponse } from "next/server"

/**
 * Mensagens de erro padronizadas para APIs.
 * Evita expor informações sensíveis sobre o estado interno da aplicação.
 */
export const API_ERROR_MESSAGES = {
  // Genérico: usado para 401, 403, 404 em recursos sensíveis
  NOT_FOUND: "Recurso não encontrado",

  // Autenticação
  UNAUTHORIZED: "Autenticação necessária",

  // Validação
  INVALID_REQUEST: "Requisição inválida",

  // Servidor
  INTERNAL_ERROR: "Erro interno do servidor",
} as const

/**
 * Cria uma resposta de erro padronizada.
 * Por segurança, erros 401 e 403 em recursos públicos retornam 404.
 */
export function createErrorResponse(
  message: string,
  status: number,
  options?: {
    /**
     * Se true, converte 401/403 em 404 para evitar enumeration attacks.
     * Use para recursos públicos como documentos compartilhados.
     */
    hideAuthErrors?: boolean
  }
): NextResponse {
  const finalStatus = options?.hideAuthErrors && (status === 401 || status === 403) ? 404 : status
  const finalMessage =
    options?.hideAuthErrors && (status === 401 || status === 403)
      ? API_ERROR_MESSAGES.NOT_FOUND
      : message

  return NextResponse.json({ error: finalMessage }, { status: finalStatus })
}

/**
 * Helper para erros comuns
 */
export const errorResponse = {
  notFound: (message = API_ERROR_MESSAGES.NOT_FOUND) =>
    NextResponse.json({ error: message }, { status: 404 }),

  unauthorized: (message = API_ERROR_MESSAGES.UNAUTHORIZED) =>
    NextResponse.json({ error: message }, { status: 401 }),

  forbidden: (message = API_ERROR_MESSAGES.NOT_FOUND) =>
    NextResponse.json({ error: message }, { status: 404 }), // Retorna 404 por segurança

  badRequest: (message = API_ERROR_MESSAGES.INVALID_REQUEST) =>
    NextResponse.json({ error: message }, { status: 400 }),

  internalError: (message = API_ERROR_MESSAGES.INTERNAL_ERROR) =>
    NextResponse.json({ error: message }, { status: 500 }),
}
