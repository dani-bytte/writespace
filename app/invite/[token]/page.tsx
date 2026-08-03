"use client"

import { CheckCircle, Clock, FileText, Mail, User, XCircle } from "lucide-react"
import { useParams } from "next/navigation"
import type { ReactNode } from "react"
import { useCallback, useEffect, useState } from "react"
import { ThemeToggle } from "@/src/components/theme-toggle"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Separator } from "@/src/components/ui/separator"

interface DocumentData {
  title: string
  content: string
  sharedBy: string
  sharedByEmail: string
}

interface InviteData {
  email: string
  expiresAt: string
  status: "pending" | "accepted" | "expired"
}

export default function SharedDocumentPage() {
  const params = useParams()
  const token = params.token as string

  const [document, setDocument] = useState<DocumentData | null>(null)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const fetchSharedDocument = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/invite/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Erro ao carregar documento")
        return
      }

      setDocument(data.document)
      setInvite(data.invite)
    } catch (_err) {
      setError("Erro ao carregar documento compartilhado")
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchSharedDocument()
    }
  }, [token, fetchSharedDocument])

  const handleAcceptInvite = async () => {
    if (!token) return

    setAccepting(true)
    try {
      const response = await fetch(`/api/invite/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "accept" }),
      })

      if (response.ok) {
        setInvite(prev => (prev ? { ...prev, status: "accepted" } : null))
      } else {
        const data = await response.json()
        setError(data.error || "Erro ao aceitar convite")
      }
    } catch (_err) {
      setError("Erro ao aceitar convite")
    } finally {
      setAccepting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle className="size-4 text-success" />
      case "expired":
        return <XCircle className="size-4 text-destructive" />
      case "pending":
        return <Clock className="size-4 text-warning" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-muted text-success"
      case "expired":
        return "bg-muted text-destructive"
      case "pending":
        return "bg-muted text-warning"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "accepted":
        return "Aceito"
      case "expired":
        return "Expirado"
      case "pending":
        return "Pendente"
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted flex items-center justify-center px-4">
        <div role="status" aria-live="polite" aria-atomic="true" className="text-center">
          <div className="animate-pulse">
            <FileText className="mx-auto mb-4 size-12 text-primary" />
          </div>
          <p className="editorial-kicker mb-2">Invite Access</p>
          <p className="text-muted-foreground">Carregando documento…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted flex items-center justify-center p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="editorial-card w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="size-12 text-destructive" />
            </div>
            <CardTitle className="editorial-title text-2xl font-semibold">
              Erro ao acessar documento
            </CardTitle>
          </CardHeader>
          <CardContent role="alert" aria-live="assertive">
            <p className="text-center text-muted-foreground mb-4">{error}</p>
            <Button
              onClick={() => {
                window.location.href = "/"
              }}
              className="w-full"
            >
              Ir para Página Inicial
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      <header className="editorial-shell sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent shadow-sm">
              <FileText className="size-4 text-primary-foreground" />
            </div>
            <h1 className="editorial-title text-xl font-semibold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              WriteSpace
            </h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col gap-6">
          <section className="text-center flex flex-col gap-2">
            <span className="editorial-kicker">Invite Access</span>
            <h2 className="editorial-title text-4xl font-semibold leading-none">
              Documento compartilhado
            </h2>
            <p className="text-muted-foreground text-sm">
              Consulte os dados do convite e aceite quando estiver pronto.
            </p>
          </section>

          {/* Invite Info */}
          {invite && (
            <Card className="editorial-card">
              <CardHeader>
                <CardTitle className="editorial-title text-2xl font-semibold flex items-center">
                  <Mail className="mr-2 size-5" />
                  Informações do Convite
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Email Convidado
                    </Label>
                    <p className="font-medium">{invite.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Expira em</Label>
                    <p className="font-medium">
                      {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                    <div className="flex items-center mt-1">
                      <Badge className={getStatusColor(invite.status)}>
                        <div className="flex items-center">
                          {getStatusIcon(invite.status)}
                          <span className="ml-1">{getStatusText(invite.status)}</span>
                        </div>
                      </Badge>
                    </div>
                  </div>
                </div>

                {invite.status === "pending" && (
                  <>
                    <Separator className="my-4" />
                    <div className="text-center">
                      <Button onClick={handleAcceptInvite} disabled={accepting}>
                        {accepting ? "Aceitando…" : "Aceitar Convite"}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document Content */}
          {document && (
            <Card className="editorial-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="editorial-title text-3xl font-semibold">
                    {document.title}
                  </CardTitle>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-1 size-4" />
                    <span>Compartilhado por {document.sharedBy}</span>
                  </div>
                </div>
                <CardDescription>Contato: {document.sharedByEmail}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/70 p-4">
                    {document.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Powered by{" "}
              <span className="font-semibold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                WriteSpace
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={className}>{children}</div>
}
