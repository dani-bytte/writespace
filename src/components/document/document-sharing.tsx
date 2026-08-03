"use client"

import { Copy, Link, Mail, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Separator } from "@/src/components/ui/separator"
import type { BaseDocument } from "@/src/types/document"

interface DocumentSharingProps {
  document: BaseDocument | null
  shareEmail: string
  shareEmailId: string
  onShareEmailChange: (email: string) => void
  onShareViaEmail: () => void
  onShareViaLink: () => void
  onUnshareDocument: () => void
  onClose: () => void
}

export function DocumentSharing({
  document: doc,
  shareEmail,
  shareEmailId,
  onShareEmailChange,
  onShareViaEmail,
  onShareViaLink,
  onUnshareDocument,
  onClose,
}: DocumentSharingProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  if (!doc) return null

  const shareUrl = doc.shareToken ? `${window.location.origin}/shared/${doc.shareToken}` : null

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
        toast.success("Link copiado!")
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = shareUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
        toast.success("Link copiado!")
      }
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link className="size-5" />
              Compartilhar Documento
            </CardTitle>
            <CardDescription>Compartilhe "{doc.title}" com outras pessoas</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar painel">
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {doc.shared && shareUrl && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-sm">Documento Compartilhado</h4>
              <Button variant="outline" size="sm" onClick={onUnshareDocument}>
                Parar Compartilhamento
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground">Link público:</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-sm" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="whitespace-nowrap"
                >
                  <Copy data-icon="inline-start" />
                  {copySuccess ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Compartilhado via: <strong>{doc.sharedVia}</strong>
            </p>
          </div>
        )}

        {!doc.shared && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={shareEmailId} className="flex items-center gap-2">
                <Mail className="size-4" />
                Compartilhar por Email
              </Label>
              <div className="flex gap-2">
                <Input
                  id={shareEmailId}
                  type="email"
                  placeholder="Digite o email da pessoa…"
                  autoComplete="email"
                  spellCheck={false}
                  value={shareEmail}
                  onChange={e => onShareEmailChange(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={onShareViaEmail} disabled={!shareEmail.trim()}>
                  Enviar Convite
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A pessoa receberá um email com um link para visualizar o documento
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground">
                <span className="bg-background px-2">ou</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-2">
                <Link className="size-4" />
                Criar Link Público
              </Label>
              <Button onClick={onShareViaLink} variant="outline" className="w-full">
                <Link data-icon="inline-start" />
                Gerar Link de Compartilhamento
              </Button>
              <p className="text-xs text-muted-foreground">
                Qualquer pessoa com o link poderá visualizar o documento
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
