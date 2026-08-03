"use client"

import { Card, CardContent, CardHeader } from "@/src/components/ui/card"
import { Skeleton } from "@/src/components/ui/skeleton"

/**
 * Skeleton para o dashboard de música com animação suave
 */
export function MusicDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-500">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />

      {/* Main content skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Mode selector skeleton */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>

          {/* Settings skeleton */}
          <div className="flex flex-col gap-4 border-t pt-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />

            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate button skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

/**
 * Skeleton para a lista de documentos
 */
export function DocumentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 animate-in fade-in-50 duration-500">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border bg-card"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="size-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton para o editor de documentos
 */
export function DocumentEditorSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Title input */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>

      {/* Editor toolbar */}
      <Skeleton className="h-10 w-full rounded-t-md" />

      {/* Editor content */}
      <div className="border rounded-b-md p-4 min-h-[300px] flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Document info */}
      <div className="flex flex-col gap-1 border-t pt-4">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  )
}

/**
 * Skeleton para playlist preview
 */
export function PlaylistPreviewSkeleton() {
  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24 mt-1" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <Skeleton className="size-10 rounded" />
            <div className="flex-1 flex flex-col gap-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-10" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton para cards de conexão (Spotify, Discord, etc)
 */
export function ConnectionCardSkeleton() {
  return (
    <Card className="animate-in fade-in-50 duration-500">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-28 rounded-md" />
      </CardContent>
    </Card>
  )
}
