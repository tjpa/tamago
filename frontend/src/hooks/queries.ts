import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, type NewJob } from "@/lib/api"

export const useJobs = () =>
  useQuery({ queryKey: ["jobs"], queryFn: api.jobs.list, refetchInterval: 5000 })

export const useJob = (id: number) =>
  useQuery({
    queryKey: ["job", id],
    queryFn: () => api.jobs.get(id),
    refetchInterval: (q) => (q.state.data?.status === "completed" ? 1500 : false),
  })

export const useDrivers = () => useQuery({ queryKey: ["drivers"], queryFn: api.drivers.list })
export const useVehicles = () => useQuery({ queryKey: ["vehicles"], queryFn: api.vehicles.list })
export const useInvoices = () =>
  useQuery({ queryKey: ["invoices"], queryFn: api.invoices.list, refetchInterval: 5000 })

function useApiMutation<TVars, TData>(
  fn: (vars: TVars) => Promise<TData>,
  invalidate: string[],
  success: (data: TData, vars: TVars) => string,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, vars) => {
      invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] }))
      toast.success(success(data, vars))
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

const jobKeys = ["jobs", "job"]

export const useCreateJob = () =>
  useApiMutation((body: NewJob) => api.jobs.create(body), jobKeys, (job) => `${job.reference} created`)

export const useDispatchJob = () =>
  useApiMutation(
    (v: { id: number; driver_id: number; vehicle_id: number | null }) =>
      api.jobs.dispatch(v.id, { driver_id: v.driver_id, vehicle_id: v.vehicle_id }),
    [...jobKeys, "drivers"],
    (job) => `${job.reference} dispatched to ${job.driver?.name ?? "driver"}`,
  )

export const useStartJob = () =>
  useApiMutation((id: number) => api.jobs.start(id), jobKeys, (job) => `${job.reference} is in transit`)

export const useCompleteJob = () =>
  useApiMutation(
    (id: number) => api.jobs.complete(id),
    jobKeys,
    (job) => `${job.reference} completed. Invoice is being generated`,
  )

export const useCreateDriver = () =>
  useApiMutation(
    (body: { name: string; phone: string | null }) => api.drivers.create(body),
    ["drivers"],
    (d) => `${d.name} added`,
  )

export const useCreateVehicle = () =>
  useApiMutation(
    (body: { plate: string; kind: string }) => api.vehicles.create(body),
    ["vehicles"],
    (v) => `${v.plate} added`,
  )
