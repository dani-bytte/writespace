"use client"

import { Ban } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"

interface BlacklistStats {
  totalBlockedTracks: number
  totalBlockedArtists: number
}

interface PlaylistSettingsProps {
  playlistSize: number
  setPlaylistSize: (size: number) => void
  refineWithGemini: boolean
  setRefineWithGemini: (value: boolean) => void
  blacklistStats?: BlacklistStats
  // Discovery mode settings
  showDiscoveryOptions?: boolean
  topTracksRatio?: number
  setTopTracksRatio?: (ratio: number) => void
}

export function PlaylistSettings({
  playlistSize,
  setPlaylistSize,
  refineWithGemini,
  setRefineWithGemini,
  blacklistStats,
  showDiscoveryOptions = false,
  topTracksRatio = 0,
  setTopTracksRatio,
}: PlaylistSettingsProps) {
  return (
    <div className="pt-4 flex flex-col gap-4">
      {/* Blacklist Info */}
      {blacklistStats &&
        (blacklistStats.totalBlockedTracks > 0 || blacklistStats.totalBlockedArtists > 0) && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-muted">
            <Ban className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Filtros ativos</p>
              <p className="text-xs text-muted-foreground">
                {blacklistStats.totalBlockedTracks} música
                {blacklistStats.totalBlockedTracks !== 1 ? "s" : ""} e{" "}
                {blacklistStats.totalBlockedArtists} artista
                {blacklistStats.totalBlockedArtists !== 1 ? "s" : ""} bloqueado
                {blacklistStats.totalBlockedTracks + blacklistStats.totalBlockedArtists !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>
        )}

      {/* Playlist Size */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Tamanho da playlist</Label>
          <p className="text-xs text-muted-foreground">{playlistSize} músicas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setPlaylistSize(Math.max(10, playlistSize - 10))}
          >
            -
          </Button>
          <span className="w-8 text-center">{playlistSize}</span>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => setPlaylistSize(Math.min(100, playlistSize + 10))}
          >
            +
          </Button>
        </div>
      </div>

      {/* Refine with AI */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Refinar com IA</Label>
          <p className="text-xs text-muted-foreground">
            Remove remixes e versões duplicadas automaticamente
          </p>
        </div>
        <Switch checked={refineWithGemini} onCheckedChange={setRefineWithGemini} />
      </div>

      {/* Discovery Options */}
      {showDiscoveryOptions && setTopTracksRatio && (
        <div className="border-t pt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Incluir músicas conhecidas</Label>
              <p className="text-xs text-muted-foreground">
                Mistura descobertas com músicas do seu top
              </p>
            </div>
            <Switch
              checked={topTracksRatio > 0}
              onCheckedChange={checked => setTopTracksRatio(checked ? 0.3 : 0)}
            />
          </div>

          {topTracksRatio > 0 && (
            <div className="pl-4 border-l-2 border-primary/30 flex flex-col gap-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {Math.round(topTracksRatio * 100)}% conhecidas •{" "}
                  {Math.round((1 - topTracksRatio) * 100)}% novas
                </p>
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="10"
                  value={topTracksRatio * 100}
                  onChange={e => setTopTracksRatio(Number(e.target.value) / 100)}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Mais novas</span>
                  <span>Mais conhecidas</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="p-2 rounded-lg bg-muted/50 border">
                  <p className="font-bold text-primary">
                    {Math.round(playlistSize * topTracksRatio)}
                  </p>
                  <p className="text-xs text-muted-foreground">do seu top</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 border">
                  <p className="font-bold text-primary">
                    {Math.round(playlistSize * (1 - topTracksRatio))}
                  </p>
                  <p className="text-xs text-muted-foreground">descobertas</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
