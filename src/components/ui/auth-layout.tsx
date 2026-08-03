"use client"

import type React from "react"
import { ThemeToggle } from "@/src/components/theme-toggle"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"

interface AuthLayoutProps {
  description: string
  children: React.ReactNode
}

export function AuthLayout({ description, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background via-background to-muted p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="editorial-card w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 text-center">
          <span className="editorial-kicker">WriteSpace</span>
          <CardTitle className="editorial-title text-3xl font-semibold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
            WriteSpace
          </CardTitle>
          <CardDescription className="text-muted-foreground">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
      </Card>
    </div>
  )
}
