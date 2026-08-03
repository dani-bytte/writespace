"use client"

import { Clock, FileText, Mail, Share2, Shield, Users } from "lucide-react"
import { useCallback, useId, useMemo, useState } from "react"
import { toast } from "sonner"
import { EmailSettings, UserManagement } from "@/src/components/admin"
import { DocumentEditor } from "@/src/components/document/document-editor"
import { RichTextViewer } from "@/src/components/editor/rich-text-viewer"
import { AppHeader } from "@/src/components/layout"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ErrorBanner } from "@/src/components/ui/error-banner"
import { signOut, useAuth } from "@/src/lib/hooks/auth/use-auth"
import { useAutoSave } from "@/src/lib/hooks/documents/use-auto-save"
import { useDocuments } from "@/src/lib/hooks/documents/use-documents"
import { useSharedDocuments } from "@/src/lib/hooks/documents/use-shared-documents"
import { useNavigation } from "@/src/lib/hooks/ui/use-navigation"
import { logger } from "@/src/lib/logger"
import type { BaseDocument, SharedDocument } from "@/src/types/document"
import { DocumentsSidebar } from "./documents-sidebar"
import { SharedDocumentInfo } from "./shared-doc-info"
import { SharingPanel, type ValidationType } from "./sharing-panel"

interface DashboardProps {
  onLogout: () => void
}

type AdminSurface = "documents" | "user-management" | "email-settings"

// Auto-save data type
interface DocumentSaveData {
  title: string
  content: string
  documentId?: string
}

