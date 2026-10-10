"use server"

import { prisma } from "@/lib/db/prisma"
import { Role } from "@prisma/client"

export async function searchCustomers(tenantId: string, query: string) {
  if (!query || query.length < 2) return []
  
  const customers = await prisma.customerProfile.findMany({
    where: {
      tenantId,
      OR: [
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } }
      ]
    },
    take: 10,
    select: { id: true, firstName: true, lastName: true, phone: true }
  })
  
  return customers
}
