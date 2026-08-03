"use client"

import { Copy, Eye, Mail } from "lucide-react"
import { useId } from "react"
import { toast } from "sonner"
import { LoadingSpinner } from "@/src/components/loading-state"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { Separator } from "@/src/components/ui/separator"
import type { BaseDocument, SharedDocument } from "@/src/types/document"

export type ValidationType = "none" | "email" | "discord" | "email_or_discord"

interface SharingPanelProps {
  currentDoc: BaseDocument | SharedDocument | null
  loadingStates: { sharing?: string | null; unsharing?: string | null }
  // Validation state
  validationType: ValidationType
  setValidationType: (type: ValidationType) => void
  shareEmail: string
  setShareEmail: (email: string) => void
  shareDiscordId: string
  setShareDiscordId: (id: string) => void
  emailError: string
  setEmailError: (error: string) => void
  discordIdError: string
  setDiscordIdError: (error: string) => void
  // Actions
  onShareViaEmail: () => Promise<void>
  onGenerateShareLink: () => Promise<void>
  onUnshareDocument: (docId: string) => Promise<void>
  isValidForSharing: () => boolean
}

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

const validateDiscordId = (discordId: string): boolean => {
  const discordIdRegex = /^\d{17,19}$/
  return discordIdRegex.test(discordId)
}

export function SharingPanel({
  currentDoc,
  loadingStates,
  validationType,
  setValidationType,
  shareEmail,
  setShareEmail,
  shareDiscordId,
  setShareDiscordId,
  emailError,
  setEmailError,
  discordIdError,
  setDiscordIdError,
  onShareViaEmail,
  onGenerateShareLink,
  onUnshareDocument,
  isValidForSharing,
}: SharingPanelProps) {
  const validationTypeId = useId()
  const shareEmailId = useId()
  const shareEmailErrorId = useId()
  const shareDiscordIdField = useId()
  const shareDiscordErrorId = useId()

  const handleEmailChange = (email: string) => {
    setShareEmail(email)
    if (email && !validateEmail(email)) {
      setEmailError("Formato de email inválido")
    } else {
      setEmailError("")
    }
  }

  const handleDiscordIdChange = (discordId: string) => {
    setShareDiscordId(discordId)
    if (discordId && !validateDiscordId(discordId)) {
      setDiscordIdError("Discord ID deve ter 17-19 dígitos (ex: 123456789012345678)")
    } else {
      setDiscordIdError("")
    }
  }

  const handleValidationTypeChange = (value: ValidationType) => {
    setValidationType(value)
    setShareEmail("")
    setShareDiscordId("")
    setEmailError("")
    setDiscordIdError("")
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Validation Type Selection */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={validationTypeId}>Tipo de Validação</Label>
        <Select value={validationType} onValueChange={handleValidationTypeChange}>
          <SelectTrigger id={validationTypeId} className="bg-background/80">
            <SelectValue placeholder="Selecione a validação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">🌐 Acesso livre (sem validação)</SelectItem>
            <SelectItem value="email">✉️ Apenas email autorizado</SelectItem>
            <SelectItem value="discord">🎮 Apenas Discord ID autorizado</SelectItem>
            <SelectItem value="email_or_discord">🔄 Email OU Discord ID</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {validationType === "none" && "Qualquer pessoa com o link pode acessar"}
          {validationType === "email" && "Apenas usuários logados com o email especificado"}
          {validationType === "discord" && "Apenas usuários logados com o Discord ID especificado"}
          {validationType === "email_or_discord" &&
            "Usuários logados com email ou Discord ID especificado"}
        </p>
      </div>

      {/* Email field */}
      {(validationType === "email" || validationType === "email_or_discord") && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={shareEmailId}>
            Email autorizado {validationType === "email_or_discord" && "(opcional)"}
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                id={shareEmailId}
                type="email"
                value={shareEmail}
                onChange={e => handleEmailChange(e.target.value)}
                placeholder="email@exemplo.com"
                className="bg-background/80"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? shareEmailErrorId : undefined}
                disabled={!currentDoc}
              />
              {emailError && (
                <p id={shareEmailErrorId} className="mt-1 text-xs text-destructive">
                  {emailError}
                </p>
              )}
            </div>
            <Button
              size="icon"
              onClick={onShareViaEmail}
              aria-label="Compartilhar por email"
              disabled={
                !isValidForSharing() || loadingStates.sharing === currentDoc?.id || !currentDoc
              }
            >
              {loadingStates.sharing === currentDoc?.id ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Mail className="size-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Discord ID field */}
      {(validationType === "discord" || validationType === "email_or_discord") && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={shareDiscordIdField}>
            Discord ID {validationType === "email_or_discord" && "(opcional)"}
          </Label>
          <Input
            id={shareDiscordIdField}
            type="text"
            value={shareDiscordId}
            onChange={e => handleDiscordIdChange(e.target.value)}
            placeholder="123456789012345678"
            className="bg-background/80"
            aria-invalid={Boolean(discordIdError)}
            aria-describedby={discordIdError ? shareDiscordErrorId : undefined}
            disabled={!currentDoc}
          />
          {discordIdError && (
            <p id={shareDiscordErrorId} className="mt-1 text-xs text-destructive">
              {discordIdError}
            </p>
          )}
        </div>
      )}

      <Separator />

      {/* Share link button */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Link de compartilhamento</span>
        <Button
          variant="outline"
          className="w-full justify-start bg-background/80"
          onClick={onGenerateShareLink}
          disabled={!isValidForSharing() || loadingStates.sharing === currentDoc?.id || !currentDoc}
        >
          {loadingStates.sharing === currentDoc?.id ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Gerando link…
            </>
          ) : (
            <>
              <Copy data-icon="inline-start" />
              Gerar e copiar link
            </>
          )}
        </Button>
      </div>

      {/* Already shared indicator */}
      {currentDoc?.shared && (
        <div className="rounded-lg border border-border/60 bg-accent/10 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-accent-foreground">
              <Eye className="mr-2 size-4" />
              Compartilhado via {currentDoc.sharedVia === "email" ? "email" : "link"}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await onUnshareDocument(currentDoc.id)
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "Erro ao remover compartilhamento"
                  )
                }
              }}
              disabled={loadingStates.unsharing === currentDoc?.id}
              className="text-xs"
            >
              Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
