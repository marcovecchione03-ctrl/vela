"use server"

import { prisma } from "../lib/db/prisma"
import { verifyAccess } from "./appointments"

export async function createTenantTag(tenantId: string, userId: string, name: string, color?: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage CRM tags")
  }

  const tag = await prisma.customerTag.create({
    data: {
      tenantId,
      name: name.trim(),
      color
    }
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: userId,
      action: "TAG_CREATED",
      entityType: "CustomerTag",
      entityId: tag.id
    }
  })

  return tag
}

export async function deleteTenantTag(tenantId: string, userId: string, tagId: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage CRM tags")
  }

  await prisma.customerTag.delete({
    where: { id: tagId, tenantId }
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: userId,
      action: "TAG_DELETED",
      entityType: "CustomerTag",
      entityId: tagId
    }
  })
}

export async function assignCustomerTag(tenantId: string, userId: string, customerId: string, tagId: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage CRM tags")
  }

  // Ensure tag belongs to tenant
  const tag = await prisma.customerTag.findUnique({
    where: { id: tagId, tenantId }
  })
  if (!tag) throw new Error("Tag not found")

  // Ensure customer belongs to tenant
  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId, tenantId }
  })
  if (!customer) throw new Error("Customer not found")

  await prisma.customerTagAssignment.create({
    data: {
      tenantId,
      customerId,
      tagId
    }
  })

  return true
}

export async function removeCustomerTag(tenantId: string, userId: string, customerId: string, tagId: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage CRM tags")
  }

  await prisma.customerTagAssignment.delete({
    where: {
      tagId_customerId: {
        tagId,
        customerId
      },
      tenantId
    }
  })

  return true
}
