export type JobStatus = "created" | "dispatched" | "in_transit" | "completed" | "invoiced"

export interface Driver {
  id: number
  name: string
  phone: string | null
  active: boolean
}
export interface Vehicle {
  id: number
  plate: string
  kind: string
}
export interface Job {
  id: number
  reference: string
  customer_name: string
  pickup_address: string
  dropoff_address: string
  description: string
  price_pence: number
  status: JobStatus
  driver: Driver | null
  vehicle: Vehicle | null
  created_at: string
  updated_at: string
}
export interface JobEvent {
  from_status: JobStatus | null
  to_status: JobStatus
  at: string
}
export interface Invoice {
  id: number
  job_id: number
  job_reference: string
  customer_name: string
  number: string
  amount_pence: number
  status: "issued" | "paid"
  document_key: string | null
  issued_at: string
}
export interface JobDetail extends Job {
  events: JobEvent[]
  invoice: Invoice | null
}
export interface NewJob {
  customer_name: string
  pickup_address: string
  dropoff_address: string
  description: string
  price_pence: number
}

const BASE = "/api"
const API_KEY = import.meta.env.VITE_API_KEY as string | undefined

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set("content-type", "application/json")
  if (API_KEY) headers.set("x-api-key", API_KEY)
  let res: Response
  try {
    res = await fetch(BASE + path, { ...init, headers })
  } catch {
    throw new ApiError(0, "Can't reach the API. Check the backend is running.")
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail)
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })

export const api = {
  jobs: {
    list: () => request<Job[]>("/jobs"),
    get: (id: number) => request<JobDetail>(`/jobs/${id}`),
    create: (body: NewJob) => post<Job>("/jobs", body),
    dispatch: (id: number, body: { driver_id: number; vehicle_id: number | null }) =>
      post<Job>(`/jobs/${id}/dispatch`, body),
    start: (id: number) => post<Job>(`/jobs/${id}/start`),
    complete: (id: number) => post<Job>(`/jobs/${id}/complete`),
  },
  drivers: {
    list: () => request<Driver[]>("/drivers"),
    create: (body: { name: string; phone: string | null }) => post<Driver>("/drivers", body),
  },
  vehicles: {
    list: () => request<Vehicle[]>("/vehicles"),
    create: (body: { plate: string; kind: string }) => post<Vehicle>("/vehicles", body),
  },
  invoices: {
    list: () => request<Invoice[]>("/invoices"),
    documentUrl: (id: number) => `${BASE}/invoices/${id}/document`,
  },
}
