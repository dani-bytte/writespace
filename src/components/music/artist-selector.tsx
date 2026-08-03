"use client"

import { Music2, Search, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/src/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Skeleton } from "@/src/components/ui/skeleton"
import { type SpotifyArtistUI, useArtistSearch } from "@/src/lib/hooks/music/use-music"
import { useDebounce } from "@/src/lib/hooks/ui/use-debounce"

interface ArtistSelectorProps {
  selectedArtists: SpotifyArtistUI[]
  onSelectionChange: (artists: SpotifyArtistUI[]) => void
  maxSelection?: number
}

export function ArtistSelector({
  selectedArtists,
  onSelectionChange,
  maxSelection = 10,
}: ArtistSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedQuery = useDebounce(searchQuery, 300)

  const { data: searchResults, isLoading } = useArtistSearch(debouncedQuery)

  const handleSelectArtist = (artist: SpotifyArtistUI) => {
    if (selectedArtists.find(a => a.id === artist.id)) {
      return // Já selecionado
    }

    if (selectedArtists.length >= maxSelection) {
      return // Limite atingido
    }

    onSelectionChange([...selectedArtists, artist])
    setSearchQuery("") // Limpar busca após seleção
  }

  const handleRemoveArtist = (artistId: string) => {
    onSelectionChange(selectedArtists.filter(a => a.id !== artistId))
  }

  const filteredResults = searchResults?.artists.filter(
    artist => !selectedArtists.find(a => a.id === artist.id)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecionar Artistas</CardTitle>
        <CardDescription>
          Busque e selecione até {maxSelection} artistas para criar uma playlist personalizada
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Selected Artists */}
        {selectedArtists.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Artistas selecionados ({selectedArtists.length}/{maxSelection}):
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedArtists.map(artist => (
                <Badge
                  key={artist.id}
                  variant="secondary"
                  className="pl-1 pr-1 py-1 flex items-center gap-1"
                >
                  {artist.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artist.image} alt={artist.name} className="size-5 rounded-full" />
                  ) : (
                    <div className="size-5 rounded-full bg-muted flex items-center justify-center">
                      <Music2 className="size-3" />
                    </div>
                  )}
                  <span className="px-1">{artist.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveArtist(artist.id)}
                    className="hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar artistas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
            disabled={selectedArtists.length >= maxSelection}
            aria-label="Buscar artistas para selecionar"
          />
        </div>

        {selectedArtists.length >= maxSelection && (
          <p className="text-sm text-warning">Limite de {maxSelection} artistas atingido</p>
        )}

        {/* Search Results */}
        {searchQuery.trim().length >= 2 && (
          <ScrollArea className="h-[300px]">
            <div className="border rounded-lg divide-y">
              {isLoading ? (
                <div className="p-2 flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="flex items-center gap-3 p-2">
                      <Skeleton className="size-10 rounded-full" />
                      <div className="flex-1 flex flex-col gap-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredResults && filteredResults.length > 0 ? (
                filteredResults.map(artist => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => handleSelectArtist(artist)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                    disabled={selectedArtists.length >= maxSelection}
                  >
                    {artist.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                        <Music2 className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{artist.name}</p>
                      {artist.genres.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {artist.genres.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {artist.popularity}%
                    </Badge>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhum artista encontrado para "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
          <p className="text-sm text-muted-foreground text-center">
            Digite pelo menos 2 caracteres para buscar
          </p>
        )}
      </CardContent>
    </Card>
  )
}
