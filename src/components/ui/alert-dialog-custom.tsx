"use client"

import { AlertTriangle, CheckCircle, Info, X } from "lucide-react"
import { createRoot } from "react-dom/client"
import { Button } from "@/src/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"

export interface AlertDialogProps {
  title?: string
  description?: string
  confirmText?: string
  variant?: "default" | "success" | "warning" | "error"
  onConfirm?: () => void
}

interface AlertDialogComponentProps extends AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AlertDialogComponent({
  title = "Notificação",
  description = "",
  confirmText = "OK",
  variant = "default",
  open,
  onOpenChange,
  onConfirm,
}: AlertDialogComponentProps) {
  const handleConfirm = () => {
    onConfirm?.()
    onOpenChange(false)
  }

  const getIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle className="size-6 text-success" />
      case "warning":
        return <AlertTriangle className="size-6 text-warning" />
      case "error":
        return <X className="size-6 text-destructive" />
      default:
        return <Info className="size-6 text-info" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getIcon()}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function alertDialog(props: AlertDialogProps): Promise<void> {
  return new Promise(resolve => {
    const container = document.createElement("div")
    document.body.appendChild(container)

    const root = createRoot(container)

    const cleanup = () => {
      root.unmount()
      document.body.removeChild(container)
    }

    const handleConfirm = () => {
      props.onConfirm?.()
      resolve()
      cleanup()
    }

    root.render(
      <AlertDialogComponent
        {...props}
        open={true}
        onOpenChange={open => {
          if (!open) {
            handleConfirm()
          }
        }}
        onConfirm={handleConfirm}
      />
    )
  })
}
