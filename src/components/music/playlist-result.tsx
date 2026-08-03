"use client"

import { Button } from "@/src/components/ui/button"
import type { GeneratedPlaylist } from "@/src/lib/hooks/music/use-music"
import { PlaylistCreator } from "./playlist-creator"
import { PlaylistPreview } from "./playlist-preview"

interface PlaylistResultProps {
  playlist: GeneratedPlaylist
  onReset: () => void
}

/**
 * Exibe o resultado da geração de playlist com preview e criador
 */
export function PlaylistResult({ playlist, onReset }: PlaylistResultProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sua Playlist</h2>
        <Button variant="outline" onClick={onReset}>
          Criar outra
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlaylistPreview
          tracks={playlist.tracks}
          removedTracks={playlist.refinement?.removedTracks ?? []}
          wasRefined={playlist.refinement?.wasRefined ?? false}
          suggestions={playlist.refinement?.suggestions}
        />

        <PlaylistCreator
          tracks={playlist.tracks}
          suggestedNames={playlist.nameSuggestions ?? []}
          generationType={(playlist.meta?.type as "top-tracks" | "artist-mix") || "top-tracks"}
          seedArtists={playlist.seeds?.artists ?? []}
          seedTracks={playlist.seeds?.tracks ?? []}
          wasRefined={playlist.refinement?.wasRefined ?? false}
          removedDuplicates={playlist.refinement?.removedTracks?.map(t => ({
            name: t.name,
            reason: t.reason,
          }))}
          onSuccess={onReset}
        />
      </div>
    </div>
  )
}
