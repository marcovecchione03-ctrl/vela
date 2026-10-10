import { prisma } from '@/lib/db/prisma';
import { cache } from 'react';

/**
 * Validates a hostname and fetches its associated Tenant ID.
 * This is meant to be called from the Server Components/Actions, NOT Edge Middleware,
 * to avoid Prisma Edge compatibility issues.
 */
export const getTenantFromDomain = cache(async (hostname: string) => {
  if (!hostname) return null;

  // Normalize hostname (e.g. remove port in dev, lowercase)
  const normalizedHost = hostname.split(':')[0].toLowerCase();

  const domain = await prisma.domain.findUnique({
    where: { hostname: normalizedHost },
    select: { tenantId: true, status: true, tenant: { select: { status: true } } },
  });

  if (!domain || domain.status !== 'ACTIVE' || domain.tenant.status !== 'ACTIVE') {
    return null; // Fail closed: Unknown or inactive domain -> no tenant
  }

  return domain.tenantId;
});

/**
 * Extracts the Tenant ID safely from the Next.js request headers.
 * The Middleware is responsible for reading the Host and setting `x-vela-host`.
 */
export const getTenantContext = cache(async (headers: Headers) => {
  const host = headers.get('x-vela-host');
  if (!host) return null;

  return await getTenantFromDomain(host);
});
