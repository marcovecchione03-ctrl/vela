"use server"

import { prisma } from "../lib/db/prisma"
import { verifyAccess } from "./appointments"

export async function toggleCustomerBlacklist(tenantId: string, userId: string, customerId: string, isBlocked: boolean, reason?: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage customer access")
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId, tenantId }
  })
  
  if (!customer) throw new Error("Customer not found")

  await prisma.customerProfile.update({
    where: { id: customerId },
    data: {
      isBlocked,
      blockedAt: isBlocked ? new Date() : null,
      blockedById: isBlocked ? userId : null,
      blockReason: isBlocked ? reason : null
    }
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: userId,
      action: isBlocked ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED",
      entityType: "CustomerProfile",
      entityId: customerId,
      metadata: JSON.stringify({ reason })
    }
  })

  return true
}
