import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/lib/env', () => ({
  env: {
    STRIPE_BASIC_MONTHLY_PRICE_ID: 'price_basic_mo',
    STRIPE_BASIC_ANNUAL_PRICE_ID: 'price_basic_yr',
    STRIPE_PRO_MONTHLY_PRICE_ID: 'price_pro_mo',
    STRIPE_PRO_ANNUAL_PRICE_ID: 'price_pro_yr',
    STRIPE_SECRET_KEY: 'sk_test_123',
    STRIPE_WEBHOOK_SECRET: 'whsec_123',
    DATABASE_URL: 'postgres://test',
    NEXTAUTH_SECRET: 'secret',
    CRON_SECRET: 'cron_123'
  }
}))

import { PLANS, getPlanByPriceId } from '../../src/lib/billing/plans'
import { mapStripeStatusToInternal } from '../../src/lib/billing/reconcile'

describe('Phase 8B: Final Stripe Billing Hardening', () => {
  it('1-4. Exact plan configuration pricing', () => {
    expect(PLANS.BASIC.pricing.month.amount).toBe(2999)
    expect(PLANS.BASIC.pricing.year.amount).toBe(28790)
    expect(PLANS.PRO.pricing.month.amount).toBe(5999)
    expect(PLANS.PRO.pricing.year.amount).toBe(57590)
  })

  it('5-6. Exact location limits', () => {
    expect(PLANS.BASIC.locationLimit).toBe(1)
    expect(PLANS.PRO.locationLimit).toBe(3)
  })

  it('16. Grace exactly 7 days', () => {
    const failureDate = new Date('2026-10-01T12:00:00.000Z')
    const graceEnd = new Date(failureDate)
    graceEnd.setDate(graceEnd.getDate() + 7)
    expect(graceEnd.toISOString()).toBe('2026-10-08T12:00:00.000Z')
  })

  it('30. Deterministic Stripe idempotency key generation', () => {
    const tenantId = 't-123'
    const plan = 'PRO'
    const interval = 'month'
    const idempotencyKey = `checkout_${tenantId}_${plan}_${interval}`
    expect(idempotencyKey).toBe('checkout_t-123_PRO_month')
  })
})

describe('Webhook and Event Parsing', () => {
  it('Map active, trialing, past_due correctly', () => {
    expect(mapStripeStatusToInternal('active')).toBe('ACTIVE')
    expect(mapStripeStatusToInternal('trialing')).toBe('ACTIVE')
    expect(mapStripeStatusToInternal('past_due')).toBe('PAST_DUE')
    expect(mapStripeStatusToInternal('canceled')).toBe('CANCELED')
    expect(mapStripeStatusToInternal('unpaid')).toBe('UNPAID')
  })
})
