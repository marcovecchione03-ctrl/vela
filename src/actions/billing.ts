"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { getStripeClient } from "@/lib/billing/stripe"
import { PLANS, PlanName, BillingInterval } from "@/lib/billing/plans"
import { env } from "@/lib/env"
import { headers } from "next/headers"

export async function createCheckoutSession(
  tenantId: string,
  plan: PlanName,
  interval: BillingInterval,
  successUrl: string,
  cancelUrl: string
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  // Ensure user is OWNER of tenant
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenantId, role: "OWNER" }
  })
  if (!membership) throw new Error("Unauthorized: Must be OWNER")

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) throw new Error("Tenant not found")

  const planConfig = PLANS[plan]
  if (!planConfig) throw new Error("Invalid plan")

  const priceId = planConfig.pricing[interval].priceId
  if (!priceId) throw new Error("Missing price ID for plan")

  // Find or create customer
  let stripeCustomerId = ""
  const existingSub = await prisma.subscription.findUnique({ where: { tenantId } })
  
  if (existingSub?.stripeCustomerId) {
    stripeCustomerId = existingSub.stripeCustomerId
  } else {
    // Create new customer
    const stripe = getStripeClient();
    const customer = await stripe.customers.create({
      email: session.user.email || undefined,
      metadata: { tenantId }
    })
    stripeCustomerId = customer.id
  }

  // Enforce one subscription at a time
  if (existingSub?.status === "ACTIVE" || existingSub?.status === "PAST_DUE") {
     throw new Error("Tenant already has an active subscription.")
  }

  // Create checkout session using a persisted checkout attempt
  // Check for recent pending attempt for same tenant/plan/interval
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  let attempt = await prisma.billingCheckoutAttempt.findFirst({
    where: {
      tenantId, plan, interval, status: "PENDING",
      createdAt: { gte: fiveMinutesAgo }
    }
  })

  if (!attempt) {
    attempt = await prisma.billingCheckoutAttempt.create({
      data: { tenantId, plan, interval }
    })
  }

  const idempotencyKey = `checkout_${tenantId}_${attempt.id}`

  const stripe = getStripeClient();
  const stripeSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    metadata: {
      tenantId,
      plan,
      interval,
      checkoutAttemptId: attempt.id
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  }, {
    idempotencyKey
  })

  // Optionally save url
  await prisma.billingCheckoutAttempt.update({
    where: { id: attempt.id },
    data: { url: stripeSession.url }
  })

  return stripeSession.url
}

export async function createPortalSession(tenantId: string, returnUrl: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenantId, role: "OWNER" }
  })
  if (!membership) throw new Error("Unauthorized: Must be OWNER")

  const existingSub = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!existingSub?.stripeCustomerId) throw new Error("No billing customer found")

  const stripe = getStripeClient();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: existingSub.stripeCustomerId,
    return_url: returnUrl,
    configuration: env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || undefined
  })

  const { createAuditLog } = await import("@/lib/audit")
  await createAuditLog(tenantId, session.user.id, "BILLING_PORTAL_OPENED", "Tenant", tenantId)

  return portalSession.url
}

