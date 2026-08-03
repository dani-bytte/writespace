"use client"

import { Clock, Eye, FileText, Link, Share2, Trash2 } from "lucide-react"
import { LoadingSpinner } from "@/src/components/loading-state"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/src/components/ui/card"
import { confirmDialog } from "@/src/components/ui/confirm-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip"
import type { BaseDocument } from "@/src/types/document"

interface DocumentListProps {
  documents: BaseDocument[]
  loading: boolean
  currentDocId?: string
  viewMode?: "list" | "grid"
  onSelectDocument: (doc: BaseDocument) => void
  onDeleteDocument: (docId: string) => void
  onShareDocument: (docId: string) => void
  onUnshareDocument: (docId: string) => void
  infiniteScrollRef?: React.RefObject<HTMLDivElement | null>
}

export function DocumentList({
  documents,
  loading,
  currentDocId,
  viewMode = "list",
  onSelectDocument,
  onDeleteDocument,
  onShareDocument,
  onUnshareDocument,
  infiniteScrollRef,
}: DocumentListProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    } catch {
      return "Data inválida"
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Carregando documentos…</span>
      </div>
    )
  }

  if (!loading && documents.length === 0) {
    return (
      <Card className="editorial-card col-span-full">
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
          <p className="text-muted-foreground">Crie seu primeiro documento para começar</p>
        </CardContent>
      </Card>
    )
  }

  const containerClasses =
    viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-2" : "flex flex-col gap-2"

  return (
    <div className={containerClasses}>
      {documents.map(doc => (
        <Card
          key={doc.id}
          className={`editorial-card card-hover-effect cursor-pointer transition-all duration-200 hover:-translate-y-px hover:border-primary/30 ${
            currentDocId === doc.id ? "ring-2 ring-primary shadow-md" : ""
          } ${viewMode === "grid" ? "h-fit" : ""}`}
          onClick={() => onSelectDocument(doc)}
          role="button"
          tabIndex={0}
          aria-label={`Abrir documento ${doc.title || "sem título"}`}
          onKeyDown={event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              onSelectDocument(doc)
            }
          }}
        >
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardTitle className="text-sm font-medium truncate cursor-help">
                        {doc.title || "Documento sem título"}
                      </CardTitle>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{doc.title || "Documento sem título"}</p>
                    </TooltipContent>
                  </Tooltip>
                  {doc.shared === true && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 ml-1 shrink-0">
                          {doc.sharedVia === "email" ? "Email" : "Link"}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {doc.sharedVia === "email"
                            ? "Compartilhado por email"
                            : "Compartilhado por link público"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CardDescription className="flex items-center gap-1 text-xs cursor-help">
                        <Clock className="size-3" />
                        {formatDate(doc.updatedAt)}
                      </CardDescription>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Última modificação: {new Date(doc.updatedAt).toLocaleString("pt-BR")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1">
                    {doc.shared && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              if (doc.sharedVia === "link") {
                                window.open(`/shared/${doc.shareToken}`, "_blank")
                              }
                            }}
                            className="size-7 p-0 hover:text-info"
                            aria-label={
                              doc.sharedVia === "link"
                                ? "Abrir documento compartilhado"
                                : "Visualizar compartilhamento por email"
                            }
                          >
                            {doc.sharedVia === "link" ? (
                              <Link className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {doc.sharedVia === "link"
                              ? "Abrir documento em nova aba"
                              : "Visualizar documento compartilhado por email"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            if (doc.shared) {
                              onUnshareDocument(doc.id)
                            } else {
                              onShareDocument(doc.id)
                            }
                          }}
                          className={`size-7 p-0 ${
                            doc.shared ? "hover:text-warning" : "hover:text-success"
                          }`}
                          aria-label={
                            doc.shared ? "Parar compartilhamento" : "Compartilhar documento"
                          }
                        >
                          <Share2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {doc.shared
                            ? "Parar compartilhamento do documento"
                            : "Compartilhar documento via email ou link"}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async e => {
                            e.stopPropagation()
                            const confirmed = await confirmDialog({
                              title: "Excluir documento",
                              description:
                                "Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.",
                              confirmText: "Excluir",
                              cancelText: "Cancelar",
                              variant: "destructive",
                              onConfirm: () => {},
                            })
                            if (confirmed) {
                              onDeleteDocument(doc.id)
                            }
                          }}
                          className="size-7 p-0 hover:text-destructive"
                          aria-label="Excluir documento"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Excluir documento permanentemente</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Infinite scroll trigger */}
      {infiniteScrollRef && (
        <div
          ref={infiniteScrollRef}
          className={`h-10 flex items-center justify-center ${
            viewMode === "grid" ? "col-span-full" : ""
          }`}
        >
          {loading && <LoadingSpinner />}
        </div>
      )}
    </div>
  )
}
