"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface LoadingStateProps {
  isLoading: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
  size?: "sm" | "md" | "lg"
  overlay?: boolean
  className?: string
}

export function LoadingState({
  isLoading,
  children,
  fallback,
  size = "md",
  overlay = false,
  className,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  }

  const defaultFallback = (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn("flex items-center justify-center py-8", className)}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      <span className="sr-only">Carregando</span>
    </div>
  )

  if (!isLoading) {
    return <>{children}</>
  }

  if (overlay) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm"
        >
          <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
          <span className="sr-only">Carregando</span>
        </div>
      </div>
    )
  }

  return <>{fallback || defaultFallback}</>
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
  text?: string
}

export function LoadingSpinner({ size = "md", className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn("flex items-center justify-center gap-2", className)}
    >
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
      {!text && <span className="sr-only">Carregando</span>}
    </div>
  )
}
