"use client"

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/src/lib/hooks/auth/use-auth"

interface Document {
  id: string
  title: string
  content: string
  userId: string
  shared: boolean
  sharedVia: string | null
  shareToken: string | null
  createdAt: string
  updatedAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalPages: number
}

interface DocumentsResponse {
  documents: Document[]
  pagination: PaginationInfo
}

// React Query infinite query types
interface InfiniteDocumentsData {
  pages: DocumentsResponse[]
  pageParams: unknown[]
}

// Query keys factory
const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (search?: string) => [...documentKeys.lists(), { search }] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
}

// API Functions
async function fetchDocuments(page = 1, limit = 20, search = ""): Promise<DocumentsResponse> {
  const url = new URL("/api/documents", window.location.origin)
  url.searchParams.set("page", page.toString())
  url.searchParams.set("limit", limit.toString())
  if (search.trim()) {
    url.searchParams.set("search", search.trim())
  }

  const response = await fetch(url.toString())
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao carregar documentos")
  }

  return data
}

async function createDocument(data: { title: string; content: string }): Promise<Document> {
  const response = await fetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Erro ao criar documento")
  }

  return result.document
}

async function updateDocument(id: string, data: Partial<Document>): Promise<Document> {
  const response = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Erro ao atualizar documento")
  }

  return result.document
}

async function deleteDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Erro ao excluir documento")
  }
}

async function shareDocument(id: string, shareVia: "email" | "link", email?: string) {
  const response = await fetch(`/api/documents/${id}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareVia, email }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || "Erro ao compartilhar documento")
  }

  return data
}

async function unshareDocument(id: string): Promise<void> {
  const response = await fetch(`/api/documents/${id}/share`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Erro ao remover compartilhamento")
  }
}

// Hooks
export function useDocumentsQuery(search = "") {
  const { isAuthenticated } = useAuth()

  return useInfiniteQuery({
    queryKey: documentKeys.list(search),
    queryFn: ({ pageParam = 1 }) => fetchDocuments(pageParam, 20, search),
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  })
}

export function useCreateDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDocument,
    onSuccess: newDocument => {
      // Invalidate and refetch documents list
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })

      // Add the new document to all existing queries
      queryClient.setQueriesData(
        { queryKey: documentKeys.lists() },
        (oldData: InfiniteDocumentsData | undefined) => {
          if (!oldData) return oldData

          const firstPage = oldData.pages[0]
          if (!firstPage) return oldData

          return {
            ...oldData,
            pages: [
              {
                ...firstPage,
                documents: [newDocument, ...firstPage.documents],
                pagination: {
                  ...firstPage.pagination,
                  total: firstPage.pagination.total + 1,
                },
              },
              ...oldData.pages.slice(1),
            ],
          }
        }
      )
    },
  })
}

export function useUpdateDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Document> }) => updateDocument(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() })

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: documentKeys.lists() },
        (oldData: InfiniteDocumentsData | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: DocumentsResponse) => ({
              ...page,
              documents: page.documents.map((doc: Document) =>
                doc.id === id ? { ...doc, ...data } : doc
              ),
            })),
          }
        }
      )

      return { id, data }
    },
    onError: (_err, _params, context) => {
      // Revert optimistic update
      if (context) {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDocument,
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() })

      // Optimistically remove
      queryClient.setQueriesData(
        { queryKey: documentKeys.lists() },
        (oldData: InfiniteDocumentsData | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: DocumentsResponse) => ({
              ...page,
              documents: page.documents.filter((doc: Document) => doc.id !== id),
              pagination: {
                ...page.pagination,
                total: Math.max(0, page.pagination.total - 1),
              },
            })),
          }
        }
      )

      return { id }
    },
    onError: (_err, _id, context) => {
      if (context) {
        queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

export function useShareDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      shareVia,
      email,
    }: {
      id: string
      shareVia: "email" | "link"
      email?: string
    }) => shareDocument(id, shareVia, email),
    onSuccess: (data, { id, shareVia }) => {
      // Update document in cache
      queryClient.setQueriesData(
        { queryKey: documentKeys.lists() },
        (oldData: InfiniteDocumentsData | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: DocumentsResponse) => ({
              ...page,
              documents: page.documents.map((doc: Document) =>
                doc.id === id
                  ? { ...doc, shared: true, sharedVia: shareVia, shareToken: data.shareToken }
                  : doc
              ),
            })),
          }
        }
      )
    },
  })
}

export function useUnshareDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unshareDocument,
    onSuccess: (_data, id) => {
      // Update document in cache
      queryClient.setQueriesData(
        { queryKey: documentKeys.lists() },
        (oldData: InfiniteDocumentsData | undefined) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: DocumentsResponse) => ({
              ...page,
              documents: page.documents.map((doc: Document) =>
                doc.id === id ? { ...doc, shared: false, sharedVia: null, shareToken: null } : doc
              ),
            })),
          }
        }
      )
    },
  })
}
