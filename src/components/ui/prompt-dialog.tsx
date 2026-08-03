"use client"

import { useEffect, useId, useState } from "react"
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
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"

export interface PromptDialogProps {
  title?: string
  description?: string
  placeholder?: string
  defaultValue?: string
  confirmText?: string
  cancelText?: string
  onConfirm: (value: string) => void
  onCancel?: () => void
}

interface PromptDialogComponentProps extends PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PromptDialogComponent({
  title = "Digite um valor",
  description,
  placeholder = "",
  defaultValue = "",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: PromptDialogComponentProps) {
  const [value, setValue] = useState(defaultValue)
  const inputId = useId()

  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  const handleConfirm = () => {
    onConfirm(value)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === "Escape") {
      e.preventDefault()
      handleCancel()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor={inputId}>Valor</Label>
          <Input
            id={inputId}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            autoFocus
            className="mt-2"
          />
        </div>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:gap-2">
          <Button variant="outline" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button onClick={handleConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function promptDialog(props: PromptDialogProps): Promise<string | null> {
  return new Promise(resolve => {
    const container = document.createElement("div")
    document.body.appendChild(container)

    const root = createRoot(container)

    const cleanup = () => {
      root.unmount()
      document.body.removeChild(container)
    }

    const handleConfirm = (value: string) => {
      props.onConfirm(value)
      resolve(value)
      cleanup()
    }

    const handleCancel = () => {
      props.onCancel?.()
      resolve(null)
      cleanup()
    }

    root.render(
      <PromptDialogComponent
        {...props}
        open={true}
        onOpenChange={open => {
          if (!open) {
            handleCancel()
          }
        }}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    )
  })
}
