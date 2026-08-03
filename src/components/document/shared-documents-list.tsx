"use client"

import { Clock, Eye, FileText, Link, Mail, User } from "lucide-react"
import { LoadingSpinner } from "@/src/components/loading-state"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/src/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip"
import type { SharedDocument } from "@/src/types/document"

interface SharedDocumentsListProps {
  documents: SharedDocument[]
  loading: boolean
  currentDocId?: string
  viewMode?: "list" | "grid"
  onSelectDocument: (doc: SharedDocument) => void
}

export function SharedDocumentsList({
  documents,
  loading,
  currentDocId,
  viewMode = "list",
  onSelectDocument,
}: SharedDocumentsListProps) {
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

  const getShareTypeInfo = (shareType: string) => {
    switch (shareType) {
      case "invite":
        return { label: "Convite", icon: Mail, color: "text-info" }
      case "direct":
        return { label: "Direto", icon: Link, color: "text-success" }
      default:
        return { label: "Desconhecido", icon: FileText, color: "text-muted-foreground" }
    }
  }

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
        <span className="ml-2">Carregando documentos compartilhados…</span>
      </div>
    )
  }

  if (!loading && documents.length === 0) {
    return (
      <Card className="editorial-card col-span-full">
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Nenhum documento compartilhado</h3>
          <p className="text-muted-foreground">
            Documentos compartilhados com você aparecerão aqui
          </p>
        </CardContent>
      </Card>
    )
  }

  const containerClasses =
    viewMode === "grid" ? "grid grid-cols-1 xl:grid-cols-2 gap-2" : "flex flex-col gap-2"

  return (
    <div className={containerClasses}>
      {documents.map(doc => {
        const shareTypeInfo = getShareTypeInfo(doc.shareType)
        const ShareIcon = shareTypeInfo.icon

        return (
          <Card
            key={doc.id}
            className={`editorial-card card-hover-effect cursor-pointer transition-all duration-200 hover:-translate-y-px hover:border-primary/30 ${
              currentDocId === doc.id ? "ring-2 ring-primary shadow-md" : ""
            } ${viewMode === "grid" ? "h-fit" : ""}`}
            onClick={() => onSelectDocument(doc)}
            role="button"
            tabIndex={0}
            aria-label={`Abrir documento compartilhado ${doc.title || "sem título"}`}
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
                    <div className="flex items-center gap-1 ml-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className={`text-xs px-1.5 py-0.5 ${shareTypeInfo.color}`}
                          >
                            <ShareIcon className="mr-1 size-2.5" />
                            {shareTypeInfo.label}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {doc.shareType === "invite"
                              ? "Compartilhado via convite por email"
                              : "Compartilhado via link direto"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CardDescription className="flex items-center gap-1 text-xs cursor-help">
                            <Clock className="size-3" />
                            {formatDate(doc.updatedAt)}
                          </CardDescription>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Última modificação: {new Date(doc.updatedAt).toLocaleString("pt-BR")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CardDescription className="flex items-center gap-1 text-xs cursor-help">
                            <User className="size-3" />
                            {doc.ownerName}
                          </CardDescription>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Proprietário: {doc.ownerName} ({doc.ownerEmail})
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              if (doc.shareToken) {
                                window.open(`/shared/${doc.shareToken}`, "_blank")
                              }
                            }}
                            className="size-7 p-0 hover:text-info"
                            aria-label="Abrir documento compartilhado em nova aba"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Abrir documento compartilhado em nova aba</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
