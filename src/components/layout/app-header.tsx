"use client"

import { FileText, Loader2, LogOut, Music, Settings, User, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "@/src/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar"
import { Button } from "@/src/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { useNavigation } from "@/src/lib/hooks/ui/use-navigation"

interface AppHeaderProps {
  userName?: string
  userEmail?: string
  userImage?: string
  isAdmin?: boolean
  isNavigating?: boolean
  onShowUserManagement?: () => void
  onShowEmailSettings?: () => void
  onLogout: () => void
}

export function AppHeader({
  userName,
  userEmail,
  userImage,
  isAdmin = false,
  isNavigating = false,
  onShowUserManagement,
  onShowEmailSettings,
  onLogout,
}: AppHeaderProps) {
  const pathname = usePathname()
  const { navigate } = useNavigation()

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const currentModule = pathname === "/music" ? "music" : "documents"

  const handleTabChange = (value: string) => {
    // Save preference
    localStorage.setItem("writespace:last-module", value)

    if (value === "music") {
      navigate("/music")
    } else {
      navigate("/")
    }
  }

  return (
    <header className="editorial-shell sticky top-0 z-50">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Logo + Navigation */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-primary to-accent shadow-sm">
              <FileText className="size-4 text-primary-foreground" />
            </div>
            <span className="editorial-title hidden bg-linear-to-r from-primary to-accent bg-clip-text text-xl font-semibold text-transparent sm:inline">
              WriteSpace
            </span>
          </Link>

          <div className="h-6 w-px bg-border hidden sm:block" />

          {/* Module Navigation Tabs */}
          <Tabs value={currentModule} onValueChange={handleTabChange} className="hidden sm:block">
            <TabsList className="h-9 border border-border/60 bg-background/70">
              <TabsTrigger value="documents" className="gap-1.5 text-sm">
                <FileText className="size-3.5" />
                Documentos
              </TabsTrigger>
              <TabsTrigger value="music" className="gap-1.5 text-sm">
                <Music className="size-3.5" />
                Playlists
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right side: Theme + User Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-3">
                <Avatar className="size-7">
                  <AvatarImage src={userImage} alt={userName} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium max-w-25 truncate">
                  {userName?.split(" ")[0]}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-muted-foreground font-normal">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Mobile navigation */}
              <div className="sm:hidden">
                <DropdownMenuItem onClick={() => handleTabChange("documents")}>
                  <FileText className="mr-2 size-4" />
                  Documentos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTabChange("music")}>
                  <Music className="mr-2 size-4" />
                  Playlists
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>

              {/* Admin options */}
              {isAdmin && (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Administração
                  </DropdownMenuLabel>
                  <DropdownMenuItem onClick={onShowUserManagement}>
                    <Users className="mr-2 size-4" />
                    Usuários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onShowEmailSettings}>
                    <Settings className="mr-2 size-4" />
                    Configurações de Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 size-4" />
                  Meu Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="text-destructive focus:text-destructive"
              >
                {isNavigating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 size-4" />
                )}
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
