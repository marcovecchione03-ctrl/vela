import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { getStripeClient } from "@/lib/billing/stripe"
import SuccessPoller from "./SuccessPoller"

export default async function OnboardingSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect("/onboarding")
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  // Get current tenant in onboarding
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: session.user.id, role: "OWNER" },
    include: { tenant: true }
  })

  if (!membership) {
    redirect("/onboarding")
  }

  const tenant = membership.tenant

  // Check authoritative local state first (fast path if webhook beat the redirect)
  if (tenant.onboardingState === "COMPLETED") {
    redirect("/dashboard")
  }

  // Check Stripe Session to verify it's legitimate
  const stripe = getStripeClient()
  try {
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)
    if (checkoutSession.metadata?.tenantId !== tenant.id) {
      // Trying to access another tenant's session
      redirect("/onboarding")
    }
    
    if (checkoutSession.payment_status !== "paid" && checkoutSession.payment_status !== "no_payment_required") {
      redirect("/onboarding")
    }
  } catch (err) {
    console.error("Invalid stripe session:", err)
    redirect("/onboarding")
  }

  // Still processing, render polling UI
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4">
      <SuccessPoller />
    </div>
  )
}
