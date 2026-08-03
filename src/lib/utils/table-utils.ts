import type { User, UserRole } from "@/src/types/admin"

export function getRoleColor(role: UserRole): string {
  return role === "dev"
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
}

export function getRoleLabel(role: UserRole): string {
  return role === "dev" ? "Desenvolvedor" : "Usuário"
}

export function getStatusColor(verified: boolean): "default" | "secondary" {
  return verified ? "default" : "secondary"
}

export function getStatusLabel(verified: boolean): string {
  return verified ? "Verificado" : "Pendente"
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function filterUsers(users: User[], searchTerm: string): User[] {
  if (!searchTerm.trim()) return users

  const search = searchTerm.toLowerCase()
  return users.filter(
    user =>
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      getRoleLabel(user.role).toLowerCase().includes(search) ||
      getStatusLabel(user.emailVerified).toLowerCase().includes(search)
  )
}

export function getColumnDisplayName(columnId: string): string {
  const columnNames: Record<string, string> = {
    name: "Nome",
    role: "Função",
    emailVerified: "Status Email",
    createdAt: "Data de Registro",
  }

  return columnNames[columnId] || columnId
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export async function downloadUsersCSV(users: User[]): Promise<void> {
  const headers = ["Nome", "Email", "Função", "Status Email", "Data de Registro"]
  const csvContent = [
    headers.join(","),
    ...users.map(user =>
      [
        `"${user.name}"`,
        `"${user.email}"`,
        `"${getRoleLabel(user.role)}"`,
        `"${getStatusLabel(user.emailVerified)}"`,
        `"${formatDate(user.createdAt)}"`,
      ].join(",")
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `usuarios-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}
