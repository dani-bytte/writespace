"use client"

import { Plus } from "lucide-react"
import type { RefObject } from "react"
import { toast } from "sonner"
import { DocumentList } from "@/src/components/document/document-list"
import { DocumentSearch } from "@/src/components/document/document-search"
import { DocumentViewToggle } from "@/src/components/document/document-view-toggle"
import { SharedDocumentsList } from "@/src/components/document/shared-documents-list"
import { LoadingSpinner, LoadingState } from "@/src/components/loading-state"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ErrorBanner } from "@/src/components/ui/error-banner"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import type { BaseDocument, SharedDocument } from "@/src/types/document"

interface DocumentsSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  viewMode: "list" | "grid"
  setViewMode: (mode: "list" | "grid") => void
  // My documents
  documents: BaseDocument[]
  loading: boolean
  loadingStates: { creating?: boolean; sharing?: string | null; unsharing?: string | null }
  error: string | null
  searchQuery: string
  search: (query: string) => void
  currentDocId?: string
  onCreateDocument: () => Promise<void>
  onSelectDocument: (doc: BaseDocument) => void
  onDeleteDocument: (docId: string) => Promise<void>
  onShareDocument: (docId: string) => void
  onUnshareDocument: (docId: string) => Promise<void>
  infiniteScrollRef: RefObject<HTMLDivElement | null>
  // Shared documents
  sharedDocuments: SharedDocument[]
  sharedLoading: boolean
  sharedError: string | null
  onSelectSharedDocument: (doc: SharedDocument) => void
}

export function DocumentsSidebar({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  documents,
  loading,
  loadingStates,
  error,
  searchQuery,
  search,
  currentDocId,
  onCreateDocument,
  onSelectDocument,
  onDeleteDocument,
  onShareDocument,
  onUnshareDocument,
  infiniteScrollRef,
  sharedDocuments,
  sharedLoading,
  sharedError,
  onSelectSharedDocument,
}: DocumentsSidebarProps) {
  return (
    <div className="xl:col-span-1 order-1 xl:order-1 h-full">
      <Card className="editorial-card h-full flex flex-col">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <CardTitle className="editorial-title text-2xl font-semibold">Documentos</CardTitle>
            <div className="flex items-center gap-2">
              <DocumentViewToggle view={viewMode} onViewChange={setViewMode} />
              {activeTab === "my-documents" && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onCreateDocument}
                  disabled={loadingStates.creating}
                  aria-label="Criar novo documento"
                  className="bg-background/80"
                >
                  {loadingStates.creating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 border border-border/60 bg-background/70 p-1">
              <TabsTrigger
                value="my-documents"
                className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Meus Docs
              </TabsTrigger>
              <TabsTrigger
                value="shared-with-me"
                className="text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
              >
                Compartilhados
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-documents" className="mt-3">
              <div className="flex flex-col gap-3">
                <DocumentSearch onSearch={search} placeholder="Buscar por título ou conteúdo…" />
              </div>
            </TabsContent>

            <TabsContent value="shared-with-me" className="mt-3">
              <div className="text-center text-sm text-muted-foreground">
                Documentos compartilhados com você
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsContent value="my-documents" className="p-3">
                <div className={viewMode === "grid" ? "gap-0" : "flex flex-col gap-2"}>
                  <LoadingState
                    isLoading={loading && documents.length === 0}
                    fallback={<LoadingSpinner text="Carregando documentos…" className="py-8" />}
                  >
                    <ErrorBanner error={error} className="mb-2" />
                    {!loading && documents.length === 0 && searchQuery && (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/60 py-8 text-center text-sm text-muted-foreground">
                        Nenhum documento encontrado para "{searchQuery}"
                      </div>
                    )}
                    {!loading && documents.length === 0 && !searchQuery && (
                      <div className="rounded-lg border border-dashed border-border/70 bg-background/60 py-8 text-center text-sm text-muted-foreground">
                        Nenhum documento criado ainda.
                      </div>
                    )}
                    {!loading && documents.length > 0 && (
                      <DocumentList
                        documents={documents}
                        loading={loading}
                        currentDocId={currentDocId}
                        viewMode={viewMode}
                        onSelectDocument={onSelectDocument}
                        onDeleteDocument={onDeleteDocument}
                        onShareDocument={onShareDocument}
                        onUnshareDocument={async docId => {
                          try {
                            await onUnshareDocument(docId)
                            toast.success("Compartilhamento removido!")
                          } catch (err) {
                            toast.error(
                              err instanceof Error
                                ? err.message
                                : "Erro ao remover compartilhamento"
                            )
                          }
                        }}
                        infiniteScrollRef={infiniteScrollRef}
                      />
                    )}
                  </LoadingState>
                </div>
              </TabsContent>

              <TabsContent value="shared-with-me" className="p-3">
                <div className={viewMode === "grid" ? "gap-0" : "flex flex-col gap-2"}>
                  <LoadingState
                    isLoading={sharedLoading && sharedDocuments.length === 0}
                    fallback={
                      <LoadingSpinner
                        text="Carregando documentos compartilhados…"
                        className="py-8"
                      />
                    }
                  >
                    <ErrorBanner error={sharedError} className="mb-2" />
                    <SharedDocumentsList
                      documents={sharedDocuments}
                      loading={sharedLoading}
                      currentDocId={currentDocId}
                      viewMode={viewMode}
                      onSelectDocument={onSelectSharedDocument}
                    />
                  </LoadingState>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
