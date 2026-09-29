import { useState } from "react"

import { Field } from "@/components/field"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDispatchJob, useDrivers, useVehicles } from "@/hooks/queries"
import type { Job } from "@/lib/api"

const NO_VEHICLE = "none"

export function DispatchDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Pick<Job, "id" | "reference" | "customer_name">
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const dispatch = useDispatchJob()
  const [driverId, setDriverId] = useState("")
  const [vehicleId, setVehicleId] = useState(NO_VEHICLE)
  const [error, setError] = useState("")

  const driverItems = (drivers.data ?? []).filter((d) => d.active).map((d) => ({ value: String(d.id), label: d.name }))
  const vehicleItems = [
    { value: NO_VEHICLE, label: "No vehicle" },
    ...(vehicles.data ?? []).map((v) => ({ value: String(v.id), label: `${v.plate} · ${v.kind}` })),
  ]

  function submit() {
    if (!driverId) {
      setError("Choose a driver")
      return
    }
    dispatch.mutate(
      { id: job.id, driver_id: Number(driverId), vehicle_id: vehicleId === NO_VEHICLE ? null : Number(vehicleId) },
      {
        onSuccess: () => {
          setDriverId("")
          setVehicleId(NO_VEHICLE)
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dispatch {job.reference}</DialogTitle>
          <DialogDescription>
            Assign a driver to move {job.customer_name} from Created to Dispatched.
          </DialogDescription>
        </DialogHeader>
        <Field label="Driver" htmlFor="driver" error={error}>
          <Select
            value={driverId}
            items={driverItems}
            onValueChange={(v) => {
              setDriverId(v ?? "")
              setError("")
            }}
          >
            <SelectTrigger id="driver" className="w-full">
              <SelectValue placeholder="Select a driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.data
                ?.filter((d) => d.active)
                .map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Vehicle (optional)" htmlFor="vehicle">
          <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? NO_VEHICLE)} items={vehicleItems}>
            <SelectTrigger id="vehicle" className="w-full">
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_VEHICLE}>No vehicle</SelectItem>
              {vehicles.data?.map((v) => (
                <SelectItem key={v.id} value={String(v.id)}>
                  {v.plate} · {v.kind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={dispatch.isPending}>
            {dispatch.isPending ? "Dispatching…" : "Dispatch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
