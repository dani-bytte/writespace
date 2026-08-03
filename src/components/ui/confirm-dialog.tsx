"use client"

import { AlertTriangle, CheckCircle, Info } from "lucide-react"
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

export interface ConfirmDialogProps {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "success" | "warning"
  onConfirm: () => void
  onCancel?: () => void
}

interface ConfirmDialogComponentProps extends ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ConfirmDialogComponentInternal({
  title = "Confirmar ação",
  description = "Tem certeza que deseja continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: ConfirmDialogComponentProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const getIcon = () => {
    switch (variant) {
      case "destructive":
        return <AlertTriangle className="size-6 text-destructive" />
      case "success":
        return <CheckCircle className="size-6 text-success" />
      case "warning":
        return <AlertTriangle className="size-6 text-warning" />
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
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Componente exportado para uso declarativo
export const ConfirmDialog = ConfirmDialogComponentInternal

export function confirmDialog(props: ConfirmDialogProps): Promise<boolean> {
  return new Promise(resolve => {
    const container = document.createElement("div")
    document.body.appendChild(container)

    const root = createRoot(container)
    let isSettled = false
    let isCleanedUp = false

    const cleanup = () => {
      if (isCleanedUp) return
      isCleanedUp = true

      root.unmount()

      if (container.parentNode === document.body) {
        document.body.removeChild(container)
      }
    }

    const settle = (result: boolean) => {
      if (isSettled) return
      isSettled = true
      resolve(result)
      cleanup()
    }

    const handleConfirm = () => {
      props.onConfirm()
      settle(true)
    }

    const handleCancel = () => {
      props.onCancel?.()
      settle(false)
    }

    root.render(
      <ConfirmDialogComponentInternal
        {...props}
        open={true}
        onOpenChange={(open: boolean) => {
          if (!open && !isSettled) {
            handleCancel()
          }
        }}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  })
}
