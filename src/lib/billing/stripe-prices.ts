import { env } from "@/lib/env"
import { type PlanName, type BillingInterval } from "./plans"

export function getStripePriceId(plan: PlanName, interval: BillingInterval): string {
  if (plan === "BASIC" && interval === "month") return env.STRIPE_BASIC_MONTHLY_PRICE_ID || ""
  if (plan === "BASIC" && interval === "year") return env.STRIPE_BASIC_ANNUAL_PRICE_ID || ""
  if (plan === "PRO" && interval === "month") return env.STRIPE_PRO_MONTHLY_PRICE_ID || ""
  if (plan === "PRO" && interval === "year") return env.STRIPE_PRO_ANNUAL_PRICE_ID || ""
  return ""
}

export function getPlanByPriceId(priceId: string): { plan: PlanName; interval: BillingInterval } | null {
  if (priceId === env.STRIPE_BASIC_MONTHLY_PRICE_ID) return { plan: "BASIC", interval: "month" }
  if (priceId === env.STRIPE_BASIC_ANNUAL_PRICE_ID) return { plan: "BASIC", interval: "year" }
  if (priceId === env.STRIPE_PRO_MONTHLY_PRICE_ID) return { plan: "PRO", interval: "month" }
  if (priceId === env.STRIPE_PRO_ANNUAL_PRICE_ID) return { plan: "PRO", interval: "year" }
  return null
}
