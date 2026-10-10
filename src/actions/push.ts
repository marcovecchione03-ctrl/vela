"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

export async function subscribeToPush({
  tenantId,
  endpoint,
  p256dh,
  auth
}: {
  tenantId: string
  endpoint: string
  p256dh: string
  auth: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      tenantId,
      userId: session.user.id,
      endpoint,
      p256dh,
      auth
    },
    update: {
      tenantId,
      userId: session.user.id,
      p256dh,
      auth,
      revokedAt: null
    }
  })

  return { success: true }
}

export async function unsubscribeFromPush({ endpoint }: { endpoint: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.pushSubscription.update({
    where: { endpoint },
    data: { revokedAt: new Date() }
  })

  return { success: true }
}
