import { requireOwner } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db/prisma"
import { getDashboardTenant } from "@/lib/tenant/context"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PLANS } from "@/lib/billing/plans"
import { ManageBillingButton } from "@/components/billing/ManageBillingButton"
import { AlertCircle } from "lucide-react"

export default async function SubscriptionPage() {
  const baseTenant = await getDashboardTenant()
  if (!baseTenant) notFound()

  // Enforce OWNER only
  let membership
  try {
    membership = await requireOwner(baseTenant.id)
  } catch (err) {
    redirect(`/dashboard`)
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: baseTenant.id },
    include: { subscription: true, _count: { select: { locations: true } } }
  })

  if (!tenant || !tenant.subscription) return notFound()

  const sub = tenant.subscription
  const planConfig = PLANS[sub.plan as keyof typeof PLANS]
  const currentLocationsCount = tenant._count.locations
  
  const isGracePeriod = tenant.status === "GRACE_PERIOD"
  const isSuspended = tenant.status === "SUSPENDED"
  const graceDate = tenant.gracePeriodEndsAt ? new Intl.DateTimeFormat("en-US").format(tenant.gracePeriodEndsAt) : null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Subscription & Billing</h1>
      
      {isGracePeriod && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Payment Failed</h3>
            <p className="text-sm">
              Your last payment failed. Your account is in a grace period until {graceDate}. 
              Please update your payment method to avoid suspension.
            </p>
          </div>
        </div>
      )}

      {isSuspended && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Account Suspended</h3>
            <p className="text-sm">
              Your account has been suspended due to non-payment. Customers cannot book appointments. 
              Please update your billing information to restore service.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Manage your subscription</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-500">Plan</span>
              <span className="font-medium">{sub.plan}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-500">Billing Interval</span>
              <span className="font-medium capitalize">{sub.interval}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-500">Status</span>
              <span className="font-medium capitalize">{sub.status.toLowerCase().replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-500">Renewal Date</span>
              <span className="font-medium">
                {sub.currentPeriodEnd ? new Intl.DateTimeFormat("en-US").format(sub.currentPeriodEnd) : "N/A"}
              </span>
            </div>
            {sub.cancelAtPeriodEnd && (
              <p className="text-sm text-red-600 mt-2">
                Your subscription will cancel at the end of the current billing period.
              </p>
            )}
            
            <div className="pt-4">
              <ManageBillingButton tenantId={tenant.id} />
              <p className="text-xs text-neutral-500 mt-2">
                Use the billing portal to update payment methods, download invoices, or change/cancel your plan.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage & Limits</CardTitle>
            <CardDescription>Your current plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-neutral-500">Locations</span>
              <span className="font-medium">
                {currentLocationsCount} / {planConfig.locationLimit}
              </span>
            </div>
            
            {currentLocationsCount > planConfig.locationLimit && (
              <p className="text-sm text-red-600 mt-2">
                You are exceeding the location limit for your current plan. Downgrades are restricted.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
