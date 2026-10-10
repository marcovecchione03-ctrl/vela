import { expect, test, describe, vi, beforeEach } from "vitest"
import { isStripeConfigured, getStripeClient } from "@/lib/billing/stripe"
import { env } from "@/lib/env"

vi.mock("@/lib/env", () => ({
  env: {
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
    STRIPE_BASIC_MONTHLY_PRICE_ID: "",
    STRIPE_BASIC_ANNUAL_PRICE_ID: "",
    STRIPE_PRO_MONTHLY_PRICE_ID: "",
    STRIPE_PRO_ANNUAL_PRICE_ID: ""
  }
}))

describe("Stripe Configuration Optionality", () => {
  beforeEach(() => {
    // Reset env to empty
    env.STRIPE_SECRET_KEY = "";
    env.STRIPE_WEBHOOK_SECRET = "";
    env.STRIPE_BASIC_MONTHLY_PRICE_ID = "";
    env.STRIPE_BASIC_ANNUAL_PRICE_ID = "";
    env.STRIPE_PRO_MONTHLY_PRICE_ID = "";
    env.STRIPE_PRO_ANNUAL_PRICE_ID = "";
  })

  test("isStripeConfigured is false when vars are missing", () => {
    expect(isStripeConfigured()).toBe(false)
  })

  test("getStripeClient throws error when Stripe is not configured", () => {
    expect(() => getStripeClient()).toThrow("Stripe is not configured")
  })

  test("isStripeConfigured is false when partial vars are provided", () => {
    env.STRIPE_SECRET_KEY = "sk_test_123"
    // Missing webhook and price IDs
    expect(isStripeConfigured()).toBe(false)
    expect(() => getStripeClient()).toThrow("Stripe is not configured")
  })

  test("isStripeConfigured is true when all vars are provided and returns client", () => {
    env.STRIPE_SECRET_KEY = "sk_test_123"
    env.STRIPE_WEBHOOK_SECRET = "whsec_123"
    env.STRIPE_BASIC_MONTHLY_PRICE_ID = "price_1"
    env.STRIPE_BASIC_ANNUAL_PRICE_ID = "price_2"
    env.STRIPE_PRO_MONTHLY_PRICE_ID = "price_3"
    env.STRIPE_PRO_ANNUAL_PRICE_ID = "price_4"

    expect(isStripeConfigured()).toBe(true)
    const client = getStripeClient()
    expect(client).toBeDefined()
  })
})
