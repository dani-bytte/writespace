"use client"

import { Clock, Music2, Sparkles, TrendingUp } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Skeleton } from "@/src/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import {
  type SpotifyArtistUI,
  type SpotifyTrackUI,
  useTopTracks,
} from "@/src/lib/hooks/music/use-music"

interface TopTracksAnalysisProps {
  onGeneratePlaylist?: (tracks: SpotifyTrackUI[]) => void
}

type TimeRange = "short_term" | "medium_term" | "long_term"

const TIME_RANGES: { value: TimeRange; label: string; icon: React.ReactNode }[] = [
  { value: "short_term", label: "4 semanas", icon: <Clock className="size-4" /> },
  { value: "medium_term", label: "6 meses", icon: <TrendingUp className="size-4" /> },
  { value: "long_term", label: "Desde sempre", icon: <Sparkles className="size-4" /> },
]

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function TrackItem({ track, index }: { track: SpotifyTrackUI; index: number }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <span className="text-muted-foreground text-sm font-semibold w-6 text-right">
        {index + 1}
      </span>
      {track.album.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.album.image} alt={track.album.name} className="size-10 rounded" />
      ) : (
        <div className="size-10 rounded bg-muted flex items-center justify-center">
          <Music2 className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <a
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sm truncate block hover:underline"
        >
          {track.name}
        </a>
        <p className="text-xs text-muted-foreground truncate">
          {track.artists.map(a => a.name).join(", ")}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDuration(track.duration_ms)}
      </span>
    </div>
  )
}

function ArtistItem({ artist, index }: { artist: SpotifyArtistUI; index: number }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
      <span className="text-muted-foreground text-sm font-semibold w-6 text-right">
        {index + 1}
      </span>
      {artist.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={artist.image} alt={artist.name} className="size-10 rounded-full object-cover" />
      ) : (
        <div className="size-10 rounded-full bg-muted flex items-center justify-center">
          <Music2 className="size-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <a
          href={artist.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-sm truncate block hover:underline"
        >
          {artist.name}
        </a>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {artist.genres.slice(0, 1).map(genre => (
            <Badge key={genre} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
              {genre}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={`skeleton-${i}`} className="flex items-center gap-3 p-2">
          <Skeleton className="w-6 h-4" />
          <Skeleton className="size-10 rounded" />
          <div className="flex-1 flex flex-col gap-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TopTracksAnalysis({ onGeneratePlaylist }: TopTracksAnalysisProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term")
  // Only fetch analysis for medium_term to save API calls
  const includeAnalysis = timeRange === "medium_term"
  const { data, isLoading, error } = useTopTracks(timeRange, includeAnalysis)

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Suas Músicas Mais Ouvidas</CardTitle>
            <CardDescription>{data?.timeRangeLabel || "Carregando…"}</CardDescription>
          </div>
          {data && onGeneratePlaylist && (
            <Button onClick={() => onGeneratePlaylist(data.tracks)}>
              <Sparkles data-icon="inline-start" />
              Criar Playlist
            </Button>
          )}
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mt-4">
          {TIME_RANGES.map(range => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range.value)}
            >
              {range.icon}
              <span className="ml-1">{range.label}</span>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {/* Analysis Summary with Statistics */}
        {data && (
          <div className="mb-6 rounded-lg bg-muted/50 p-4 flex flex-col gap-4">
            {/* Main Analysis */}
            {data.analysis && (
              <>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="size-4 text-warning" />
                    Análise do seu perfil musical
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">{data.analysis.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{data.analysis.mood}</Badge>
                    {data.analysis.genres.map(genre => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                  {data.analysis.recommendations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        Artistas que você pode gostar:
                      </p>
                      <p className="text-sm">{data.analysis.recommendations.join(", ")}</p>
                    </div>
                  )}
                </div>
                <div className="border-t pt-4" />
              </>
            )}

            {/* Profile Statistics */}
            <div>
              <h4 className="font-medium mb-3 text-sm">Estatísticas do período</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-background border">
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(
                      data.tracks.reduce((sum, t) => sum + t.popularity, 0) / data.tracks.length
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Popularidade média</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    (0-100: quanto maior, mais mainstream)
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background border">
                  <p className="text-2xl font-bold text-primary">
                    {Math.round(
                      data.tracks.reduce((sum, t) => sum + t.duration_ms, 0) /
                        60000 /
                        data.tracks.length
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Min. médios</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    (duração típica de suas músicas)
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-background border">
                  <p className="text-2xl font-bold text-primary">
                    {new Set(data.tracks.flatMap(t => t.artists.map(a => a.id))).size}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Artistas únicos</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    (diversidade do seu gosto)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tracks">Top Músicas ({data?.tracks.length || 0})</TabsTrigger>
            <TabsTrigger value="artists">Top Artistas ({data?.artists.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="mt-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="flex flex-col gap-1 pr-4">
                  {data?.tracks.map((track, i) => (
                    <TrackItem key={track.id} track={track} index={i} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="flex flex-col gap-1 pr-4">
                  {data?.artists.map((artist, i) => (
                    <ArtistItem key={artist.id} artist={artist} index={i} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
