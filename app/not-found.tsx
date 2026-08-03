"use client"

import { ArrowLeft, FileQuestion, Home } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/src/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="editorial-card max-w-md w-full text-center flex flex-col gap-8 p-8 sm:p-10">
        {/* Animated 404 Icon */}
        <div className="relative">
          <div className="size-32 mx-auto bg-linear-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center animate-pulse">
            <FileQuestion className="size-16 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 size-8 bg-destructive/20 rounded-full animate-bounce" />
          <div className="absolute -bottom-1 -left-4 size-6 bg-accent/30 rounded-full animate-bounce delay-100" />
        </div>

        {/* Error Message */}
        <div className="flex flex-col gap-3">
          <span className="editorial-kicker">Erro de rota</span>
          <h1 className="editorial-title text-7xl font-semibold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="editorial-title text-3xl font-semibold text-foreground">
            Página não encontrada
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            A página que você está procurando não existe, foi movida ou você não tem permissão para
            acessá-la.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="default" size="lg" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
          <Button variant="outline" size="lg" asChild className="gap-2 bg-background/80">
            <Link href="/">
              <Home className="size-4" />
              Página inicial
            </Link>
          </Button>
        </div>

        {/* Decorative Elements */}
        <div className="pt-8 text-xs text-muted-foreground/50">
          WriteSpace • Seu espaço de escrita
        </div>
      </div>
    </div>
  )
}
