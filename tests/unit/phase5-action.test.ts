import { describe, it, expect, vi } from "vitest"
import { createBookingTransaction } from "../../src/actions/booking"

// Mock the dependencies
vi.mock("../../src/lib/db/prisma", () => {
  return {
    prisma: {
      tenant: {
        findUnique: vi.fn()
      },
      customerProfile: {
        findUnique: vi.fn()
      },
      service: {
        findMany: vi.fn()
      },
      booking: {
        count: vi.fn(),
        findFirst: vi.fn()
      },
      employeeProfile: {
        findMany: vi.fn()
      },
      $transaction: vi.fn(),
      $queryRaw: vi.fn()
    }
  }
})

import { prisma } from "../../src/lib/db/prisma"

describe("Phase 5: Booking Action Rules (Mocked)", () => {
  it("rejects booking if customer is blocked", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ id: "tenant-1", status: "ACTIVE" } as any)
    vi.mocked(prisma.customerProfile.findUnique).mockResolvedValue({ id: "cust-1", isBlocked: true, tenantMembership: { user: { emailVerified: new Date() } } } as any)

    await expect(
      createBookingTransaction({
        tenantId: "00000000-0000-0000-0000-000000000000",
        locationId: "00000000-0000-0000-0000-000000000000",
        serviceIds: ["00000000-0000-0000-0000-000000000000"],
        employeeId: "00000000-0000-0000-0000-000000000000",
        customerId: "00000000-0000-0000-0000-000000000000",
        startTime: "2026-10-15T09:00:00Z"
      })
    ).rejects.toThrow("Online booking is currently unavailable")
  })

  it("rejects if customer exceeds daily limit", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ 
      id: "tenant-1", 
      status: "ACTIVE",
      maxCustomerAppointmentsPerDay: 2 
    } as any)
    vi.mocked(prisma.customerProfile.findUnique).mockResolvedValue({ id: "cust-1", isBlocked: false, tenantMembership: { user: { emailVerified: new Date() } } } as any)
    vi.mocked(prisma.service.findMany).mockResolvedValue([{ id: "svc-1", durationMinutes: 30, price: 1000 } as any])
    
    // Simulate they already have 2 bookings
    vi.mocked(prisma.booking.count).mockResolvedValue(2)

    await expect(
      createBookingTransaction({
        tenantId: "00000000-0000-0000-0000-000000000000",
        locationId: "00000000-0000-0000-0000-000000000000",
        serviceIds: ["00000000-0000-0000-0000-000000000000"],
        employeeId: "00000000-0000-0000-0000-000000000000",
        customerId: "00000000-0000-0000-0000-000000000000",
        startTime: "2026-10-15T09:00:00Z"
      })
    ).rejects.toThrow("reached the maximum allowed appointments per day")
  })
  
  it("rejects if customer allows overlap is false and they have overlap", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ 
      id: "tenant-1", 
      status: "ACTIVE",
      maxCustomerAppointmentsPerDay: null,
      allowCustomerOverlaps: false
    } as any)
    vi.mocked(prisma.customerProfile.findUnique).mockResolvedValue({ id: "cust-1", isBlocked: false, tenantMembership: { user: { emailVerified: new Date() } } } as any)
    vi.mocked(prisma.service.findMany).mockResolvedValue([{ id: "svc-1", durationMinutes: 30, price: 1000 } as any])
    
    // Simulate overlap exists
    vi.mocked(prisma.booking.findFirst).mockResolvedValue({ id: "booking-overlap" } as any)

    await expect(
      createBookingTransaction({
        tenantId: "00000000-0000-0000-0000-000000000000",
        locationId: "00000000-0000-0000-0000-000000000000",
        serviceIds: ["00000000-0000-0000-0000-000000000000"],
        employeeId: "00000000-0000-0000-0000-000000000000",
        customerId: "00000000-0000-0000-0000-000000000000",
        startTime: "2026-10-15T09:00:00Z"
      })
    ).rejects.toThrow("already have a booking overlapping this time")
  })
})
