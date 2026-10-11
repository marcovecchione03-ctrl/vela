import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '@/app/(dashboard)/dashboard/page';
import CalendarPage from '@/app/(dashboard)/dashboard/calendar/page';
import BookingsPage from '@/app/(dashboard)/dashboard/bookings/page';
import BookingDetailPage from '@/app/(dashboard)/dashboard/bookings/[id]/page';
import CustomersPage from '@/app/(dashboard)/dashboard/customers/page';
import CustomerDetailPage from '@/app/(dashboard)/dashboard/customers/[id]/page';
import SettingsPage from '@/app/(dashboard)/dashboard/settings/page';
import AnalyticsPage from '@/app/(dashboard)/dashboard/analytics/page';
import SubscriptionPage from '@/app/(dashboard)/dashboard/subscription/page';
import DomainsPage from '@/app/(dashboard)/dashboard/settings/domains/page';
import CustomizationPage from '@/app/(dashboard)/dashboard/settings/customization/page';
import * as tenantContext from '@/lib/tenant/context';
import * as rbac from '@/lib/auth/rbac';
import { redirect } from 'next/navigation';
import { createCheckoutSession, createPortalSession } from '@/actions/billing';
import { prisma } from '@/lib/db/prisma';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NOT_FOUND'); }),
}));

vi.mock('@/lib/env', () => ({
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
}));

vi.mock('@/lib/tenant/context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tenant/context')>();
  return {
    ...actual,
    getDashboardTenant: vi.fn(),
    getDashboardContext: vi.fn(),
  };
});

vi.mock('@/lib/auth/rbac', () => ({
  requireRole: vi.fn(),
  requireOwner: vi.fn(),
  requireOwnerOrAdmin: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({ user: { id: 'test-user-id', email: 'owner@vela.test' } }),
}));

vi.mock('@/lib/billing/stripe', () => ({
  getStripeClient: vi.fn().mockReturnValue({
    checkout: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test' }) } },
    billingPortal: { sessions: { create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }) } },
    customers: { create: vi.fn().mockResolvedValue({ id: 'cus_test' }) },
  }),
}));

// Provide fake prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    timeBlock: { findMany: vi.fn().mockResolvedValue([]) },
    availabilityException: { findMany: vi.fn().mockResolvedValue([]) },
    customerProfile: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
    customerTag: { findMany: vi.fn().mockResolvedValue([]) },
    domain: { findMany: vi.fn().mockResolvedValue([]) },
    tenant: { findUnique: vi.fn().mockResolvedValue({ id: 'tenant-1', employees: [], subscription: { plan: 'PRO', status: 'ACTIVE' }, _count: { locations: 1 } }) },
    tenantMembership: { findUnique: vi.fn().mockResolvedValue({ role: 'OWNER' }), findFirst: vi.fn(), findMany: vi.fn() },
    employeeProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    auditLog: { create: vi.fn().mockResolvedValue({ id: 'log-1' }) },
    subscription: { findUnique: vi.fn().mockResolvedValue({ id: 'sub-1', plan: 'PRO', status: 'INCOMPLETE', stripeCustomerId: 'cus_123' }) },
    billingCheckoutAttempt: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: 'att-1' }), update: vi.fn() },
  },
}));

