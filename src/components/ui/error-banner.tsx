"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
import { cn } from "@/src/lib/utils"

interface ErrorBannerProps {
  error: string | null
  className?: string
  role?: "alert" | "status"
}

export function ErrorBanner({ error, className, role = "alert" }: ErrorBannerProps) {
  if (!error) return null

  return (
    <Alert
      variant="destructive"
      role={role}
      className={cn("animate-in fade-in slide-in-from-top-2", className)}
    >
      <AlertCircle data-icon="inline-start" />
      <AlertDescription data-slot="alert-description">{error}</AlertDescription>
    </Alert>
  )
}
