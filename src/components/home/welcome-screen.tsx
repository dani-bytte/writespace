"use client"

import { FileText, Music } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { useNavigation } from "@/src/lib/hooks/ui/use-navigation"

interface WelcomeScreenProps {
  userName?: string
  userImage?: string
}

const PREFERENCE_KEY = "writespace:last-module"

export function WelcomeScreen({ userName, userImage }: WelcomeScreenProps) {
  const _router = useRouter()
  const { navigate } = useNavigation()
  const [_hasPreference, setHasPreference] = useState(false)

  // Check if user has a saved preference
  useEffect(() => {
    const savedModule = localStorage.getItem(PREFERENCE_KEY)
    if (savedModule) {
      setHasPreference(true)
      // Auto-redirect to saved preference after a short delay
      // This gives user a chance to see the screen and change if needed
      const timer = setTimeout(() => {
        if (savedModule === "music") {
          navigate("/music")
        }
        // Documents is already the default at /
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [navigate])

  const handleSelectDocuments = () => {
    localStorage.setItem(PREFERENCE_KEY, "documents")
    // Already on documents page, just close welcome
    window.location.reload()
  }

  const handleSelectMusic = () => {
    localStorage.setItem(PREFERENCE_KEY, "music")
    navigate("/music")
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-2xl w-full flex flex-col gap-8">
        {/* Header with user info */}
        <div className="text-center flex flex-col gap-4">
          <div className="flex justify-center">
            <Avatar className="size-20">
              <AvatarImage src={userImage} alt={userName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Olá, {userName?.split(" ")[0] || "usuário"}! 👋</h1>
            <p className="text-muted-foreground mt-2">O que vamos fazer hoje?</p>
          </div>
        </div>

        {/* Module selection cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Documents Card */}
          <Card
            className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 group"
            onClick={handleSelectDocuments}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <FileText className="size-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Documentos</CardTitle>
              <CardDescription>Escreva e organize seus textos</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground flex flex-col gap-1">
                <li>📝 Editor de texto rico</li>
                <li>🔗 Compartilhe com outros</li>
                <li>💾 Auto-save automático</li>
              </ul>
            </CardContent>
          </Card>

          {/* Music Card */}
          <Card
            className="cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg hover:border-primary/50 group"
            onClick={handleSelectMusic}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                <Music className="size-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Playlists</CardTitle>
              <CardDescription>Crie playlists personalizadas</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground flex flex-col gap-1">
                <li>🎵 Conecte com Spotify</li>
                <li>✨ IA para curadoria</li>
                <li>🎧 Descubra novas músicas</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-muted-foreground">
          💡 Sua escolha será lembrada. Você pode trocar a qualquer momento pelo menu.
        </p>
      </div>
    </div>
  )
}
