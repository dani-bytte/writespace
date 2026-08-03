"use client"

import { Calendar, Clock, Copy, ExternalLink, FileText, Mail } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { useEffect, useState } from "react"
import { RichTextViewer } from "@/src/components/editor/rich-text-viewer"
import { ThemeToggle } from "@/src/components/theme-toggle"
import { alertDialog } from "@/src/components/ui/alert-dialog-custom"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { signIn } from "@/src/lib/auth-client"

interface SharedDocument {
  document: {
    id: string
    title: string
    content: string
    createdAt: string
    updatedAt: string
  }
  sharedWithEmail: string | null
  expiresAt: string | null
}

interface SharedDocumentPageProps {
  params: Promise<{
    token: string
  }>
}

export default function SharedDocumentPage({ params }: SharedDocumentPageProps) {
  const [sharedDoc, setSharedDoc] = useState<SharedDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [validationType, setValidationType] = useState<string | null>(null)
  const [_currentPath, setCurrentPath] = useState("")
  const [shouldShowNotFound, setShouldShowNotFound] = useState(false)

  useEffect(() => {
    // Capture current path for redirect
    setCurrentPath(window.location.pathname)
  }, [])

  useEffect(() => {
    async function fetchSharedDocument() {
      try {
        setLoading(true)
        setError(null)

        const resolvedParams = await params
        const response = await fetch(`/api/shared/${resolvedParams.token}`)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 401 && data.requiresAuth) {
            setRequiresAuth(true)
            setValidationType(data.validationType)
            setError("Você precisa estar logado para visualizar este documento")
          } else if (response.status === 404) {
            // Usar página 404 genérica para não revelar informações
            setShouldShowNotFound(true)
          } else {
            // Mensagem genérica para outros erros
            setError("Não foi possível carregar o documento")
          }
          return
        }

        setSharedDoc(data)
      } catch (_err) {
        setError("Não foi possível carregar o documento")
      } finally {
        setLoading(false)
      }
    }

    fetchSharedDocument()
  }, [params])

  // Usar notFound() para erros 404
  if (shouldShowNotFound) {
    notFound()
  }

  const copyToClipboard = async () => {
    if (sharedDoc) {
      navigator.clipboard.writeText(sharedDoc.document.content)
      await alertDialog({
        title: "Sucesso!",
        description: "Conteúdo copiado para área de transferência!",
        variant: "success",
      })
    }
  }

  const handleDirectLogin = async () => {
    try {
      if (validationType === "discord") {
        // Login direto com Discord
        await signIn.social({
          provider: "discord",
          callbackURL: window.location.pathname,
        })
      } else if (validationType === "email_or_discord") {
        // Redirecionar para página de login com opções
        window.location.href = `/?redirect=${encodeURIComponent(window.location.pathname)}`
      } else {
        // Para email only, redirecionar para login normal
        window.location.href = `/?redirect=${encodeURIComponent(window.location.pathname)}`
      }
    } catch (error) {
      console.error("Erro no login:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted px-4">
        <div role="status" aria-live="polite" aria-atomic="true" className="text-center">
          <p className="editorial-kicker mb-2">Leitura Compartilhada</p>
          <div className="mx-auto mb-4 animate-spin rounded-full border-b-2 border-primary size-8"></div>
          <p className="text-muted-foreground">Carregando documento…</p>
        </div>
      </div>
    )
  }

  if (error || !sharedDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted p-4">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <Card className="editorial-card w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="editorial-title text-2xl font-semibold text-destructive">
              Erro
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {error || "Documento não encontrado"}
            </CardDescription>
          </CardHeader>
          <CardContent
            role="alert"
            aria-live="assertive"
            className="flex flex-col gap-3 text-center"
          >
            {requiresAuth ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {validationType === "email" && "Faça login com o email autorizado"}
                  {validationType === "discord" && "Faça login com sua conta Discord"}
                  {validationType === "email_or_discord" && "Faça login com email ou Discord"}
                </p>
                <Button className="w-full" onClick={handleDirectLogin}>
                  {validationType === "discord" ? "Login com Discord" : "Fazer Login"}
                </Button>
              </>
            ) : (
              <Link href="/">
                <Button className="w-full">
                  <ExternalLink data-icon="inline-start" />
                  Ir para WriteSpace
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const isExpired = sharedDoc.expiresAt && new Date(sharedDoc.expiresAt) < new Date()

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      <header className="editorial-shell sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent shadow-sm">
              <FileText className="size-4 text-primary-foreground" />
            </div>
            <h1 className="editorial-title text-xl font-semibold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
              WriteSpace
            </h1>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <span className="editorial-kicker">Leitura Compartilhada</span>
          <h2 className="editorial-title text-4xl font-semibold leading-none">Documento aberto</h2>
          <p className="text-sm text-muted-foreground">
            Conteudo em modo somente leitura com informacoes de origem e validade do link.
          </p>
        </section>

        {isExpired && (
          <Card className="editorial-card border-destructive/20 bg-destructive/10">
            <CardContent className="pt-4">
              <div className="flex items-center text-destructive">
                <Calendar className="mr-2 size-4" />
                Este link de compartilhamento expirou
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="editorial-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="editorial-title text-3xl font-semibold">
                  {sharedDoc.document.title}
                </CardTitle>
                <CardDescription className="mt-2 flex flex-wrap items-center gap-4">
                  <span className="flex items-center">
                    <Clock className="mr-1 size-4" />
                    Criado em {new Date(sharedDoc.document.createdAt).toLocaleDateString()}
                  </span>
                  {sharedDoc.sharedWithEmail && (
                    <span className="flex items-center">
                      <Mail className="mr-1 size-4" />
                      Compartilhado com {sharedDoc.sharedWithEmail}
                    </span>
                  )}
                  {sharedDoc.expiresAt && (
                    <span className="flex items-center">
                      <Calendar className="mr-1 size-4" />
                      Expira em {new Date(sharedDoc.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                <Copy data-icon="inline-start" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/60 bg-background/70 p-4 min-h-100">
              {sharedDoc.document.content ? (
                <RichTextViewer content={sharedDoc.document.content} />
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  Este documento está vazio.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/">
            <Button variant="outline" className="bg-background/80">
              <ExternalLink data-icon="inline-start" />
              Criar sua própria conta no WriteSpace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
