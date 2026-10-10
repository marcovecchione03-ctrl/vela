import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../src/lib/db/prisma';
import { submitOnboardingStep } from '../../src/actions/onboarding';
import * as nextAuth from 'next-auth';

describe('Phase 3B Onboarding & Idempotency Tests', () => {
  let userOwner: { id: string, email: string };

  beforeAll(async () => {
    userOwner = await prisma.user.create({ data: { email: 'onboarding-test-3b@example.com' } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userOwner.id } });
  });

  const mockSession = (userId: string) => {
    vi.spyOn(nextAuth, 'getServerSession').mockResolvedValue({
      user: { id: userId, email: 'test@example.com' },
      expires: '9999-12-31T23:59:59.999Z'
    });
  };

  it('1. Step 1 creates tenant correctly idempotently', async () => {
    mockSession(userOwner.id);
    const fd = new FormData();
    fd.append('businessType', 'Barber Shop');
    
    let res = await submitOnboardingStep(1, fd);
    expect(res.success).toBe(true);
    expect(res.step).toBe(2);

    // Double submit Step 1 (Idempotency)
    res = await submitOnboardingStep(1, fd);
    expect(res.success).toBe(true);
    expect(res.step).toBe(2); // Should not create a second tenant

    const count = await prisma.tenant.count({
      where: { memberships: { some: { userId: userOwner.id } } }
    });
    expect(count).toBe(1);
  });

  it('2. Forged tenant is impossible because tenantId is derived securely', async () => {
    const maliciousUser = await prisma.user.create({ data: { email: 'hacker2@example.com' } });
    mockSession(maliciousUser.id);
    
    const fd = new FormData();
    fd.append('name', 'Hacked Name');
    
    // Malicious user tries to do step 2 without having done step 1
    const res = await submitOnboardingStep(2, fd);
    expect(res.error).toBe('No onboarding in progress.');
    
    await prisma.user.delete({ where: { id: maliciousUser.id } });
  });

  it('3. Owner can complete step 2 and step 10, setting status to PENDING', async () => {
    mockSession(userOwner.id);
    
    // Step 2
    let fd = new FormData();
    fd.append('name', 'My Barber Shop');
    let res = await submitOnboardingStep(2, fd);
    expect(res.success).toBe(true);

    // Skip to Step 10
    fd = new FormData();
    fd.append('plan', 'PRO');
    res = await submitOnboardingStep(10, fd);
    expect(res.success).toBe(true);
    expect(res.step).toBe(11); // completed

    const tenant = await prisma.tenant.findFirst({
      where: { memberships: { some: { userId: userOwner.id } } },
      include: { subscription: true }
    });
    
    expect(tenant?.onboardingState).toBe('COMPLETED');
    expect(tenant?.subscription?.plan).toBe('PRO');
    expect(tenant?.subscription?.status).toBe('PENDING'); // Enforce real billing isolation
  });
});
