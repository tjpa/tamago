import type { JobStatus } from "@/lib/api"

export const STATUSES: { value: JobStatus; label: string; badge: string }[] = [
  { value: "created", label: "Created", badge: "bg-status-created-bg text-status-created" },
  { value: "dispatched", label: "Dispatched", badge: "bg-status-dispatched-bg text-status-dispatched" },
  { value: "in_transit", label: "In transit", badge: "bg-status-in-transit-bg text-status-in-transit" },
  { value: "completed", label: "Completed", badge: "bg-status-completed-bg text-status-completed" },
  { value: "invoiced", label: "Invoiced", badge: "bg-status-invoiced-bg text-status-invoiced" },
]

export const statusMeta = (s: JobStatus) => STATUSES.find((x) => x.value === s)!

export type NextAction = "dispatch" | "start" | "complete"

export const nextAction = (s: JobStatus): NextAction | null =>
  s === "created" ? "dispatch" : s === "dispatched" ? "start" : s === "in_transit" ? "complete" : null
