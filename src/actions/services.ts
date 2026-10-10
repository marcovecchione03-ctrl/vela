"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/config"
import { PriceMode } from "@prisma/client"

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

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  orderIndex: z.number().int().default(0)
})

export async function upsertCategory(data: z.infer<typeof categorySchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden")
  }

  const parsed = categorySchema.parse(data)

  if (parsed.id) {
    const existing = await prisma.serviceCategory.findUnique({ where: { id: parsed.id, tenantId: tenant.id } })
    if (!existing) throw new Error("Category not found")
    
    await prisma.serviceCategory.update({
      where: { id: parsed.id },
      data: { name: parsed.name, orderIndex: parsed.orderIndex }
    })
  } else {
    await prisma.serviceCategory.create({
      data: { tenantId: tenant.id, name: parsed.name, orderIndex: parsed.orderIndex }
    })
  }

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: parsed.id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
      entityType: "ServiceCategory",
      entityId: parsed.id || "new"
    }
  })

  return { success: true }
}

export async function deleteCategory(categoryId: string) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    throw new Error("Forbidden")
  }

  const category = await prisma.serviceCategory.findUnique({
    where: { id: categoryId, tenantId: tenant.id },
    include: { _count: { select: { services: true } } }
  })

  if (!category) throw new Error("Category not found")
  if (category._count.services > 0) throw new Error("Cannot delete category with attached services")

  await prisma.serviceCategory.delete({
    where: { id: categoryId }
  })

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorId: session.user.id,
      action: "CATEGORY_DELETED",
      entityType: "ServiceCategory",
      entityId: categoryId
    }
  })

  return { success: true }
}

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(5).max(1440),
  price: z.number().int().min(0),
  priceMode: z.nativeEnum(PriceMode),
  isActive: z.boolean(),
  concurrentCapacity: z.number().int().min(1).max(50),
  bufferOverrideMins: z.number().int().min(0).optional(),
  availableDays: z.array(z.number().int().min(0).max(6)),
  locationIds: z.array(z.string().uuid()),
  employeeIds: z.array(z.string().uuid())
})

export async function upsertService(data: z.infer<typeof serviceSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER") {
    throw new Error("Forbidden: Only owners can manage services")
  }

  const parsed = serviceSchema.parse(data)

  // Verify category belongs to tenant
  const category = await prisma.serviceCategory.findUnique({
    where: { id: parsed.categoryId, tenantId: tenant.id }
  })
  if (!category) throw new Error("Category not found")

  return await prisma.$transaction(async (tx) => {
    let serviceId = parsed.id

    if (serviceId) {
      const existing = await tx.service.findUnique({ where: { id: serviceId, tenantId: tenant.id } })
      if (!existing) throw new Error("Service not found")

      await tx.service.update({
        where: { id: serviceId },
        data: {
          categoryId: parsed.categoryId,
          name: parsed.name,
          description: parsed.description,
          durationMinutes: parsed.durationMinutes,
          price: parsed.price,
          priceMode: parsed.priceMode,
          isActive: parsed.isActive,
          concurrentCapacity: parsed.concurrentCapacity,
          bufferOverrideMins: parsed.bufferOverrideMins,
          availableDays: parsed.availableDays,
        }
      })
      
      // Clean relations
      await tx.serviceLocation.deleteMany({ where: { serviceId, tenantId: tenant.id } })
      await tx.serviceEmployee.deleteMany({ where: { serviceId, tenantId: tenant.id } })
    } else {
      const newService = await tx.service.create({
        data: {
          tenantId: tenant.id,
          categoryId: parsed.categoryId,
          name: parsed.name,
          description: parsed.description,
          durationMinutes: parsed.durationMinutes,
          price: parsed.price,
          priceMode: parsed.priceMode,
          isActive: parsed.isActive,
          concurrentCapacity: parsed.concurrentCapacity,
          bufferOverrideMins: parsed.bufferOverrideMins,
          availableDays: parsed.availableDays,
        }
      })
      serviceId = newService.id
    }

    if (parsed.locationIds.length > 0) {
      const validLocs = await tx.location.findMany({ where: { id: { in: parsed.locationIds }, tenantId: tenant.id } })
      if (validLocs.length !== [...new Set(parsed.locationIds)].length) throw new Error("Invalid locations")

      await tx.serviceLocation.createMany({
        data: validLocs.map(l => ({ serviceId: serviceId!, locationId: l.id, tenantId: tenant.id }))
      })
    }

    if (parsed.employeeIds.length > 0) {
      const validEmps = await tx.employeeProfile.findMany({ where: { id: { in: parsed.employeeIds }, tenantId: tenant.id } })
      if (validEmps.length !== [...new Set(parsed.employeeIds)].length) throw new Error("Invalid employees")

      await tx.serviceEmployee.createMany({
        data: validEmps.map(e => ({ serviceId: serviceId!, employeeId: e.id, tenantId: tenant.id }))
      })
    }

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: session.user.id,
        action: parsed.id ? "SERVICE_UPDATED" : "SERVICE_CREATED",
        entityType: "Service",
        entityId: serviceId!
      }
    })

    return { success: true, serviceId }
  })
}

const combinedServiceSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().min(0),
  priceMode: z.nativeEnum(PriceMode),
  isActive: z.boolean(),
  components: z.array(z.object({
    serviceId: z.string().uuid(),
    orderIndex: z.number().int()
  })).min(2),
  locationIds: z.array(z.string().uuid()),
  employeeIds: z.array(z.string().uuid())
})

export async function upsertCombinedService(data: z.infer<typeof combinedServiceSchema>) {
  const { session, tenant, membership } = await getAuthAndTenant()

  if (membership.role !== "OWNER") {
    throw new Error("Forbidden: Only owners can manage services")
  }

  const parsed = combinedServiceSchema.parse(data)

  // Verify category belongs to tenant
  const category = await prisma.serviceCategory.findUnique({
    where: { id: parsed.categoryId, tenantId: tenant.id }
  })
  if (!category) throw new Error("Category not found")

  // Ensure no self-reference in components
  if (parsed.id && parsed.components.some(c => c.serviceId === parsed.id)) {
    throw new Error("A combined service cannot contain itself")
  }

  // Fetch all component services to ensure they belong to tenant, and they are not themselves combined services
  const componentIds = parsed.components.map(c => c.serviceId)
  const childServices = await prisma.service.findMany({
    where: { id: { in: componentIds }, tenantId: tenant.id },
    include: { _count: { select: { components: true } } }
  })

  if (childServices.length !== [...new Set(componentIds)].length) {
    throw new Error("One or more component services do not exist in this tenant")
  }

  const totalDuration = childServices.reduce((sum, s) => sum + s.durationMinutes, 0)

  for (const child of childServices) {
    if (child._count.components > 0) {
      throw new Error(`Service ${child.name} is already a combined service. Nesting is not allowed.`)
    }
  }

  return await prisma.$transaction(async (tx) => {
    let serviceId = parsed.id

    if (serviceId) {
      const existing = await tx.service.findUnique({ where: { id: serviceId, tenantId: tenant.id } })
      if (!existing) throw new Error("Service not found")

      await tx.service.update({
        where: { id: serviceId },
        data: {
          categoryId: parsed.categoryId,
          name: parsed.name,
          description: parsed.description,
          durationMinutes: totalDuration, // Derived from components
          price: parsed.price,
          priceMode: parsed.priceMode,
          isActive: parsed.isActive,
        }
      })
      
      // Clean relations
      await tx.serviceLocation.deleteMany({ where: { serviceId, tenantId: tenant.id } })
      await tx.serviceEmployee.deleteMany({ where: { serviceId, tenantId: tenant.id } })
      await tx.combinedServiceComponent.deleteMany({ where: { parentId: serviceId, tenantId: tenant.id } })
    } else {
      const newService = await tx.service.create({
        data: {
          tenantId: tenant.id,
          categoryId: parsed.categoryId,
          name: parsed.name,
          description: parsed.description,
          durationMinutes: totalDuration,
          price: parsed.price,
          priceMode: parsed.priceMode,
          isActive: parsed.isActive,
          concurrentCapacity: 1,
          availableDays: [0,1,2,3,4,5,6], // Usually combined derives this, but simplifying
        }
      })
      serviceId = newService.id
    }

    if (parsed.locationIds.length > 0) {
      const validLocs = await tx.location.findMany({ where: { id: { in: parsed.locationIds }, tenantId: tenant.id } })
      if (validLocs.length !== [...new Set(parsed.locationIds)].length) throw new Error("Invalid locations")

      await tx.serviceLocation.createMany({
        data: validLocs.map(l => ({ serviceId: serviceId!, locationId: l.id, tenantId: tenant.id }))
      })
    }

    if (parsed.employeeIds.length > 0) {
      const validEmps = await tx.employeeProfile.findMany({ where: { id: { in: parsed.employeeIds }, tenantId: tenant.id } })
      if (validEmps.length !== [...new Set(parsed.employeeIds)].length) throw new Error("Invalid employees")

      await tx.serviceEmployee.createMany({
        data: validEmps.map(e => ({ serviceId: serviceId!, employeeId: e.id, tenantId: tenant.id }))
      })
    }

    // Attach components
    await tx.combinedServiceComponent.createMany({
      data: parsed.components.map(c => ({
        tenantId: tenant.id,
        parentId: serviceId!,
        componentId: c.serviceId,
        orderIndex: c.orderIndex
      }))
    })

    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorId: session.user.id,
        action: parsed.id ? "COMBINED_SERVICE_UPDATED" : "COMBINED_SERVICE_CREATED",
        entityType: "Service",
        entityId: serviceId!
      }
    })

    return { success: true, serviceId }
  })
}
