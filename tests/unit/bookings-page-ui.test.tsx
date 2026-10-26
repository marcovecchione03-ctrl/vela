import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as fs from "fs"
import * as path from "path"
import DashboardBookingsPage from "@/app/(dashboard)/dashboard/bookings/page"
import BookingStatusActions from "@/app/(dashboard)/dashboard/bookings/BookingStatusActions"
import BookingNotePill from "@/app/(dashboard)/dashboard/bookings/BookingNotePill"
import {
  BOOKING_STATUS_GROUPS,
  buildBookingFilterHref,
  formatBookingDateParts,
  getBookingStatusVisual,
  resolveBookingStatusFilter
} from "@/app/(dashboard)/dashboard/bookings/booking-ui-helpers"
import * as tenantContext from "@/lib/tenant/context"
import { prisma } from "@/lib/db/prisma"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/bookings",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  })
}))

vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "user-owner-1", email: "owner@vela.test" }
  })
}))

vi.mock("@/lib/tenant/context", () => ({
  getDashboardTenant: vi.fn(),
  getDashboardContext: vi.fn()
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: {
      findUnique: vi.fn()
    },
    booking: {
      findMany: vi.fn(),
      count: vi.fn()
    }
  }
}))

describe("STAGING STEP 4P — Figma-Authored Bookings Page UI", () => {
  const mockTenant = {
    id: "tenant-1",
    name: "Salone Bella Vista",
    primaryColor: "#297BFF",
    secondaryColor: "#9A7DDE",
    bgColor: "#0f162c",
    textColor: "#ffffff"
  }

  const sampleBookings = [
    {
      id: "booking-101",
      tenantId: "tenant-1",
      bookingReference: "REF-101",
      locationId: "loc-1",
      employeeId: "emp-1",
      customerId: "cust-101",
      oneTimeClientId: null,
      startTime: new Date("2026-10-13T13:00:00"),
      endTime: new Date("2026-10-13T13:30:00"),
      status: "CONFIRMED",
      customerNote: null,
      internalNote: "Preferisce forbici",
      lateCancellation: false,
      customer: { firstName: "Elena", lastName: "Conti" },
      oneTimeClient: null,
      employee: { name: "Matteo", surname: "Greco" },
      location: { name: "Sede Centrale" },
      services: [
        {
          id: "bs-101",
          serviceName: "Taglio + Piega",
          durationMinutes: 45,
          price: 3500
        }
      ],
      notes: [{ id: "note-1", content: "Cliente puntuale", createdAt: new Date() }]
    },
    {
      id: "booking-102",
      tenantId: "tenant-1",
      bookingReference: "REF-102",
      locationId: "loc-1",
      employeeId: "emp-2",
      customerId: null,
      oneTimeClientId: "otc-102",
      startTime: new Date("2026-10-13T09:00:00"),
      endTime: new Date("2026-10-13T09:15:00"),
      status: "PENDING",
      customerNote: null,
      internalNote: null,
      lateCancellation: false,
      customer: null,
      oneTimeClient: { firstName: "Davide", lastName: "Moretti" },
      employee: { name: "Sara", surname: "Lombardi" },
      location: { name: "Sede Centrale" },
      services: [
        {
          id: "bs-102",
          serviceName: "Regolazione Barba",
          durationMinutes: 15,
          price: 1200
        }
      ],
      notes: []
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tenantContext.getDashboardTenant).mockResolvedValue(mockTenant as any)
    vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({
      id: "mem-1",
      role: "OWNER",
      employeeProfile: { id: "emp-1" }
    } as any)
    vi.mocked(prisma.booking.findMany).mockResolvedValue(sampleBookings as any)
    vi.mocked(prisma.booking.count).mockResolvedValue(sampleBookings.length)
  })

  it("4P.1 renders status filters mapped to grouped booking status model", async () => {
    const pageElement = await DashboardBookingsPage({
      searchParams: Promise.resolve({ statusGroup: "CONFIRMED" })
    })
    const html = renderToStaticMarkup(pageElement)

    expect(html).toContain('data-testid="mobile-status-filters"')
    expect(html).toContain('data-testid="desktop-filter-bar"')
    expect(html).toContain("Tutte")
    expect(html).toContain("In corso")
    expect(html).toContain("Confermate")
    expect(html).toContain("Completate")
    expect(html).toContain("Cancellate")
    expect(html).toContain("/dashboard/bookings?statusGroup=ACTIVE")
    expect(html).toContain("/dashboard/bookings?statusGroup=CONFIRMED")
    expect(html).toContain("/dashboard/bookings?statusGroup=COMPLETED")
    expect(html).toContain("/dashboard/bookings?statusGroup=CANCELLED")

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          status: { in: ["CONFIRMED"] }
        })
      })
    )
  })

  it("4P.2 renders mobile booking cards with live customer, service, employee, date/time, and note data", async () => {
    const pageElement = await DashboardBookingsPage({
      searchParams: Promise.resolve({})
    })
    const html = renderToStaticMarkup(pageElement)

    expect(html).toContain('data-testid="mobile-bookings-list"')
    expect(html).toContain('data-testid="mobile-booking-card"')
    expect(html).toContain("Elena Conti")
    expect(html).toContain("Taglio + Piega")
    expect(html).toContain("Matteo Greco")
    expect(html).toContain("Davide Moretti")
    expect(html).toContain("Regolazione Barba")
    expect(html).toContain("Sara Lombardi")
    expect(html).toContain("13:00")
    expect(html).toContain("09:00")
    expect(html).toContain("Cliente puntuale")
  })

  it("4P.3 renders semantic desktop booking table with Cliente, Data & Orario, Staff, Servizio, Note, Stato, and Actions", async () => {
    const pageElement = await DashboardBookingsPage({
      searchParams: Promise.resolve({})
    })
    const html = renderToStaticMarkup(pageElement)

    expect(html).toContain('data-testid="desktop-bookings-table"')
    expect(html).toContain('data-testid="desktop-booking-row"')
    expect(html).toContain("Cliente")
    expect(html).toContain("Data &amp; Orario")
    expect(html).toContain("Staff")
    expect(html).toContain("Servizio")
    expect(html).toContain("Note")
    expect(html).toContain("Stato")
    expect(html).toContain("45 min • €35")
    expect(html).toContain("15 min • €12")
  })

  it("4P.4 renders New Booking CTA linking to /dashboard/bookings/new on both mobile and desktop", async () => {
    const pageElement = await DashboardBookingsPage({
      searchParams: Promise.resolve({})
    })
    const html = renderToStaticMarkup(pageElement)

    expect(html).toContain('data-testid="mobile-new-booking-cta"')
    expect(html).toContain('data-testid="desktop-new-booking-cta"')
    expect(html).toContain('href="/dashboard/bookings/new"')
    expect(html).toContain("Nuova prenotazione")
  })

  it("4P.5 renders booking detail navigation links (/dashboard/bookings/[id]) on mobile chevron and desktop client cell", async () => {
    const pageElement = await DashboardBookingsPage({
      searchParams: Promise.resolve({})
    })
    const html = renderToStaticMarkup(pageElement)

    expect(html).toContain('data-testid="booking-detail-chevron"')
    expect(html).toContain('href="/dashboard/bookings/booking-101"')
    expect(html).toContain('href="/dashboard/bookings/booking-102"')
  })

  it("4P.6 maps booking statuses to semantic visual states (confirmed, active, completed, cancelled) with accessible text", () => {
    expect(getBookingStatusVisual("CONFIRMED")).toEqual({
      label: "Confermata",
      semanticState: "confirmed",
      capsuleClass: "vela-status-capsule vela-status-confirmed"
    })
    expect(getBookingStatusVisual("PENDING")).toEqual({
      label: "In corso",
      semanticState: "active",
      capsuleClass: "vela-status-capsule vela-status-active"
    })
    expect(getBookingStatusVisual("IN_PROGRESS")).toEqual({
      label: "In corso",
      semanticState: "active",
      capsuleClass: "vela-status-capsule vela-status-active"
    })
    expect(getBookingStatusVisual("COMPLETED")).toEqual({
      label: "Completata",
      semanticState: "completed",
      capsuleClass: "vela-status-capsule vela-status-completed"
    })
    expect(getBookingStatusVisual("CANCELLED")).toEqual({
      label: "Annullata",
      semanticState: "cancelled",
      capsuleClass: "vela-status-capsule vela-status-cancelled"
    })

    const dateParts = formatBookingDateParts(new Date("2026-10-13T13:00:00"))
    expect(dateParts.shortDate).toBe("Mar 13 OTT")
    expect(dateParts.fullDate).toBe("Mar 13 OTT 2026")
    expect(dateParts.time24).toBe("13:00")
  })

  it("4P.7 renders role-aware BookingStatusActions and BookingNotePill controls", () => {
    const compactHtml = renderToStaticMarkup(
      <BookingStatusActions
        tenantId="tenant-1"
        userId="user-1"
        bookingId="booking-101"
        currentStatus="PENDING"
        role="OWNER"
        compact={true}
      />
    )
    expect(compactHtml).toContain('aria-label="Azioni prenotazione"')
    expect(compactHtml).toContain('aria-haspopup="menu"')

    const fullPendingOwnerHtml = renderToStaticMarkup(
      <BookingStatusActions
        tenantId="tenant-1"
        userId="user-1"
        bookingId="booking-101"
        currentStatus="PENDING"
        role="OWNER"
        compact={false}
      />
    )
    expect(fullPendingOwnerHtml).toContain("Mark Confirmed")
    expect(fullPendingOwnerHtml).toContain("Cancel Booking")

    const fullCompletedHtml = renderToStaticMarkup(
      <BookingStatusActions
        tenantId="tenant-1"
        userId="user-1"
        bookingId="booking-101"
        currentStatus="COMPLETED"
        role="OWNER"
        compact={false}
      />
    )
    expect(fullCompletedHtml).not.toContain("Mark Confirmed")
    expect(fullCompletedHtml).not.toContain("Cancel Booking")

    const noteHtml = renderToStaticMarkup(
      <BookingNotePill
        tenantId="tenant-1"
        userId="user-1"
        bookingId="booking-101"
        initialNote="Nota esistente"
        variant="desktop"
      />
    )
    expect(noteHtml).toContain('placeholder="Aggiungi una nota..."')
    expect(noteHtml).toContain('value="Nota esistente"')
  })

  it("4P.8 renders Liquid Glass empty state when zero bookings exist and never falls back to legacy white rectangle", async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([])
    vi.mocked(prisma.booking.count).mockResolvedValue(0)

    const pageElement = await DashboardBookingsPage({
      searchParams: Promise.resolve({})
    })
    const html = renderToStaticMarkup(pageElement)

    expect(html).toContain('data-testid="bookings-empty-state-mobile"')
    expect(html).toContain('data-testid="bookings-empty-state-desktop"')
    expect(html).toContain("Nessuna prenotazione trovata")
    expect(html).not.toContain("No bookings found.")
  })

  it("4P.9 scopes EMPLOYEE bookings query to their own employeeProfile.id and contains zero hardcoded sample names or localhost:3845 URLs", async () => {
    vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({
      id: "mem-emp",
      role: "EMPLOYEE",
      employeeProfile: { id: "emp-restricted-99" }
    } as any)

    await DashboardBookingsPage({
      searchParams: Promise.resolve({})
    })

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "tenant-1",
          employeeId: "emp-restricted-99"
        })
      })
    )

    const pageSource = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/bookings/page.tsx"),
      "utf-8"
    )
    expect(pageSource).not.toContain("Luca Bianchi")
    expect(pageSource).not.toContain("Pasquale Ricci")
    expect(pageSource).not.toContain("Andrea Lai")
    expect(pageSource).not.toContain("http://localhost:3845")
  })

  describe("STAGING STEP 4P-B — Grouped Status Filter Semantics", () => {
    const allStatusFixtures = [
      { ...sampleBookings[0], id: "b-pending", status: "PENDING", customer: { firstName: "Cliente", lastName: "Pending" } },
      { ...sampleBookings[0], id: "b-arrived", status: "ARRIVED", customer: { firstName: "Cliente", lastName: "Arrived" } },
      { ...sampleBookings[0], id: "b-in-progress", status: "IN_PROGRESS", customer: { firstName: "Cliente", lastName: "InProgress" } },
      { ...sampleBookings[0], id: "b-confirmed", status: "CONFIRMED", customer: { firstName: "Cliente", lastName: "Confirmed" } },
      { ...sampleBookings[0], id: "b-completed", status: "COMPLETED", customer: { firstName: "Cliente", lastName: "Completed" } },
      { ...sampleBookings[0], id: "b-cancelled", status: "CANCELLED", customer: { firstName: "Cliente", lastName: "Cancelled" } },
      { ...sampleBookings[0], id: "b-noshow", status: "NO_SHOW", customer: { firstName: "Cliente", lastName: "NoShow" } }
    ]

    beforeEach(() => {
      vi.mocked(prisma.booking.findMany).mockImplementation((async (args: any) => {
        const statusFilter = args?.where?.status
        if (!statusFilter) return allStatusFixtures as any
        const allowed: string[] = Array.isArray(statusFilter.in)
          ? statusFilter.in
          : [statusFilter]
        return allStatusFixtures.filter(b => allowed.includes(b.status)) as any
      }) as any)
      vi.mocked(prisma.booking.count).mockImplementation((async (args: any) => {
        const statusFilter = args?.where?.status
        if (!statusFilter) return allStatusFixtures.length
        const allowed: string[] = Array.isArray(statusFilter.in)
          ? statusFilter.in
          : [statusFilter]
        return allStatusFixtures.filter(b => allowed.includes(b.status)).length
      }) as any)
    })

    it("4P-B.1 active group returns PENDING", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "ACTIVE" })
      expect(resolved.statuses).toContain("PENDING")

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "ACTIVE" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente Pending")
    })

    it("4P-B.2 active group returns ARRIVED", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "ACTIVE" })
      expect(resolved.statuses).toContain("ARRIVED")

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "ACTIVE" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente Arrived")
    })

    it("4P-B.3 active group returns IN_PROGRESS", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "ACTIVE" })
      expect(resolved.statuses).toContain("IN_PROGRESS")

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "ACTIVE" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente InProgress")
    })

    it("4P-B.4 active group excludes CONFIRMED", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "ACTIVE" })
      expect(resolved.statuses).not.toContain("CONFIRMED")
      expect(BOOKING_STATUS_GROUPS.ACTIVE).toEqual(["PENDING", "ARRIVED", "IN_PROGRESS"])

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "ACTIVE" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).not.toContain("Cliente Confirmed")
      expect(html).not.toContain("Cliente Completed")
      expect(html).not.toContain("Cliente Cancelled")
    })

    it("4P-B.5 cancelled group returns CANCELLED", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "CANCELLED" })
      expect(resolved.statuses).toContain("CANCELLED")

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "CANCELLED" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente Cancelled")
    })

    it("4P-B.6 cancelled group returns NO_SHOW", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "CANCELLED" })
      expect(resolved.statuses).toContain("NO_SHOW")
      expect(BOOKING_STATUS_GROUPS.CANCELLED).toEqual(["CANCELLED", "NO_SHOW"])

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "CANCELLED" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente NoShow")
      expect(html).not.toContain("Cliente Confirmed")
      expect(html).not.toContain("Cliente Pending")
    })

    it("4P-B.7 confirmed filter only returns CONFIRMED", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "CONFIRMED" })
      expect(resolved.statuses).toEqual(["CONFIRMED"])

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "CONFIRMED" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente Confirmed")
      expect(html).not.toContain("Cliente Pending")
      expect(html).not.toContain("Cliente Arrived")
      expect(html).not.toContain("Cliente InProgress")
      expect(html).not.toContain("Cliente Completed")
      expect(html).not.toContain("Cliente Cancelled")
      expect(html).not.toContain("Cliente NoShow")
    })

    it("4P-B.8 completed filter only returns COMPLETED", async () => {
      const resolved = resolveBookingStatusFilter({ statusGroup: "COMPLETED" })
      expect(resolved.statuses).toEqual(["COMPLETED"])

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({ statusGroup: "COMPLETED" })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain("Cliente Completed")
      expect(html).not.toContain("Cliente Confirmed")
      expect(html).not.toContain("Cliente Pending")
      expect(html).not.toContain("Cliente Arrived")
      expect(html).not.toContain("Cliente InProgress")
      expect(html).not.toContain("Cliente Cancelled")
      expect(html).not.toContain("Cliente NoShow")
    })

    it("4P-B.9 date parameter is preserved across all filter URLs", async () => {
      expect(buildBookingFilterHref("ALL", "2026-10-13")).toBe(
        "/dashboard/bookings?date=2026-10-13"
      )
      expect(buildBookingFilterHref("ACTIVE", "2026-10-13")).toBe(
        "/dashboard/bookings?statusGroup=ACTIVE&date=2026-10-13"
      )
      expect(buildBookingFilterHref("CONFIRMED", "2026-10-13")).toBe(
        "/dashboard/bookings?statusGroup=CONFIRMED&date=2026-10-13"
      )
      expect(buildBookingFilterHref("COMPLETED", "2026-10-13")).toBe(
        "/dashboard/bookings?statusGroup=COMPLETED&date=2026-10-13"
      )
      expect(buildBookingFilterHref("CANCELLED", "2026-10-13")).toBe(
        "/dashboard/bookings?statusGroup=CANCELLED&date=2026-10-13"
      )

      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({
          statusGroup: "ACTIVE",
          date: "2026-10-13"
        })
      })
      const html = renderToStaticMarkup(pageElement)
      expect(html).toContain('href="/dashboard/bookings?date=2026-10-13"')
      expect(html).toContain(
        'href="/dashboard/bookings?statusGroup=ACTIVE&amp;date=2026-10-13"'
      )
      expect(html).toContain(
        'href="/dashboard/bookings?statusGroup=CONFIRMED&amp;date=2026-10-13"'
      )
      expect(html).toContain(
        'href="/dashboard/bookings?statusGroup=COMPLETED&amp;date=2026-10-13"'
      )
      expect(html).toContain(
        'href="/dashboard/bookings?statusGroup=CANCELLED&amp;date=2026-10-13"'
      )
    })

    it("4P-B.10 mobile and desktop filter URLs use the exact same grouping and active state", async () => {
      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({
          statusGroup: "ACTIVE",
          date: "2026-10-13"
        })
      })
      const html = renderToStaticMarkup(pageElement)

      const mobileNavMatch = html.match(
        /<nav[^>]*data-testid="mobile-status-filters"[^>]*>([\s\S]*?)<\/nav>/
      )
      const desktopBarMatch = html.match(
        /<div[^>]*data-testid="desktop-filter-bar"[^>]*>[\s\S]*?<nav[^>]*>([\s\S]*?)<\/nav>/
      )

      expect(mobileNavMatch).not.toBeNull()
      expect(desktopBarMatch).not.toBeNull()

      const extractFilterLinks = (navHtml: string) =>
        Array.from(
          navHtml.matchAll(
            /<a[^>]*data-filter-status="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g
          )
        ).map(m => ({
          group: m[1],
          href: m[2],
          isActive: m[0].includes('aria-current="page"')
        }))

      const mobileLinks = extractFilterLinks(mobileNavMatch![1])
      const desktopLinks = extractFilterLinks(desktopBarMatch![1])

      expect(mobileLinks).toHaveLength(5)
      expect(desktopLinks).toEqual(mobileLinks)
      expect(mobileLinks.find(l => l.group === "ACTIVE")?.isActive).toBe(true)
      expect(mobileLinks.filter(l => l.group !== "ACTIVE").every(l => !l.isActive)).toBe(true)
    })
  })

  // =========================================================================
  // STAGING STEP 4P-D: VIEWPORT GEOMETRY & FULL-WIDTH ALIGNMENT
  // =========================================================================
  describe("STAGING STEP 4P-D: Viewport Geometry & Full-Width Alignment", () => {
    it("uses full DashboardPageShell variant without narrow max-w caps or double horizontal padding", async () => {
      const pageElement = await DashboardBookingsPage({
        searchParams: Promise.resolve({})
      })
      const html = renderToStaticMarkup(pageElement)

      expect(html).toContain('data-shell-variant="full"')
      expect(html).toContain("max-w-none")
      expect(html).not.toContain("max-w-[338px]")
      expect(html).not.toContain("lg:max-w-[1000px]")
      expect(html).not.toContain("xl:max-w-[1040px]")
      expect(html).toContain("lg:pr-[35px]")
      expect(html).toContain("min-h-[53px]")
      expect(html).toContain("min-h-[667px]")
    })
  })
})
