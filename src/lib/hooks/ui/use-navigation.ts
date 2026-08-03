"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState, useTransition } from "react"

/**
 * Hook para navegação com feedback visual.
 * Fornece estado de loading durante transições de navegação.
 *
 * @example
 * const { navigate, isNavigating } = useNavigation()
 *
 * <Button
 *   onClick={() => navigate("/music")}
 *   disabled={isNavigating}
 * >
 *   {isNavigating ? <Loader2 className="animate-spin" /> : null}
 *   Ir para Música
 * </Button>
 */
export function useNavigation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const navigate = useCallback(
    (href: string, options?: { replace?: boolean }) => {
      startTransition(() => {
        if (options?.replace) {
          router.replace(href)
        } else {
          router.push(href)
        }
      })
    },
    [router]
  )

  const navigateBack = useCallback(() => {
    startTransition(() => {
      router.back()
    })
  }, [router])

  return {
    navigate,
    navigateBack,
    isNavigating: isPending,
    isPending,
  }
}

/**
 * Hook simplificado para tracking de estado de navegação.
 * Útil quando você só precisa saber se está navegando.
 */
export function useNavigationState() {
  const [, startTransition] = useTransition()
  const [isNavigating, setIsNavigating] = useState(false)

  const trackNavigation = (action: () => void) => {
    setIsNavigating(true)
    startTransition(() => {
      action()
    })
    // Timeout de segurança
    setTimeout(() => setIsNavigating(false), 3000)
  }

  return {
    isNavigating,
    trackNavigation,
  }
}
