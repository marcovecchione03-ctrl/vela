"use server"

import { prisma } from "@/lib/db/prisma"
import { BookingStatus, Role } from "@prisma/client"
import { isValidTransition } from "@/lib/booking-engine/status-machine"

// Helper to determine active tenant role
export async function verifyAccess(tenantId: string, userId: string): Promise<{ role: Role, profileId: string | null }> {
  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    include: { employeeProfile: true, customerProfile: true }
  })
  
  if (!membership) throw new Error("Unauthorized access to tenant")
  
  const profileId = membership.role === "CUSTOMER" 
    ? membership.customerProfile?.id 
    : membership.employeeProfile?.id
    
  return { role: membership.role, profileId: profileId || null }
}

export async function updateAppointmentStatus(
  tenantId: string, 
  userId: string, 
  bookingId: string, 
  newStatus: BookingStatus,
  reason?: string
) {
  const { role, profileId } = await verifyAccess(tenantId, userId)
  
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId, tenantId }
    })
    
    if (!booking) throw new Error("Booking not found")
    
    // Enforcement: Customer cannot arbitrarily update status via this method
    if (role === "CUSTOMER") {
      throw new Error("Customers cannot manually update statuses. Use cancellation instead.")
    }
    
    // Enforcement: Employee self-only
    if (role === "EMPLOYEE" && booking.employeeId !== profileId) {
      throw new Error("Employees can only update their own appointments")
    }
    
    // State machine check
    if (!isValidTransition(booking.status, newStatus, role)) {
      throw new Error(`Invalid status transition from ${booking.status} to ${newStatus} for role ${role}`)
    }
    
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status: newStatus }
    })
    
    await tx.bookingStatusHistory.create({
      data: {
        tenantId,
        bookingId,
        status: newStatus,
        reason: reason || undefined
      }
    })
    
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: "STATUS_UPDATE",
        entityType: "Booking",
        entityId: bookingId,
        metadata: JSON.stringify({ oldStatus: booking.status, newStatus })
      }
    })

    // Phase 7: Score evaluation if this is a registered customer
    if (booking.customerId) {
      const { applyBookingStatusScore } = await import("../lib/crm/customer-score")
      
      await applyBookingStatusScore(tx, {
        tenantId,
        booking: { id: booking.id, customerId: booking.customerId, status: booking.status as any },
        toStatus: newStatus as any,
        lateCancellation: booking.lateCancellation,
        actorId: userId
      })
    }
    
    // Phase 9: Calendar sync
    const { enqueueCalendarSync } = await import("@/lib/calendar/enqueue")
    if (newStatus === "CANCELLED" || newStatus === "NO_SHOW") {
      await enqueueCalendarSync(tenantId, booking.employeeId, booking.id, "DELETE", tx)
    } else {
      await enqueueCalendarSync(tenantId, booking.employeeId, booking.id, "UPDATE", tx)
    }
    
    return updated
  })
}

export async function addInternalNote(
  tenantId: string,
  userId: string,
  bookingId: string,
  content: string
) {
  const { role, profileId } = await verifyAccess(tenantId, userId)
  
  if (role === "CUSTOMER") {
    throw new Error("Customers cannot add internal notes.")
  }
  
  if (!content.trim() || content.length > 2000) {
    throw new Error("Invalid note content")
  }
  
  // Verify booking access
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId, tenantId }
  })
  
  if (!booking) throw new Error("Booking not found")
  
  if (role === "EMPLOYEE" && booking.employeeId !== profileId) {
    throw new Error("Employees can only view and note their own appointments")
  }
  
  const note = await prisma.bookingNote.create({
    data: {
      tenantId,
      bookingId,
      authorId: userId,
      content: content.trim()
    }
  })
  
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: userId,
      action: "INTERNAL_NOTE_ADDED",
      entityType: "Booking",
      entityId: bookingId
    }
  })
  
  return note
}

