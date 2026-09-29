import type { JobStatus } from "@/lib/api"

export const STATUSES: { value: JobStatus; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "dispatched", label: "Dispatched" },
  { value: "in_transit", label: "In transit" },
  { value: "completed", label: "Completed" },
  { value: "invoiced", label: "Invoiced" },
]

export const statusMeta = (s: JobStatus) => STATUSES.find((x) => x.value === s)!

export type NextAction = "dispatch" | "start" | "complete"

export const nextAction = (s: JobStatus): NextAction | null =>
  s === "created" ? "dispatch" : s === "dispatched" ? "start" : s === "in_transit" ? "complete" : null
