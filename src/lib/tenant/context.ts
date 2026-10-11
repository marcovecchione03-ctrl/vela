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

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/config";
import { Tenant, TenantMembership, Role } from "@prisma/client";

export interface DashboardContext {
  tenant: Tenant;
  membership: TenantMembership;
  role: Role;
}

/**
 * Resolves the active dashboard context (tenant, membership, role) for the authenticated user.
 * 
 * Active tenant selection precedence:
 * 1. SuperAdmin impersonation context (session.user.impersonatedTenantId)
 * 2. Explicit active tenant cookie (vela_active_tenant) or header (x-vela-tenant-id) - verified against user's memberships
 * 3. Single active membership (if user belongs to exactly 1 business)
 * 4. Multi-membership fallback: prioritized by role (OWNER > ADMIN > EMPLOYEE) then oldest active
 */
export const getDashboardContext = cache(async (): Promise<DashboardContext | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // 1. SuperAdmin impersonation
  if (session.user.impersonatedTenantId) {
    const impersonatedMembership = await prisma.tenantMembership.findFirst({
      where: {
        tenantId: session.user.impersonatedTenantId,
        userId: userId,
        tenant: { status: { in: ["ACTIVE", "GRACE_PERIOD"] } }
      },
      include: { tenant: true }
    });
    if (impersonatedMembership) {
      return {
        tenant: impersonatedMembership.tenant,
        membership: impersonatedMembership,
        role: impersonatedMembership.role
      };
    }
  }

  // 2. Explicit active tenant selection via cookie or header
  let explicitTenantId: string | null = null;
  try {
    const { cookies, headers } = await import("next/headers");
    const cookieStore = await cookies();
    explicitTenantId = cookieStore.get("vela_active_tenant")?.value || null;
    if (!explicitTenantId) {
      const headerStore = await headers();
      explicitTenantId = headerStore.get("x-vela-tenant-id") || null;
    }
  } catch {
    // Outside request scope (e.g. unit tests)
  }

  if (explicitTenantId) {
    const selectedMembership = await prisma.tenantMembership.findFirst({
      where: {
        userId,
        tenantId: explicitTenantId,
        role: { in: ["OWNER", "ADMIN", "EMPLOYEE"] },
        tenant: { status: { in: ["ACTIVE", "GRACE_PERIOD"] } }
      },
      include: { tenant: true }
    });

    if (selectedMembership) {
      return {
        tenant: selectedMembership.tenant,
        membership: selectedMembership,
        role: selectedMembership.role
      };
    }
    // Invalid/unauthorized cookie falls through to user's real memberships
  }

  // 3. Fetch all active operational memberships for this user
  const memberships = await prisma.tenantMembership.findMany({
    where: { 
      userId, 
      role: { in: ["OWNER", "ADMIN", "EMPLOYEE"] },
      tenant: { status: { in: ["ACTIVE", "GRACE_PERIOD"] } }
    },
    include: { tenant: true },
    orderBy: { createdAt: "asc" }
  });

  if (memberships.length === 0) {
    return null;
  }

  if (memberships.length === 1) {
    return {
      tenant: memberships[0].tenant,
      membership: memberships[0],
      role: memberships[0].role
    };
  }

  // 4. Multiple operational memberships: prioritize OWNER > ADMIN > EMPLOYEE
  const roleRank: Record<Role, number> = {
    OWNER: 1,
    ADMIN: 2,
    EMPLOYEE: 3,
    CUSTOMER: 4
  };

  const sorted = [...memberships].sort((a, b) => {
    const rankDiff = roleRank[a.role] - roleRank[b.role];
    if (rankDiff !== 0) return rankDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return {
    tenant: sorted[0].tenant,
    membership: sorted[0],
    role: sorted[0].role
  };
});

/**
 * Returns the tenant for the current dashboard user.
 */
export const getDashboardTenant = cache(async () => {
  const ctx = await getDashboardContext();
  return ctx?.tenant ?? null;
});

/**
 * Sets the active tenant for users with multiple memberships.
 */
export async function setActiveTenant(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      userId: session.user.id,
      tenantId,
      role: { in: ["OWNER", "ADMIN", "EMPLOYEE"] },
      tenant: { status: { in: ["ACTIVE", "GRACE_PERIOD"] } }
    }
  });

  if (!membership) {
    throw new Error("Cannot select tenant: not an active member");
  }

  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("vela_active_tenant", tenantId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
  } catch {
    // Outside Next.js request scope
  }

  return { success: true };
}
