export type PlanName = "BASIC" | "PRO"
export type BillingInterval = "month" | "year"

export interface PlanConfig {
  name: PlanName
  locationLimit: number
  monthlyAmountCents: number
  annualAmountCents: number
}

export const PLANS: Record<PlanName, PlanConfig> = {
  BASIC: {
    name: "BASIC",
    locationLimit: 1,
    monthlyAmountCents: 2999,
    annualAmountCents: 28790
  },
  PRO: {
    name: "PRO",
    locationLimit: 3,
    monthlyAmountCents: 5999,
    annualAmountCents: 57590
  }
}
