"use client"

import { AlertTriangle, Ban, Clock, ExternalLink, Music2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Separator } from "@/src/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip"
import { useAddTrackToBlacklistMutation } from "@/src/lib/hooks/music/use-blacklist"
import type { SpotifyTrackUI } from "@/src/lib/hooks/music/use-music"
import { TOAST_ERROR, TOAST_SUCCESS } from "@/src/lib/toast-messages"

interface RemovedTrack {
  name: string
  artists: string[]
  reason: string
  originalTrack?: string
}

interface PlaylistPreviewProps {
  tracks: SpotifyTrackUI[]
  removedTracks?: RemovedTrack[]
  wasRefined: boolean
  suggestions?: string
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function formatTotalDuration(tracks: SpotifyTrackUI[]): string {
  const totalMs = tracks.reduce((sum, track) => sum + track.duration_ms, 0)
  const hours = Math.floor(totalMs / 3600000)
  const minutes = Math.floor((totalMs % 3600000) / 60000)

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }
  return `${minutes} min`
}

export function PlaylistPreview({
  tracks,
  removedTracks,
  wasRefined,
  suggestions,
}: PlaylistPreviewProps) {
  const addToBlacklistMutation = useAddTrackToBlacklistMutation()

  const handleAddToBlacklist = async (track: SpotifyTrackUI) => {
    try {
      await addToBlacklistMutation.mutateAsync({
        spotifyTrackId: track.id,
        trackName: track.name,
        artistName: track.artists.map(a => a.name).join(", "),
        reason: "user_preference",
      })
      toast.success(TOAST_SUCCESS.trackBlocked)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : TOAST_ERROR.blockError)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Preview da Playlist</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{tracks.length} músicas</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatTotalDuration(tracks)}
              </span>
            </CardDescription>
          </div>
          {wasRefined && (
            <Badge variant="secondary" className="bg-muted text-success">
              ✨ Refinada com IA
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Suggestions from Gemini */}
        {suggestions && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            💡 {suggestions}
          </div>
        )}

        {/* Removed tracks warning */}
        {removedTracks && removedTracks.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="size-4" />
              <span className="text-sm font-medium">
                {removedTracks.length} música(s) removida(s) para evitar repetição
              </span>
            </div>
            <div className="rounded-lg bg-muted p-3 flex flex-col gap-2">
              {removedTracks.map((track, i) => (
                <div key={`removed-${track.name}-${i}`} className="text-sm">
                  <span className="font-medium">{track.name}</span>
                  <span className="text-muted-foreground"> - {track.artists.join(", ")}</span>
                  <p className="mt-0.5 text-xs text-warning">{track.reason}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Track list */}
        <ScrollArea className="h-[350px]">
          <div className="flex flex-col gap-1 pr-4">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <span className="text-muted-foreground text-sm w-6 text-right">{index + 1}</span>
                {track.album.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={track.album.image} alt={track.album.name} className="size-10 rounded" />
                ) : (
                  <div className="size-10 rounded bg-muted flex items-center justify-center">
                    <Music2 className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{track.name}</span>
                    <a
                      href={track.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="size-3 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {track.artists.map(a => a.name).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(track.duration_ms)}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleAddToBlacklist(track)}
                          disabled={addToBlacklistMutation.isPending}
                        >
                          <Ban className="size-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Adicionar à blacklist</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {tracks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Nenhuma música na playlist</div>
        )}
      </CardContent>
    </Card>
  )
}
