// Centralized document types for the WriteSpace application

export interface BaseDocument {
  id: string
  title: string
  content: string
  plainTextContent?: string
  contentType?: "rich" | "plain"
  userId: string
  shared: boolean
  sharedVia: string | null
  shareToken: string | null
  createdAt: string
  updatedAt: string
}

// Alias for backward compatibility
export type Document = BaseDocument

export interface SharedDocument extends BaseDocument {
  ownerName: string
  ownerEmail: string
  shareType: "invite" | "direct"
}

export interface DocumentWithOwner extends BaseDocument {
  ownerName?: string
  ownerEmail?: string
  shareType?: "invite" | "direct"
}

export interface DocumentFilters {
  search?: string
  sortBy?: "createdAt" | "updatedAt" | "title"
  sortOrder?: "asc" | "desc"
}

export interface DocumentSaveData {
  title: string
  content: string
  plainTextContent?: string
}

export interface DocumentsResponse {
  documents: BaseDocument[]
  hasMore: boolean
  total: number
}

export interface InfiniteDocumentsData {
  pages: DocumentsResponse[]
  pageParams: (number | undefined)[]
}

export interface UseSharedDocumentsReturn {
  documents: SharedDocument[]
  loading: boolean
  error: string | null
  refreshDocuments: () => Promise<void>
}
