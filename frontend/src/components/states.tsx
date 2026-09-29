import { PackageOpen, RefreshCw, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function LoadingBlocks({ rows = 3, height = "h-24" }: { rows?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`${height} w-full`} />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <PackageOpen className="size-8 text-muted-foreground" />
      <div className="text-base font-semibold">{title}</div>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-3">
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>Couldn&apos;t load data</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw />
        Retry
      </Button>
    </div>
  )
}
