"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"

async function getAuthAndTenant() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const tenantMembership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { tenant: true }
  })

  if (!tenantMembership) throw new Error("No tenant found")

  return { session, tenant: tenantMembership.tenant, membership: tenantMembership }
}

const ruleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
  isActive: z.boolean(),
  locationId: z.string().uuid().optional()
})

const setRecurringSchema = z.object({
  employeeId: z.string().uuid(),
  rules: z.array(ruleSchema)
})

export async function setRecurringAvailability(data: z.infer<typeof setRecurringSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    // Phase 4 requires employee modifications to be requests, but OWNER/ADMIN can set directly.
    throw new Error("Forbidden: Only Owner or Admin can set recurring availability directly")
  }

  const parsed = setRecurringSchema.parse(data)

  const employee = await prisma.employeeProfile.findUnique({
    where: { id: parsed.employeeId, tenantId: tenant.id }
  })

  if (!employee) throw new Error("Employee not found")

  return await prisma.$transaction(async (tx) => {
    // Delete existing rules for this employee
    await tx.availabilityRule.deleteMany({
      where: { employeeId: parsed.employeeId, tenantId: tenant.id }
    })

    if (parsed.rules.length > 0) {
      // Validate locations
      const locationIds = parsed.rules.map(r => r.locationId).filter(Boolean) as string[]
      if (locationIds.length > 0) {
        const validLocs = await tx.location.findMany({
          where: { id: { in: locationIds }, tenantId: tenant.id }
        })
        if (validLocs.length !== [...new Set(locationIds)].length) {
          throw new Error("One or more locations do not belong to this tenant")
        }
      }

      await tx.availabilityRule.createMany({
        data: parsed.rules.map(r => {
          if (r.startTime >= r.endTime) throw new Error("End time must be after start time")
          return {
            tenantId: tenant.id,
            employeeId: parsed.employeeId,
            locationId: r.locationId || null,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            isActive: r.isActive
          }
        })
      })
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: session.user.id,
        action: "RECURRING_AVAILABILITY_UPDATED",
        entityType: "EmployeeProfile",
        entityId: parsed.employeeId
      }
    })

    return { success: true }
  })
}

const timeBlockSchema = z.object({
  employeeId: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  reason: z.string().optional()
})

export async function createTimeBlock(data: z.infer<typeof timeBlockSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()
  const parsed = timeBlockSchema.parse(data)

  const employee = await prisma.employeeProfile.findUnique({
    where: { id: parsed.employeeId, tenantId: tenant.id }
  })

  if (!employee) throw new Error("Employee not found")

  // Employee can only create blocks for themselves
  if (membership.role === "EMPLOYEE" && employee.tenantMembershipId !== membership.id) {
    throw new Error("Employees can only create time blocks for themselves")
  }

  if (new Date(parsed.startTime) >= new Date(parsed.endTime)) {
    throw new Error("End time must be after start time")
  }

  const block = await prisma.timeBlock.create({
    data: {
      tenantId: tenant.id,
      employeeId: parsed.employeeId,
      startTime: new Date(parsed.startTime),
      endTime: new Date(parsed.endTime),
      reason: parsed.reason
    }
  })

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "TIME_BLOCK_CREATED",
      entityType: "TimeBlock",
      entityId: block.id
    }
  })

  return { success: true, block }
}

const availabilityRequestSchema = z.object({
  employeeId: z.string().uuid(),
  requestedChanges: z.string(), // JSON representing the desired rules
})

export async function requestAvailabilityChange(data: z.infer<typeof availabilityRequestSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()
  const parsed = availabilityRequestSchema.parse(data)

  const employee = await prisma.employeeProfile.findUnique({
    where: { id: parsed.employeeId, tenantId: tenant.id }
  })
  if (!employee) throw new Error("Employee not found")

  // Only the employee themselves can request a change for themselves
  if (membership.role === "EMPLOYEE" && employee.tenantMembershipId !== membership.id) {
    throw new Error("Employees can only request schedule changes for themselves")
  }

  const request = await prisma.availabilityChangeRequest.create({
    data: {
      tenantId: tenant.id,
      employeeId: parsed.employeeId,
      requestedChanges: parsed.requestedChanges,
      status: "PENDING"
    }
  })

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "AVAILABILITY_REQUEST_CREATED",
      entityType: "AvailabilityChangeRequest",
      entityId: request.id
    }
  })

  return { success: true, request }
}

export async function respondToAvailabilityRequest(requestId: string, approve: boolean) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden: Only Owner or Admin can approve/reject availability requests")
  }

  return await prisma.$transaction(async (tx) => {
    const request = await tx.availabilityChangeRequest.findUnique({
      where: { id: requestId, tenantId: tenant.id }
    })
    
    if (!request) throw new Error("Request not found")
    if (request.status !== "PENDING") throw new Error("Request is no longer pending")

    if (approve) {
      const parsedRules = JSON.parse(request.requestedChanges);
      
      // Delete existing rules for this employee
      await tx.availabilityRule.deleteMany({
        where: { employeeId: request.employeeId, tenantId: tenant.id }
      })

      // Assuming parsedRules is an array of valid rule objects
      if (Array.isArray(parsedRules) && parsedRules.length > 0) {
        await tx.availabilityRule.createMany({
          data: parsedRules.map(r => ({
            tenantId: tenant.id,
            employeeId: request.employeeId,
            locationId: r.locationId || null,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            isActive: r.isActive
          }))
        })
      }

      await tx.availabilityChangeRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" }
      })

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: session.user.id,
          action: "AVAILABILITY_REQUEST_APPROVED",
          entityType: "AvailabilityChangeRequest",
          entityId: request.id
        }
      })
    } else {
      await tx.availabilityChangeRequest.update({
        where: { id: request.id },
        data: { status: "REJECTED" }
      })

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: session.user.id,
          action: "AVAILABILITY_REQUEST_REJECTED",
          entityType: "AvailabilityChangeRequest",
          entityId: request.id
        }
      })
    }
    
    return { success: true }
  })
}

const availabilityExceptionSchema = z.object({
  employeeId: z.string().uuid().optional(), // If null, tenant-wide
  date: z.string().datetime(),
  isClosed: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional()
})

export async function createAvailabilityException(data: z.infer<typeof availabilityExceptionSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden: Only Owner or Admin can manage vacations/exceptions")
  }

  const parsed = availabilityExceptionSchema.parse(data)

  const exception = await prisma.availabilityException.create({
    data: {
      tenantId: tenant.id,
      employeeId: parsed.employeeId || null,
      date: new Date(parsed.date),
      isClosed: parsed.isClosed,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      reason: parsed.reason
    }
  })

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "VACATION_ABSENCE_CREATED",
      entityType: "AvailabilityException",
      entityId: exception.id
    }
  })

  return { success: true, exception }
}
