import { CircleDot, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import type { Job } from "@/lib/api"
import { initials, money, timeAgo } from "@/lib/format"

export function JobCard({ job }: { job: Job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      <Card className="gap-3 py-3.5 transition-colors hover:bg-accent/40">
        <CardContent className="flex flex-col gap-3 px-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{job.reference}</span>
            <span className="text-sm font-semibold">{money(job.price_pence)}</span>
          </div>
          <div className="text-sm font-medium">{job.customer_name}</div>
          <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CircleDot className="size-3.5 shrink-0" />
              <span className="truncate">{job.pickup_address}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{job.dropoff_address}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            {job.driver ? (
              <span className="flex items-center gap-1.5">
                <Avatar className="size-5">
                  <AvatarFallback className="text-[9px] font-semibold">{initials(job.driver.name)}</AvatarFallback>
                </Avatar>
                {job.driver.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
            <span className="text-muted-foreground">{timeAgo(job.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
