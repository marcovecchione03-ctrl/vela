import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveEffectiveTenantStatus } from '../../src/lib/tenant/resolver';
import { prisma } from '../../src/lib/db/prisma';

vi.mock('../../src/lib/db/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    }
  }
}));

describe('Phase 10: Platform Resolution Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prioritizes platform suspension over active billing', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: 't1',
      platformSuspendedAt: new Date(), // SUSPENDED
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' }
    });

    const status = await resolveEffectiveTenantStatus('t1');
    expect(status).toBe('PLATFORM_SUSPENDED');
  });

  it('returns CANCELLED if tenant is cancelled', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: 't1',
      platformSuspendedAt: null,
      status: 'CANCELLED',
      subscription: { status: 'ACTIVE' }
    });

    const status = await resolveEffectiveTenantStatus('t1');
    expect(status).toBe('CANCELLED');
  });

  it('returns CANCELLED if subscription is canceled in stripe', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: 't1',
      platformSuspendedAt: null,
      status: 'ACTIVE', // Locally not caught up yet
      subscription: { status: 'CANCELED' }
    });

    const status = await resolveEffectiveTenantStatus('t1');
    expect(status).toBe('CANCELLED');
  });

  it('returns GRACE_PERIOD if grace period has not expired', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: 't1',
      platformSuspendedAt: null,
      status: 'GRACE_PERIOD',
      gracePeriodEndsAt: futureDate,
      subscription: { status: 'PAST_DUE' }
    });

    const status = await resolveEffectiveTenantStatus('t1');
    expect(status).toBe('GRACE_PERIOD');
  });

  it('returns BILLING_SUSPENDED if grace period has expired', async () => {
    const pastDate = new Date();
    pastDate.setMonth(pastDate.getMonth() - 1);

    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: 't1',
      platformSuspendedAt: null,
      status: 'GRACE_PERIOD',
      gracePeriodEndsAt: pastDate,
      subscription: { status: 'PAST_DUE' }
    });

    const status = await resolveEffectiveTenantStatus('t1');
    expect(status).toBe('BILLING_SUSPENDED');
  });

  it('returns ACTIVE normally', async () => {
    (prisma.tenant.findUnique as any).mockResolvedValue({
      id: 't1',
      platformSuspendedAt: null,
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' }
    });

    const status = await resolveEffectiveTenantStatus('t1');
    expect(status).toBe('ACTIVE');
  });
});
