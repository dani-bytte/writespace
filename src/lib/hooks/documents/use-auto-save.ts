"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { logger } from "@/src/lib/logger"
import { useDebounce } from "../ui/use-debounce"

interface UseAutoSaveOptions<T> {
  delay?: number
  onSave: (data: T) => Promise<void>
  enabled?: boolean
  /**
   * Função customizada para comparar se os dados mudaram
   * Útil para otimizar performance em objetos grandes
   */
  isEqual?: (a: T, b: T) => boolean
}

interface UseAutoSaveReturn {
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
  forceSave: () => Promise<void>
}

/**
 * Compara dois valores de forma eficiente
 * Para objetos, faz shallow comparison das propriedades de primeiro nível
 */
function defaultIsEqual<T>(a: T, b: T): boolean {
  // Comparação rápida por referência
  if (a === b) return true

  // Se um é nulo/undefined e o outro não, são diferentes
  if (a == null || b == null) return false

  // Para tipos primitivos, já foram comparados acima
  if (typeof a !== "object" || typeof b !== "object") return false

  // Para objetos, compara as chaves e valores de primeiro nível
  const keysA = Object.keys(a) as Array<keyof T>
  const keysB = Object.keys(b) as Array<keyof T>

  if (keysA.length !== keysB.length) return false

  // Compara cada propriedade
  for (const key of keysA) {
    if (!(key in b)) return false
    if (a[key] !== b[key]) return false
  }

  return true
}

/**
 * Hook para auto-save com debounce
 * @param data - Dados para salvar
 * @param options - Opções de configuração
 * @returns Estado do auto-save
 */
export function useAutoSave<T>(data: T, options: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const { delay = 2000, onSave, enabled = true, isEqual = defaultIsEqual } = options
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previousDataRef = useRef<T>(data)
  const isFirstRender = useRef(true)
  const saveControllerRef = useRef<AbortController | null>(null)

  // Debounce dos dados
  const debouncedData = useDebounce(data, delay)

  const forceSave = useCallback(async () => {
    if (!enabled) return

    // Cancela qualquer save em progresso
    if (saveControllerRef.current) {
      saveControllerRef.current.abort()
    }

    const controller = new AbortController()
    saveControllerRef.current = controller

    try {
      setIsSaving(true)
      setError(null)
      await onSave(data)

      // Só atualiza se não foi abortado
      if (!controller.signal.aborted) {
        setLastSaved(new Date())
        previousDataRef.current = data
      }
    } catch (err) {
      // Ignora erros de abort
      if (err instanceof Error && err.name === "AbortError") return

      const errorMessage = err instanceof Error ? err.message : "Erro ao salvar"
      setError(errorMessage)
      logger.error(
        "Auto-save error in forceSave",
        {
          action: "auto_save_force",
        },
        err instanceof Error ? err : new Error(String(err))
      )
    } finally {
      if (!controller.signal.aborted) {
        setIsSaving(false)
        saveControllerRef.current = null
      }
    }
  }, [data, onSave, enabled])

  // Effect para auto-save quando dados mudam
  useEffect(() => {
    // Não salvar no primeiro render
    if (isFirstRender.current) {
      isFirstRender.current = false
      previousDataRef.current = debouncedData
      return
    }

    // Não salvar se não estiver habilitado
    if (!enabled) return

    // Não salvar se os dados não mudaram (usa comparação eficiente)
    if (isEqual(debouncedData, previousDataRef.current)) {
      return
    }

    // Cancela qualquer save anterior em progresso
    if (saveControllerRef.current) {
      saveControllerRef.current.abort()
    }

    const controller = new AbortController()
    saveControllerRef.current = controller

    // Salvar os dados
    const save = async () => {
      try {
        setIsSaving(true)
        setError(null)
        await onSave(debouncedData)

        // Só atualiza se não foi abortado
        if (!controller.signal.aborted) {
          setLastSaved(new Date())
          previousDataRef.current = debouncedData
        }
      } catch (err) {
        // Ignora erros de abort
        if (err instanceof Error && err.name === "AbortError") return

        const errorMessage = err instanceof Error ? err.message : "Erro ao salvar"
        setError(errorMessage)
        logger.error(
          "Auto-save error in debounced save",
          {
            action: "auto_save_debounced",
          },
          err instanceof Error ? err : new Error(String(err))
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsSaving(false)
          saveControllerRef.current = null
        }
      }
    }

    save()
  }, [debouncedData, enabled, onSave, isEqual])

  // Limpa erro quando usuário começa a editar novamente
  useEffect(() => {
    if (error) {
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  // Cleanup: cancela saves pendentes quando desmonta
  useEffect(() => {
    return () => {
      if (saveControllerRef.current) {
        saveControllerRef.current.abort()
      }
    }
  }, [])

  return {
    isSaving,
    lastSaved,
    error,
    forceSave,
  }
}