export async function cancelAppointment(
  tenantId: string,
  userId: string,
  bookingId: string,
  reason?: string
) {
  const { role, profileId } = await verifyAccess(tenantId, userId)

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId, tenantId },
      include: { tenant: true }
    })
    
    if (!booking) throw new Error("Booking not found")
    
    if (role === "CUSTOMER" && booking.customerId !== profileId) {
      throw new Error("You can only cancel your own appointments")
    }
    
    if (role === "EMPLOYEE" && booking.employeeId !== profileId) {
      throw new Error("Employees can only cancel their own appointments")
    }
    
    if (!isValidTransition(booking.status, "CANCELLED", role)) {
      throw new Error(`Cannot cancel appointment from status ${booking.status}`)
    }
    
    let isLate = false
    if (role === "CUSTOMER") {
      // Evaluate late cancellation
      const deadlineHours = booking.tenant.cancellationDeadlineHours
      const deadline = new Date(booking.startTime.getTime() - deadlineHours * 60 * 60 * 1000)
      if (new Date() > deadline) {
        isLate = true
      }
    }
    
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { 
        status: "CANCELLED",
        lateCancellation: isLate
      }
    })
    
    await tx.bookingStatusHistory.create({
      data: {
        tenantId,
        bookingId,
        status: "CANCELLED",
        reason: reason || (isLate ? "LATE_CANCELLATION" : undefined)
      }
    })
    
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        action: role === "CUSTOMER" ? "CUSTOMER_CANCELLATION" : "STAFF_CANCELLATION",
        entityType: "Booking",
        entityId: bookingId,
        metadata: JSON.stringify({ isLate, reason })
      }
    })
    
    // Phase 7: Score evaluation for cancellations
    if (booking.customerId) {
      const { applyBookingStatusScore } = await import("../lib/crm/customer-score")
      
      await applyBookingStatusScore(tx, {
        tenantId,
        booking: { id: booking.id, customerId: booking.customerId, status: booking.status as any },
        toStatus: "CANCELLED",
        lateCancellation: isLate,
        actorId: userId
      })
    }

    // Phase 9: Calendar sync
    const { enqueueCalendarSync } = await import("@/lib/calendar/enqueue")
    await enqueueCalendarSync(tenantId, booking.employeeId, booking.id, "DELETE", tx)

    return updated
  })
}

