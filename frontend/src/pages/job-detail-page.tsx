import { Check, Circle, CircleCheck, CircleDot, Download, Info, Loader2, MapPin, Play, Send } from "lucide-react"
import { useState } from "react"
import { Link, useParams } from "react-router-dom"

import { DispatchDialog } from "@/components/dispatch-dialog"
import { ErrorState, LoadingBlocks } from "@/components/states"
import { StatusBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCompleteJob, useJob, useStartJob } from "@/hooks/queries"
import { api, type JobDetail, type JobStatus } from "@/lib/api"
import { dateTime, money } from "@/lib/format"
import { nextAction, STATUSES } from "@/lib/status"

export function JobDetailPage() {
  const id = Number(useParams().id)
  const job = useJob(id)

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/jobs">Jobs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{job.data?.reference ?? `Job ${id}`}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {job.isPending ? (
        <LoadingBlocks rows={3} height="h-32" />
      ) : job.isError ? (
        <ErrorState error={job.error} onRetry={() => job.refetch()} />
      ) : (
        <Detail job={job.data} />
      )}
    </>
  )
}

function Detail({ job }: { job: JobDetail }) {
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const start = useStartJob()
  const complete = useCompleteJob()
  const action = nextAction(job.status)

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{job.reference}</h1>
            <StatusBadge status={job.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {job.customer_name} · created {dateTime(job.created_at)}
          </p>
        </div>
        <PrimaryAction
          job={job}
          action={action}
          busy={start.isPending || complete.isPending}
          onDispatch={() => setDispatchOpen(true)}
          onStart={() => start.mutate(job.id)}
          onComplete={() => complete.mutate(job.id)}
        />
      </div>

      <div className="grid grid-cols-[1fr_380px] items-start gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <Row label="Customer" value={job.customer_name} />
              <Row label="Price" value={<strong>{money(job.price_pence)}</strong>} />
              <Row label="Description" value={job.description || "—"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Route</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <Stop icon="pickup" label="Pickup" address={job.pickup_address} />
              <Stop icon="dropoff" label="Dropoff" address={job.dropoff_address} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoicePanel job={job} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status history</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline job={job} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              {job.driver ? (
                <>
                  <Row label="Driver" value={job.driver.name} />
                  <Row label="Phone" value={job.driver.phone ?? "—"} />
                  <Row label="Vehicle" value={job.vehicle ? `${job.vehicle.plate} · ${job.vehicle.kind}` : "—"} />
                </>
              ) : (
                <p className="text-muted-foreground">Not assigned yet. Dispatch the job to choose a driver.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DispatchDialog job={job} open={dispatchOpen} onOpenChange={setDispatchOpen} />
    </>
  )
}

function PrimaryAction({
  job,
  action,
  busy,
  onDispatch,
  onStart,
  onComplete,
}: {
  job: JobDetail
  action: ReturnType<typeof nextAction>
  busy: boolean
  onDispatch: () => void
  onStart: () => void
  onComplete: () => void
}) {
  if (action === "dispatch")
    return (
      <Button onClick={onDispatch}>
        <Send />
        Dispatch
      </Button>
    )
  if (action === "start")
    return (
      <Button onClick={onStart} disabled={busy}>
        <Play />
        Start delivery
      </Button>
    )
  if (action === "complete")
    return (
      <Button onClick={onComplete} disabled={busy}>
        <Check />
        Mark as completed
      </Button>
    )
  if (job.status === "completed")
    return (
      <Button disabled>
        <Loader2 className="animate-spin" />
        Generating invoice…
      </Button>
    )
  return job.invoice ? (
    <Button asChild variant="outline">
      <a href={api.invoices.documentUrl(job.invoice.id)} target="_blank" rel="noreferrer">
        <Download />
        Download invoice
      </a>
    </Button>
  ) : null
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

function Stop({ icon, label, address }: { icon: "pickup" | "dropoff"; label: string; address: string }) {
  const Icon = icon === "pickup" ? CircleDot : MapPin
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4.5 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span>{address}</span>
      </div>
    </div>
  )
}

function InvoicePanel({ job }: { job: JobDetail }) {
  if (job.invoice) {
    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex flex-col gap-1">
          <span className="font-medium">{job.invoice.number}</span>
          <span className="text-muted-foreground">
            {money(job.invoice.amount_pence)} · issued {dateTime(job.invoice.issued_at)}
          </span>
        </div>
        <Button asChild variant="outline">
          <a href={api.invoices.documentUrl(job.invoice.id)} target="_blank" rel="noreferrer">
            <Download />
            PDF
          </a>
        </Button>
      </div>
    )
  }
  return (
    <Alert>
      <Info />
      <AlertTitle>{job.status === "completed" ? "Generating invoice…" : "Invoice not generated yet"}</AlertTitle>
      <AlertDescription>
        {job.status === "completed"
          ? "The worker is creating the invoice. This page updates automatically."
          : "An invoice is created automatically once this job is marked as completed."}
      </AlertDescription>
    </Alert>
  )
}

function Timeline({ job }: { job: JobDetail }) {
  const reached = new Map<JobStatus, string>(job.events.map((e) => [e.to_status, e.at]))
  return (
    <ol className="flex flex-col">
      {STATUSES.map((s, i) => {
        const at = reached.get(s.value)
        const current = s.value === job.status && job.status !== "invoiced"
        const done = !!at && !current
        const last = i === STATUSES.length - 1
        const Icon = done ? CircleCheck : current ? CircleDot : Circle
        const tone = done
          ? "text-status-completed"
          : current
            ? "text-status-in-transit"
            : "text-muted-foreground"
        return (
          <li key={s.value} className="flex gap-3" aria-current={current ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <Icon className={`size-5 ${tone}`} />
              {!last && <div className="my-1 h-7 w-px bg-border" />}
            </div>
            <div className="flex flex-col pb-1">
              <span className={at ? "text-sm font-medium" : "text-sm text-muted-foreground"}>{s.label}</span>
              <span className="text-xs text-muted-foreground">
                {at ? dateTime(at) : s.value === "invoiced" ? "Pending — automatic" : "Pending"}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
