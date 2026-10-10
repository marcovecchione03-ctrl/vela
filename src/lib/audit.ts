import { prisma } from "@/lib/db/prisma"

export async function createAuditLog(
  tenantId: string,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: any,
  tx?: any
) {
  const data = {
    tenantId,
    actorId,
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.stringify(metadata) : null
  }

  if (tx) {
    return await tx.auditLog.create({ data })
  }
  return await prisma.auditLog.create({ data })
}
