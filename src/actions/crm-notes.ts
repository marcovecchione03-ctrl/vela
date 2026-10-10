"use server"

import { prisma } from "../lib/db/prisma"
import { verifyAccess } from "./appointments"

export async function addCustomerNote(tenantId: string, userId: string, customerId: string, content: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage CRM notes")
  }

  if (!content.trim() || content.length > 5000) {
    throw new Error("Invalid note content")
  }

  // Ensure customer belongs to tenant
  const customer = await prisma.customerProfile.findUnique({
    where: { id: customerId, tenantId }
  })
  if (!customer) throw new Error("Customer not found")

  const note = await prisma.customerNote.create({
    data: {
      tenantId,
      customerId,
      authorId: userId,
      content: content.trim()
    }
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: userId,
      action: "CRM_NOTE_ADDED",
      entityType: "CustomerProfile",
      entityId: customerId
    }
  })

  return note
}

export async function deleteCustomerNote(tenantId: string, userId: string, noteId: string) {
  const { role } = await verifyAccess(tenantId, userId)
  
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only owners and admins can manage CRM notes")
  }

  await prisma.customerNote.delete({
    where: { id: noteId, tenantId }
  })

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: userId,
      action: "CRM_NOTE_DELETED",
      entityType: "CustomerNote",
      entityId: noteId
    }
  })

  return true
}