export async function rescheduleAppointment(
  tenantId: string,
  userId: string,
  bookingId: string,
  newStartStr: string, // ISO string
  newEmployeeId?: string // If they want to change employee, otherwise defaults to current
) {
  const { role, profileId } = await verifyAccess(tenantId, userId)

  const newStart = new Date(newStartStr)

  // MAX_RETRIES logic for row-level locking
  const MAX_RETRIES = 3
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    try {
      return await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId, tenantId },
          include: { 
            services: { include: { service: true } },
            tenant: true
          }
        })

        if (!booking) throw new Error("Booking not found")
        
        // Calculate total duration from services snapshot
        const totalMinutes = booking.services.reduce((acc, s) => acc + s.durationMinutes, 0)
        const newEnd = new Date(newStart.getTime() + totalMinutes * 60000)

        // Role validations
        if (role === "CUSTOMER" && booking.customerId !== profileId) {
          throw new Error("You can only reschedule your own appointments")
        }
        if (role === "EMPLOYEE" && booking.employeeId !== profileId) {
          throw new Error("Employees can only reschedule their own appointments")
        }

        // Cannot reschedule if not pending/confirmed
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
          throw new Error(`Cannot reschedule appointment from status ${booking.status}`)
        }

        const targetEmployeeId = newEmployeeId || booking.employeeId

        // Lock the target employee
        await tx.$queryRaw`SELECT id FROM "EmployeeProfile" WHERE id = ${targetEmployeeId}::uuid FOR UPDATE`

        // Concurrency / Capacity Check for new slot
        // Make sure the new slot does not overlap excessively
        const effectiveCapacity = Math.min(...booking.services.map(s => s.service.concurrentCapacity))
        
        const overlappingEmployeeBookings = await tx.booking.findMany({
          where: {
            employeeId: targetEmployeeId,
            tenantId,
            id: { not: bookingId }, // Exclude current booking!
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            OR: [
              { startTime: { lt: newEnd }, endTime: { gt: newStart } }
            ]
          }
        })

        if (overlappingEmployeeBookings.length >= effectiveCapacity) {
          throw new Error("SLOT_UNAVAILABLE")
        }

        // Customer daily limit and overlap checks
        if (booking.customerId) {
          const dayStart = new Date(newStart)
          dayStart.setUTCHours(0,0,0,0)
          const dayEnd = new Date(newStart)
          dayEnd.setUTCHours(23,59,59,999)
          
          const existingDayCount = await tx.booking.count({
            where: {
              customerId: booking.customerId,
              tenantId,
              id: { not: bookingId },
              startTime: { gte: dayStart, lt: dayEnd },
              status: { notIn: ["CANCELLED", "NO_SHOW"] }
            }
          })
          
          if (booking.tenant.maxCustomerAppointmentsPerDay && existingDayCount >= booking.tenant.maxCustomerAppointmentsPerDay) {
            throw new Error("You have reached the maximum allowed appointments per day.")
          }

          if (!booking.tenant.allowCustomerOverlaps) {
            const overlappingCustomer = await tx.booking.findFirst({
              where: {
                customerId: booking.customerId,
                tenantId,
                id: { not: bookingId },
                status: { notIn: ["CANCELLED", "NO_SHOW"] },
                OR: [
                  { startTime: { lt: newEnd }, endTime: { gt: newStart } }
                ]
              }
            })
            if (overlappingCustomer) throw new Error("You already have a booking overlapping this new time.")
          }
        }

        // Evaluate rescheduling deadline
        if (role === "CUSTOMER") {
          const deadlineHours = booking.tenant.cancellationDeadlineHours
          const deadline = new Date(booking.startTime.getTime() - deadlineHours * 60 * 60 * 1000)
          if (new Date() > deadline) {
            throw new Error(`You cannot reschedule within ${deadlineHours} hours of your appointment. Please contact support.`)
          }
        }

        const previousStart = booking.startTime
        const previousEnd = booking.endTime
        const previousEmployeeId = booking.employeeId

        // Commit Reschedule
        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: {
            startTime: newStart,
            endTime: newEnd,
            employeeId: targetEmployeeId
          }
        })

        await tx.bookingChangeHistory.create({
          data: {
            tenantId,
            bookingId,
            actorId: userId,
            actorRole: role,
            previousStart,
            previousEnd,
            newStart,
            newEnd,
            previousEmployeeId,
            newEmployeeId: targetEmployeeId
          }
        })

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: userId,
            action: role === "CUSTOMER" ? "CUSTOMER_RESCHEDULE" : "STAFF_RESCHEDULE",
            entityType: "Booking",
            entityId: bookingId,
            metadata: JSON.stringify({ previousStart, newStart })
          }
        })

        // Phase 9: Calendar sync
        const { enqueueCalendarSync } = await import("@/lib/calendar/enqueue")
        await enqueueCalendarSync(tenantId, targetEmployeeId, bookingId, "UPDATE", tx)

        return updated
      })
    } catch (err: any) {
      if (err.message === "SLOT_UNAVAILABLE" || err.message.includes("appointments per day") || err.message.includes("overlapping this new time")) {
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
}

export async function createManualBooking(
  tenantId: string,
  userId: string,
  payload: {
    locationId: string
    serviceIds: string[]
    employeeId: string
    startTime: string
    endTime: string
    customerId?: string
    oneTimeClient?: { firstName: string, lastName: string, email?: string, phone?: string }
    internalNote?: string
  }
) {
  const { role, profileId } = await verifyAccess(tenantId, userId)

  if (role === "CUSTOMER") {
    throw new Error("Customers cannot create manual staff bookings")
  }

  if (role === "EMPLOYEE" && payload.employeeId !== profileId) {
    throw new Error("Employees can only create manual bookings for themselves")
  }

  if (!payload.customerId && !payload.oneTimeClient) {
    throw new Error("Must provide either a registered customer or one-time client details")
  }
  if (payload.customerId && payload.oneTimeClient) {
    throw new Error("Cannot provide both registered customer and one-time client")
  }

  const start = new Date(payload.startTime)
  const end = new Date(payload.endTime)

  // MAX_RETRIES for row-level locking
  const MAX_RETRIES = 3
  let attempt = 0

  while (attempt < MAX_RETRIES) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Fetch services to snapshot
        const services = await tx.service.findMany({
          where: { id: { in: payload.serviceIds }, tenantId, isActive: true }
        })
        if (services.length !== payload.serviceIds.length) {
          throw new Error("Some services are invalid or inactive")
        }

        // Lock employee
        await tx.$queryRaw`SELECT id FROM "EmployeeProfile" WHERE id = ${payload.employeeId}::uuid FOR UPDATE`

        // Check slot availability
        const effectiveCapacity = Math.min(...services.map(s => s.concurrentCapacity))
        const overlappingEmployeeBookings = await tx.booking.findMany({
          where: {
            employeeId: payload.employeeId,
            tenantId,
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
            OR: [
              { startTime: { lt: end }, endTime: { gt: start } }
            ]
          }
        })

        if (overlappingEmployeeBookings.length >= effectiveCapacity) {
          throw new Error("SLOT_UNAVAILABLE")
        }

        // Handle Identity
        let finalCustomerId: string | null = null
        let finalOneTimeClientId: string | null = null

        if (payload.customerId) {
          finalCustomerId = payload.customerId
        } else if (payload.oneTimeClient) {
          // Create OneTimeClient
          const otc = await tx.oneTimeClient.create({
            data: {
              tenantId,
              firstName: payload.oneTimeClient.firstName,
              lastName: payload.oneTimeClient.lastName,
              email: payload.oneTimeClient.email,
              phone: payload.oneTimeClient.phone
            }
          })
          finalOneTimeClientId = otc.id
        }

        // Manual staff booking default: CONFIRMED
        const initialStatus: BookingStatus = "CONFIRMED"
        
        // Use a crypto random reference
        const { randomBytes } = await import("crypto")
        const bookingRef = randomBytes(4).toString('hex').toUpperCase()

        const booking = await tx.booking.create({
          data: {
            tenantId,
            bookingReference: bookingRef,
            locationId: payload.locationId,
            employeeId: payload.employeeId,
            customerId: finalCustomerId,
            oneTimeClientId: finalOneTimeClientId,
            startTime: start,
            endTime: end,
            status: initialStatus,
            internalNote: payload.internalNote,

            statusHistory: {
              create: {
                tenantId,
                status: initialStatus
              }
            },
            
            services: {
              create: services.map(s => ({
                tenantId,
                serviceId: s.id,
                serviceName: s.name,
                durationMinutes: s.durationMinutes,
                price: s.price
              }))
            }
          }
        })

        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: userId,
            action: payload.oneTimeClient ? "MANUAL_BOOKING_OTC" : "MANUAL_BOOKING_REGISTERED",
            entityType: "Booking",
            entityId: booking.id,
            metadata: JSON.stringify({ reference: bookingRef, isOneTimeClient: !!payload.oneTimeClient })
          }
        })

        // Phase 9: Calendar Sync
        const { enqueueCalendarSync } = await import("@/lib/calendar/enqueue")
        await enqueueCalendarSync(tenantId, payload.employeeId, booking.id, "CREATE", tx)

        return booking
      })
    } catch (err: any) {
      if (err.message === "SLOT_UNAVAILABLE" || err.message.includes("Must provide") || err.message.includes("invalid")) {
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
  throw new Error("Service is temporarily busy. Please try again.")
}
