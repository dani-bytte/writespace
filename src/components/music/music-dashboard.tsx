"use client"

import { Ban, History, Loader2, Sparkles, Users } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Label } from "@/src/components/ui/label"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { useBlacklist } from "@/src/lib/hooks/music/use-blacklist"
import {
  type GeneratedPlaylist,
  type SpotifyArtistUI,
  useDeletePlaylistMutation,
  useGeneratePlaylistMutation,
  usePlaylistHistory,
  usePrefetchProfile,
  useSpotifyStatus,
} from "@/src/lib/hooks/music/use-music"
import { ArtistSelector } from "./artist-selector"
import { BlacklistManager } from "./blacklist-manager"
import { GenerationModeSelector } from "./generation-mode-selector"
import { PlaylistCreator } from "./playlist-creator"
import { PlaylistHistory } from "./playlist-history"
import { PlaylistPreview } from "./playlist-preview"
import { PlaylistSettings } from "./playlist-settings"
import { SpotifyConnect } from "./spotify-connect"
import { TopTracksAnalysis } from "./top-tracks-analysis"

type GenerationMode = "top-tracks" | "artist-mix" | "discovery"

// Chaves para persistir estado no sessionStorage (sobrevive reloads na mesma aba)
const PLAYLIST_STORAGE_KEY = "writespace:generated-playlist"
const GENERATING_STORAGE_KEY = "writespace:generating-playlist"

// Função para salvar playlist no sessionStorage
function savePlaylistToStorage(playlist: GeneratedPlaylist | null) {
  if (typeof window === "undefined") return
  if (playlist) {
    sessionStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist))
  } else {
    sessionStorage.removeItem(PLAYLIST_STORAGE_KEY)
  }
}

// Função para recuperar playlist do sessionStorage
function loadPlaylistFromStorage(): GeneratedPlaylist | null {
  if (typeof window === "undefined") return null
  try {
    const stored = sessionStorage.getItem(PLAYLIST_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as GeneratedPlaylist
    }
  } catch {
    // Ignore parse errors
  }
  return null
}

// Funções para rastrear geração em andamento (protege contra reload)
function setGeneratingState(isGenerating: boolean) {
  if (typeof window === "undefined") return
  if (isGenerating) {
    sessionStorage.setItem(GENERATING_STORAGE_KEY, Date.now().toString())
  } else {
    sessionStorage.removeItem(GENERATING_STORAGE_KEY)
  }
}

function wasGeneratingRecently(): boolean {
  if (typeof window === "undefined") return false
  const timestamp = sessionStorage.getItem(GENERATING_STORAGE_KEY)
  if (!timestamp) return false
  // Considera "recente" se foi há menos de 2 minutos
  const elapsed = Date.now() - parseInt(timestamp, 10)
  return elapsed < 2 * 60 * 1000
}

