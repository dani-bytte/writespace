"use client"

import { useState } from "react"

export interface FormState<T> {
  values: T
  errors: Record<keyof T, string | null>
  isSubmitting: boolean
  submitError: string | null
}

export function useFormState<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<keyof T, string | null>>(
    {} as Record<keyof T, string | null>
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const setValue = <K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const setFieldError = <K extends keyof T>(field: K, error: string | null) => {
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const clearFieldError = <K extends keyof T>(field: K) => {
    setErrors(prev => ({ ...prev, [field]: null }))
  }

  const clearAllErrors = () => {
    setErrors({} as Record<keyof T, string | null>)
    setSubmitError(null)
  }

  const startSubmit = () => {
    setIsSubmitting(true)
    setSubmitError(null)
  }

  const endSubmit = () => {
    setIsSubmitting(false)
  }

  const setSubmitErrorMessage = (error: string) => {
    setSubmitError(error)
    setIsSubmitting(false)
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({} as Record<keyof T, string | null>)
    setIsSubmitting(false)
    setSubmitError(null)
  }

  const hasErrors = Object.values(errors).some(error => error !== null) || submitError !== null

  return {
    values,
    errors,
    isSubmitting,
    submitError,
    hasErrors,
    setValue,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    startSubmit,
    endSubmit,
    setSubmitErrorMessage,
    reset,
  }
}
