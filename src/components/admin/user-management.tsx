"use client"

import { Activity, Mail, Settings, Shield, Users } from "lucide-react"
import { toast } from "sonner"
import { InvitesDataTable } from "@/src/components/admin/invites-data-table"
import { UsersDataTable } from "@/src/components/admin/users-data-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ErrorBanner } from "@/src/components/ui/error-banner"
import { useInvitesQuery, useUsersQuery } from "@/src/lib/hooks/admin/use-admin-query"
import type { User } from "@/src/types/admin"

interface UserManagementProps {
  embedded?: boolean
}

export function UserManagement({ embedded = false }: UserManagementProps) {
  // Use React Query hooks
  const { data: usersData, isLoading: isLoadingUsers, error: usersError } = useUsersQuery()
  const { data: invitesData, isLoading: isLoadingInvites, error: invitesError } = useInvitesQuery()

  const users = usersData?.users || []
  const invites = invitesData?.invites || []
  const error = usersError?.message || invitesError?.message || null

  // User action handlers (placeholders for now)
  const handleViewUser = (user: User) => {
    toast.info(`Visualizando detalhes de ${user.name}`)
  }

  const handleEditUser = (user: User) => {
    toast.info(`Funcionalidade de edição para ${user.name} será implementada`)
  }

  const handleDeleteUser = (user: User) => {
    toast.warning(`Funcionalidade de exclusão para ${user.name} será implementada`)
  }

  const handleResendVerification = async (user: User) => {
    try {
      const res = await fetch("/api/admin/users/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || `Falha ao reenviar email para ${user.email}`)
        return
      }
      if (data.failed > 0) {
        toast.warning(`Email de verificação não pôde ser enviado para ${user.email}`)
      } else if (data.sent === 0) {
        toast.info(`${user.email} já está verificado`)
      } else {
        toast.success(`Email de verificação reenviado para ${user.email}`)
      }
    } catch {
      toast.error(`Erro ao reenviar email para ${user.email}`)
    }
  }

  const handleChangeRole = (user: User, newRole: "dev" | "user") => {
    toast.success(
      `Função de ${user.name} alterada para ${newRole === "dev" ? "Desenvolvedor" : "Usuário"}`
    )
  }

  // Bulk action handlers
  const handleBulkDelete = (users: User[]) => {
    toast.warning(`${users.length} usuário(s) serão excluídos`)
  }

  const handleBulkChangeRole = (users: User[], newRole: "dev" | "user") => {
    toast.success(
      `${users.length} usuário(s) terão a função alterada para ${newRole === "dev" ? "Desenvolvedor" : "Usuário"}`
    )
  }

  const handleBulkResendVerification = async (users: User[]) => {
    try {
      const res = await fetch("/api/admin/users/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: users.map(u => u.id) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Falha ao reenviar emails de verificação")
        return
      }
      if (data.failed > 0 && data.sent > 0) {
        toast.warning(`${data.sent} enviado(s), ${data.failed} com falha`)
      } else if (data.failed > 0) {
        toast.error(`Falha ao reenviar para ${data.failed} usuário(s)`)
      } else if (data.sent === 0) {
        toast.info("Todos os usuários selecionados já estão verificados")
      } else {
        toast.success(`Email de verificação reenviado para ${data.sent} usuário(s)`)
      }
    } catch {
      toast.error("Erro ao reenviar emails de verificação")
    }
  }

  const verifiedUsers = users.filter(user => user.emailVerified).length
  const pendingInvites = invites.filter(invite => invite.status === "pending").length
  const containerClass = embedded
    ? "flex flex-col gap-6"
    : "min-h-screen bg-linear-to-br from-background via-background to-muted p-4 sm:p-6"
  const contentClass = embedded ? "flex flex-col gap-6" : "mx-auto flex max-w-7xl flex-col gap-6"

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        <section className="editorial-card relative overflow-hidden p-6 sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <p className="editorial-kicker">Admin Console</p>
              <h1 className="editorial-title text-4xl font-semibold leading-none sm:text-5xl">
                Operação de usuários
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Controle permissões, verificação e convites em uma única visão operacional.
              </p>
            </div>

            <div className="flex gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-3">
              <Settings aria-hidden="true" className="size-5 text-primary" />
              <p className="max-w-64 text-xs text-muted-foreground">
                Para configurar o Resend, abra a aba "Resend e templates" no menu lateral desta área
                de administração.
              </p>
            </div>
          </div>
        </section>

        <ErrorBanner error={error} />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="editorial-card border-l-4 border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total de usuarios
                  </p>
                  <p className="text-3xl font-semibold leading-none mt-2">{users.length}</p>
                </div>
                <Users aria-hidden="true" className="size-9 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="editorial-card border-l-4 border-l-primary/70">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Usuarios verificados
                  </p>
                  <p className="text-3xl font-semibold leading-none mt-2">{verifiedUsers}</p>
                </div>
                <Shield aria-hidden="true" className="size-9 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="editorial-card border-l-4 border-l-primary/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Convites pendentes
                  </p>
                  <p className="text-3xl font-semibold leading-none mt-2">{pendingInvites}</p>
                </div>
                <Activity aria-hidden="true" className="size-9 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="editorial-card border-l-4 border-l-primary/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total de convites
                  </p>
                  <p className="text-3xl font-semibold leading-none mt-2">{invites.length}</p>
                </div>
                <Mail aria-hidden="true" className="size-9 text-primary" />
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <Card className="editorial-card xl:col-span-2">
            <CardHeader>
              <CardTitle className="editorial-title text-2xl font-semibold flex items-center">
                <Users aria-hidden="true" className="size-5 mr-2" />
                Usuarios registrados ({users.length})
              </CardTitle>
              <CardDescription>Gerencie todos os usuarios cadastrados no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <UsersDataTable
                data={users}
                isLoading={isLoadingUsers}
                onView={handleViewUser}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onResendVerification={handleResendVerification}
                onChangeRole={handleChangeRole}
                onBulkDelete={handleBulkDelete}
                onBulkChangeRole={handleBulkChangeRole}
                onBulkResendVerification={handleBulkResendVerification}
              />
            </CardContent>
          </Card>

          <Card className="editorial-card">
            <CardHeader>
              <CardTitle className="editorial-title text-xl font-semibold">Resumo rapido</CardTitle>
              <CardDescription>Indicadores de saude da administracao</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Verificacao</p>
                <p className="mt-1 text-sm text-foreground">
                  {verifiedUsers === users.length
                    ? "Todos os usuarios estao verificados."
                    : `${users.length - verifiedUsers} usuario(s) ainda nao verificado(s).`}
                </p>
              </div>
              <div className="rounded-xl border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fila de convites
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {pendingInvites > 0
                    ? `${pendingInvites} convite(s) aguardando resposta.`
                    : "Nenhum convite pendente no momento."}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="editorial-card">
          <CardHeader>
            <CardTitle className="editorial-title text-2xl font-semibold flex items-center">
              <Mail aria-hidden="true" className="size-5 mr-2" />
              Convites de acesso ({invites.length})
            </CardTitle>
            <CardDescription>Historico de convites enviados para documentos</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingInvites ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full size-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                  Carregando convites…
                </p>
              </div>
            ) : (
              <InvitesDataTable data={invites} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
