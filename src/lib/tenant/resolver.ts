import { prisma } from "@/lib/db/prisma";

export type EffectiveTenantStatus = 
  | 'ACTIVE' 
  | 'PLATFORM_SUSPENDED' 
  | 'BILLING_SUSPENDED' 
  | 'GRACE_PERIOD' 
  | 'CANCELLED' 
  | 'UNKNOWN';

export async function resolveEffectiveTenantStatus(tenantId: string): Promise<EffectiveTenantStatus> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { subscription: true }
  });

  if (!tenant) return 'UNKNOWN';

  // 1. Platform Suspension takes precedence
  if (tenant.platformSuspendedAt) {
    return 'PLATFORM_SUSPENDED';
  }

  // 2. Cancellation
  if (tenant.status === 'CANCELLED' || tenant.subscription?.status === 'CANCELED') {
    return 'CANCELLED';
  }

  // 3. Grace Period
  if (tenant.status === 'GRACE_PERIOD') {
    if (tenant.gracePeriodEndsAt && tenant.gracePeriodEndsAt > new Date()) {
      return 'GRACE_PERIOD';
    }
    return 'BILLING_SUSPENDED';
  }

  // 4. Billing Suspended
  if (tenant.status === 'SUSPENDED') {
    return 'BILLING_SUSPENDED';
  }

  return 'ACTIVE';
}
