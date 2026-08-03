"use client"

import { AlertCircle, Music, Plus, Search, Trash2, User } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import {
  useAddArtistToBlacklistMutation,
  useAddTrackToBlacklistMutation,
  useBlacklist,
  useRemoveArtistFromBlacklistMutation,
  useRemoveTrackFromBlacklistMutation,
  useTrackSearch,
} from "@/src/lib/hooks/music/use-blacklist"
import { useArtistSearch } from "@/src/lib/hooks/music/use-music"
import { useDebounce } from "@/src/lib/hooks/ui/use-debounce"

export function BlacklistManager() {
  const { data: blacklist, isLoading } = useBlacklist()
  const [_selectedItem, setSelectedItem] = useState<{
    type: "track" | "artist"
    id: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchType, setSearchType] = useState<"tracks" | "artists">("tracks")
  const debouncedQuery = useDebounce(searchQuery, 500)

  const { data: trackSearchResults } = useTrackSearch(debouncedQuery)
  const { data: artistSearchResults } = useArtistSearch(debouncedQuery)

  const removeTrackMutation = useRemoveTrackFromBlacklistMutation()
  const removeArtistMutation = useRemoveArtistFromBlacklistMutation()
  const addTrackMutation = useAddTrackToBlacklistMutation()
  const addArtistMutation = useAddArtistToBlacklistMutation()

  // Filter out already blacklisted items from search results
  const filteredTrackResults = useMemo(() => {
    if (!trackSearchResults?.tracks) return []
    const blacklistedIds = new Set(blacklist?.tracks?.map(t => t.id) || [])
    return trackSearchResults.tracks.filter(track => !blacklistedIds.has(track.id))
  }, [trackSearchResults, blacklist])

  const filteredArtistResults = useMemo(() => {
    if (!artistSearchResults?.artists) return []
    const blacklistedIds = new Set(blacklist?.artists?.map(a => a.id) || [])
    return artistSearchResults.artists.filter(artist => !blacklistedIds.has(artist.id))
  }, [artistSearchResults, blacklist])

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await removeTrackMutation.mutateAsync(trackId)
      toast.success("Track removida da blacklist")
      setSelectedItem(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover")
    }
  }

  const handleRemoveArtist = async (artistId: string) => {
    try {
      await removeArtistMutation.mutateAsync(artistId)
      toast.success("Artista removido da blacklist")
      setSelectedItem(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover")
    }
  }

  const handleAddTrack = async (track: {
    id: string
    name: string
    artists: Array<{ id: string; name: string }>
  }) => {
    try {
      await addTrackMutation.mutateAsync({
        spotifyTrackId: track.id,
        trackName: track.name,
        artistName: track.artists.map(a => a.name).join(", "),
      })
      toast.success("Música adicionada à blacklist")
      setSearchQuery("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar")
    }
  }

  const handleAddArtist = async (artist: { id: string; name: string }) => {
    try {
      await addArtistMutation.mutateAsync({
        spotifyArtistId: artist.id,
        artistName: artist.name,
      })
      toast.success("Artista adicionado à blacklist")
      setSearchQuery("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar")
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Blacklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" role="status" aria-live="polite">
            Carregando…
          </p>
        </CardContent>
      </Card>
    )
  }

  const hasItems = (blacklist?.tracks?.length || 0) > 0 || (blacklist?.artists?.length || 0) > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar à Blacklist</CardTitle>
          <CardDescription>Busque músicas ou artistas para bloquear</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Search Type Toggle */}
          <Tabs value={searchType} onValueChange={v => setSearchType(v as "tracks" | "artists")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tracks">Músicas</TabsTrigger>
              <TabsTrigger value="artists">Artistas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder={`Buscar ${searchType === "tracks" ? "músicas" : "artistas"}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label={`Buscar ${searchType === "tracks" ? "músicas" : "artistas"} para adicionar à blacklist`}
            />
          </div>

          {/* Search Results */}
          {debouncedQuery.trim().length >= 2 && (
            <ScrollArea className="h-[250px]">
              <div className="flex flex-col gap-2 pr-4">
                {searchType === "tracks" &&
                  (filteredTrackResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {trackSearchResults?.tracks.length === 0
                        ? "Nenhuma música encontrada"
                        : "Todas as músicas já estão na blacklist"}
                    </p>
                  ) : (
                    filteredTrackResults.map(track => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {track.album.image && (
                            <img
                              src={track.album.image}
                              alt={track.album.name}
                              className="size-10 rounded shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{track.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {track.artists.map(a => a.name).join(", ")}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddTrack(track)}
                          disabled={addTrackMutation.isPending}
                          className="shrink-0 ml-2"
                        >
                          <Plus className="mr-1 size-4" />
                          Bloquear
                        </Button>
                      </div>
                    ))
                  ))}

                {searchType === "artists" &&
                  (filteredArtistResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {artistSearchResults?.artists.length === 0
                        ? "Nenhum artista encontrado"
                        : "Todos os artistas já estão na blacklist"}
                    </p>
                  ) : (
                    filteredArtistResults.map(artist => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {artist.image && (
                            <img
                              src={artist.image}
                              alt={artist.name}
                              className="size-10 rounded-full shrink-0 object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{artist.name}</p>
                            {artist.genres && artist.genres.length > 0 && (
                              <p className="text-xs text-muted-foreground truncate">
                                {artist.genres.join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddArtist(artist)}
                          disabled={addArtistMutation.isPending}
                          className="shrink-0 ml-2"
                        >
                          <Plus className="mr-1 size-4" />
                          Bloquear
                        </Button>
                      </div>
                    ))
                  ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Blacklist Items */}
      <Card>
        <CardHeader>
          <CardTitle>Itens Bloqueados</CardTitle>
          <CardDescription>Músicas e artistas que não aparecerão em suas playlists</CardDescription>
        </CardHeader>

        <CardContent>
          {!hasItems ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="mr-2 size-4" />
              <p>Nenhum item na blacklist</p>
            </div>
          ) : (
            <Tabs defaultValue="tracks" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="tracks">
                  Músicas ({blacklist?.stats?.totalBlockedTracks || 0})
                </TabsTrigger>
                <TabsTrigger value="artists">
                  Artistas ({blacklist?.stats?.totalBlockedArtists || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tracks" className="mt-4 flex flex-col gap-3">
                {(blacklist?.tracks?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma música na blacklist
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {blacklist?.tracks?.map(track => (
                      <div
                        key={track.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Music className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{track.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                            {track.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Motivo: {track.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTrack(track.id)}
                          disabled={removeTrackMutation.isPending}
                          className="shrink-0 ml-2"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="artists" className="mt-4 flex flex-col gap-3">
                {(blacklist?.artists?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum artista na blacklist
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {blacklist?.artists?.map(artist => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <User className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{artist.name}</p>
                            {artist.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Motivo: {artist.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveArtist(artist.id)}
                          disabled={removeArtistMutation.isPending}
                          className="shrink-0 ml-2"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
