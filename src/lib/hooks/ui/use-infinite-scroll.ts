"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface UseInfiniteScrollOptions {
  threshold?: number
  rootMargin?: string
  enabled?: boolean
}

interface UseInfiniteScrollReturn {
  ref: React.RefObject<HTMLDivElement | null>
  isIntersecting: boolean
}

/**
 * Hook para detectar quando o usuário chegou ao final da lista
 * @param onLoadMore - Callback chamado quando precisa carregar mais dados
 * @param options - Opções de configuração
 * @returns Ref para o elemento observado e estado de intersecção
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const { threshold = 0.1, rootMargin = "50px", enabled = true } = options
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      setIsIntersecting(entry.isIntersecting)

      if (entry.isIntersecting && enabled) {
        onLoadMore()
      }
    },
    [onLoadMore, enabled]
  )

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    })

    observerRef.current.observe(element)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [handleIntersect, threshold, rootMargin, enabled])

  return { ref, isIntersecting }
}
