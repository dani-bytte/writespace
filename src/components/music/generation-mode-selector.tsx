"use client"

import { Compass, Sparkles, Users } from "lucide-react"
import { Card } from "@/src/components/ui/card"

type GenerationMode = "top-tracks" | "artist-mix" | "discovery"

interface GenerationModeSelectorProps {
  mode: GenerationMode
  onModeChange: (mode: GenerationMode) => void
}

const MODES = [
  {
    id: "top-tracks" as const,
    icon: Sparkles,
    title: "Top Tracks",
    description: "Baseada no que você mais ouve",
    gradient: "from-green-500/20 to-emerald-600/20",
  },
  {
    id: "artist-mix" as const,
    icon: Users,
    title: "Mix de Artistas",
    description: "Escolha seus artistas favoritos",
    gradient: "from-blue-500/20 to-indigo-600/20",
  },
  {
    id: "discovery" as const,
    icon: Compass,
    title: "Descoberta",
    description: "Novas músicas baseadas no seu gosto",
    gradient: "from-purple-500/20 to-pink-600/20",
  },
]

export function GenerationModeSelector({ mode, onModeChange }: GenerationModeSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {MODES.map(({ id, icon: Icon, title, description, gradient }) => {
        const isActive = mode === id
        return (
          <Card
            key={id}
            onClick={() => onModeChange(id)}
            className={`
              relative p-4 cursor-pointer transition-all duration-200
              hover:scale-[1.02] hover:shadow-lg
              ${
                isActive
                  ? `border-primary border-2 bg-linear-to-br ${gradient}`
                  : "border-border hover:border-primary/50"
              }
            `}
          >
            <div
              className={`
              size-10 rounded-lg mb-3 flex items-center justify-center
              ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
              transition-colors duration-200
            `}
            >
              <Icon className="size-5" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
            {isActive && (
              <div className="absolute top-2 right-2">
                <div className="size-2 rounded-full bg-primary animate-pulse" />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
