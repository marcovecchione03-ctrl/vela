import Stripe from "stripe"
import { env } from "@/lib/env"

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || "mock_key_for_build", {
  apiVersion: "2024-04-10" as any,
  appInfo: {
    name: "Vela",
    version: "1.0.0"
  }
})
