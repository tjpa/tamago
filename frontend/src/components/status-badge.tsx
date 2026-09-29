import { Badge } from "@/components/ui/badge"
import type { JobStatus } from "@/lib/api"
import { statusMeta } from "@/lib/status"

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant={status}>
      <span className="size-1.5 rounded-full bg-current" />
      {statusMeta(status).label}
    </Badge>
  )
}
