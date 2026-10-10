import { Prisma } from '@prisma/client'
import { prisma as defaultPrisma } from '@/lib/db/prisma'

export async function enqueueCalendarSync(
  tenantId: string,
  employeeId: string,
  bookingId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  tx?: Prisma.TransactionClient
) {
  const db = tx || defaultPrisma

  // Find active connections for this employee
  const connections = await db.externalCalendarConnection.findMany({
    where: {
      employeeId,
      syncEnabled: true
    }
  })

  if (connections.length === 0) return

  // Enqueue jobs
  await db.calendarSyncJob.createMany({
    data: connections.map(c => ({
      tenantId,
      employeeId,
      bookingId,
      connectionId: c.id,
      action
    }))
  })
}
