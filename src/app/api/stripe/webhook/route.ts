import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getStripeClient, isStripeConfigured } from "@/lib/billing/stripe"
import { prisma } from "@/lib/db/prisma"
import { env } from "@/lib/env"
import Stripe from "stripe"
import { reconcileSubscription } from "@/lib/billing/reconcile"
import { createAuditLog } from "@/lib/audit"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("Stripe-Signature") as string

  let event: Stripe.Event

  if (!isStripeConfigured()) {
    return new NextResponse("Stripe not configured", { status: 501 })
  }
  const stripe = getStripeClient();

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // Idempotency Check
  const existingEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id }
  })
  
  if (existingEvent && (existingEvent.status === "PROCESSED" || existingEvent.status === "PROCESSING")) {
    return NextResponse.json({ received: true, msg: "Already processed or processing" })
  }

  // Mark as processing
  await prisma.stripeWebhookEvent.upsert({
    where: { id: event.id },
    create: { id: event.id, type: event.type, status: "PROCESSING" },
    update: { status: "PROCESSING" }
  })

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenantId

        if (tenantId && session.subscription) {
          const subscriptionId = session.subscription as string
          
          await prisma.subscription.update({
            where: { tenantId },
            data: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscriptionId,
              status: "ACTIVE", // Start as active, will sync with customer.subscription.created
            }
          })

          await prisma.tenant.update({
            where: { id: tenantId },
            data: { onboardingState: "COMPLETED", onboardingStep: 11, status: "ACTIVE" }
          })
          
          await createAuditLog(tenantId, null, "CHECKOUT_COMPLETED", "Tenant", tenantId, { subscriptionId })
        }
        break
      }
      
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.paid": {
        // Find internal sub
        let stripeCustomerId: string | undefined
        
        if (event.type.startsWith("invoice.")) {
           stripeCustomerId = (event.data.object as Stripe.Invoice).customer as string
        } else {
           stripeCustomerId = (event.data.object as Stripe.Subscription).customer as string
        }

        const internalSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId }
        })

        if (internalSub) {
           await reconcileSubscription(internalSub.tenantId)
           await createAuditLog(internalSub.tenantId, null, "WEBHOOK_RECONCILED", "Tenant", internalSub.tenantId, { type: event.type })
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const stripeCustomerId = invoice.customer as string
        const internalSub = await prisma.subscription.findFirst({
          where: { stripeCustomerId }
        })

        if (internalSub) {
          const tenant = await prisma.tenant.findUnique({ where: { id: internalSub.tenantId } })
          if (tenant && tenant.status === "ACTIVE") {
            // Exactly 168 hours grace period
            const failureTimestamp = new Date()
            const exactGraceMs = 7 * 24 * 60 * 60 * 1000
            const graceEnd = new Date(failureTimestamp.getTime() + exactGraceMs)

            await prisma.tenant.update({
              where: { id: tenant.id },
              data: { status: "GRACE_PERIOD", gracePeriodEndsAt: graceEnd }
            })
            
            await createAuditLog(tenant.id, null, "PAYMENT_FAILED_GRACE_ENTERED", "Tenant", tenant.id, { graceEnd: graceEnd.toISOString() })
          }
          await prisma.subscription.update({
            where: { id: internalSub.id },
            data: { status: "PAST_DUE" }
          })
        }
        break
      }
    }

    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED" }
    })

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error("Webhook handling error:", error)
    
    await prisma.stripeWebhookEvent.update({
      where: { id: event.id },
      data: { status: "FAILED", error: error.message }
    })

    return new NextResponse(`Webhook Error: ${error.message}`, { status: 500 })
  }
}
