import { Badge } from "@/components/ui/badge"
import type { JobStatus } from "@/lib/api"
import { cn } from "@/lib/utils"
import { statusMeta } from "@/lib/status"

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const meta = statusMeta(status)
  return (
    <Badge variant="secondary" className={cn("gap-1.5 border-transparent", meta.badge, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  )
}
