import { prisma } from "@/lib/db/prisma"
import { stripe } from "@/lib/billing/stripe"
import { getPlanByPriceId, BillingInterval, PlanName } from "@/lib/billing/plans"
import { createAuditLog } from "@/lib/audit"

export async function reconcileSubscription(tenantId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId }
  })

  if (!subscription || !subscription.stripeSubscriptionId) {
    return { success: false, reason: "No active Stripe subscription mapped." }
  }

  try {
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
    const status = mapStripeStatusToInternal(stripeSub.status)
    const priceId = stripeSub.items.data[0]?.price.id
    const cancelAtPeriodEnd = stripeSub.cancel_at_period_end
    const currentPeriodStart = new Date((stripeSub as any).current_period_start * 1000)
    const currentPeriodEnd = new Date((stripeSub as any).current_period_end * 1000)

    let planDetails = { plan: "BASIC" as PlanName, interval: "month" as BillingInterval }
    if (priceId) {
      const resolved = getPlanByPriceId(priceId)
      if (resolved) planDetails = resolved
    }

    // Clear pending state if there's no schedule on Stripe, or if we have actually reached the new plan
    const hasSchedule = !!stripeSub.schedule
    let pendingPlan = subscription.pendingPlan
    let pendingInterval = subscription.pendingInterval
    let pendingEffectiveAt = subscription.pendingEffectiveAt

    if (!hasSchedule || (planDetails.plan === pendingPlan && planDetails.interval === pendingInterval)) {
       pendingPlan = null
       pendingInterval = null
       pendingEffectiveAt = null
    }

    const updatedSub = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: cancelAtPeriodEnd ? "CANCEL_AT_PERIOD_END" : status,
        plan: planDetails.plan,
        interval: planDetails.interval,
        stripePriceId: priceId,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        pendingPlan,
        pendingInterval,
        pendingEffectiveAt
      }
    })

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })

    if (status === "ACTIVE") {
      if (tenant?.status !== "ACTIVE") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { status: "ACTIVE", gracePeriodEndsAt: null }
        })
        await createAuditLog(tenantId, null, "BILLING_RECOVERED", "Tenant", tenantId, { source: "reconcile" })
      }
    } else if (status === "CANCELED" || status === "UNPAID") {
      if (tenant?.status !== "SUSPENDED") {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { status: "SUSPENDED" }
        })
        await createAuditLog(tenantId, null, "BILLING_SUSPENDED", "Tenant", tenantId, { source: "reconcile", reason: status })
      }
    }

    return { success: true, status: updatedSub.status }
  } catch (err: any) {
    console.error("Reconciliation failed:", err)
    return { success: false, reason: err.message }
  }
}

export function mapStripeStatusToInternal(stripeStatus: string): any {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE"
    case "past_due":
      return "PAST_DUE"
    case "canceled":
      return "CANCELED"
    case "unpaid":
      return "UNPAID"
    default:
      return "PENDING"
  }
}
