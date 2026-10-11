import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { PLANS } from '../../src/lib/billing/plans';
import { getPlanByPriceId } from '../../src/lib/billing/stripe-prices';
import { env } from '../../src/lib/env';

describe('Phase 8: Billing Configuration & Plans', () => {
  it('should enforce the correct location limits for BASIC and PRO plans', () => {
    expect(PLANS.BASIC.locationLimit).toBe(1);
    expect(PLANS.PRO.locationLimit).toBe(3);
  });

  it('should have correct pricing amounts in cents', () => {
    expect(PLANS.BASIC.monthlyAmountCents).toBe(2999);
    expect(PLANS.BASIC.annualAmountCents).toBe(28790);
    expect(PLANS.PRO.monthlyAmountCents).toBe(5999);
    expect(PLANS.PRO.annualAmountCents).toBe(57590);
  });

  it('should resolve plan by price ID', () => {
    const resolved = getPlanByPriceId('price_basic_mo');
    expect(resolved).not.toBeNull();
    expect(resolved?.plan).toBe('BASIC');
    expect(resolved?.interval).toBe('month');
  });

  it('should fail to resolve unknown price ID', () => {
    const resolved = getPlanByPriceId('price_unknown');
    expect(resolved).toBeNull();
  });
});

describe('Grace Period Logic (Simulated)', () => {
  it('should calculate exactly 7 days for grace period', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const graceEnd = new Date(now);
    graceEnd.setDate(graceEnd.getDate() + 7);
    
    expect(graceEnd.toISOString()).toBe('2026-01-08T12:00:00.000Z');
  });
});
