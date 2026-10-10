"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { headers } from "next/headers"

// SCHEMAS
const step1Schema = z.object({ businessType: z.string().min(1) })
const step2Schema = z.object({ name: z.string().min(1), description: z.string().optional() })
const step3Schema = z.object({ 
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid HEX color"),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid HEX color"),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid HEX color"),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid HEX color")
})
const step4Schema = z.object({ 
  businessEmail: z.string().email().or(z.literal("")),
  businessPhone: z.string().optional(),
  websiteUrl: z.string().url().or(z.literal("")).optional(),
  instagramUrl: z.string().url().or(z.literal("")).optional()
})
const step5Schema = z.object({ locationName: z.string().min(1), address: z.string().min(1), timezone: z.string().min(1) })
const step6Schema = z.object({
  rules: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format"),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format")
  })).refine(rules => rules.every(r => r.endTime > r.startTime), "End time must be after start time")
})
const step7Schema = z.object({
  bookingApprovalMode: z.enum(["AUTOMATIC", "MANUAL"]),
  cancellationDeadlineHours: z.coerce.number().min(0),
  maxAdvanceBookingDays: z.coerce.number().min(1),
  minBookingNoticeHours: z.coerce.number().min(0),
  defaultBookingBufferMins: z.coerce.number().min(0),
  allowCustomerOverlaps: z.boolean()
})
const step8Schema = z.object({ showPrices: z.boolean() })
const step9Schema = z.object({ defaultLocale: z.string().min(1), currency: z.string().min(3), timezone: z.string().min(1) })
const step10Schema = z.object({ 
  plan: z.enum(["BASIC", "PRO"]),
  interval: z.enum(["month", "year"]).default("month")
})

async function getOwnerTenant(userId: string) {
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId, role: "OWNER" },
    include: { tenant: true }
  })
  return membership?.tenant || null
}

export async function getOnboardingState() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }

  const tenant = await getOwnerTenant(session.user.id)
  
  if (!tenant) {
    return { step: 1, tenant: null }
  }

  if (tenant.onboardingState === "COMPLETED") {
    return { completed: true, slug: tenant.slug }
  }

  return { step: tenant.onboardingStep || 1, tenant }
}

