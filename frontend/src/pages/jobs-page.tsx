import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"

import { EmptyState, ErrorState, LoadingBlocks } from "@/components/states"
import { JobCard } from "@/components/job-card"
import { NewJobDialog } from "@/components/new-job-dialog"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDrivers, useJobs } from "@/hooks/queries"
import type { Job, JobStatus } from "@/lib/api"
import { money, timeAgo } from "@/lib/format"
import { STATUSES } from "@/lib/status"

const ALL = "all"

export function JobsPage() {
  const jobs = useJobs()
  const drivers = useDrivers()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = params.get("view") === "table" ? "table" : "board"
  const [query, setQuery] = useState("")
  const [driver, setDriver] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [newOpen, setNewOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (jobs.data ?? []).filter(
      (j) =>
        (driver === ALL || String(j.driver?.id) === driver) &&
        (status === ALL || j.status === status) &&
        (!q ||
          [j.reference, j.customer_name, j.pickup_address, j.dropoff_address].some((s) =>
            s.toLowerCase().includes(q),
          )),
    )
  }, [jobs.data, query, driver, status])

  const open = (jobs.data ?? []).filter((j) => j.status !== "invoiced")
  const openTotal = open.reduce((sum, j) => sum + j.price_pence, 0)
  const byStatus = (s: JobStatus) => filtered.filter((j) => j.status === s)

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle={jobs.data ? `${jobs.data.length} jobs · ${money(openTotal)} open` : "Loading…"}
        actions={
          <>
            <Tabs
              value={view}
              onValueChange={(v) => setParams(v === "table" ? { view: "table" } : {}, { replace: true })}
            >
              <TabsList>
                <TabsTrigger value="board">Board</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setNewOpen(true)}>
              <Plus />
              New job
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <Input
          aria-label="Search jobs"
          placeholder="Search jobs…"
          className="w-80"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={driver} onValueChange={setDriver}>
          <SelectTrigger aria-label="Filter by driver" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All drivers</SelectItem>
            {drivers.data?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {view === "table" && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger aria-label="Filter by status" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {jobs.isPending ? (
        <div className="grid grid-cols-5 gap-4">
          {STATUSES.map((s) => (
            <LoadingBlocks key={s.value} rows={2} />
          ))}
        </div>
      ) : jobs.isError ? (
        <ErrorState error={jobs.error} onRetry={() => jobs.refetch()} />
      ) : jobs.data.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Create your first job to start dispatching."
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Plus />
              New job
            </Button>
          }
        />
      ) : view === "board" ? (
        <div className="grid grid-cols-5 items-start gap-4">
          {STATUSES.map((s) => {
            const items = byStatus(s.value)
            return (
              <section key={s.value} aria-label={s.label} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={s.value} />
                  <span className="text-sm font-medium text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                  {items.length === 0 && (
                    <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No jobs
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <JobsTable jobs={filtered} onOpen={(id) => navigate(`/jobs/${id}`)} />
      )}

      <NewJobDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  )
}

function JobsTable({ jobs, onOpen }: { jobs: Job[]; onOpen: (id: number) => void }) {
  if (jobs.length === 0) {
    return <EmptyState title="No matching jobs" description="Try a different search or filter." />
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((j) => (
          <TableRow key={j.id} className="cursor-pointer" onClick={() => onOpen(j.id)}>
            <TableCell className="font-medium">
              <Link to={`/jobs/${j.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                {j.reference}
              </Link>
            </TableCell>
            <TableCell>{j.customer_name}</TableCell>
            <TableCell className="text-muted-foreground">
              {j.pickup_address} → {j.dropoff_address}
            </TableCell>
            <TableCell className="text-muted-foreground">{j.driver?.name ?? "Unassigned"}</TableCell>
            <TableCell>
              <StatusBadge status={j.status} />
            </TableCell>
            <TableCell>{money(j.price_pence)}</TableCell>
            <TableCell className="text-muted-foreground">{timeAgo(j.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
