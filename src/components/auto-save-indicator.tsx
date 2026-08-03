"use client"

import { Check, Clock, WifiOff } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface AutoSaveIndicatorProps {
  isAutoSaving: boolean
  lastSaved: Date | null
  error: string | null
  enabled: boolean
  className?: string
}

export function AutoSaveIndicator({
  isAutoSaving,
  lastSaved,
  error,
  enabled,
  className,
}: AutoSaveIndicatorProps) {
  if (!enabled) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
      >
        <WifiOff className="size-3" />
        Auto-save desabilitado
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn("flex items-center gap-1 text-xs text-destructive", className)}
      >
        <WifiOff className="size-3" />
        Erro no auto-save
      </div>
    )
  }

  if (isAutoSaving) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("flex items-center gap-1 text-xs text-primary", className)}
      >
        <div className="size-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Salvando…
      </div>
    )
  }

  if (lastSaved) {
    const timeDiff = Date.now() - lastSaved.getTime()
    const seconds = Math.floor(timeDiff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    let timeText = ""
    if (hours > 0) {
      timeText = `${hours}h atrás`
    } else if (minutes > 0) {
      timeText = `${minutes}m atrás`
    } else if (seconds > 30) {
      timeText = `${seconds}s atrás`
    } else {
      timeText = "agora mesmo"
    }

    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("flex items-center gap-1 text-xs text-primary", className)}
      >
        <Check className="size-3" />
        Salvo {timeText}
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <Clock className="size-3" />
      Aguardando alterações…
    </div>
  )
}
