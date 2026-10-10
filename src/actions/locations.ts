"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required")
})

export async function createLocation(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } },
    include: { tenant: { include: { subscription: true } } }
  })

  if (!membership) return { error: "Unauthorized" }

  const { tenant } = membership

  // Enforce server-side plan limits
  const maxLocations = tenant.subscription?.plan === "PRO" ? 3 : 1
  const currentCount = await prisma.location.count({ where: { tenantId: tenant.id, isActive: true } })

  if (currentCount >= maxLocations) {
    return { error: `Plan limit reached. Your ${tenant.subscription?.plan || "BASIC"} plan allows up to ${maxLocations} active location(s).` }
  }

  const rawData = Object.fromEntries(formData.entries())
  const parsed = locationSchema.safeParse(rawData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await prisma.location.create({
      data: {
        tenantId: tenant.id,
        name: parsed.data.name,
        address: parsed.data.address || "",
        timezone: parsed.data.timezone
      }
    })
    return { success: true }
  } catch (e) {
    console.error("Location creation error:", e)
    return { error: "Failed to create location" }
  }
}

export async function updateLocation(locationId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  // Must ensure the user has OWNER/ADMIN role over the tenant that owns this location
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, role: { in: ["OWNER", "ADMIN"] } }
  })

  if (!membership) return { error: "Unauthorized" }

  // Verify location belongs to the user's tenant
  const location = await prisma.location.findUnique({
    where: { id: locationId }
  })

  if (!location || location.tenantId !== membership.tenantId) {
    return { error: "Location not found or unauthorized" }
  }

  const rawData = Object.fromEntries(formData.entries())
  const parsed = locationSchema.safeParse(rawData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  try {
    await prisma.location.update({
      where: { id: locationId },
      data: {
        name: parsed.data.name,
        address: parsed.data.address || "",
        timezone: parsed.data.timezone
      }
    })
    return { success: true }
  } catch (e) {
    console.error("Location update error:", e)
    return { error: "Failed to update location" }
  }
}
