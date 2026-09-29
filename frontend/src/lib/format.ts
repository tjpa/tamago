const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" })

export const money = (pence: number) => gbp.format(pence / 100)

export function poundsToPence(input: string): number | null {
  const value = Number(input.replace(/[£,\s]/g, ""))
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100)
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? "Yesterday" : `${days}d ago`
}

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