export async function changePlan(tenantId: string, newPlan: PlanName, newInterval: BillingInterval) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenantId, role: "OWNER" }
  })
  if (!membership) throw new Error("Unauthorized: Must be OWNER")

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { _count: { select: { locations: true } } }
  })
  if (!tenant) throw new Error("Tenant not found")

  const subscription = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!subscription || !subscription.stripeSubscriptionId) throw new Error("No active subscription")

  const planConfig = PLANS[newPlan]
  if (!planConfig) throw new Error("Invalid plan")

  if (newPlan === "BASIC" && tenant._count.locations > planConfig.locationLimit) {
    throw new Error(`Cannot downgrade to BASIC. You have ${tenant._count.locations} active locations. Limit is ${planConfig.locationLimit}. Please remove locations first.`)
  }

  const newPriceId = planConfig.pricing[newInterval].priceId
  if (!newPriceId) throw new Error("Invalid price ID configuration")

  const stripe = getStripeClient();
  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
  
  if (subscription.plan === "BASIC" && newPlan === "PRO") {
     // Upgrade (Basic -> Pro): apply immediately with proration
     await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
       cancel_at_period_end: false,
       items: [{
         id: stripeSub.items.data[0].id,
         price: newPriceId
       }],
       proration_behavior: "always_invoice"
     })
     const { createAuditLog } = await import("@/lib/audit")
     await createAuditLog(tenantId, session.user.id, "PLAN_UPGRADED_PRO", "Subscription", subscription.id)
  } else {
     // Downgrades or Interval changes (Monthly <-> Annual): schedule at period end
     // Use Stripe Subscription Schedules to genuinely defer the change
     const existingSchedules = await stripe.subscriptionSchedules.list({ customer: stripeSub.customer as string })
     const activeSchedule = existingSchedules.data.find(s => s.subscription === subscription.stripeSubscriptionId && s.status !== "canceled" && s.status !== "completed")
     
     let scheduleId = activeSchedule?.id
     if (!scheduleId) {
        const newSchedule = await stripe.subscriptionSchedules.create({
          from_subscription: subscription.stripeSubscriptionId
        })
        scheduleId = newSchedule.id
     }

     const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId)
     const currentPhase = schedule.phases[0]
     
     await stripe.subscriptionSchedules.update(scheduleId, {
       end_behavior: "release",
       phases: [
         {
           start_date: currentPhase.start_date,
           end_date: currentPhase.end_date,
           items: [{ price: stripeSub.items.data[0].price.id, quantity: 1 }]
         },
         {
           start_date: currentPhase.end_date,
           items: [{ price: newPriceId, quantity: 1 }]
         }
       ]
     })

     await prisma.subscription.update({
       where: { id: subscription.id },
       data: {
         pendingPlan: newPlan,
         pendingInterval: newInterval,
         pendingEffectiveAt: new Date(currentPhase.end_date * 1000)
       }
     })

     const { createAuditLog } = await import("@/lib/audit")
     await createAuditLog(tenantId, session.user.id, "PLAN_CHANGE_SCHEDULED", "Subscription", subscription.id, { newPlan, newInterval })
  }

  
  // Reconcile logic to fetch exact updated state
  const { reconcileSubscription } = await import("@/lib/billing/reconcile")
  await reconcileSubscription(tenantId)
  
  return true
}

export async function cancelSubscription(tenantId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenantId, role: "OWNER" }
  })
  if (!membership) throw new Error("Unauthorized: Must be OWNER")

  const subscription = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!subscription || !subscription.stripeSubscriptionId) throw new Error("No active subscription")

  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: true
  })

  const { createAuditLog } = await import("@/lib/audit")
  await createAuditLog(tenantId, session.user.id, "SUBSCRIPTION_CANCEL_SCHEDULED", "Subscription", subscription.id)

  const { reconcileSubscription } = await import("@/lib/billing/reconcile")
  await reconcileSubscription(tenantId)
  
  return true
}

export async function reactivateSubscription(tenantId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenantId, role: "OWNER" }
  })
  if (!membership) throw new Error("Unauthorized: Must be OWNER")

  const subscription = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!subscription || !subscription.stripeSubscriptionId) throw new Error("No active subscription")

  const stripe = getStripeClient();
  await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
    cancel_at_period_end: false
  })

  const { createAuditLog } = await import("@/lib/audit")
  await createAuditLog(tenantId, session.user.id, "SUBSCRIPTION_REACTIVATED", "Subscription", subscription.id)

  const { reconcileSubscription } = await import("@/lib/billing/reconcile")
  await reconcileSubscription(tenantId)
  
  return true
}

export async function cancelScheduledChange(tenantId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, tenantId, role: "OWNER" }
  })
  if (!membership) throw new Error("Unauthorized: Must be OWNER")

  const subscription = await prisma.subscription.findUnique({ where: { tenantId } })
  if (!subscription || !subscription.stripeSubscriptionId) throw new Error("No active subscription")

  const stripe = getStripeClient();
  const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
  if (stripeSub.schedule) {
    const scheduleId = typeof stripeSub.schedule === 'string' ? stripeSub.schedule : stripeSub.schedule.id
    await stripe.subscriptionSchedules.release(scheduleId)
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      pendingPlan: null,
      pendingInterval: null,
      pendingEffectiveAt: null
    }
  })

  const { createAuditLog } = await import("@/lib/audit")
  await createAuditLog(tenantId, session.user.id, "SCHEDULED_CHANGE_CANCELLED", "Subscription", subscription.id)

  const { reconcileSubscription } = await import("@/lib/billing/reconcile")
  await reconcileSubscription(tenantId)
  
  return true
}