export async function submitOnboardingStep(step: number, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: "Unauthorized" }
  const userId = session.user.id

  const rawData = Object.fromEntries(formData.entries())

  try {
    if (step === 1) {
      const existingTenant = await getOwnerTenant(userId)
      const parsed = step1Schema.safeParse(rawData)
      if (!parsed.success) return { error: "Invalid business type." }

      if (existingTenant) {
        if (existingTenant.onboardingState === "COMPLETED") return { error: "Onboarding already completed." }
        await prisma.tenant.update({
          where: { id: existingTenant.id },
          data: { businessType: parsed.data.businessType, onboardingStep: 2 }
        })
        return { success: true, step: 2 }
      }

      // Create new tenant transactionally
      const slug = `tenant-${Date.now()}`
      await prisma.tenant.create({
        data: {
          slug,
          name: "My Business",
          businessType: parsed.data.businessType,
          onboardingState: "IN_PROGRESS",
          onboardingStep: 2,
          memberships: {
            create: { userId, role: "OWNER" }
          }
        }
      })
      return { success: true, step: 2 }
    }

    if (step === 2) {
      const parsed = step2Schema.safeParse(rawData)
      if (!parsed.success) return { error: parsed.error.issues[0].message }
      
      const res = await prisma.tenant.updateMany({
        where: { memberships: { some: { userId, role: "OWNER" } } },
        data: { name: parsed.data.name, description: parsed.data.description, onboardingStep: 3 }
      })
      if (res.count === 0) return { error: "No onboarding in progress." }
      return { success: true, step: 3 }
    }

    if (step === 3) {
      const parsed = step3Schema.safeParse(rawData)
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      const res = await prisma.tenant.updateMany({
        where: { memberships: { some: { userId, role: "OWNER" } } },
        data: { ...parsed.data, onboardingStep: 4 }
      })
      if (res.count === 0) return { error: "No onboarding in progress." }
      return { success: true, step: 4 }
    }

    if (step === 4) {
      const parsed = step4Schema.safeParse(rawData)
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      const res = await prisma.tenant.updateMany({
        where: { memberships: { some: { userId, role: "OWNER" } } },
        data: { ...parsed.data, onboardingStep: 5 }
      })
      if (res.count === 0) return { error: "No onboarding in progress." }
      return { success: true, step: 5 }
    }

    if (step === 5) {
      const existingTenant = await getOwnerTenant(userId)
      if (!existingTenant) return { error: "No onboarding in progress." }
      const tenantId = existingTenant.id

      const parsed = step5Schema.safeParse(rawData)
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      // Use transaction to create location idempotently (only if none exists)
      await prisma.$transaction(async (tx) => {
        const count = await tx.location.count({ where: { tenantId } })
        if (count === 0) {
          await tx.location.create({
            data: { tenantId, name: parsed.data.locationName, address: parsed.data.address, timezone: parsed.data.timezone }
          })
        }
        await tx.tenant.update({
          where: { id: tenantId },
          data: { onboardingStep: 6 }
        })
      })
      return { success: true, step: 6 }
    }

    if (step === 6) {
      const existingTenant = await getOwnerTenant(userId)
      if (!existingTenant) return { error: "No onboarding in progress." }
      const tenantId = existingTenant.id

      // Parse days from rawData
      const rules = []
      for (let i = 0; i < 7; i++) {
        if (rawData[`open-${i}`]) {
          rules.push({
            dayOfWeek: i,
            startTime: rawData[`start-${i}`] as string || "09:00",
            endTime: rawData[`end-${i}`] as string || "17:00"
          })
        }
      }

      const parsed = step6Schema.safeParse({ rules })
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      await prisma.$transaction(async (tx) => {
        await tx.availabilityRule.deleteMany({ where: { tenantId, locationId: null } })
        for (const rule of parsed.data.rules) {
          await tx.availabilityRule.create({ data: { tenantId, ...rule } })
        }
        await tx.tenant.update({
          where: { id: tenantId },
          data: { onboardingStep: 7 }
        })
      })
      return { success: true, step: 7 }
    }

    if (step === 7) {
      const allowCustomerOverlaps = rawData.allowCustomerOverlaps === "on"
      const parsed = step7Schema.safeParse({ ...rawData, allowCustomerOverlaps })
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      const res = await prisma.tenant.updateMany({
        where: { memberships: { some: { userId, role: "OWNER" } } },
        data: { ...parsed.data, onboardingStep: 8 }
      })
      if (res.count === 0) return { error: "No onboarding in progress." }
      return { success: true, step: 8 }
    }

    if (step === 8) {
      const showPrices = rawData.showPrices === "on"
      const parsed = step8Schema.safeParse({ showPrices })
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      const res = await prisma.tenant.updateMany({
        where: { memberships: { some: { userId, role: "OWNER" } } },
        data: { showPrices: parsed.data.showPrices, onboardingStep: 9 }
      })
      if (res.count === 0) return { error: "No onboarding in progress." }
      return { success: true, step: 9 }
    }

    if (step === 9) {
      const parsed = step9Schema.safeParse(rawData)
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      const res = await prisma.tenant.updateMany({
        where: { memberships: { some: { userId, role: "OWNER" } } },
        data: { ...parsed.data, onboardingStep: 10 }
      })
      if (res.count === 0) return { error: "No onboarding in progress." }
      return { success: true, step: 10 }
    }

    if (step === 10) {
      const existingTenant = await getOwnerTenant(userId)
      if (!existingTenant) return { error: "No onboarding in progress." }
      const tenantId = existingTenant.id
      const parsed = step10Schema.safeParse(rawData)
      if (!parsed.success) return { error: parsed.error.issues[0].message }

      // Allow dev bypass if configured and non-production
      if (process.env.ALLOW_DEV_BILLING_BYPASS === "true" && process.env.NODE_ENV !== "production") {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.upsert({
            where: { tenantId },
            create: { tenantId, plan: parsed.data.plan, interval: parsed.data.interval, status: "ACTIVE" },
            update: { plan: parsed.data.plan, interval: parsed.data.interval, status: "ACTIVE" }
          })
          await tx.tenant.update({
            where: { id: tenantId },
            data: { onboardingState: "COMPLETED", onboardingStep: 11, status: "ACTIVE" }
          })
        })
        return { success: true, step: 11, slug: existingTenant.slug }
      }

      // Upsert subscription PENDING
      await prisma.subscription.upsert({
        where: { tenantId },
        create: { tenantId, plan: parsed.data.plan, interval: parsed.data.interval, status: "PENDING" },
        update: { plan: parsed.data.plan, interval: parsed.data.interval, status: "PENDING" }
      })

      const headersList = await headers()
      const origin = headersList.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

      const { createCheckoutSession } = await import("@/actions/billing")
      
      const successUrl = `${origin}/dashboard?success=true`
      const cancelUrl = `${origin}/onboarding`

      try {
        const checkoutUrl = await createCheckoutSession(
          tenantId,
          parsed.data.plan,
          parsed.data.interval,
          successUrl,
          cancelUrl
        )
        return { success: true, checkoutUrl }
      } catch (err) {
        console.error("Failed to create checkout session:", err)
        return { error: "Failed to connect to billing provider. Please try again later." }
      }
    }

  } catch (error) {
    console.error("Onboarding step error:", error)
    return { error: "An unexpected error occurred." }
  }

  return { error: "Invalid step" }
}
