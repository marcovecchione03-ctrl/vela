"use server"

import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { hashPassword } from "@/lib/auth/password"

const registerSchema = z.object({
  tenantId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional()
})

export async function registerCustomer(data: z.infer<typeof registerSchema>) {
  const parsed = registerSchema.parse(data)
  
  // See if user already exists
  let user = await prisma.user.findUnique({ where: { email: parsed.email } })
  
  if (!user) {
    const passwordHash = await hashPassword(parsed.password)
    user = await prisma.user.create({
      data: {
        email: parsed.email,
        passwordHash
      }
    })
  }

  // Ensure they belong to this tenant as a customer
  let membership = await prisma.tenantMembership.findUnique({
    where: {
      tenantId_userId: {
        userId: user.id,
        tenantId: parsed.tenantId
      }
    }
  })

  if (!membership) {
    membership = await prisma.tenantMembership.create({
      data: {
        userId: user.id,
        tenantId: parsed.tenantId,
        role: "CUSTOMER"
      }
    })
  } else if (membership.role !== "CUSTOMER") {
    // If they are an OWNER/ADMIN/EMPLOYEE, we probably still allow them to act as a customer for booking testing?
    // Let's just create the CustomerProfile if missing.
  }

  // Create CustomerProfile if missing
  let profile = await prisma.customerProfile.findUnique({
    where: { tenantMembershipId: membership.id }
  })

  if (!profile) {
    profile = await prisma.customerProfile.create({
      data: {
        tenantId: parsed.tenantId,
        tenantMembershipId: membership.id,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: parsed.phone
      }
    })
  }

  return { success: true, email: user.email, customerId: profile.id }
}
