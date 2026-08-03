"use client"

import { signIn } from "@/src/lib/auth-client"
import { useLoadingState } from "@/src/lib/hooks/ui/use-loading-state"
import { logger } from "@/src/lib/logger"

export function useOAuth(onSuccess: () => void) {
  const { isLoading, error, startLoading, stopLoading, setErrorMessage } = useLoadingState()

  const handleOAuthLogin = async (provider: "google" | "discord") => {
    startLoading()

    try {
      logger.auth("debug", `Iniciando autenticação com ${provider}...`)

      // Better Auth gerencia o callbackURL automaticamente baseado no baseURL configurado
      // Não precisamos passar callbackURL manualmente, isso pode causar conflitos
      const { data, error } = await signIn.social({
        provider,
        // Redirecionar para a página principal após login bem-sucedido
        callbackURL: "/",
      })

      if (error) {
        logger.auth("error", `Erro na resposta do ${provider}`, {
          provider,
          errorMessage: error.message,
        })

        // Mensagens de erro mais específicas
        let errorMessage = `Erro ao fazer login com ${provider}`
        if (error.message?.includes("invalid_client")) {
          errorMessage = "Credenciais OAuth inválidas. Verifique suas configurações."
        } else if (error.message?.includes("invalid_code")) {
          errorMessage = "Código de autorização inválido. Tente novamente."
        } else if (error.message) {
          errorMessage = error.message
        }

        setErrorMessage(errorMessage)
        return
      }

      if (data && "user" in data && data.user) {
        logger.auth("info", `Login com ${provider} bem-sucedido!`)
        onSuccess()
      }
    } catch (err) {
      logger.auth("error", `Erro no login OAuth ${provider}`, {
        provider,
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      setErrorMessage(err instanceof Error ? err.message : `Erro ao fazer login com ${provider}`)
    } finally {
      stopLoading()
    }
  }

  return {
    isLoading,
    error,
    handleOAuthLogin,
  }
}
