"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { logger } from "@/src/lib/logger"
import type { EmailSettings, User, UserInvite } from "@/src/types/admin"

// Re-export types for convenience
export type { EmailSettings, User, UserInvite } from "@/src/types/admin"

// Query keys factory
const adminKeys = {
  all: ["admin"] as const,
  users: () => [...adminKeys.all, "users"] as const,
  invites: () => [...adminKeys.all, "invites"] as const,
  emailSettings: () => [...adminKeys.all, "email-settings"] as const,
}

const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  id: "default",
  hasApiKey: false,
  fromEmail: "noreply@update.blasiusy.site",
  fromName: "WriteSpace",
  isActive: true,
  emailSubjectTemplate: "Convite para visualizar: {{documentTitle}}",
  emailBodyTemplate: "",
  useCustomTemplate: false,
}

// API Functions
async function fetchUsers(): Promise<{ users: User[] }> {
  const endTimer = logger.time("fetch_users", { action: "fetch_users" })

  try {
    const response = await fetch("/api/admin/users")
    const data = await response.json()

    if (!response.ok) {
      logger.api("error", "Failed to fetch users", {
        action: "fetch_users",
        status: response.status,
        error: data.error,
      })
      throw new Error(data.error || "Erro ao carregar usuários")
    }

    endTimer()
    return data
  } catch (error) {
    endTimer()
    logger.api(
      "error",
      "Failed to fetch users",
      {
        action: "fetch_users",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

async function fetchInvites(): Promise<{ invites: UserInvite[] }> {
  const endTimer = logger.time("fetch_invites", { action: "fetch_invites" })

  try {
    const response = await fetch("/api/admin/invites")
    const data = await response.json()

    if (!response.ok) {
      logger.api("error", "Failed to fetch invites", {
        action: "fetch_invites",
        status: response.status,
        error: data.error,
      })
      throw new Error(data.error || "Erro ao carregar convites")
    }

    endTimer()
    return data
  } catch (error) {
    endTimer()
    logger.api(
      "error",
      "Failed to fetch invites",
      {
        action: "fetch_invites",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

async function fetchEmailSettings(): Promise<EmailSettings> {
  const endTimer = logger.time("fetch_email_settings", { action: "fetch_email_settings" })

  try {
    const response = await fetch("/api/admin/email-settings")
    const data = await response.json()

    if (!response.ok) {
      logger.api("error", "Failed to fetch email settings", {
        action: "fetch_email_settings",
        status: response.status,
        error: data.error,
      })
      throw new Error(data.error || "Erro ao carregar configurações de email")
    }

    endTimer()
    return data.settings ? { ...DEFAULT_EMAIL_SETTINGS, ...data.settings } : DEFAULT_EMAIL_SETTINGS
  } catch (error) {
    endTimer()
    logger.api(
      "error",
      "Failed to fetch email settings",
      {
        action: "fetch_email_settings",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

async function updateEmailSettings(settings: Partial<EmailSettings>): Promise<EmailSettings> {
  const endTimer = logger.time("update_email_settings", { action: "update_email_settings" })

  try {
    logger.api("info", "Updating email settings", {
      action: "update_email_settings",
      fieldsUpdated: Object.keys(settings),
    })

    const response = await fetch("/api/admin/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.api("error", "Failed to update email settings", {
        action: "update_email_settings",
        status: response.status,
        error: data.error,
      })
      throw new Error(data.error || "Erro ao atualizar configurações")
    }

    logger.api("info", "Successfully updated email settings", {
      action: "update_email_settings",
      fieldsUpdated: Object.keys(settings),
    })

    endTimer()
    return { ...DEFAULT_EMAIL_SETTINGS, ...data.settings }
  } catch (error) {
    endTimer()
    logger.api(
      "error",
      "Failed to update email settings",
      {
        action: "update_email_settings",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

async function testEmailSettings(testEmail: string): Promise<{ message: string }> {
  const endTimer = logger.time("test_email_settings", { action: "test_email_settings" })

  try {
    logger.email("info", "Testing email configuration", {
      action: "test_email_settings",
    })

    const response = await fetch("/api/admin/email-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testEmail }),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.email("error", "Email configuration test failed", {
        action: "test_email_settings",
        status: response.status,
        error: data.error,
      })
      throw new Error(data.error || "Erro ao testar configurações")
    }

    logger.email("info", "Email configuration test successful", {
      action: "test_email_settings",
    })

    endTimer()
    return data
  } catch (error) {
    endTimer()
    logger.email(
      "error",
      "Email configuration test failed",
      {
        action: "test_email_settings",
      },
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

async function sendInvite(inviteData: {
  email: string
  documentId: string
  message?: string
}): Promise<{ message: string; emailSent?: boolean; warning?: string }> {
  const endTimer = logger.time("send_invite", { action: "send_invite" })

  try {
    logger.email("info", "Sending document invite", {
      action: "send_invite",
      recipientEmail: inviteData.email,
      documentId: inviteData.documentId,
      hasCustomMessage: !!inviteData.message,
    })

    const response = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteData),
    })

    const data = await response.json()

    if (!response.ok) {
      logger.email("error", "Failed to send invite", {
        action: "send_invite",
        recipientEmail: inviteData.email,
        documentId: inviteData.documentId,
        status: response.status,
        error: data.error,
      })
      throw new Error(data.error || "Erro ao enviar convite")
    }

    logger.email("info", "Successfully sent invite", {
      action: "send_invite",
      recipientEmail: inviteData.email,
      documentId: inviteData.documentId,
    })

    endTimer()
    return data
  } catch (error) {
    endTimer()
    logger.email(
      "error",
      "Failed to send invite",
      {
        action: "send_invite",
        recipientEmail: inviteData.email,
        documentId: inviteData.documentId,
      },
      error instanceof Error ? error : new Error(String(error))
    )
    throw error
  }
}

// Hooks
export function useUsersQuery() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useInvitesQuery() {
  return useQuery({
    queryKey: adminKeys.invites(),
    queryFn: fetchInvites,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useEmailSettingsQuery() {
  return useQuery({
    queryKey: adminKeys.emailSettings(),
    queryFn: fetchEmailSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useUpdateEmailSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateEmailSettings,
    onMutate: async newSettings => {
      logger.debug("Starting optimistic update for email settings", {
        action: "optimistic_update_email_settings",
        fieldsUpdated: Object.keys(newSettings),
      })

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: adminKeys.emailSettings() })

      // Optimistically update
      const previousSettings = queryClient.getQueryData(adminKeys.emailSettings())
      queryClient.setQueryData(adminKeys.emailSettings(), (old: EmailSettings | undefined) => ({
        ...old,
        ...newSettings,
      }))

      return { previousSettings }
    },
    onError: (_err, _newSettings, context) => {
      logger.warn("Reverting optimistic update due to error", {
        action: "revert_optimistic_update_email_settings",
      })

      // Revert optimistic update
      if (context?.previousSettings) {
        queryClient.setQueryData(adminKeys.emailSettings(), context.previousSettings)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.emailSettings() })
    },
  })
}

export function useTestEmailSettingsMutation() {
  return useMutation({
    mutationFn: testEmailSettings,
  })
}

export function useSendInviteMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: sendInvite,
    onSuccess: data => {
      logger.debug("Invalidating invites cache after successful send", {
        action: "invalidate_invites_cache",
      })
      // Invalidate invites to refresh the list
      queryClient.invalidateQueries({ queryKey: adminKeys.invites() })

      // Inform the caller about partial success (invite created but email may not have been sent)
      return data
    },
  })
}

export function useInvalidateAdminData() {
  const queryClient = useQueryClient()

  return () => {
    logger.debug("Manually invalidating all admin data", {
      action: "invalidate_all_admin_data",
    })
    queryClient.invalidateQueries({ queryKey: adminKeys.all })
  }
}
