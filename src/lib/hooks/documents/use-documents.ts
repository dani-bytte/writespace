"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/src/lib/hooks/auth/use-auth"
import { useInfiniteScroll } from "../ui/use-infinite-scroll"

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

interface DocumentFilters {
  sortBy: "title" | "createdAt" | "updatedAt"
  sortOrder: "asc" | "desc"
}

interface LoadingStates {
  fetching: boolean
  creating: boolean
  updating: string | null // document ID being updated
  deleting: string | null // document ID being deleted
  sharing: string | null // document ID being shared
  unsharing: string | null // document ID being unshared
  loadingMore: boolean // loading more items for infinite scroll
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalPages: number
}

// Simple cache for documents to avoid reloading when switching tabs
const documentsCache = {
  data: null as Document[] | null,
  timestamp: 0,
  isValid: (maxAge = 30000) => {
    // 30 seconds cache
    return documentsCache.data !== null && Date.now() - documentsCache.timestamp < maxAge
  },
  set: (data: Document[]) => {
    documentsCache.data = data
    documentsCache.timestamp = Date.now()
  },
  clear: () => {
    documentsCache.data = null
    documentsCache.timestamp = 0
  },
}

export function useDocuments(enabled = true) {
  const { isAuthenticated } = useAuth()
  const [documents, setDocuments] = useState<Document[]>(documentsCache.data || [])
  const [loading, setLoading] = useState(!documentsCache.isValid())
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    fetching: false,
    creating: false,
    updating: null,
    deleting: null,
    sharing: null,
    unsharing: null,
    loadingMore: false,
  })
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [filters, setFilters] = useState<DocumentFilters>({
    sortBy: "updatedAt",
    sortOrder: "desc",
  })

  // Usar refs para evitar dependências circulares
  const filtersRef = useRef(filters)
  const searchQueryRef = useRef(searchQuery)
  const isFetchingRef = useRef(false)
  const lastFetchKeyRef = useRef<string>("")

  // Atualizar refs quando os valores mudam
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  useEffect(() => {
    searchQueryRef.current = searchQuery
  }, [searchQuery])

  const fetchDocuments = useCallback(
    async (
      page = 1,
      limit = 20,
      append = false,
      search?: string,
      currentFilters?: DocumentFilters
    ) => {
      if (!isAuthenticated) return

      const searchToUse = search !== undefined ? search : searchQueryRef.current
      const filtersToUse = currentFilters || filtersRef.current

      // Criar chave única para esta requisição
      const fetchKey = `${page}-${limit}-${append}-${searchToUse}-${JSON.stringify(filtersToUse)}`

      // Proteção contra requisições duplicadas
      if (isFetchingRef.current && !append) {
        return
      }

      // Evitar requisições idênticas consecutivas
      if (lastFetchKeyRef.current === fetchKey && !append) {
        return
      }

      // SECURITY: Client-side validation to prevent malicious inputs
      if (searchToUse.length > 1000) {
        setError("Termo de busca muito longo")
        return
      }
      if (limit > 50 || limit < 1) {
        setError("Limite inválido")
        return
      }
      if (page < 1 || page > 1000) {
        setError("Página inválida")
        return
      }

      try {
        if (!append) {
          isFetchingRef.current = true
          lastFetchKeyRef.current = fetchKey
          setLoading(true)
          setLoadingStates(prev => ({ ...prev, fetching: true }))
        } else {
          setLoadingStates(prev => ({ ...prev, loadingMore: true }))
        }
        setError(null)

        const url = new URL("/api/documents", window.location.origin)
        url.searchParams.set("page", page.toString())
        url.searchParams.set("limit", limit.toString())
        url.searchParams.set("sortBy", filtersToUse.sortBy)
        url.searchParams.set("sortOrder", filtersToUse.sortOrder)

        if (searchToUse.trim()) {
          url.searchParams.set("search", searchToUse.trim())
        }

        const response = await fetch(url.toString())
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar documentos")
        }

        if (append) {
          setDocuments(prev => {
            const newDocuments = [...prev, ...data.documents]
            documentsCache.set(newDocuments)
            return newDocuments
          })
        } else {
          setDocuments(data.documents)
          documentsCache.set(data.documents)
        }
        setPagination(data.pagination)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        isFetchingRef.current = false
        setLoading(false)
        setLoadingStates(prev => ({ ...prev, fetching: false, loadingMore: false }))
      }
    },
    [isAuthenticated]
  )

  const createDocument = useCallback(
    async (title: string, content: string = "") => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado")

      try {
        setLoadingStates(prev => ({ ...prev, creating: true }))
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, content }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erro ao criar documento")
        }

        setDocuments(prev => {
          const updatedDocuments = [data.document, ...prev]
          documentsCache.set(updatedDocuments)
          return updatedDocuments
        })
        return data.document
      } catch (err) {
        throw err instanceof Error ? err : new Error("Erro desconhecido")
      } finally {
        setLoadingStates(prev => ({ ...prev, creating: false }))
      }
    },
    [isAuthenticated]
  )

  const updateDocument = useCallback(
    async (id: string, updates: Partial<Document>) => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado")

      try {
        setLoadingStates(prev => ({ ...prev, updating: id }))
        const response = await fetch(`/api/documents/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erro ao atualizar documento")
        }

        setDocuments(prev => {
          const updatedDocuments = prev.map(doc => (doc.id === id ? data.document : doc))
          documentsCache.set(updatedDocuments)
          return updatedDocuments
        })
        return data.document
      } catch (err) {
        throw err instanceof Error ? err : new Error("Erro desconhecido")
      } finally {
        setLoadingStates(prev => ({ ...prev, updating: null }))
      }
    },
    [isAuthenticated]
  )

  const deleteDocument = useCallback(
    async (id: string) => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado")

      try {
        setLoadingStates(prev => ({ ...prev, deleting: id }))
        const response = await fetch(`/api/documents/${id}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Erro ao excluir documento")
        }

        setDocuments(prev => {
          const updatedDocuments = prev.filter(doc => doc.id !== id)
          documentsCache.set(updatedDocuments)
          return updatedDocuments
        })
      } catch (err) {
        throw err instanceof Error ? err : new Error("Erro desconhecido")
      } finally {
        setLoadingStates(prev => ({ ...prev, deleting: null }))
      }
    },
    [isAuthenticated]
  )

  const shareDocument = useCallback(
    async (
      id: string,
      shareVia: "email" | "link",
      email?: string,
      discordId?: string,
      validationType?: "none" | "email" | "discord" | "email_or_discord"
    ) => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado")

      try {
        setLoadingStates(prev => ({ ...prev, sharing: id }))
        const response = await fetch(`/api/documents/${id}/share`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shareVia,
            email,
            discordId,
            validationType: validationType || "none",
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Erro ao compartilhar documento")
        }

        // Atualizar o documento na lista local
        setDocuments(prev => {
          const updatedDocuments = prev.map(doc =>
            doc.id === id
              ? { ...doc, shared: true, sharedVia: shareVia, shareToken: data.shareToken }
              : doc
          )
          documentsCache.set(updatedDocuments)
          return updatedDocuments
        })

        return data
      } catch (err) {
        throw err instanceof Error ? err : new Error("Erro desconhecido")
      } finally {
        setLoadingStates(prev => ({ ...prev, sharing: null }))
      }
    },
    [isAuthenticated]
  )

  const unshareDocument = useCallback(
    async (id: string) => {
      if (!isAuthenticated) throw new Error("Usuário não autenticado")

      try {
        setLoadingStates(prev => ({ ...prev, unsharing: id }))
        const response = await fetch(`/api/documents/${id}/share`, {
          method: "DELETE",
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Erro ao remover compartilhamento")
        }

        // Atualizar o documento na lista local
        setDocuments(prev => {
          const updatedDocuments = prev.map(doc =>
            doc.id === id ? { ...doc, shared: false, sharedVia: null, shareToken: null } : doc
          )
          documentsCache.set(updatedDocuments)
          return updatedDocuments
        })
      } catch (err) {
        throw err instanceof Error ? err : new Error("Erro desconhecido")
      } finally {
        setLoadingStates(prev => ({ ...prev, unsharing: null }))
      }
    },
    [isAuthenticated]
  )

  const search = useCallback(
    (query: string) => {
      setSearchQuery(query)
      fetchDocuments(1, 20, false, query)
    },
    [fetchDocuments]
  )

  const updateFilters = useCallback(
    (newFilters: Partial<DocumentFilters>) => {
      const updatedFilters = { ...filtersRef.current, ...newFilters }
      setFilters(updatedFilters)
      fetchDocuments(1, 20, false, undefined, updatedFilters)
    },
    [fetchDocuments]
  )

  const resetFilters = useCallback(() => {
    const defaultFilters: DocumentFilters = {
      sortBy: "updatedAt",
      sortOrder: "desc",
    }
    setFilters(defaultFilters)
    fetchDocuments(1, 20, false, undefined, defaultFilters)
  }, [fetchDocuments])

  const loadMore = useCallback(() => {
    if (!pagination?.hasNextPage || loadingStates.loadingMore) return
    fetchDocuments(pagination.page + 1, pagination.limit, true)
  }, [
    pagination?.hasNextPage,
    pagination?.page,
    pagination?.limit,
    loadingStates.loadingMore,
    fetchDocuments,
  ])

  const { ref: infiniteScrollRef } = useInfiniteScroll(loadMore, {
    enabled: Boolean(pagination?.hasNextPage && !loadingStates.loadingMore),
  })

  useEffect(() => {
    if (isAuthenticated && enabled && !isFetchingRef.current) {
      // If cache is valid and no search/filters, use cached data
      const currentFilters = filtersRef.current
      const currentSearch = searchQueryRef.current

      if (
        documentsCache.isValid() &&
        !currentSearch &&
        currentFilters.sortBy === "updatedAt" &&
        currentFilters.sortOrder === "desc"
      ) {
        setLoading(false)
        return
      }

      // Pequeno delay para evitar chamadas simultâneas do React Strict Mode
      const timeoutId = setTimeout(() => {
        if (!isFetchingRef.current) {
          fetchDocuments(1, 20, false)
        }
      }, 10)

      return () => clearTimeout(timeoutId)
    }
  }, [isAuthenticated, enabled, fetchDocuments])

  return {
    documents,
    loading,
    loadingStates,
    pagination,
    error,
    searchQuery,
    filters,
    search,
    updateFilters,
    resetFilters,
    createDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    unshareDocument,
    loadMore,
    infiniteScrollRef,
    refetch: () => fetchDocuments(1, 20, false, searchQuery, filters),
  }
}
