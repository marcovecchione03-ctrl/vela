import { getOnboardingState } from "@/actions/onboarding"
import { redirect } from "next/navigation"
import OnboardingWizard from "./Wizard"

export default async function OnboardingPage() {
  const state = await getOnboardingState()

  if (state.error) {
    redirect("/auth/login")
  }

  if (state.completed) {
    redirect("/dashboard")
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
