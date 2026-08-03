"use client"

import { Loader2, LogOut, Moon, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { ThemeToggle } from "@/src/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Separator } from "@/src/components/ui/separator"
import { signOut } from "@/src/lib/auth-client"
import { useAuth } from "@/src/lib/hooks/auth/use-auth"
import { useDisconnectSpotifyMutation, useSpotifyStatus } from "@/src/lib/hooks/music/use-music"

// Discord icon component
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="Discord"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  )
}

// Spotify icon component
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="Spotify"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

// YouTube icon component (for future use)
function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label="YouTube Music"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isPending, user, userEmail } = useAuth()
  const { data: spotifyStatus, isLoading: isLoadingSpotify } = useSpotifyStatus()
  const disconnectSpotify = useDisconnectSpotifyMutation()
  const [isMounted, setIsMounted] = useState(false)
  const [hasDiscordAsOnlyLogin, setHasDiscordAsOnlyLogin] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !isAuthenticated) {
      router.replace("/?redirect=/profile")
    }
  }, [isAuthenticated, isPending, router])

  // Check if Discord is the only login method
  useEffect(() => {
    // If user doesn't have email verified or password set, Discord might be only login
    // This is a simplified check - in production, you'd check the accounts table
    if (user) {
      const hasEmail = userEmail && !userEmail.includes("@discord.")
      const hasPassword = true // Assume has password if not OAuth-only
      // For now, we'll assume if logged in via Discord and email looks like Discord placeholder
      setHasDiscordAsOnlyLogin(!hasEmail && !hasPassword)
    }
  }, [user, userEmail])

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  const handleDisconnectSpotify = async () => {
    try {
      await disconnectSpotify.mutateAsync()
      toast.success("Spotify desconectado!")
    } catch (_error) {
      toast.error("Erro ao desconectar Spotify")
    }
  }

  const handleConnectSpotify = () => {
    window.location.href = "/api/auth/spotify"
  }

  const getInitials = (name?: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isMounted || isPending || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      {/* Simple header */}
      <header className="editorial-shell sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            ← Voltar
          </Button>
          <h1 className="editorial-title text-xl font-semibold">Meu Perfil</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <span className="editorial-kicker">Conta e Identidade</span>
          <h2 className="editorial-title text-4xl font-semibold leading-none">Painel pessoal</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie conexoes, sessao e preferencias visuais em um unico lugar.
          </p>
        </section>

        {/* Profile Card */}
        <Card className="editorial-card">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={user?.image || undefined} alt={user?.name || ""} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="editorial-title text-2xl">
                  {user?.name || "Usuário"}
                </CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Connections Card */}
        <Card className="editorial-card">
          <CardHeader>
            <CardTitle className="editorial-title text-2xl">Conexões</CardTitle>
            <CardDescription>Gerencie suas contas conectadas</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Discord Connection */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center">
                  <DiscordIcon className="size-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Discord</p>
                  <p className="text-sm text-muted-foreground">Login via OAuth</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-muted text-success">
                  Conectado
                </Badge>
                {hasDiscordAsOnlyLogin && (
                  <span className="text-xs text-muted-foreground">(login principal)</span>
                )}
              </div>
            </div>

            <Separator />

            {/* Spotify Connection */}
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary flex items-center justify-center">
                  <SpotifyIcon className="size-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Spotify</p>
                  {spotifyStatus?.connected ? (
                    <p className="text-sm text-muted-foreground">
                      {spotifyStatus.profile?.displayName}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Conecte para criar playlists</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingSpotify ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : spotifyStatus?.connected ? (
                  <>
                    <Badge variant="secondary" className="bg-muted text-success">
                      Conectado
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDisconnectSpotify}
                      disabled={disconnectSpotify.isPending}
                      className="text-destructive hover:text-destructive"
                    >
                      {disconnectSpotify.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Desconectar"
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectSpotify}
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    Conectar
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* YouTube Music (Coming Soon) */}
            <div className="flex items-center justify-between p-3 rounded-lg border opacity-60">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-destructive flex items-center justify-center">
                  <YouTubeIcon className="size-5 text-destructive-foreground" />
                </div>
                <div>
                  <p className="font-medium">YouTube Music</p>
                  <p className="text-sm text-muted-foreground">Em breve</p>
                </div>
              </div>
              <Badge variant="outline">Em breve</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="editorial-card">
          <CardHeader>
            <CardTitle className="editorial-title text-2xl">Aparência</CardTitle>
            <CardDescription>Personalize a aparência do app</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                  <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </div>
                <div>
                  <p className="font-medium">Tema</p>
                  <p className="text-sm text-muted-foreground">Claro, escuro ou sistema</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Session Card */}
        <Card className="editorial-card">
          <CardHeader>
            <CardTitle className="editorial-title text-2xl">Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleLogout} className="w-full">
              <LogOut data-icon="inline-start" />
              Sair da conta
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