export function MusicDashboard() {
  usePrefetchProfile()
  const { data: spotifyStatus, isLoading: isLoadingStatus } = useSpotifyStatus()
  const { data: historyData } = usePlaylistHistory()
  const { data: blacklist } = useBlacklist()
  const generatePlaylistMutation = useGeneratePlaylistMutation()
  const deletePlaylistMutation = useDeletePlaylistMutation()

  const [mode, setMode] = useState<GenerationMode>("top-tracks")
  const [selectedArtists, setSelectedArtists] = useState<SpotifyArtistUI[]>([])
  const [playlistSize, setPlaylistSize] = useState(30)
  const [refineWithGemini, setRefineWithGemini] = useState(true)
  const [excludeStoredTracks, _setExcludeStoredTracks] = useState(true)
  const [topTracksRatio, setTopTracksRatio] = useState(0.5)
  const [timeRange, setTimeRange] = useState<"short_term" | "medium_term" | "long_term">(() => {
    if (typeof window === "undefined") return "medium_term"
    return (
      (localStorage.getItem("writespace:timeRange") as
        | "short_term"
        | "medium_term"
        | "long_term") || "medium_term"
    )
  })
  const [generatedPlaylist, setGeneratedPlaylist] = useState<GeneratedPlaylist | null>(null)
  const [showCreator, setShowCreator] = useState(false)

  // Ref para rastrear se está gerando (sobrevive a re-renders)
  const isGeneratingRef = useRef(false)

  // Recuperar playlist do sessionStorage ao montar
  useEffect(() => {
    const stored = loadPlaylistFromStorage()
    if (stored) {
      setGeneratedPlaylist(stored)
      setShowCreator(true)
    } else if (wasGeneratingRecently()) {
      toast.warning("Uma geração de playlist foi interrompida. Tente novamente.", {
        duration: 5000,
      })
      setGeneratingState(false)
    }
  }, [])

  // Salvar playlist no sessionStorage quando mudar
  useEffect(() => {
    savePlaylistToStorage(generatedPlaylist)
  }, [generatedPlaylist])

  // Proteger contra reload/navegação durante geração
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGeneratingRef.current) {
        e.preventDefault()
        return "Uma playlist está sendo gerada. Tem certeza que deseja sair?"
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  // Persistir timeRange no localStorage
  useEffect(() => {
    localStorage.setItem("writespace:timeRange", timeRange)
  }, [timeRange])

  const handleGenerateFromTopTracks = useCallback(async () => {
    try {
      isGeneratingRef.current = true
      setGeneratingState(true)

      const result = await generatePlaylistMutation.mutateAsync({
        type: "top-tracks",
        timeRange,
        playlistSize,
        includeRecommendations: true,
        refineWithGemini,
        excludeStoredTracks,
      })

      setGeneratedPlaylist(result)
      setShowCreator(true)
      toast.success(`Playlist gerada com ${result.tracks.length} músicas!`)
    } catch (error) {
      console.error("[handleGenerateFromTopTracks] Error:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao gerar playlist")
    } finally {
      isGeneratingRef.current = false
      setGeneratingState(false)
    }
  }, [generatePlaylistMutation, playlistSize, refineWithGemini, excludeStoredTracks, timeRange])

  const handleGenerateDiscovery = useCallback(async () => {
    try {
      isGeneratingRef.current = true
      setGeneratingState(true)

      const result = await generatePlaylistMutation.mutateAsync(
        topTracksRatio > 0
          ? {
              type: "hybrid",
              timeRange,
              playlistSize,
              topTracksRatio,
              refineWithGemini,
            }
          : {
              type: "discovery",
              playlistSize,
              includeRecommendations: true,
              refineWithGemini: false,
            }
      )

      setGeneratedPlaylist(result)
      setShowCreator(true)
      if (topTracksRatio > 0) {
        const topCount = Math.round(playlistSize * topTracksRatio)
        const newCount = result.tracks.length - topCount
        toast.success(`Playlist: ${topCount} conhecidas + ${newCount} novas!`)
      } else {
        toast.success(`Playlist gerada com ${result.tracks.length} descobertas!`)
      }
    } catch (error) {
      console.error("[handleGenerateDiscovery] Error:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao gerar playlist")
    } finally {
      isGeneratingRef.current = false
      setGeneratingState(false)
    }
  }, [generatePlaylistMutation, playlistSize, topTracksRatio, refineWithGemini, timeRange])

  const handleGenerateFromArtists = useCallback(async () => {
    if (selectedArtists.length === 0) {
      toast.error("Selecione pelo menos um artista")
      return
    }

    try {
      isGeneratingRef.current = true
      setGeneratingState(true)

      const result = await generatePlaylistMutation.mutateAsync({
        type: "artist-mix",
        artistIds: selectedArtists.map(a => a.id),
        playlistSize,
        includeRecommendations: true,
        refineWithGemini,
      })

      setGeneratedPlaylist(result)
      setShowCreator(true)
      toast.success(`Playlist gerada com ${result.tracks.length} músicas!`)
    } catch (error) {
      console.error("[handleGenerateFromArtists] Error:", error)
      toast.error(error instanceof Error ? error.message : "Erro ao gerar playlist")
    } finally {
      isGeneratingRef.current = false
      setGeneratingState(false)
    }
  }, [generatePlaylistMutation, playlistSize, refineWithGemini, selectedArtists])

  const handleReset = useCallback(() => {
    setGeneratedPlaylist(null)
    setShowCreator(false)
    savePlaylistToStorage(null)
  }, [])

  const handleDeleteHistory = useCallback(
    (historyId: string, _playlistName: string) => {
      deletePlaylistMutation.mutate(
        { historyId, deleteFromSpotify: false },
        {
          onSuccess: () => toast.success("Removido do histórico!"),
          onError: error => toast.error(error.message),
        }
      )
    },
    [deletePlaylistMutation]
  )

  // Loading state (initial load only)
  if (isLoadingStatus && !spotifyStatus) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  // Not connected
  if (spotifyStatus && !spotifyStatus.connected) {
    return (
      <div className="max-w-md mx-auto">
        <SpotifyConnect />
      </div>
    )
  }

  if (!spotifyStatus) {
    return null
  }

  if (spotifyStatus.restricted) {
    return (
      <Card className="border-warning/40 bg-warning/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning">
            <Ban className="size-5" />
            Integracao Spotify temporariamente indisponivel
          </CardTitle>
          <CardDescription className="text-foreground/85">
            {spotifyStatus.restrictionMessage ||
              "O Spotify bloqueou as chamadas da API para este app no momento."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Isso nao depende da sua conta de usuario. Quando a conta dona do app tiver Premium ativo
            novamente, o acesso pode levar algumas horas para normalizar.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Show playlist creator after generation
  if (generatedPlaylist && showCreator) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Sua Playlist</h2>
          <Button variant="outline" onClick={handleReset}>
            Criar outra
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PlaylistPreview
            tracks={generatedPlaylist.tracks}
            removedTracks={generatedPlaylist.refinement?.removedTracks ?? []}
            wasRefined={generatedPlaylist.refinement?.wasRefined ?? false}
            suggestions={generatedPlaylist.refinement?.suggestions}
          />

          <PlaylistCreator
            tracks={generatedPlaylist.tracks}
            suggestedNames={generatedPlaylist.nameSuggestions ?? []}
            generationType={
              (generatedPlaylist.meta?.type as "top-tracks" | "artist-mix") || "top-tracks"
            }
            seedArtists={generatedPlaylist.seeds?.artists ?? []}
            seedTracks={generatedPlaylist.seeds?.tracks ?? []}
            wasRefined={generatedPlaylist.refinement?.wasRefined ?? false}
            removedDuplicates={generatedPlaylist.refinement?.removedTracks?.map(t => ({
              name: t.name,
              reason: t.reason,
            }))}
            onSuccess={handleReset}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header with Spotify status - Premium Card */}
      <Card className="bg-linear-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {spotifyStatus.profile?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={spotifyStatus.profile.image}
                  alt={spotifyStatus.profile.displayName}
                  className="size-14 rounded-full ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                />
              ) : (
                <div className="size-14 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                  <svg
                    className="size-7 text-primary-foreground"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold">Olá, {spotifyStatus.profile?.displayName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="size-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-sm text-muted-foreground">Conectado ao Spotify</p>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-4">
              {historyData && historyData.playlists.length > 0 && (
                <div className="text-center px-4 border-l border-border/50">
                  <p className="text-lg font-bold text-primary">{historyData.playlists.length}</p>
                  <p className="text-xs text-muted-foreground">Playlists</p>
                </div>
              )}
              {blacklist &&
                (blacklist.stats.totalBlockedTracks > 0 ||
                  blacklist.stats.totalBlockedArtists > 0) && (
                  <div className="text-center px-4 border-l border-border/50">
                    <p className="text-lg font-bold">
                      {blacklist.stats.totalBlockedTracks + blacklist.stats.totalBlockedArtists}
                    </p>
                    <p className="text-xs text-muted-foreground">Bloqueios</p>
                  </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted/50">
          <TabsTrigger
            value="generate"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
          >
            <Sparkles className="mr-2 size-4" />
            <span className="hidden sm:inline">Gerar</span>
          </TabsTrigger>
          <TabsTrigger
            value="analysis"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
          >
            <Users className="mr-2 size-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger
            value="blacklist"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
          >
            <Ban className="mr-2 size-4" />
            <span className="hidden sm:inline">Bloqueios</span>
            {blacklist &&
              (blacklist.stats.totalBlockedTracks > 0 ||
                blacklist.stats.totalBlockedArtists > 0) && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 min-w-5 bg-primary-foreground/20 px-1.5 text-current"
                >
                  {blacklist.stats.totalBlockedTracks + blacklist.stats.totalBlockedArtists}
                </Badge>
              )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
          >
            <History className="mr-2 size-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        {/* Generate Playlist Tab */}
        <TabsContent value="generate" className="mt-6 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Como você quer criar sua playlist?</CardTitle>
              <CardDescription>
                Escolha entre usar suas músicas mais ouvidas ou selecionar artistas específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <GenerationModeSelector mode={mode} onModeChange={setMode} />

              {/* Time Range Selector (for top-tracks mode) */}
              {mode === "top-tracks" && (
                <div className="border-t pt-4">
                  <Label className="text-base mb-3 block">Período para análise</Label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { value: "short_term" as const, label: "📅 Últimas 4 semanas" },
                      { value: "medium_term" as const, label: "📊 Últimos 6 meses" },
                      { value: "long_term" as const, label: "⭐ Todo o histórico" },
                    ].map(option => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={timeRange === option.value ? "default" : "outline"}
                        onClick={() => setTimeRange(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <PlaylistSettings
                playlistSize={playlistSize}
                setPlaylistSize={setPlaylistSize}
                refineWithGemini={refineWithGemini}
                setRefineWithGemini={setRefineWithGemini}
                blacklistStats={blacklist?.stats}
                showDiscoveryOptions={mode === "discovery"}
                topTracksRatio={topTracksRatio}
                setTopTracksRatio={setTopTracksRatio}
              />
            </CardContent>
          </Card>

          {/* Artist Selector (for artist-mix mode) */}
          {mode === "artist-mix" && (
            <ArtistSelector
              selectedArtists={selectedArtists}
              onSelectionChange={setSelectedArtists}
              maxSelection={10}
            />
          )}

          {/* Generate Button */}
          <Button
            type="button"
            onClick={
              mode === "top-tracks"
                ? handleGenerateFromTopTracks
                : mode === "artist-mix"
                  ? handleGenerateFromArtists
                  : handleGenerateDiscovery
            }
            disabled={
              generatePlaylistMutation.isPending ||
              (mode === "artist-mix" && selectedArtists.length === 0)
            }
            className="h-12 w-full text-lg"
          >
            {generatePlaylistMutation.isPending ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Gerando playlist…
              </>
            ) : (
              <>
                <Sparkles data-icon="inline-start" />
                Gerar Playlist
              </>
            )}
          </Button>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="mt-6">
          <TopTracksAnalysis
            onGeneratePlaylist={async () => {
              setMode("top-tracks")
              await handleGenerateFromTopTracks()
            }}
          />
        </TabsContent>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist" className="mt-6">
          <BlacklistManager />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <PlaylistHistory
            playlists={historyData?.playlists ?? []}
            isDeleting={deletePlaylistMutation.isPending}
            onDelete={handleDeleteHistory}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
