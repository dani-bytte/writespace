import type { Metadata } from "next"
import { Cormorant_Garamond, Manrope } from "next/font/google"
import type React from "react"
import { Suspense } from "react"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/src/components/theme-provider"
import { ReactQueryProvider } from "@/src/lib/react-query"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "WriteSpace",
  description: "Seu espaço pessoal para escrever, guardar e compartilhar textos com facilidade",
  generator: "WriteSpace",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${manrope.variable} ${cormorant.variable} font-sans antialiased`}>
        <Suspense fallback={null}>
          <ReactQueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster position="top-right" expand={false} richColors closeButton />
            </ThemeProvider>
          </ReactQueryProvider>
        </Suspense>
      </body>
    </html>
  )
}
