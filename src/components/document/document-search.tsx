"use client"

import { Search, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { useDebounce } from "@/src/lib/hooks/ui/use-debounce"
import { cn } from "@/src/lib/utils"

interface DocumentSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
  debounceDelay?: number
}

export function DocumentSearch({
  onSearch,
  placeholder = "Buscar documentos…",
  className,
  debounceDelay = 300,
}: DocumentSearchProps) {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, debounceDelay)

  // Trigger search when debounced query changes
  useEffect(() => {
    onSearch(debouncedQuery)
  }, [debouncedQuery, onSearch])

  const clearSearch = () => {
    setQuery("")
    onSearch("")
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="bg-background/80 pl-10 pr-10 transition-colors focus-visible:border-primary/50"
        aria-label={placeholder}
      />
      {query && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSearch}
          aria-label="Limpar busca"
          className="absolute right-1 top-1/2 size-8 -translate-y-1/2 p-0"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}
