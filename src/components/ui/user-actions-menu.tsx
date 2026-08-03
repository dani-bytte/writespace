"use client"

import { Copy, Edit, Eye, Mail, MoreHorizontal, Shield, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { copyToClipboard } from "@/src/lib/utils/table-utils"
import type { User } from "@/src/types/admin"

interface UserActionsMenuProps {
  user: User
  onEdit?: (user: User) => void
  onView?: (user: User) => void
  onDelete?: (user: User) => void
  onResendVerification?: (user: User) => void
  onChangeRole?: (user: User, newRole: "dev" | "user") => void
}

export function UserActionsMenu({
  user,
  onEdit,
  onView,
  onDelete,
  onResendVerification,
  onChangeRole,
}: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleCopyId = async () => {
    try {
      await copyToClipboard(user.id)
      toast.success("ID copiado para a área de transferência")
    } catch {
      toast.error("Não foi possível copiar o ID do usuário")
    }
    setIsOpen(false)
  }

  const handleCopyEmail = async () => {
    try {
      await copyToClipboard(user.email)
      toast.success("Email copiado para a área de transferência")
    } catch {
      toast.error("Não foi possível copiar o email do usuário")
    }
    setIsOpen(false)
  }

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  const handleDeleteWithConfirm = () => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)
    if (!confirmed) {
      setIsOpen(false)
      return
    }

    handleAction(() => onDelete?.(user))
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="size-8 p-0 hover:bg-muted" aria-haspopup="menu">
          <span className="sr-only">Abrir menu de ações</span>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Ações</span>
          <span className="truncate text-sm font-medium text-foreground" title={user.name}>
            {user.name}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuItem onClick={handleCopyId}>
          <Copy className="mr-2 size-4" />
          Copiar ID
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopyEmail}>
          <Copy className="mr-2 size-4" />
          Copiar Email
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {onView && (
          <DropdownMenuItem onClick={() => handleAction(() => onView(user))}>
            <Eye className="mr-2 size-4" />
            Ver Detalhes
          </DropdownMenuItem>
        )}

        {onEdit && (
          <DropdownMenuItem onClick={() => handleAction(() => onEdit(user))}>
            <Edit className="mr-2 size-4" />
            Editar usuario
          </DropdownMenuItem>
        )}

        {onChangeRole && (
          <DropdownMenuItem
            onClick={() =>
              handleAction(() => onChangeRole(user, user.role === "dev" ? "user" : "dev"))
            }
          >
            <Shield className="mr-2 size-4" />
            {user.role === "dev" ? "Tornar Usuario" : "Tornar Desenvolvedor"}
          </DropdownMenuItem>
        )}

        {!user.emailVerified && onResendVerification && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleAction(() => onResendVerification(user))}>
              <Mail className="mr-2 size-4" />
              Reenviar verificacao
            </DropdownMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleDeleteWithConfirm}
            >
              <Trash2 className="mr-2 size-4" />
              Excluir usuario
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
