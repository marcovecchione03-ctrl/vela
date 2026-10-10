"use server"

import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { randomBytes } from "crypto"
import { Prisma } from "@prisma/client"

function generateBookingReference() {
  return randomBytes(4).toString("hex").toUpperCase() // 8 chars e.g. "A1B2C3D4"
}

const createBookingSchema = z.object({
  tenantId: z.string().uuid(),
  locationId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).min(1),
  employeeId: z.string().uuid().or(z.literal("ANY")),
  customerId: z.string().uuid(), // Assumes logged in CustomerProfile
  startTime: z.string().datetime(), // ISO Date
})

export async function createBookingTransaction(data: z.infer<typeof createBookingSchema>) {
  const parsed = createBookingSchema.parse(data)
  const start = new Date(parsed.startTime)

  // 1. Fetch Tenant settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: parsed.tenantId }
  })
  if (!tenant || tenant.status !== "ACTIVE") throw new Error("Tenant is inactive or not found")

  // 2. Fetch Customer and their User details
  const customer = await prisma.customerProfile.findUnique({
    where: { id: parsed.customerId, tenantId: parsed.tenantId },
    include: {
      tenantMembership: {
        include: {
          user: true
        }
      }
    }
  })
  if (!customer) throw new Error("Customer not found")
  if (customer.isBlocked) throw new Error("Online booking is currently unavailable for this account. Please contact the business.")

  // 2a. Check email verification
  if (process.env.NEXT_PUBLIC_DEV_BYPASS_EMAIL_VERIFICATION !== "true") {
    if (!customer.tenantMembership.user.emailVerified) {
      throw new Error("You must verify your email address before booking.")
    }
  }

  // 3. Fetch Services
  const services = await prisma.service.findMany({
    where: { 
      id: { in: parsed.serviceIds },
      tenantId: parsed.tenantId,
      isActive: true
    },
    include: {
      employees: true
    }
  })
  if (services.length !== parsed.serviceIds.length) throw new Error("One or more services invalid or inactive")

  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0)
  const end = new Date(start.getTime() + totalDuration * 60000)

  // Maximum Customer Appointments Per Day Rule
  if (tenant.maxCustomerAppointmentsPerDay) {
    // Assuming local day bounds based on start, simplifying for test by querying +/- 24h
    const dayStart = new Date(start)
    dayStart.setUTCHours(0,0,0,0)
    const dayEnd = new Date(start)
    dayEnd.setUTCHours(23,59,59,999)
    
    const existingDayCount = await prisma.booking.count({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        startTime: { gte: dayStart, lt: dayEnd },
        status: { notIn: ["CANCELLED", "NO_SHOW"] }
      }
    })
    
    if (existingDayCount >= tenant.maxCustomerAppointmentsPerDay) {
      throw new Error("You have reached the maximum allowed appointments per day.")
    }
  }

  // Customer Overlap Rule
  if (!tenant.allowCustomerOverlaps) {
    const overlapping = await prisma.booking.findFirst({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        OR: [
          { startTime: { lt: end }, endTime: { gt: start } }
        ]
      }
    })
    if (overlapping) throw new Error("You already have a booking overlapping this time.")
  }

  // Determine Employee
  let finalEmployeeId = parsed.employeeId
  
  if (finalEmployeeId === "ANY") {
    // Collect all employees compatible with ALL services
    let compatibleIds: string[] = []
    services.forEach((s, idx) => {
      const ids = s.employees.map(e => e.employeeId)
      if (idx === 0) compatibleIds = ids
      else compatibleIds = compatibleIds.filter(id => ids.includes(id))
    })
    
    if (compatibleIds.length === 0) throw new Error("No employee can perform all requested services")
    
    // Pick the one with fewest non-cancelled appointments today, fallback to lastAutoAssignedAt
    const candidates = await prisma.employeeProfile.findMany({
      where: { id: { in: compatibleIds }, tenantId: tenant.id, isActive: true },
      include: {
        bookings: {
          where: {
            startTime: { gte: new Date(new Date(start).setUTCHours(0,0,0,0)), lt: new Date(new Date(start).setUTCHours(23,59,59,999)) },
            status: { notIn: ["CANCELLED", "NO_SHOW"] }
          }
        }
      }
    })
    
    candidates.sort((a, b) => {
      if (a.bookings.length !== b.bookings.length) return a.bookings.length - b.bookings.length
      const aTime = a.lastAutoAssignedAt ? a.lastAutoAssignedAt.getTime() : 0
      const bTime = b.lastAutoAssignedAt ? b.lastAutoAssignedAt.getTime() : 0
      return aTime - bTime
    })
    
    if (candidates.length === 0) throw new Error("No available employees")
    finalEmployeeId = candidates[0].id
  }

  // 4. TRANSACTION
  // Maximum retries for serialization conflicts
  const MAX_RETRIES = 3
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 4a. ROW-LEVEL LOCK ON EMPLOYEE
        await tx.$queryRaw`SELECT id FROM "EmployeeProfile" WHERE id = ${finalEmployeeId}::uuid FOR UPDATE`

        // 4b. Re-query overlaps for the employee now that we hold the lock
        const overlappingEmployeeBookings = await tx.booking.findMany({
          where: {
            employeeId: finalEmployeeId,
            tenantId: tenant.id,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            OR: [
              { startTime: { lt: end }, endTime: { gt: start } }
            ]
          }
        })
        
        const effectiveCapacity = Math.min(...services.map(s => s.concurrentCapacity))
        if (overlappingEmployeeBookings.length >= effectiveCapacity) {
          throw new Error("SLOT_UNAVAILABLE")
        }
        
        const bookingRef = generateBookingReference()
        const initialStatus = tenant.bookingApprovalMode === "MANUAL" ? "PENDING" : "CONFIRMED"

        // 4c. Create Booking
        const booking = await tx.booking.create({
          data: {
            tenantId: tenant.id,
            bookingReference: bookingRef,
            locationId: parsed.locationId,
            employeeId: finalEmployeeId,
            customerId: customer.id,
            startTime: start,
            endTime: end,
            status: initialStatus,
            
            statusHistory: {
              create: {
                tenantId: tenant.id,
                status: initialStatus
              }
            },
            
            services: {
              create: services.map(s => ({
                tenantId: tenant.id,
                serviceId: s.id,
                serviceName: s.name,
                durationMinutes: s.durationMinutes,
                price: s.price
              }))
            }
          }
        })

        // 4d. Update lastAutoAssignedAt if it was an auto assignment
        if (parsed.employeeId === "ANY") {
          await tx.employeeProfile.update({
            where: { id: finalEmployeeId, tenantId: tenant.id },
            data: { lastAutoAssignedAt: new Date() }
          })
        }

        // 4e. Audit log
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            action: "BOOKING_CREATED",
            entityType: "Booking",
            entityId: booking.id,
            metadata: JSON.stringify({ reference: bookingRef, status: initialStatus, isAutoAssigned: parsed.employeeId === "ANY" })
          }
        })

        // 4f. Calendar Sync
        const { enqueueCalendarSync } = await import("@/lib/calendar/enqueue")
        await enqueueCalendarSync(tenant.id, finalEmployeeId, booking.id, "CREATE", tx)

        return booking
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
      })
    } catch (err: any) {
      if (err.message === "SLOT_UNAVAILABLE") {
        // We will fetch alternatives outside the transaction
        break;
      }
      if (err.message.includes("Tenant") || err.message.includes("Customer")) {
        throw err 
      }
      
      if (err.code === "P2034" || err.message.includes("deadlock")) {
        attempt++
        if (attempt >= MAX_RETRIES) throw new Error("Service is temporarily busy. Please try again.")
        continue
      }
      
      throw err 
    }
  }

  // If we broke out of the loop because of SLOT_UNAVAILABLE, fetch alternatives
  const { searchAvailability } = await import("./availability-search")
  const startStr = start.toISOString().split("T")[0]
  const availableSlots = await searchAvailability(parsed.tenantId, parsed.locationId, parsed.serviceIds, parsed.employeeId, startStr)
  
  // Find nearest slots that are strictly later than the requested start time
  const alternatives = availableSlots
    .filter(s => new Date(s).getTime() > start.getTime())
    .slice(0, 3)

  throw new Error(JSON.stringify({ 
    code: "SLOT_UNAVAILABLE", 
    message: "This slot is no longer available.",
    alternatives 
  }))
}
