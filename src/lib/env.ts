import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Vela"),
  // Mock Stripe -> Real Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_BASIC_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_BASIC_ANNUAL_PRICE_ID: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_ANNUAL_PRICE_ID: z.string().optional(),
  STRIPE_BILLING_PORTAL_CONFIGURATION_ID: z.string().optional(),
  CRON_SECRET: z.string().min(1),
  ALLOW_DEV_BILLING_BYPASS: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  
  // Phase 9: Calendar & Notifications
  CALENDAR_ENCRYPTION_KEY: z.string().length(32, "Encryption key must be 32 chars for AES-256-GCM").default("12345678901234567890123456789012"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_CLIENT_ID: z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  
  // Test DB
  DATABASE_URL_TEST: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
