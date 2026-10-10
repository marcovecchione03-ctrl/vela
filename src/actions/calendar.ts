"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import crypto from "crypto"

export async function generateICSToken(employeeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { employeeProfile: true }
  })

  if (!membership || !membership.employeeProfile || membership.employeeProfile.id !== employeeId) {
    throw new Error("Forbidden")
  }

  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

  await prisma.employeeProfile.update({
    where: { id: employeeId },
    data: { icsTokenHash: tokenHash }
  })

  return { success: true, token: rawToken }
}

export async function revokeICSToken(employeeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id },
    include: { employeeProfile: true }
  })

  if (!membership || !membership.employeeProfile || membership.employeeProfile.id !== employeeId) {
    throw new Error("Forbidden")
  }

  await prisma.employeeProfile.update({
    where: { id: employeeId },
    data: { icsTokenHash: null }
  })

  return { success: true }
}
