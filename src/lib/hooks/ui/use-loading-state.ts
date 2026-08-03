"use client"

import { useState } from "react"

export interface LoadingState {
  isLoading: boolean
  error: string | null
}

export function useLoadingState(initialLoading = false) {
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const startLoading = () => {
    setIsLoading(true)
    setError(null)
  }

  const stopLoading = () => {
    setIsLoading(false)
  }

  const setErrorMessage = (message: string) => {
    setError(message)
    setIsLoading(false)
  }

  const clearError = () => {
    setError(null)
  }

  const reset = () => {
    setIsLoading(false)
    setError(null)
  }

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setErrorMessage,
    clearError,
    reset,
  }
}
