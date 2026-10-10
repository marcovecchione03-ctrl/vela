import Stripe from "stripe"
import { env } from "@/lib/env"

export function isStripeConfigured(): boolean {
  return !!(
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET &&
    env.STRIPE_BASIC_MONTHLY_PRICE_ID &&
    env.STRIPE_BASIC_ANNUAL_PRICE_ID &&
    env.STRIPE_PRO_MONTHLY_PRICE_ID &&
    env.STRIPE_PRO_ANNUAL_PRICE_ID
  );
}

export function getStripeClient(): Stripe {
  if (!isStripeConfigured() || !env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-04-10" as any,
    appInfo: {
      name: "Vela",
      version: "1.0.0"
    }
  });
}
