"use client"

import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/src/components/ui/button"

interface GenerateButtonProps {
  isGenerating: boolean
  disabled?: boolean
  onClick: () => void
}

/**
 * Botão de geração de playlist com estado de loading
 */
export function GenerateButton({ isGenerating, disabled, onClick }: GenerateButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isGenerating || disabled}
      className="h-12 w-full text-lg"
    >
      {isGenerating ? (
        <>
          <Loader2 data-icon="inline-start" className="animate-spin" />
          Gerando playlist…
        </>
      ) : (
        <>
          <Sparkles data-icon="inline-start" />
          Gerar Playlist
        </>
      )}
    </Button>
  )
}