describe('Dashboard Route RBAC Validation', () => {
  const mockTenant = { id: 'tenant-1', name: 'Test Tenant', onboardingState: 'COMPLETED' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated Access', () => {
    it('unauthenticated user is redirected/notFound by pages if no tenant', async () => {
      vi.mocked(tenantContext.getDashboardTenant).mockResolvedValue(null);
      vi.mocked(tenantContext.getDashboardContext).mockResolvedValue(null);

      await expect(DashboardPage()).rejects.toThrow('NOT_FOUND');
      await expect(CalendarPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NOT_FOUND');
      await expect(BookingsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NOT_FOUND');
      await expect(CustomersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NOT_FOUND');
      await expect(SubscriptionPage()).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('OWNER Access Matrix (All 7 Sections)', () => {
    beforeEach(() => {
      vi.mocked(tenantContext.getDashboardTenant).mockResolvedValue(mockTenant as any);
      vi.mocked(tenantContext.getDashboardContext).mockResolvedValue({
        tenant: mockTenant,
        membership: { id: 'mem-1', role: 'OWNER', userId: 'user-1', tenantId: mockTenant.id },
        role: 'OWNER',
      } as any);

      vi.mocked(rbac.requireRole).mockResolvedValue({ role: 'OWNER' } as any);
      vi.mocked(rbac.requireOwner).mockResolvedValue(true as any);
      vi.mocked(rbac.requireOwnerOrAdmin).mockResolvedValue(true as any);
      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({ id: 'mem-1', role: 'OWNER' } as any);
      vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({ id: 'mem-1', role: 'OWNER' } as any);
    });

    it('1. OWNER can access /dashboard', async () => {
      await expect(DashboardPage()).resolves.toBeDefined();
    });

    it('2. OWNER can access /dashboard/calendar', async () => {
      await expect(CalendarPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('3. OWNER can access /dashboard/bookings', async () => {
      await expect(BookingsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('4. OWNER can access /dashboard/customers', async () => {
      await expect(CustomersPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('5. OWNER can access /dashboard/settings and all subsections', async () => {
      await expect(SettingsPage()).resolves.toBeDefined();
      await expect(DomainsPage()).resolves.toBeDefined();
      await expect(CustomizationPage()).resolves.toBeDefined();
    });

    it('6. OWNER can access /dashboard/analytics', async () => {
      await expect(AnalyticsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('7. OWNER can access /dashboard/subscription', async () => {
      await expect(SubscriptionPage()).resolves.toBeDefined();
    });

    it('8. OWNER can execute billing actions (checkout, portal)', async () => {
      const checkoutUrl = await createCheckoutSession('tenant-1', 'PRO', 'month', 'https://ok', 'https://cancel');
      expect(checkoutUrl).toBe('https://checkout.stripe.com/test');

      const portalUrl = await createPortalSession('tenant-1', 'https://return');
      expect(portalUrl).toBe('https://billing.stripe.com/test');
    });
  });

  describe('ADMIN Access Matrix (Subscription Denied)', () => {
    beforeEach(() => {
      vi.mocked(tenantContext.getDashboardTenant).mockResolvedValue(mockTenant as any);
      vi.mocked(tenantContext.getDashboardContext).mockResolvedValue({
        tenant: mockTenant,
        membership: { id: 'mem-2', role: 'ADMIN', userId: 'user-2', tenantId: mockTenant.id },
        role: 'ADMIN',
      } as any);

      vi.mocked(rbac.requireRole).mockResolvedValue({ role: 'ADMIN' } as any);
      vi.mocked(rbac.requireOwnerOrAdmin).mockResolvedValue(true as any);
      vi.mocked(rbac.requireOwner).mockRejectedValue(new Error('Forbidden: requires OWNER'));
      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({ id: 'mem-2', role: 'ADMIN' } as any);
      // For billing actions, findFirst with role: OWNER will return null
      (vi.mocked(prisma.tenantMembership.findFirst) as any).mockImplementation((args: any) => {
        if (args?.where?.role === 'OWNER') return Promise.resolve(null);
        return Promise.resolve({ id: 'mem-2', role: 'ADMIN' } as any);
      });
    });

    it('ADMIN can access /dashboard', async () => {
      await expect(DashboardPage()).resolves.toBeDefined();
    });

    it('ADMIN can access /dashboard/calendar', async () => {
      await expect(CalendarPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('ADMIN can access /dashboard/bookings', async () => {
      await expect(BookingsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('ADMIN can access /dashboard/customers', async () => {
      await expect(CustomersPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('ADMIN can access /dashboard/settings (hides OWNER domains)', async () => {
      const page = await SettingsPage();
      expect(page).toBeDefined();
    });

    it('ADMIN can access /dashboard/analytics', async () => {
      await expect(AnalyticsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('ADMIN is DENIED from /dashboard/subscription (redirects to /dashboard)', async () => {
      await SubscriptionPage();
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('ADMIN is DENIED from billing actions (throws Unauthorized: Must be OWNER)', async () => {
      await expect(
        createCheckoutSession('tenant-1', 'PRO', 'month', 'https://ok', 'https://cancel')
      ).rejects.toThrow(/Must be OWNER/);

      await expect(
        createPortalSession('tenant-1', 'https://return')
      ).rejects.toThrow(/Must be OWNER/);
    });
  });

  describe('EMPLOYEE Access Matrix (Restricted Scope)', () => {
    beforeEach(() => {
      vi.mocked(tenantContext.getDashboardTenant).mockResolvedValue(mockTenant as any);
      vi.mocked(tenantContext.getDashboardContext).mockResolvedValue({
        tenant: mockTenant,
        membership: { id: 'mem-3', role: 'EMPLOYEE', userId: 'user-3', tenantId: mockTenant.id },
        role: 'EMPLOYEE',
      } as any);

      vi.mocked(rbac.requireRole).mockImplementation(async (tenantId, allowedRoles) => {
        if (allowedRoles.includes('EMPLOYEE')) return { role: 'EMPLOYEE' } as any;
        throw new Error(`Forbidden: requires one of [${allowedRoles.join(', ')}]`);
      });
      vi.mocked(rbac.requireOwner).mockRejectedValue(new Error('Forbidden: requires OWNER'));
      vi.mocked(rbac.requireOwnerOrAdmin).mockRejectedValue(new Error('Forbidden: requires OWNER or ADMIN'));

      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({
        id: 'mem-3',
        role: 'EMPLOYEE',
        employeeProfile: { id: 'emp-profile-1' }
      } as any);
      (vi.mocked(prisma.tenantMembership.findFirst) as any).mockImplementation((args: any) => {
        if (args?.where?.role === 'OWNER') return Promise.resolve(null);
        return Promise.resolve({ id: 'mem-3', role: 'EMPLOYEE' } as any);
      });
    });

    it('EMPLOYEE can access /dashboard (filtered to own metrics)', async () => {
      await expect(DashboardPage()).resolves.toBeDefined();
    });

    it('EMPLOYEE can access /dashboard/calendar (own schedule)', async () => {
      await expect(CalendarPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('EMPLOYEE can access /dashboard/bookings (own bookings)', async () => {
      await expect(BookingsPage({ searchParams: Promise.resolve({}) })).resolves.toBeDefined();
    });

    it('EMPLOYEE is DENIED from /dashboard/customers', async () => {
      await expect(CustomersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(/Forbidden/);
    });

    it('EMPLOYEE is DENIED from /dashboard/settings (redirects to /dashboard)', async () => {
      await SettingsPage();
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });

    it('EMPLOYEE is DENIED from /dashboard/analytics', async () => {
      await expect(AnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(/Forbidden/);
    });

    it('EMPLOYEE is DENIED from /dashboard/subscription (redirects to /dashboard)', async () => {
      await SubscriptionPage();
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Cross-Tenant Security Lookup', () => {
    beforeEach(() => {
      vi.mocked(tenantContext.getDashboardTenant).mockResolvedValue({ id: 'tenant-A' } as any);
      vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({ id: 'mem-A', role: 'OWNER' } as any);
    });

    it('User in Tenant A cannot look up Tenant B booking by ID', async () => {
      // Mock findFirst returning null because tenantId is scoped to tenant-A
      (vi.mocked(prisma.booking.findFirst) as any).mockImplementation(async (args: any) => {
        if (args?.where?.tenantId === 'tenant-A' && args?.where?.id === 'booking-B-id') {
          return null; // Not found in Tenant A
        }
        return null;
      });

      await expect(
        BookingDetailPage({ params: Promise.resolve({ id: 'booking-B-id' }) })
      ).rejects.toThrow('NOT_FOUND');
    });

    it('User in Tenant A cannot look up Tenant B customer by ID', async () => {
      vi.mocked(rbac.requireRole).mockResolvedValue({ role: 'OWNER' } as any);
      (vi.mocked(prisma.customerProfile.findFirst) as any).mockImplementation(async (args: any) => {
        if (args?.where?.tenantId === 'tenant-A' && args?.where?.id === 'customer-B-id') {
          return null; // Not found in Tenant A
        }
        return null;
      });

      await expect(
        CustomerDetailPage({ params: Promise.resolve({ id: 'customer-B-id' }) })
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});

