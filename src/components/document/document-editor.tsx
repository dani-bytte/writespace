"use client"

import { Save, Type } from "lucide-react"
import { AutoSaveIndicator } from "@/src/components/auto-save-indicator"
import { RichTextEditor } from "@/src/components/editor/rich-text-editor"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { htmlToPlainText } from "@/src/lib/html-utils"
import type { BaseDocument, SharedDocument } from "@/src/types/document"

// Union type for documents (can be own document or shared)
type DocumentType = BaseDocument | SharedDocument

interface DocumentEditorProps {
  document: DocumentType | null
  title: string
  content: string
  isAutoSaving: boolean
  lastSaved: Date | null
  manualSaveLoading: boolean
  titleId: string
  contentId: string
  onTitleChange: (title: string) => void
  onContentChange: (content: string) => void
  onManualSave: () => void
  isReadOnly?: boolean
}

export function DocumentEditor({
  document,
  title,
  content,
  isAutoSaving,
  lastSaved,
  manualSaveLoading,
  titleId,
  contentId,
  onTitleChange,
  onContentChange,
  onManualSave,
  isReadOnly = false,
}: DocumentEditorProps) {
  // Always use rich text mode

  if (!document) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <h3 className="editorial-title text-2xl font-semibold mb-2 text-foreground">
            Nenhum documento selecionado
          </h3>
          <p>Selecione um documento da lista ou crie um novo</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6">
        {/* Read-only banner for shared documents */}
        {isReadOnly && "ownerName" in document && document.ownerName && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-center gap-2 text-foreground">
              <Type className="size-4" />
              <span className="text-sm font-medium">
                Documento compartilhado por {document.ownerName}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Este documento é somente leitura. Você não pode fazer alterações.
            </p>
          </div>
        )}

        {/* Header with save info and mode toggle */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="editorial-title text-3xl font-semibold">Editor de Documento</h2>
                <AutoSaveIndicator
                  isAutoSaving={isAutoSaving}
                  lastSaved={lastSaved}
                  error={null}
                  enabled={Boolean(document)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <Button
              onClick={onManualSave}
              disabled={isAutoSaving || manualSaveLoading}
              variant="outline"
              size="sm"
              className="bg-background/80"
            >
              <Save data-icon="inline-start" />
              {manualSaveLoading ? "Salvando…" : "Salvar"}
            </Button>
          )}
        </div>

        {/* Title input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor={titleId}>Título do Documento</Label>
          <Input
            id={titleId}
            type="text"
            placeholder="Digite o título do documento..."
            value={title}
            onChange={e => onTitleChange(e.target.value)}
            className="bg-background/80 text-lg font-medium"
            readOnly={isReadOnly}
            disabled={isReadOnly}
          />
        </div>

        {/* Content editor */}
        <div className="flex flex-col gap-2">
          <Label htmlFor={contentId}>Conteúdo</Label>
          <RichTextEditor
            content={content}
            onChange={onContentChange}
            placeholder="Digite o conteúdo do documento..."
            editable={!isReadOnly}
          />
        </div>

        {/* Document info */}
        <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
          <p>ID do documento: {document.id}</p>
          <p>Criado em: {new Date(document.createdAt).toLocaleString("pt-BR")}</p>
          <p>Última modificação: {new Date(document.updatedAt).toLocaleString("pt-BR")}</p>
          <p>Caracteres: {htmlToPlainText(content).length}</p>
          <p>Status: {document.shared ? `Compartilhado via ${document.sharedVia}` : "Privado"}</p>
        </div>
      </div>
    </div>
  )
}
