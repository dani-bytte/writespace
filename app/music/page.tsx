"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AppHeader } from "@/src/components/layout"
import { MusicDashboard } from "@/src/components/music"
import { MusicDashboardSkeleton } from "@/src/components/ui/skeletons"
import { signOut, useAuth } from "@/src/lib/hooks/auth/use-auth"
import { useSpotifySessionRefresh } from "@/src/lib/hooks/music/use-spotify-session-refresh"
import { useNavigation } from "@/src/lib/hooks/ui/use-navigation"

export default function MusicPage() {
  const { isAuthenticated, isPending, userName, userEmail, user } = useAuth()
  const router = useRouter()
  const { isNavigating } = useNavigation()
  const [isMounted, setIsMounted] = useState(false)

  // Hook para forçar refresh de sessão Spotify após OAuth
  useSpotifySessionRefresh()

  // Usar ref para evitar re-execução do redirect
  const hasRedirected = useRef(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true
      router.replace("/?redirect=/music")
    }
  }, [isAuthenticated, isPending, router])

  const handleLogout = async () => {
    await signOut()
    router.push("/")
  }

  // Loading state
  if (!isMounted || isPending) {
    return (
      <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <MusicDashboardSkeleton />
        </div>
      </div>
    )
  }

  // Não autenticado - aguarda redirect
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted">
      <AppHeader
        userName={userName || "Usuário"}
        userEmail={userEmail || ""}
        userImage={user?.image || undefined}
        isNavigating={isNavigating}
        onLogout={handleLogout}
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl flex flex-col gap-6">
        <section className="flex flex-col gap-2">
          <span className="editorial-kicker">Playlist Studio</span>
          <h1 className="editorial-title text-4xl font-semibold leading-none">
            Playlists inteligentes
          </h1>
          <p className="text-sm text-muted-foreground">
            Monte listas com foco, filtros e historico de geracao sem sair do fluxo criativo.
          </p>
        </section>

        <MusicDashboard />
      </main>
    </div>
  )
}
