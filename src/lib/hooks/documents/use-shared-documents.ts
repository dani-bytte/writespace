import { useCallback, useEffect, useState } from "react"
import { logger } from "@/src/lib/logger"

// Simple cache for shared documents to avoid reloading when switching tabs
const sharedDocumentsCache = {
  data: null as SharedDocument[] | null,
  timestamp: 0,
  isValid: (maxAge = 30000) => {
    // 30 seconds cache
    return (
      sharedDocumentsCache.data !== null && Date.now() - sharedDocumentsCache.timestamp < maxAge
    )
  },
  set: (data: SharedDocument[]) => {
    sharedDocumentsCache.data = data
    sharedDocumentsCache.timestamp = Date.now()
  },
  clear: () => {
    sharedDocumentsCache.data = null
    sharedDocumentsCache.timestamp = 0
  },
}

// Document type extended with share information
interface SharedDocument {
  id: string
  title: string
  content: string
  plainTextContent?: string
  contentType?: "rich" | "plain"
  userId: string
  shared: boolean
  sharedVia: string | null
  createdAt: string
  updatedAt: string
  ownerName: string
  ownerEmail: string
  shareType: "invite" | "direct"
  shareToken: string
}

interface PaginationInfo {
  type: "offset"
  page: number
  limit: number
  total: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalPages: number
}

interface UseSharedDocumentsReturn {
  documents: SharedDocument[]
  loading: boolean
  error: string | null
  pagination: PaginationInfo | null
  refreshDocuments: () => Promise<void>
  loadNextPage: () => Promise<void>
  loadPrevPage: () => Promise<void>
  goToPage: (page: number) => Promise<void>
}

export function useSharedDocuments(enabled = true, limit = 10): UseSharedDocumentsReturn {
  const [documents, setDocuments] = useState<SharedDocument[]>(sharedDocumentsCache.data || [])
  const [loading, setLoading] = useState(!sharedDocumentsCache.isValid())
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDocuments = useCallback(
    async (page = 1, showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        setError(null)

        const url = new URL("/api/documents/shared-with-me", window.location.origin)
        url.searchParams.set("page", page.toString())
        url.searchParams.set("limit", limit.toString())

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const data = await response.json()

        const documentsData = data.documents || []
        setDocuments(documentsData)
        sharedDocumentsCache.set(documentsData)
        setPagination(data.pagination || null)
        setCurrentPage(page)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido"
        setError(errorMessage)
        logger.error("Erro ao carregar documentos compartilhados", {
          action: "fetch_shared_documents",
          error: errorMessage,
        })
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [limit]
  )

  const refreshDocuments = useCallback(async () => {
    await fetchDocuments(currentPage, true)
  }, [fetchDocuments, currentPage])

  const loadNextPage = useCallback(async () => {
    if (pagination?.hasNextPage) {
      await fetchDocuments(currentPage + 1, false)
    }
  }, [fetchDocuments, currentPage, pagination])

  const loadPrevPage = useCallback(async () => {
    if (pagination?.hasPrevPage) {
      await fetchDocuments(currentPage - 1, false)
    }
  }, [fetchDocuments, currentPage, pagination])

  const goToPage = useCallback(
    async (page: number) => {
      if (pagination && page >= 1 && page <= pagination.totalPages) {
        await fetchDocuments(page, false)
      }
    },
    [fetchDocuments, pagination]
  )

  // Initial load
  useEffect(() => {
    if (enabled) {
      // If cache is valid, use cached data
      if (sharedDocumentsCache.isValid()) {
        setLoading(false)
        return
      }
      fetchDocuments(1, true)
    }
  }, [enabled, fetchDocuments])

  return {
    documents,
    loading,
    error,
    pagination,
    refreshDocuments,
    loadNextPage,
    loadPrevPage,
    goToPage,
  }
}
