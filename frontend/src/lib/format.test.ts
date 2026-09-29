import { describe, expect, it } from "vitest"

import { initials, money, poundsToPence, timeAgo } from "@/lib/format"
import { nextAction } from "@/lib/status"

describe("format", () => {
  it("formats pence as GBP", () => {
    expect(money(12500)).toBe("£125.00")
    expect(money(9650)).toBe("£96.50")
  })

  it("parses pounds to pence and rejects invalid input", () => {
    expect(poundsToPence("150.50")).toBe(15050)
    expect(poundsToPence("£1,200")).toBe(120000)
    expect(poundsToPence("0")).toBeNull()
    expect(poundsToPence("-3")).toBeNull()
    expect(poundsToPence("abc")).toBeNull()
    expect(poundsToPence("")).toBeNull()
  })

  it("describes elapsed time", () => {
    const now = Date.parse("2026-09-29T12:00:00Z")
    expect(timeAgo("2026-09-29T11:59:40Z", now)).toBe("just now")
    expect(timeAgo("2026-09-29T11:48:00Z", now)).toBe("12m ago")
    expect(timeAgo("2026-09-29T09:00:00Z", now)).toBe("3h ago")
    expect(timeAgo("2026-09-28T12:00:00Z", now)).toBe("Yesterday")
  })

  it("builds initials", () => {
    expect(initials("Sam Murphy")).toBe("SM")
    expect(initials("cher")).toBe("C")
  })
})

describe("status", () => {
  it("offers the next action per status; invoiced is worker-only", () => {
    expect(nextAction("created")).toBe("dispatch")
    expect(nextAction("dispatched")).toBe("start")
    expect(nextAction("in_transit")).toBe("complete")
    expect(nextAction("completed")).toBeNull()
    expect(nextAction("invoiced")).toBeNull()
  })
})
