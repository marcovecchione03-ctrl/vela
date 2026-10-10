"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { validateDomainClaimInput, verifyDomainDNS } from "@/lib/tenant/domain"
import crypto from "crypto"

export async function addDomain(tenantId: string, hostname: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } }
  })
  if (membership?.role !== "OWNER") throw new Error("Only OWNER can manage domains")

  const normalized = validateDomainClaimInput(hostname)

  const existing = await prisma.domain.findUnique({
    where: { normalizedHostname: normalized }
  })

  if (existing) {
    throw new Error("Domain already registered")
  }

  const token = `vela-verify=${crypto.randomBytes(32).toString('hex')}`

  const domain = await prisma.domain.create({
    data: {
      tenantId,
      hostname: normalized, // store normalized as primary representation
      normalizedHostname: normalized,
      status: "PENDING_VERIFICATION",
      verificationToken: token
    }
  })

  return { success: true, domain }
}

export async function verifyDomain(tenantId: string, domainId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } }
  })
  if (membership?.role !== "OWNER") throw new Error("Only OWNER can manage domains")

  const domain = await prisma.domain.findUnique({
    where: { id: domainId, tenantId }
  })

  if (!domain) throw new Error("Domain not found")
  if (!domain.verificationToken) throw new Error("No verification token found")

  const isValid = await verifyDomainDNS(domain.normalizedHostname, domain.verificationToken)

  if (isValid) {
    await prisma.domain.update({
      where: { id: domainId },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
      }
    })
    return { success: true, verified: true }
  }

  return { success: true, verified: false }
}

export async function removeDomain(tenantId: string, domainId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId: session.user.id } }
  })
  if (membership?.role !== "OWNER") throw new Error("Only OWNER can manage domains")

  await prisma.domain.delete({
    where: { id: domainId, tenantId }
  })

  return { success: true }
}
