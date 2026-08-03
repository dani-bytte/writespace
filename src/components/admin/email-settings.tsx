"use client"

import { useStore } from "@nanostores/react"
import {
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Layout,
  Loader2,
  Mail,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TestTube2,
} from "lucide-react"
import { useEffect, useId, useState } from "react"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ErrorBanner } from "@/src/components/ui/error-banner"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { Textarea } from "@/src/components/ui/textarea"
import { useSession } from "@/src/lib/auth-client"
import {
  type EmailSettings as EmailSettingsType,
  useEmailSettingsQuery,
  useTestEmailSettingsMutation,
  useUpdateEmailSettingsMutation,
} from "@/src/lib/hooks/admin/use-admin-query"
import { cn } from "@/src/lib/utils"

interface EmailSettingsProps {
  embedded?: boolean
}

export function EmailSettings({ embedded = false }: EmailSettingsProps) {
  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useEmailSettingsQuery()
  const updateSettingsMutation = useUpdateEmailSettingsMutation()
  const testEmailMutation = useTestEmailSettingsMutation()
  const sessionState = useStore(useSession)

  const [localSettings, setLocalSettings] = useState<EmailSettingsType | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const apiKeyId = useId()
  const fromNameId = useId()
  const fromEmailId = useId()
  const isActiveId = useId()
  const subjectTemplateId = useId()
  const bodyTemplateId = useId()
  const useCustomTemplateId = useId()

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings)
    }
  }, [settings])

  const error =
    settingsError?.message ||
    updateSettingsMutation.error?.message ||
    testEmailMutation.error?.message ||
    null

  const isSaving = updateSettingsMutation.isPending
  const isTesting = testEmailMutation.isPending
  const isLoading = isLoadingSettings || isSaving || isTesting

  const saveSettings = async () => {
    if (!localSettings) return
    setSuccess(null)
    try {
      await updateSettingsMutation.mutateAsync(localSettings)
      if (localSettings.apiKey?.trim()) {
        setLocalSettings(prev => (prev ? { ...prev, apiKey: undefined, hasApiKey: true } : prev))
      }
      setSuccess("Configurações salvas com sucesso!")
    } catch {}
  }

  const testEmailConnection = async () => {
    const recipient = sessionState.data?.user?.email
    if (!recipient) return
    setSuccess(null)
    try {
      const result = await testEmailMutation.mutateAsync(recipient)
      setSuccess(result.message || "E-mail de teste enviado com sucesso!")
    } catch {}
  }

  const updateSetting = (key: keyof EmailSettingsType, value: string | boolean) => {
    if (!localSettings) return
    setLocalSettings(prev => (prev ? { ...prev, [key]: value } : prev))
  }

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  if (isLoadingSettings && !localSettings) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando configurações de e-mail...</p>
        </div>
      </div>
    )
  }

  if (!localSettings) return null

  const hasApiKey = Boolean(localSettings.apiKey?.trim() || localSettings.hasApiKey)
  const isConfigured = hasApiKey && localSettings.fromEmail && localSettings.isActive

  return (
    <div className={cn("mx-auto flex w-full flex-col gap-8 pb-12", !embedded && "max-w-6xl p-6")}>
      {/* Header Section */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold bg-primary/5 text-primary border-primary/20"
            >
              Admin &bull; E-mail Service
            </Badge>
            {isConfigured ? (
              <Badge
                variant="outline"
                className="rounded-full bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              >
                <CheckCircle2 data-icon="inline-start" /> Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-full">
                Configuração pendente
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Configurações de E-mail
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Gerencie o envio de convites e notificações do sistema utilizando a infraestrutura do
            Resend.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Button
            variant="outline"
            onClick={testEmailConnection}
            disabled={isLoading || !isConfigured || !sessionState.data?.user?.email}
            className="group"
          >
            {isTesting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <TestTube2
                data-icon="inline-start"
                className="transition-transform group-hover:scale-110"
              />
            )}
            Testar Conexão
          </Button>
          <Button
            onClick={saveSettings}
            disabled={isLoading || isSaving}
            className="shadow-lg shadow-primary/20"
          >
            {isSaving ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </header>

      {/* Dynamic Feedback */}
      <div className="flex flex-col gap-4">
        <ErrorBanner error={error} />
        {success && (
          <Alert
            variant="default"
            className="animate-in fade-in slide-in-from-top-2 border-emerald-500/20 bg-emerald-500/5 text-emerald-700"
          >
            <CheckCircle2 data-icon="inline-start" />
            <AlertDescription data-slot="alert-description">{success}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden border-none bg-muted/30 shadow-none ring-1 ring-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1",
                localSettings.isActive
                  ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                  : "bg-muted text-muted-foreground ring-border"
              )}
            >
              {localSettings.isActive ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <ShieldAlert className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                Status do Serviço
              </p>
              <p className="text-xl font-bold">{localSettings.isActive ? "Ativo" : "Pausado"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none bg-muted/30 shadow-none ring-1 ring-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ring-1",
                hasApiKey
                  ? "bg-primary/10 text-primary ring-primary/20"
                  : "bg-amber-500/10 text-amber-600 ring-amber-500/20"
              )}
            >
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                API Key (Resend)
              </p>
              <p className="text-xl font-bold">{hasApiKey ? "Protegida" : "Pendente"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none bg-muted/30 shadow-none ring-1 ring-border">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20">
              <Layout className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                Modo de Template
              </p>
              <p className="text-xl font-bold">
                {localSettings.useCustomTemplate ? "Customizado" : "Padrão"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Connection Settings */}
        <Card className="lg:col-span-7 border-none shadow-xl shadow-foreground/5 ring-1 ring-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <Mail className="h-6 w-6 text-primary" />
              Configurações de Conexão
            </CardTitle>
            <CardDescription>
              Configure como os e-mails serão entregues pelo Resend.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8 pb-8">
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
              <div className="flex flex-col gap-1">
                <Label htmlFor={isActiveId} className="text-base font-bold">
                  Ativar Serviço de E-mail
                </Label>
                <p className="text-xs text-muted-foreground">
                  Habilita ou suspende o disparo automático de todos os e-mails.
                </p>
              </div>
              <Switch
                id={isActiveId}
                checked={localSettings.isActive}
                onCheckedChange={checked => updateSetting("isActive", checked)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor={apiKeyId} className="font-bold">
                  API Key do Resend
                </Label>
                <div className="relative group">
                  <Input
                    id={apiKeyId}
                    type={showApiKey ? "text" : "password"}
                    placeholder={
                      hasApiKey && !localSettings.apiKey
                        ? "••••••••••••••••••••••••••••"
                        : "re_xxxxxxxxxxxxxxxx"
                    }
                    value={localSettings.apiKey || ""}
                    onChange={e => updateSetting("apiKey", e.target.value)}
                    className="h-12 bg-muted/20 font-mono transition-all focus:bg-background pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-10 w-10 p-0 hover:bg-muted"
                    onClick={() => setShowApiKey(!showApiKey)}
                    aria-label={showApiKey ? "Ocultar API key" : "Mostrar API key"}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  Gerencie suas chaves em{" "}
                  <a
                    href="https://resend.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    resend.com/api-keys
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={fromNameId} className="font-bold">
                    Nome do Remetente
                  </Label>
                  <Input
                    id={fromNameId}
                    placeholder="WriteSpace Support"
                    value={localSettings.fromName}
                    onChange={e => updateSetting("fromName", e.target.value)}
                    className="h-11 bg-muted/20 focus:bg-background"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={fromEmailId} className="font-bold">
                    E-mail do Remetente
                  </Label>
                  <Input
                    id={fromEmailId}
                    type="email"
                    placeholder="noreply@seudominio.com"
                    value={localSettings.fromEmail}
                    onChange={e => updateSetting("fromEmail", e.target.value)}
                    className="h-11 bg-muted/20 focus:bg-background"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Settings */}
        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card className="border-none shadow-xl shadow-foreground/5 ring-1 ring-border/60">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-bold">Templates</CardTitle>
                <CardDescription>Design e conteúdo dos convites.</CardDescription>
              </div>
              <Switch
                id={useCustomTemplateId}
                checked={localSettings.useCustomTemplate || false}
                onCheckedChange={checked => updateSetting("useCustomTemplate", checked)}
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {!localSettings.useCustomTemplate ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 p-8 text-center bg-muted/5">
                  <div className="mb-4 rounded-full bg-muted p-3">
                    <Layout className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Utilizando Design Padrão</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
                    O sistema enviará o template editorial padrão do WriteSpace.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2 text-primary"
                    onClick={() => updateSetting("useCustomTemplate", true)}
                  >
                    Ativar Personalização <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-200 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor={subjectTemplateId} className="font-bold">
                      Assunto do E-mail
                    </Label>
                    <Input
                      id={subjectTemplateId}
                      placeholder="Convite para visualizar {{documentTitle}}"
                      value={localSettings.emailSubjectTemplate || ""}
                      onChange={e => updateSetting("emailSubjectTemplate", e.target.value)}
                      className="h-11 bg-muted/20 focus:bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={bodyTemplateId} className="font-bold">
                        Corpo (HTML/Texto)
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] font-bold uppercase tracking-wider text-primary"
                        onClick={() => setShowPreview(!showPreview)}
                      >
                        {showPreview ? "Editar Código" : "Ver Preview"}
                      </Button>
                    </div>

                    {showPreview ? (
                      <div className="rounded-lg border bg-slate-50 p-4 text-[13px] text-slate-800 shadow-inner min-h-[200px]">
                        <div className="mb-2 font-bold text-slate-400 uppercase tracking-tighter text-[10px]">
                          Preview Simulado
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {localSettings.emailBodyTemplate
                            ?.replace(/\{\{documentTitle\}\}/g, "Manual da Empresa.pdf")
                            ?.replace(/\{\{inviteLink\}\}/g, "https://writespace.app/invite/token")
                            ?.replace(
                              /\{\{senderName\}\}/g,
                              sessionState.data?.user?.name || "Administrador"
                            ) || "Preencha o conteúdo abaixo para ver o preview..."}
                        </div>
                      </div>
                    ) : (
                      <Textarea
                        id={bodyTemplateId}
                        placeholder="Olá! Você foi convidado para o documento {{documentTitle}}..."
                        value={localSettings.emailBodyTemplate || ""}
                        onChange={e => updateSetting("emailBodyTemplate", e.target.value)}
                        rows={8}
                        className="bg-muted/20 font-mono text-[13px] focus:bg-background"
                      />
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      <Badge
                        variant="outline"
                        className="cursor-help rounded-md border-none bg-primary/5 px-2 py-0.5 text-[10px] text-primary/80"
                        title="Substituído pelo nome do arquivo"
                      >
                        {"{{documentTitle}}"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-help rounded-md border-none bg-primary/5 px-2 py-0.5 text-[10px] text-primary/80"
                        title="O link completo de acesso"
                      >
                        {"{{inviteLink}}"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-help rounded-md border-none bg-primary/5 px-2 py-0.5 text-[10px] text-primary/80"
                        title="Nome de quem convidou"
                      >
                        {"{{senderName}}"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h4 className="flex items-center gap-2 text-sm font-bold text-primary">
              <Info className="h-4 w-4" />
              Dica de Melhor Prática
            </h4>
            <p className="mt-2 text-xs leading-relaxed text-primary/80">
              Para maior taxa de entrega, utilize um e-mail de remetente com o mesmo domínio
              configurado e verificado no seu dashboard do Resend.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
