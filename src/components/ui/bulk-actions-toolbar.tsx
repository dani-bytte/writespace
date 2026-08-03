"use client"

import { Download, Mail, Shield, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent } from "@/src/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { downloadUsersCSV } from "@/src/lib/utils/table-utils"
import type { User } from "@/src/types/admin"

interface BulkActionsToolbarProps {
  selectedUsers: User[]
  onClearSelection: () => void
  onDeleteUsers?: (users: User[]) => void
  onChangeRole?: (users: User[], newRole: "dev" | "user") => void
  onResendVerification?: (users: User[]) => void
}

export function BulkActionsToolbar({
  selectedUsers,
  onClearSelection,
  onDeleteUsers,
  onChangeRole,
  onResendVerification,
}: BulkActionsToolbarProps) {
  const [isExporting, setIsExporting] = useState(false)

  if (selectedUsers.length === 0) return null

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await downloadUsersCSV(selectedUsers)
      toast.success(`${selectedUsers.length} usuário(s) exportado(s) com sucesso`)
    } catch {
      toast.error("Não foi possível exportar os usuários selecionados")
    } finally {
      setIsExporting(false)
    }
  }

  const handleBulkAction = (action: (users: User[]) => void, actionName: string) => {
    try {
      action(selectedUsers)
      toast.success(`${actionName} aplicada a ${selectedUsers.length} usuário(s)`)
      onClearSelection()
    } catch {
      toast.error(`Não foi possível executar a ação: ${actionName}`)
    }
  }

  const handleBulkDelete = () => {
    if (!onDeleteUsers) return

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${selectedUsers.length} usuário(s) selecionado(s)?`
    )
    if (!confirmed) return

    handleBulkAction(onDeleteUsers, "Excluir Usuários")
  }

  const unverifiedUsers = selectedUsers.filter(user => !user.emailVerified)

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {selectedUsers.length} usuário(s) selecionado(s)
          </div>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download data-icon="inline-start" />
            {isExporting ? "Exportando…" : "Exportar"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Ações em Lote
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {onChangeRole && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      handleBulkAction(users => onChangeRole(users, "dev"), "Tornar Desenvolvedor")
                    }
                  >
                    <Shield className="mr-2 size-4" />
                    Tornar Desenvolvedor
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      handleBulkAction(users => onChangeRole(users, "user"), "Tornar Usuário")
                    }
                  >
                    <Shield className="mr-2 size-4" />
                    Tornar Usuário
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {onResendVerification && unverifiedUsers.length > 0 && (
                <>
                  <DropdownMenuItem
                    onClick={() =>
                      handleBulkAction(
                        () => onResendVerification(unverifiedUsers),
                        "Reenviar Verificação"
                      )
                    }
                  >
                    <Mail className="mr-2 size-4" />
                    Reenviar Verificação ({unverifiedUsers.length})
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {onDeleteUsers && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 size-4" />
                  Excluir Usuários
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