export function Dashboard({ onLogout }: DashboardProps) {
  const { userId, isAdmin, userName, userEmail, user } = useAuth()
  const { isNavigating } = useNavigation()
  const titleId = useId()
  const contentId = useId()

  const [activeTab, setActiveTab] = useState("my-documents")

  const {
    documents,
    loading,
    loadingStates,
    error,
    searchQuery,
    search,
    createDocument,
    updateDocument,
    deleteDocument,
    shareDocument,
    unshareDocument,
    infiniteScrollRef,
  } = useDocuments(activeTab === "my-documents")

  const {
    documents: sharedDocuments,
    loading: sharedLoading,
    error: sharedError,
  } = useSharedDocuments(activeTab === "shared-with-me")

  const [currentDoc, setCurrentDoc] = useState<BaseDocument | SharedDocument | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [shareEmail, setShareEmail] = useState("")
  const [shareDiscordId, setShareDiscordId] = useState("")
  const [validationType, setValidationType] = useState<ValidationType>("none")
  const [manualSaveLoading, setManualSaveLoading] = useState(false)
  const [adminSurface, setAdminSurface] = useState<AdminSurface>("documents")
  const [emailError, setEmailError] = useState("")
  const [discordIdError, setDiscordIdError] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")

  // Validation functions - definidas fora do componente para evitar recriação
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }, [])

  const validateDiscordId = useCallback((discordId: string): boolean => {
    const discordIdRegex = /^\d{17,19}$/
    return discordIdRegex.test(discordId)
  }, [])

  const isValidForSharing = useCallback((): boolean => {
    switch (validationType) {
      case "email":
        return Boolean(shareEmail && validateEmail(shareEmail) && emailError === "")
      case "discord":
        return Boolean(shareDiscordId && validateDiscordId(shareDiscordId) && discordIdError === "")
      case "email_or_discord": {
        const hasValidEmail = Boolean(shareEmail && validateEmail(shareEmail) && emailError === "")
        const hasValidDiscordId = Boolean(
          shareDiscordId && validateDiscordId(shareDiscordId) && discordIdError === ""
        )
        return hasValidEmail || hasValidDiscordId
      }
      default:
        return true
    }
  }, [
    validationType,
    shareEmail,
    shareDiscordId,
    emailError,
    discordIdError,
    validateDiscordId,
    validateEmail,
  ])

  // Auto-save configuration
  const autoSaveData = useMemo(
    () => ({
      title,
      content,
      documentId: currentDoc?.id,
    }),
    [title, content, currentDoc?.id]
  )

  const handleAutoSave = useCallback(
    async (data: DocumentSaveData) => {
      if (!data.documentId) return
      await updateDocument(data.documentId, {
        title: data.title,
        content: data.content,
      })
    },
    [updateDocument]
  )

  const {
    isSaving: isAutoSaving,
    lastSaved,
    error: autoSaveError,
    forceSave,
  } = useAutoSave(autoSaveData, {
    delay: 2000,
    enabled: Boolean(currentDoc?.id),
    onSave: handleAutoSave,
  })

  // REMOVIDO: Auto-load do primeiro documento
  // Agora o usuário precisa selecionar manualmente qual documento editar

  const createNewDocument = async () => {
    try {
      const newDoc = await createDocument("Novo documento", "")
      setCurrentDoc(newDoc)
      setTitle(newDoc.title)
      setContent("")
      toast.success("Documento criado com sucesso!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar documento")
    }
  }

  const saveDocument = async () => {
    if (!currentDoc) return
    try {
      setManualSaveLoading(true)
      await forceSave()
      toast.success("Documento salvo com sucesso!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar documento")
    } finally {
      setManualSaveLoading(false)
    }
  }

  const shareViaEmail = async () => {
    if (!currentDoc || !isValidForSharing()) return
    try {
      const shareData = await shareDocument(
        currentDoc.id,
        "email",
        shareEmail,
        shareDiscordId || undefined,
        validationType
      )
      setCurrentDoc({
        ...currentDoc,
        shared: true,
        sharedVia: "email",
        shareToken: shareData.shareToken,
      })
      setShareEmail("")
      setShareDiscordId("")
      setEmailError("")
      setDiscordIdError("")
      toast.success(`Convite enviado para ${shareEmail}!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao compartilhar por email")
    }
  }

  const generateShareLink = async () => {
    if (!currentDoc || !isValidForSharing()) return
    try {
      const shareData = await shareDocument(
        currentDoc.id,
        "link",
        shareEmail || undefined,
        shareDiscordId || undefined,
        validationType
      )
      await navigator.clipboard.writeText(shareData.shareUrl)
      setCurrentDoc({
        ...currentDoc,
        shared: true,
        sharedVia: "link",
        shareToken: shareData.shareToken,
      })
      setShareEmail("")
      setShareDiscordId("")
      toast.success("Link copiado para área de transferência!")
      setEmailError("")
      setDiscordIdError("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao gerar link")
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(docId)
      if (currentDoc?.id === docId) {
        const remaining = documents.filter(d => d.id !== docId)
        if (remaining.length > 0) {
          setCurrentDoc(remaining[0])
          setTitle(remaining[0].title)
          setContent(remaining[0].content)
        } else {
          setCurrentDoc(null)
          setTitle("")
          setContent("")
        }
      }
      toast.success("Documento excluído!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir documento")
    }
  }

  const handleUnshareDocument = async (docId: string) => {
    await unshareDocument(docId)
    if (currentDoc?.id === docId) {
      setCurrentDoc({
        ...currentDoc,
        shared: false,
        sharedVia: null,
        shareToken: null,
      })
    }
  }

  const handleSelectDocument = useCallback((doc: BaseDocument | SharedDocument) => {
    setCurrentDoc(doc)
    setTitle(doc.title)
    setContent(doc.content)
  }, [])

  const handleShareDocumentSelection = useCallback(
    (docId: string) => {
      const doc = documents.find(d => d.id === docId)
      if (doc) {
        setCurrentDoc(doc)
        setTitle(doc.title)
        setContent(doc.content)
      }
    },
    [documents]
  )

  const handleLogout = async () => {
    try {
      await signOut()
      onLogout()
    } catch (err) {
      logger.error(
        "Error during logout",
        { action: "logout", userId: userId ?? undefined },
        err instanceof Error ? err : new Error(String(err))
      )
      onLogout()
    }
  }

  const isAdminSurfaceActive = isAdmin && adminSurface !== "documents"

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      <AppHeader
        userName={userName || "Usuário"}
        userEmail={userEmail || ""}
        userImage={user?.image || undefined}
        isAdmin={isAdmin}
        isNavigating={isNavigating}
        onShowUserManagement={() => setAdminSurface("user-management")}
        onShowEmailSettings={() => setAdminSurface("email-settings")}
        onLogout={handleLogout}
      />

      {isAdminSurfaceActive ? (
        <div className="container mx-auto flex flex-col gap-6 px-4 py-6">
          <section className="editorial-card relative overflow-hidden p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 top-1/2 size-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
            />
            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-2">
                <p className="editorial-kicker">Admin Studio</p>
                <h1 className="editorial-title text-4xl font-semibold leading-none sm:text-5xl">
                  Administração integrada
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                  Gerencie usuários e configuração de envio sem sair do fluxo principal do
                  WriteSpace.
                </p>
              </div>

              <Button variant="outline" onClick={() => setAdminSurface("documents")}>
                <FileText data-icon="inline-start" />
                Voltar para documentos
              </Button>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <Card className="editorial-card h-fit xl:sticky xl:top-24">
              <CardHeader>
                <CardTitle className="editorial-title text-xl">Navegação admin</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button
                  variant={adminSurface === "user-management" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setAdminSurface("user-management")}
                >
                  <Shield data-icon="inline-start" />
                  Usuários e convites
                </Button>
                <Button
                  variant={adminSurface === "email-settings" ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setAdminSurface("email-settings")}
                >
                  <Mail data-icon="inline-start" />
                  Resend e templates
                </Button>
              </CardContent>
            </Card>

            <div>
              {adminSurface === "user-management" ? (
                <UserManagement embedded />
              ) : (
                <EmailSettings embedded />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-6 h-[calc(100vh-4rem)]">
          <h1 className="sr-only">Painel de documentos do WriteSpace</h1>
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full items-stretch">
            <DocumentsSidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              viewMode={viewMode}
              setViewMode={setViewMode}
              documents={documents}
              loading={loading}
              loadingStates={loadingStates}
              error={error}
              searchQuery={searchQuery}
              search={search}
              currentDocId={currentDoc?.id}
              onCreateDocument={createNewDocument}
              onSelectDocument={handleSelectDocument}
              onDeleteDocument={handleDeleteDocument}
              onShareDocument={handleShareDocumentSelection}
              onUnshareDocument={handleUnshareDocument}
              infiniteScrollRef={infiniteScrollRef}
              sharedDocuments={sharedDocuments}
              sharedLoading={sharedLoading}
              sharedError={sharedError}
              onSelectSharedDocument={handleSelectDocument}
            />

            {/* Editor principal */}
            <div className="xl:col-span-2 order-2 xl:order-2">
              <Card className="editorial-card h-full">
                <CardContent className="p-6">
                  <ErrorBanner error={autoSaveError} className="mb-4" />

                  {activeTab === "my-documents" && currentDoc ? (
                    <DocumentEditor
                      document={currentDoc}
                      title={title}
                      content={content}
                      isAutoSaving={isAutoSaving}
                      lastSaved={lastSaved}
                      manualSaveLoading={manualSaveLoading}
                      titleId={titleId}
                      contentId={contentId}
                      onTitleChange={setTitle}
                      onContentChange={setContent}
                      onManualSave={saveDocument}
                    />
                  ) : activeTab === "my-documents" && !currentDoc ? (
                    <div className="flex items-center justify-center h-96 text-muted-foreground">
                      <div className="flex flex-col gap-4 text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
                          <FileText className="size-8" />
                        </div>
                        <div>
                          <h3 className="editorial-title text-2xl font-semibold mb-2 text-foreground">
                            Nenhum documento selecionado
                          </h3>
                          <p className="text-sm">Selecione um documento da lista ou crie um novo</p>
                        </div>
                      </div>
                    </div>
                  ) : !currentDoc ? (
                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                      <div className="text-center">
                        <h3 className="editorial-title text-2xl font-semibold mb-2 text-foreground">
                          Nenhum documento selecionado
                        </h3>
                        <p>Selecione um documento compartilhado da lista</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      <div>
                        <h2 className="editorial-title text-3xl font-semibold">
                          {currentDoc.title}
                        </h2>
                        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="mr-1 size-4" />
                            Criado em {new Date(currentDoc.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          {"ownerName" in currentDoc && currentDoc.ownerName && (
                            <span className="flex items-center">
                              <Users className="mr-1 size-4" />
                              Compartilhado por {currentDoc.ownerName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/70 p-4 min-h-100">
                        {currentDoc.content ? (
                          <RichTextViewer content={currentDoc.content} />
                        ) : (
                          <div className="flex items-center justify-center h-32 text-muted-foreground">
                            Este documento está vazio.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Painel lateral direito */}
            <div className="xl:col-span-1 order-3 xl:order-3">
              <Card className="editorial-card h-full">
                <CardHeader>
                  <CardTitle className="editorial-title text-2xl font-semibold flex items-center">
                    {activeTab === "my-documents" ? (
                      <>
                        <Share2 className="mr-2 size-4" />
                        Compartilhar
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 size-4" />
                        Informações
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {activeTab === "my-documents" ? (
                    <SharingPanel
                      currentDoc={currentDoc}
                      loadingStates={loadingStates}
                      validationType={validationType}
                      setValidationType={setValidationType}
                      shareEmail={shareEmail}
                      setShareEmail={setShareEmail}
                      shareDiscordId={shareDiscordId}
                      setShareDiscordId={setShareDiscordId}
                      emailError={emailError}
                      setEmailError={setEmailError}
                      discordIdError={discordIdError}
                      setDiscordIdError={setDiscordIdError}
                      onShareViaEmail={shareViaEmail}
                      onGenerateShareLink={generateShareLink}
                      onUnshareDocument={handleUnshareDocument}
                      isValidForSharing={isValidForSharing}
                    />
                  ) : (
                    <SharedDocumentInfo document={currentDoc as SharedDocument | null} />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
