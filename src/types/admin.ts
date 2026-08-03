export interface User {
  id: string
  name: string
  email: string
  role: "dev" | "user"
  emailVerified: boolean
  createdAt: string
  updatedAt?: string
}

export interface UserInvite {
  id: string
  email: string
  status: "pending" | "accepted" | "expired"
  documentId: string
  documentTitle: string
  expiresAt: string
  createdAt: string
}

export interface EmailSettings {
  id: string
  apiKey?: string
  hasApiKey?: boolean
  fromEmail: string
  fromName: string
  isActive: boolean
  emailSubjectTemplate?: string
  emailBodyTemplate?: string
  useCustomTemplate?: boolean
}

export type UserRole = User["role"]
export type UserStatus = "verified" | "pending"
export type InviteStatus = UserInvite["status"]

export interface UserFilters {
  search: string
  role?: UserRole
  status?: UserStatus
  dateRange?: {
    from: string
    to?: string
  }
}

export interface BulkAction {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  action: (selectedUsers: User[]) => void | Promise<void>
  variant?: "default" | "destructive"
}
