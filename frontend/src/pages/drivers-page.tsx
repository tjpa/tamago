import { Plus, Truck } from "lucide-react"
import { useState, type FormEvent } from "react"

import { Field } from "@/components/field"
import { PageHeader } from "@/components/page-header"
import { EmptyState, ErrorState, LoadingBlocks } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCreateDriver, useCreateVehicle, useDrivers, useJobs, useVehicles } from "@/hooks/queries"

export function DriversPage() {
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const jobs = useJobs()
  const [driverOpen, setDriverOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)

  const openJobs = (driverId: number) =>
    (jobs.data ?? []).filter(
      (j) => j.driver?.id === driverId && (j.status === "dispatched" || j.status === "in_transit"),
    ).length

  return (
    <>
      <PageHeader
        title="Drivers & vehicles"
        subtitle={
          drivers.data && vehicles.data ? `${drivers.data.length} drivers · ${vehicles.data.length} vehicles` : "Loading…"
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setVehicleOpen(true)}>
              <Truck />
              Add vehicle
            </Button>
            <Button onClick={() => setDriverOpen(true)}>
              <Plus />
              Add driver
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-[1fr_420px] items-start gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Drivers</h2>
          {drivers.isPending ? (
            <LoadingBlocks rows={4} height="h-10" />
          ) : drivers.isError ? (
            <ErrorState error={drivers.error} onRetry={() => drivers.refetch()} />
          ) : drivers.data.length === 0 ? (
            <EmptyState title="No drivers" description="Add a driver so jobs can be dispatched." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Open jobs</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground">{d.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{openJobs(d.id)}</TableCell>
                    <TableCell>
                      <Badge variant={d.active ? "secondary" : "outline"}>{d.active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Vehicles</h2>
          {vehicles.isPending ? (
            <LoadingBlocks rows={4} height="h-10" />
          ) : vehicles.isError ? (
            <ErrorState error={vehicles.error} onRetry={() => vehicles.refetch()} />
          ) : vehicles.data.length === 0 ? (
            <EmptyState title="No vehicles" description="Vehicles are optional when dispatching." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plate</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.plate}</TableCell>
                    <TableCell className="text-muted-foreground">{v.kind}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
      <DriverDialog open={driverOpen} onOpenChange={setDriverOpen} />
      <VehicleDialog open={vehicleOpen} onOpenChange={setVehicleOpen} />
    </>
  )
}

function DriverDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const create = useCreateDriver()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Name is required")
    create.mutate(
      { name: name.trim(), phone: phone.trim() || null },
      {
        onSuccess: () => {
          setName("")
          setPhone("")
          setError("")
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Add driver</DialogTitle>
            <DialogDescription>Drivers can be assigned when dispatching a job.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="driver-name" error={error}>
            <Input id="driver-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Phone (optional)" htmlFor="driver-phone">
            <Input id="driver-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Add driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function VehicleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [plate, setPlate] = useState("")
  const [kind, setKind] = useState("Van")
  const [error, setError] = useState("")
  const create = useCreateVehicle()

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!plate.trim()) return setError("Plate is required")
    create.mutate(
      { plate: plate.trim().toUpperCase(), kind: kind.trim() || "Van" },
      {
        onSuccess: () => {
          setPlate("")
          setError("")
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
            <DialogDescription>Vehicles are optional when dispatching a job.</DialogDescription>
          </DialogHeader>
          <Field label="Plate" htmlFor="vehicle-plate" error={error}>
            <Input id="vehicle-plate" value={plate} onChange={(e) => setPlate(e.target.value)} />
          </Field>
          <Field label="Type" htmlFor="vehicle-kind">
            <Input id="vehicle-kind" value={kind} onChange={(e) => setKind(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Add vehicle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
