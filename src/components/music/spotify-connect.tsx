"use client"

import { Loader2, LogOut, Music } from "lucide-react"
import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Skeleton } from "@/src/components/ui/skeleton"
import { signIn } from "@/src/lib/auth-client"
import { useDisconnectSpotifyMutation, useSpotifyStatus } from "@/src/lib/hooks/music/use-music"

interface SpotifyConnectProps {
  onConnected?: () => void
  /** Se true, mostra botão de desconectar quando conectado */
  showDisconnect?: boolean
}

export function SpotifyConnect({ onConnected, showDisconnect = false }: SpotifyConnectProps) {
  const { data: status, isLoading, error, refetch } = useSpotifyStatus()
  const disconnectMutation = useDisconnectSpotifyMutation()

  // Usar ref para evitar chamadas duplicadas do callback
  const hasCalledOnConnected = useRef(false)

  // Chamar onConnected em useEffect, não durante o render
  useEffect(() => {
    if (status?.connected && status.profile && onConnected && !hasCalledOnConnected.current) {
      hasCalledOnConnected.current = true
      onConnected()
    }
  }, [status?.connected, status?.profile, onConnected])

  const handleConnect = async () => {
    try {
      await signIn.social({
        provider: "spotify",
        callbackURL: "/music",
      })
    } catch (err) {
      console.error("Erro ao conectar Spotify:", err)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync()
      toast.success("Spotify desconectado com sucesso!")
      // Reset ref para permitir nova chamada de onConnected se reconectar
      hasCalledOnConnected.current = false
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desconectar")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status?.connected && status.profile) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            {status.profile.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={status.profile.image}
                alt={status.profile.displayName}
                className="size-12 rounded-full"
              />
            ) : (
              <div className="size-12 rounded-full bg-primary flex items-center justify-center">
                <Music className="size-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <CardTitle className="text-success">Spotify Conectado</CardTitle>
              <CardDescription>
                Logado como <strong>{status.profile.displayName}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <a
            href={status.profile.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline"
          >
            Ver perfil no Spotify →
          </a>
          {showDisconnect && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="text-muted-foreground hover:text-destructive"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <LogOut className="mr-1 size-4" />
                  Desconectar
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (status?.connected && status.restricted) {
    return (
      <Card className="border-warning/40 bg-warning/10">
        <CardHeader>
          <CardTitle className="text-warning">Spotify conectado com restrição</CardTitle>
          <CardDescription className="text-foreground/85">
            {status.restrictionMessage ||
              "A integracao com Spotify esta temporariamente indisponivel para este app."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Reconectar a conta nao resolve neste caso. O acesso volta apos regularizacao da conta
            dona do app no Spotify e propagacao da permissao.
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Atualizar status
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="size-5" />
          Conectar Spotify
        </CardTitle>
        <CardDescription>
          Conecte sua conta do Spotify para analisar suas músicas mais ouvidas e criar playlists
          personalizadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleConnect}>
          <svg className="mr-2 size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Conectar com Spotify
        </Button>
      </CardContent>
    </Card>
  )
}
