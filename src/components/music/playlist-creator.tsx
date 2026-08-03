"use client"

import { Check, ExternalLink, Loader2, Music } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { Textarea } from "@/src/components/ui/textarea"
import { type SpotifyTrackUI, useCreatePlaylistMutation } from "@/src/lib/hooks/music/use-music"
import { TOAST_ERROR, TOAST_SUCCESS } from "@/src/lib/toast-messages"

interface PlaylistCreatorProps {
  tracks: SpotifyTrackUI[]
  suggestedNames: string[]
  generationType: "top-tracks" | "artist-mix" | "custom"
  seedArtists?: string[]
  seedTracks?: string[]
  wasRefined: boolean
  removedDuplicates?: { name: string; reason: string }[]
  onSuccess?: (playlistUrl: string) => void
}

export function PlaylistCreator({
  tracks,
  suggestedNames,
  generationType,
  seedArtists,
  seedTracks,
  wasRefined,
  removedDuplicates,
  onSuccess,
}: PlaylistCreatorProps) {
  const [name, setName] = useState(suggestedNames[0] || "")
  const [description, setDescription] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [createdPlaylist, setCreatedPlaylist] = useState<{
    url: string
    name: string
  } | null>(null)

  const createPlaylistMutation = useCreatePlaylistMutation()

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Digite um nome para a playlist")
      return
    }

    if (tracks.length === 0) {
      toast.error("Nenhuma música para adicionar à playlist")
      return
    }

    try {
      const result = await createPlaylistMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        trackUris: tracks.map(t => t.uri),
        isPublic,
        generationType,
        seedArtists,
        seedTracks,
        wasRefined,
        removedDuplicates,
      })

      setCreatedPlaylist({
        url: result.playlist.spotifyUrl,
        name: result.playlist.name,
      })

      toast.success(TOAST_SUCCESS.playlistCreated)

      if (onSuccess) {
        onSuccess(result.playlist.spotifyUrl)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TOAST_ERROR.playlistCreateError)
    }
  }

  if (createdPlaylist) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-primary flex items-center justify-center">
              <Check className="size-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-success">Playlist Criada!</CardTitle>
              <CardDescription>
                "{createdPlaylist.name}" foi adicionada ao seu Spotify
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <a
            href={createdPlaylist.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="size-4" />
            Abrir no Spotify
          </a>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="size-5" />
          Criar Playlist no Spotify
        </CardTitle>
        <CardDescription>Sua playlist terá {tracks.length} músicas</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Name suggestions */}
        {suggestedNames.length > 1 && (
          <div className="flex flex-col gap-2">
            <Label className="text-muted-foreground text-xs">Sugestões de nome:</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedNames.map((suggestion, i) => (
                <Button
                  key={`suggestion-${suggestion}-${i}`}
                  variant={name === suggestion ? "default" : "outline"}
                  size="sm"
                  onClick={() => setName(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Name input */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="playlist-name">Nome da Playlist</Label>
          <Input
            id="playlist-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Digite o nome da playlist"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="playlist-description">Descrição (opcional)</Label>
          <Textarea
            id="playlist-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Uma breve descrição da playlist..."
            maxLength={300}
            rows={2}
          />
        </div>

        {/* Public switch */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is-public">Playlist Pública</Label>
            <p className="text-xs text-muted-foreground">
              {isPublic ? "Visível para todos no seu perfil" : "Somente você pode ver"}
            </p>
          </div>
          <Switch id="is-public" checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        {/* Create button */}
        <Button
          onClick={handleCreate}
          disabled={createPlaylistMutation.isPending || !name.trim()}
          className="w-full"
        >
          {createPlaylistMutation.isPending ? (
            <>
              <Loader2 data-icon="inline-start" className="animate-spin" />
              Criando…
            </>
          ) : (
            <>
              <svg
                className="mr-2 size-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              Criar no Spotify
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
