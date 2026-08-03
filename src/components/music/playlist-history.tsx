"use client"

import { History, Trash2 } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip"
import type { PlaylistHistory as PlaylistHistoryItem } from "@/src/lib/hooks/music/use-music"

interface PlaylistHistoryProps {
  playlists: PlaylistHistoryItem[]
  isDeleting: boolean
  onDelete: (historyId: string, playlistName: string) => void
}

export function PlaylistHistory({ playlists, isDeleting, onDelete }: PlaylistHistoryProps) {
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget.id, deleteTarget.name)
      setDeleteTarget(null)
    }
  }

  if (!playlists || playlists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Playlists</CardTitle>
          <CardDescription>Playlists que você criou usando o WriteSpace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="mx-auto mb-3 size-12 opacity-50" />
            <p>Você ainda não criou nenhuma playlist</p>
            <p className="text-sm">Crie sua primeira playlist na aba "Gerar Playlist"</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Playlists</CardTitle>
          <CardDescription>Playlists que você criou usando o WriteSpace</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="flex flex-col gap-3">
              {playlists.map(playlist => (
                <div
                  key={playlist.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{playlist.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {playlist.trackCount} músicas
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {playlist.generationType === "top-tracks"
                          ? "Top Tracks"
                          : playlist.generationType === "discovery"
                            ? "Descoberta"
                            : "Mix de Artistas"}
                      </Badge>
                      {playlist.wasRefined && (
                        <Badge variant="secondary" className="text-xs bg-muted text-success">
                          ✨ Refinada
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(playlist.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {playlist.spotifyPlaylistUrl && (
                      <a
                        href={playlist.spotifyPlaylistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        Abrir →
                      </a>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeleting}
                            onClick={() =>
                              setDeleteTarget({ id: playlist.id, name: playlist.name })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remover do histórico</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        title="Remover do histórico?"
        description={`A playlist "${deleteTarget?.name}" será removida do histórico. Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
