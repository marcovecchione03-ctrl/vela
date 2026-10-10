import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { reconcileSubscription } from "@/lib/billing/reconcile"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const now = new Date()

    // Find tenants in grace period whose deadline has passed
    const expiredTenants = await prisma.tenant.findMany({
      where: {
        status: "GRACE_PERIOD",
        gracePeriodEndsAt: {
          lte: now
        }
      },
      include: {
        subscription: true
      }
    })

    const suspendedTenantIds = []

    for (const tenant of expiredTenants) {
      // Before suspending, do a reconciliation check
      const res = await reconcileSubscription(tenant.id)
      
      // If reconciliation succeeded and it's still SUSPENDED/CANCELED/UNPAID, it will be handled by reconcile function!
      // But wait, the reconcile function suspends it if the Stripe status is canceled/unpaid. 
      // If it is PAST_DUE and the grace period has ended, reconcileSubscription won't suspend it automatically!
      // Because reconcileSubscription maps `past_due` to `PAST_DUE` but doesn't check gracePeriod.
      // So let's check the local status after reconcile.
      
      const refreshedTenant = await prisma.tenant.findUnique({ where: { id: tenant.id } })
      if (refreshedTenant && refreshedTenant.status === "GRACE_PERIOD" && refreshedTenant.gracePeriodEndsAt && refreshedTenant.gracePeriodEndsAt <= now) {
         // It's still in grace period and past due, now suspend it locally
         await prisma.tenant.update({
           where: { id: tenant.id },
           data: { status: "SUSPENDED" }
         })
         suspendedTenantIds.push(tenant.id)
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredTenants.length,
      suspended: suspendedTenantIds
    })

  } catch (error: any) {
    console.error("Cron billing reconciliation failed:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
