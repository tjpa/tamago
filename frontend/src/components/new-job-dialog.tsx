import { useState, type FormEvent } from "react"

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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useCreateJob } from "@/hooks/queries"
import { poundsToPence } from "@/lib/format"

const EMPTY = { customer: "", pickup: "", dropoff: "", price: "", description: "" }

export function NewJobDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const create = useCreateJob()

  const set = (key: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  function submit(e: FormEvent) {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.customer.trim()) next.customer = "Customer is required"
    if (!form.pickup.trim()) next.pickup = "Pickup address is required"
    if (!form.dropoff.trim()) next.dropoff = "Dropoff address is required"
    const pence = poundsToPence(form.price)
    if (pence === null) next.price = "Enter a price greater than £0"
    setErrors(next)
    if (Object.keys(next).length || pence === null) return
    create.mutate(
      {
        customer_name: form.customer.trim(),
        pickup_address: form.pickup.trim(),
        dropoff_address: form.dropoff.trim(),
        description: form.description.trim(),
        price_pence: pence,
      },
      {
        onSuccess: () => {
          setForm(EMPTY)
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>New job</DialogTitle>
            <DialogDescription>
              Create a job for the dispatch board. It starts as Created until a driver is assigned.
            </DialogDescription>
          </DialogHeader>
          <Field label="Customer" htmlFor="customer" error={errors.customer}>
            <Input id="customer" placeholder="e.g. Acme Ltd" value={form.customer} onChange={set("customer")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pickup address" htmlFor="pickup" error={errors.pickup}>
              <Input id="pickup" placeholder="Street, town" value={form.pickup} onChange={set("pickup")} />
            </Field>
            <Field label="Dropoff address" htmlFor="dropoff" error={errors.dropoff}>
              <Input id="dropoff" placeholder="Street, town" value={form.dropoff} onChange={set("dropoff")} />
            </Field>
          </div>
          <Field label="Price (£)" htmlFor="price" error={errors.price}>
            <Input id="price" inputMode="decimal" placeholder="0.00" value={form.price} onChange={set("price")} />
          </Field>
          <Field label="Description" htmlFor="description">
            <Textarea
              id="description"
              placeholder="Load details, access notes…"
              value={form.description}
              onChange={set("description")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
