import { env } from "@/lib/env"

export type PlanName = "BASIC" | "PRO"
export type BillingInterval = "month" | "year"

export interface PlanPricing {
  amount: number
  priceId: string
}

export interface PlanConfig {
  name: PlanName
  locationLimit: number
  pricing: {
    month: PlanPricing
    year: PlanPricing
  }
}

export const PLANS: Record<PlanName, PlanConfig> = {
  BASIC: {
    name: "BASIC",
    locationLimit: 1,
    pricing: {
      month: { amount: 2999, priceId: env.STRIPE_BASIC_MONTHLY_PRICE_ID || "" },
      year: { amount: 28790, priceId: env.STRIPE_BASIC_ANNUAL_PRICE_ID || "" }
    }
  },
  PRO: {
    name: "PRO",
    locationLimit: 3,
    pricing: {
      month: { amount: 5999, priceId: env.STRIPE_PRO_MONTHLY_PRICE_ID || "" },
      year: { amount: 57590, priceId: env.STRIPE_PRO_ANNUAL_PRICE_ID || "" }
    }
  }
}

export function getPlanByPriceId(priceId: string): { plan: PlanName; interval: BillingInterval } | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.pricing.month.priceId === priceId) return { plan: plan.name, interval: "month" }
    if (plan.pricing.year.priceId === priceId) return { plan: plan.name, interval: "year" }
  }
  return null
}
