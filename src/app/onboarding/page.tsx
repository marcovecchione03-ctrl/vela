import { getOnboardingState } from "@/actions/onboarding"
import { redirect } from "next/navigation"
import OnboardingWizard from "./Wizard"

export default async function OnboardingPage() {
  const state = await getOnboardingState()

  if (state.error) {
    redirect("/auth/login")
  }

  if (state.completed) {
    redirect(`/${state.slug}/dashboard`) // Tenant routing convention? Actually, dashboard is just /dashboard if context is handled by host header. But wait! The middleware enforces routing.
    // If the hostname determines tenant, we can't just route to /dashboard on localhost without setting the tenant. 
    // Actually, in dev, we often use slugs in the URL if subdomains aren't configured. 
    // For now, let's just redirect to /dashboard.
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-8 text-neutral-900">Vela Onboarding</h1>
        <OnboardingWizard initialState={state} />
      </div>
    </div>
  )
}
