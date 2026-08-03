"use client"

import { Button } from "@/src/components/ui/button"

type TimeRangeValue = "short_term" | "medium_term" | "long_term"

interface TimeRangeSelectorProps {
  value: TimeRangeValue
  onChange: (value: TimeRangeValue) => void
}

const TIME_RANGE_OPTIONS = [
  { value: "short_term" as const, label: "📅 Últimas 4 semanas" },
  { value: "medium_term" as const, label: "📊 Últimos 6 meses" },
  { value: "long_term" as const, label: "⭐ Todo o histórico" },
] as const

/**
 * Seletor de período de tempo para análise de músicas do Spotify
 */
export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="border-t pt-4">
      <span className="text-base mb-3 block font-medium">Período para análise</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {TIME_RANGE_OPTIONS.map(option => (
          <Button
            key={option.value}
            type="button"
            variant={value === option.value ? "default" : "outline"}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
