"use client"

import { ExternalLink } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Label } from "@/src/components/ui/label"
import type { SharedDocument } from "@/src/types/document"

interface SharedDocumentInfoProps {
  document: SharedDocument | null
}

export function SharedDocumentInfo({ document }: SharedDocumentInfoProps) {
  if (!document) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-background/60 p-4 text-center text-sm text-muted-foreground">
        Selecione um documento compartilhado para ver as informações
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div>
          <Label className="editorial-kicker">PROPRIETÁRIO</Label>
          <p className="text-sm mt-1">
            {"ownerName" in document ? document.ownerName : "Desconhecido"}
          </p>
          {"ownerEmail" in document && document.ownerEmail && (
            <p className="text-xs text-muted-foreground">{document.ownerEmail}</p>
          )}
        </div>

        <div>
          <Label className="editorial-kicker">TIPO DE COMPARTILHAMENTO</Label>
          <p className="text-sm mt-1 capitalize">
            {"shareType" in document && document.shareType === "invite" ? "Convite" : "Direto"}
          </p>
        </div>

        <div>
          <Label className="editorial-kicker">CRIADO EM</Label>
          <p className="text-sm mt-1">{new Date(document.createdAt).toLocaleString("pt-BR")}</p>
        </div>

        <div>
          <Label className="editorial-kicker">ÚLTIMA MODIFICAÇÃO</Label>
          <p className="text-sm mt-1">{new Date(document.updatedAt).toLocaleString("pt-BR")}</p>
        </div>

        <div>
          <Label className="editorial-kicker">ID DO DOCUMENTO</Label>
          <p className="mt-1 break-all rounded bg-muted/70 p-2 font-mono text-xs text-foreground/90">
            {document.id}
          </p>
        </div>
      </div>

      <Button
        onClick={() => {
          if (document.shareToken) {
            window.open(`/shared/${document.shareToken}`, "_blank")
          }
        }}
        variant="outline"
        size="sm"
        className="w-full bg-background/80"
        disabled={!document.shareToken}
      >
        <ExternalLink data-icon="inline-start" />
        Abrir em nova aba
      </Button>
    </div>
  )
}
