import { describe, it, expect, vi } from "vitest"
import { updateAppointmentStatus, addInternalNote } from "../../src/actions/appointments"

// Mock dependencies
vi.mock("../../src/lib/db/prisma", () => {
  return {
    prisma: {
      tenantMembership: {
        findUnique: vi.fn()
      },
      booking: {
        findUnique: vi.fn()
      },
      $transaction: vi.fn(),
      bookingNote: {
        create: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    }
  }
})

import { prisma } from "../../src/lib/db/prisma"

describe("Phase 6: Appointments Action Rules (Mocked)", () => {
  
  describe("updateAppointmentStatus", () => {
    it("rejects CUSTOMER attempting to manually update status (must use cancellation flow)", async () => {
      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({ 
        role: "CUSTOMER", customerProfile: { id: "cust-1" } 
      } as any)
      
      // Inside transaction mock
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(prisma as any)
      })
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({ 
        id: "booking-1", customerId: "cust-1", status: "PENDING" 
      } as any)

      await expect(
        updateAppointmentStatus("tenant-1", "user-1", "booking-1", "CONFIRMED")
      ).rejects.toThrow("Customers cannot manually update statuses")
    })

    it("rejects EMPLOYEE attempting to update another employee's booking", async () => {
      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({ 
        role: "EMPLOYEE", employeeProfile: { id: "emp-1" } 
      } as any)
      
      vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
        return cb(prisma as any)
      })
      
      vi.mocked(prisma.booking.findUnique).mockResolvedValue({ 
        id: "booking-2", employeeId: "emp-2", status: "CONFIRMED" 
      } as any)

      await expect(
        updateAppointmentStatus("tenant-1", "user-1", "booking-2", "ARRIVED")
      ).rejects.toThrow("Employees can only update their own appointments")
    })
  })

  describe("addInternalNote", () => {
    it("rejects CUSTOMER from adding internal notes", async () => {
      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({ 
        role: "CUSTOMER", customerProfile: { id: "cust-1" } 
      } as any)
      
      await expect(
        addInternalNote("tenant-1", "user-1", "booking-1", "This is an internal note")
      ).rejects.toThrow("Customers cannot add internal notes")
    })
  })
})
