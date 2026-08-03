"use client"

import { CalendarIcon, Filter, X } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Calendar } from "@/src/components/ui/calendar"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select"
import { cn } from "@/src/lib/utils"
import type { UserFilters, UserRole, UserStatus } from "@/src/types/admin"

interface AdvancedFiltersProps {
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
}

export function AdvancedFilters({ filters, onFiltersChange }: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = <K extends keyof UserFilters>(key: K, value: UserFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilter = (key: keyof UserFilters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({ search: "" })
  }

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "search") return value.trim() !== ""
    return value !== undefined
  }).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome, email, função ou status..."
          value={filters.search}
          onChange={e => updateFilter("search", e.target.value)}
          className="max-w-sm"
          aria-label="Buscar por nome, email, função ou status"
        />

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter data-icon="inline-start" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 size-5 rounded-full p-0 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros Avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Limpar todos
                  </Button>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="role-filter">Função</Label>
                  <Select
                    value={filters.role || ""}
                    onValueChange={value => updateFilter("role", value as UserRole)}
                  >
                    <SelectTrigger id="role-filter">
                      <SelectValue placeholder="Todas as funções" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as funções</SelectItem>
                      <SelectItem value="dev">Desenvolvedor</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status-filter">Status do Email</Label>
                  <Select
                    value={filters.status || ""}
                    onValueChange={value => updateFilter("status", value as UserStatus)}
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os status</SelectItem>
                      <SelectItem value="verified">Verificado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <span className="text-sm font-medium">Período de Registro</span>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !filters.dateRange?.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {filters.dateRange?.from
                            ? new Date(filters.dateRange.from).toLocaleDateString("pt-BR")
                            : "Data inicial"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            filters.dateRange?.from ? new Date(filters.dateRange.from) : undefined
                          }
                          onSelect={date => {
                            if (date) {
                              updateFilter("dateRange", {
                                from: date.toISOString().split("T")[0],
                                to: filters.dateRange?.to,
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "flex-1 justify-start text-left font-normal",
                            !filters.dateRange?.to && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {filters.dateRange?.to
                            ? new Date(filters.dateRange.to).toLocaleDateString("pt-BR")
                            : "Data final"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            filters.dateRange?.to ? new Date(filters.dateRange.to) : undefined
                          }
                          onSelect={date => {
                            if (date) {
                              updateFilter("dateRange", {
                                from: filters.dateRange?.from || "",
                                to: date.toISOString().split("T")[0],
                              })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Busca: {filters.search}
              <X className="size-3 cursor-pointer" onClick={() => updateFilter("search", "")} />
            </Badge>
          )}
          {filters.role && (
            <Badge variant="secondary" className="gap-1">
              Função: {filters.role === "dev" ? "Desenvolvedor" : "Usuário"}
              <X className="size-3 cursor-pointer" onClick={() => clearFilter("role")} />
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status === "verified" ? "Verificado" : "Pendente"}
              <X className="size-3 cursor-pointer" onClick={() => clearFilter("status")} />
            </Badge>
          )}
          {filters.dateRange && (
            <Badge variant="secondary" className="gap-1">
              Período: {filters.dateRange.from} - {filters.dateRange.to}
              <X className="size-3 cursor-pointer" onClick={() => clearFilter("dateRange")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
