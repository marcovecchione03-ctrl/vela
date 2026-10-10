# Stripe Integration Strategy

## Overview
Stripe is used exclusively for the B2B SaaS subscription (Tenants paying Vela). Customers do not pay for appointments through Vela at this stage.

## Plans & Pricing
- **BASIC:** €29.99/month (1 location limit)
- **BASIC YEARLY:** 20% discount
- **PRO:** €59.99/month (up to 3 locations limit)
- **PRO YEARLY:** 20% discount
- No free trial. No coupons.

## Integration Architecture
1. **Checkout Sessions:** When an Owner selects a plan, Vela creates a Stripe Checkout Session.
2. **Customer Mapping:** The Stripe `customer_id` is linked to the `Tenant` record.
3. **Webhooks:** The source of truth for subscription state is Stripe.
   - We implement a webhook endpoint (`/api/stripe/webhook`) to listen for events like `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
   - Webhooks update the `Subscription` table in PostgreSQL and modify the `Tenant.status`.
   - Idempotency is enforced using the `StripeWebhookEvent` table to prevent duplicate processing.
4. **Lifecycle & Grace Period:**
   - Active: Normal operation.
   - Grace Period (7 days): If a payment fails, `gracePeriodEndsAt` is set 7 days in the future. The tenant operates normally but sees warnings in the dashboard.
   - Suspended: If the grace period expires without a successful payment, the tenant is suspended. The customer booking portal displays a "Service Temporarily Unavailable" message.
5. **Gatekeeping:** 
   - Public pages (`/[domain]/book`, `/[domain]/page`) check `Tenant.status` and render a suspension notice if `SUSPENDED`.
   - Admin pages use RBAC. Only owners can access `/[domain]/dashboard/subscription` to manage billing.
   - A cron job (`/api/cron/billing`) checks for expired grace periods and transitions tenants to `SUSPENDED`.

## Security
- The webhook endpoint verifies the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`.
- Subscriptions are strongly tied to the `Tenant`, preventing a user from applying a subscription to the wrong business.
- Billing portal sessions are authenticated and only accessible to the tenant OWNER.
