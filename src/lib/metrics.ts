import { prisma } from "@/lib/db/prisma";

export function computeMRR(subs: { plan: string; interval: string }[]): number {
  let mrrCents = 0;
  for (const s of subs) {
    if (s.plan === 'BASIC') {
      if (s.interval === 'month') {
        mrrCents += 2999;
      } else if (s.interval === 'year') {
        mrrCents += Math.round(28790 / 12); // integer-safe
      }
    } else if (s.plan === 'PRO') {
      if (s.interval === 'month') {
        mrrCents += 5999;
      } else if (s.interval === 'year') {
        mrrCents += Math.round(57590 / 12); // integer-safe
      }
    }
  }
  return mrrCents;
}

export async function calculatePlatformMetrics() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeTenants,
    totalTenants,
    suspendedTenants,
    graceTenants,
    cancelledTenants,
    newTenants,
    subs,
    tenantsAtStart,
    subsEndedInPeriod
  ] = await Promise.all([
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
    prisma.tenant.count({ where: { status: 'GRACE_PERIOD' } }),
    prisma.tenant.count({ where: { status: 'CANCELLED' } }),
    prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.subscription.findMany({
      where: { status: { in: ['ACTIVE', 'PAST_DUE', 'UNPAID'] } },
      select: { plan: true, interval: true }
    }),
    prisma.tenant.count({
      where: { 
        createdAt: { lt: thirtyDaysAgo }
      }
    }),
    prisma.subscription.count({
      where: {
        status: 'CANCELED',
        updatedAt: { gte: thirtyDaysAgo }
      }
    })
  ]);

  const mrrCents = computeMRR(subs);
  const arrCents = mrrCents * 12;

  let basicCount = 0;
  let proCount = 0;
  let monthlyCount = 0;
  let annualCount = 0;

  for (const s of subs) {
    if (s.plan === 'BASIC') basicCount++;
    if (s.plan === 'PRO') proCount++;
    if (s.interval === 'month') monthlyCount++;
    if (s.interval === 'year') annualCount++;
  }

  // Churn calculation
  const churnRate = tenantsAtStart > 0 ? (subsEndedInPeriod / tenantsAtStart) : 0;

  return {
    mrrCents,
    arrCents,
    activeTenants,
    totalTenants,
    suspendedTenants,
    graceTenants,
    cancelledTenants,
    newTenants,
    basicCount,
    proCount,
    monthlyCount,
    annualCount,
    churnRate
  };
}
