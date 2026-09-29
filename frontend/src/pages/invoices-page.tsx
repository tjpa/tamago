import { Download } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/page-header"
import { EmptyState, ErrorState, LoadingBlocks } from "@/components/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useInvoices } from "@/hooks/queries"
import { api } from "@/lib/api"
import { money, shortDate } from "@/lib/format"

export function InvoicesPage() {
  const invoices = useInvoices()
  const [query, setQuery] = useState("")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (invoices.data ?? []).filter(
      (i) => !q || [i.number, i.job_reference, i.customer_name].some((s) => s.toLowerCase().includes(q)),
    )
  }, [invoices.data, query])

  const total = (invoices.data ?? []).reduce((sum, i) => sum + i.amount_pence, 0)

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle={
          invoices.data
            ? `${invoices.data.length} issued · ${money(total)} total · generated automatically when a job is completed`
            : "Loading…"
        }
      />
      <Input
        aria-label="Search invoices"
        placeholder="Search invoices…"
        className="w-80"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {invoices.isPending ? (
        <LoadingBlocks rows={5} height="h-10" />
      ) : invoices.isError ? (
        <ErrorState error={invoices.error} onRetry={() => invoices.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={invoices.data.length ? "No matching invoices" : "No invoices yet"}
          description={
            invoices.data.length
              ? "Try a different search."
              : "Invoices appear here automatically when a job is marked as completed."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.number}</TableCell>
                <TableCell>
                  <Link to={`/jobs/${i.job_id}`} className="text-muted-foreground hover:underline">
                    {i.job_reference}
                  </Link>
                </TableCell>
                <TableCell>{i.customer_name}</TableCell>
                <TableCell>{money(i.amount_pence)}</TableCell>
                <TableCell className="text-muted-foreground">{shortDate(i.issued_at)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{i.status === "paid" ? "Paid" : "Issued"}</Badge>
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="sm">
                    <a href={api.invoices.documentUrl(i.id)} target="_blank" rel="noreferrer">
                      <Download />
                      PDF
                    </a>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
