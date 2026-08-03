"use client"

import { GridIcon, ListIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"

interface DocumentViewToggleProps {
  view: "grid" | "list"
  onViewChange: (view: "grid" | "list") => void
}

export function DocumentViewToggle({ view, onViewChange }: DocumentViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border/70 bg-background/80 p-1">
      <Button
        variant={view === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className="h-7 px-2"
        aria-label="Visualização em lista"
        aria-pressed={view === "list"}
      >
        <ListIcon className="size-4" />
      </Button>
      <Button
        variant={view === "grid" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("grid")}
        className="h-7 px-2"
        aria-label="Visualização em grade"
        aria-pressed={view === "grid"}
      >
        <GridIcon className="size-4" />
      </Button>
    </div>
  )
}
