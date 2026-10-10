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

const ALLOWED_CALENDAR_COLORS = ['#4f46e5', '#16a34a', '#ea580c', '#e11d48', '#0891b2', '#7c3aed'];

const updateProfileSchema = z.object({
  employeeId: z.string().uuid(),
  name: z.string().min(2),
  surname: z.string().optional(),
  bio: z.string().optional(),
  jobTitle: z.string().optional(),
  specialization: z.string().optional(),
  photoUrl: z.string().url().optional(),
  calendarColor: z.string().refine(val => ALLOWED_CALENDAR_COLORS.includes(val), {
    message: "Invalid calendar color"
  }).optional(),
  isActive: z.boolean().optional(),
  publicVisibility: z.boolean().optional(),
  locationIds: z.array(z.string().uuid()).optional()
})

export async function updateEmployeeProfile(data: z.infer<typeof updateProfileSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden")
  }

  const parsed = updateProfileSchema.parse(data)

  // Verify target employee belongs to tenant
  const targetEmployee = await prisma.employeeProfile.findUnique({
    where: { id: parsed.employeeId, tenantId: tenant.id },
    include: { tenantMembership: true }
  })

  if (!targetEmployee) {
    throw new Error("Employee not found in tenant")
  }

  // Admin cannot edit Owner or Admin
  if (membership.role === "ADMIN" && (targetEmployee.tenantMembership.role === "OWNER" || targetEmployee.tenantMembership.role === "ADMIN")) {
    throw new Error("Admins cannot modify owner or other admin profiles")
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.employeeProfile.update({
      where: { id: parsed.employeeId },
      data: {
        name: parsed.name,
        surname: parsed.surname,
        bio: parsed.bio,
        jobTitle: parsed.jobTitle,
        specialization: parsed.specialization,
        photoUrl: parsed.photoUrl,
        calendarColor: parsed.calendarColor,
        isActive: parsed.isActive,
        publicVisibility: parsed.publicVisibility,
      }
    })

    if (parsed.locationIds !== undefined) {
      // Clear existing
      await tx.employeeLocation.deleteMany({
        where: { employeeId: parsed.employeeId, tenantId: tenant.id }
      })
      
      if (parsed.locationIds.length > 0) {
        // Verify locations belong to tenant
        const validLocations = await tx.location.findMany({
          where: { id: { in: parsed.locationIds }, tenantId: tenant.id }
        })

        if (validLocations.length !== parsed.locationIds.length) {
          throw new Error("One or more locations do not belong to this tenant")
        }

        await tx.employeeLocation.createMany({
          data: validLocations.map(loc => ({
            employeeId: parsed.employeeId,
            locationId: loc.id,
            tenantId: tenant.id
          }))
        })
      }
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: session.user.id,
        action: "EMPLOYEE_UPDATED",
        entityType: "EmployeeProfile",
        entityId: parsed.employeeId
      }
    })

    return { success: true, employee: updated }
  })
}
