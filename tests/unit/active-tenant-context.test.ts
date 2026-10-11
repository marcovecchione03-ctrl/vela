import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardContext, setActiveTenant } from '@/lib/tenant/context';
import { prisma } from '@/lib/db/prisma';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tenantMembership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('Multi-Tenant Active Tenant Selection Semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const tenantOwner = { id: 'tenant-owner', name: 'Owner Business', status: 'ACTIVE' };
  const tenantEmployee = { id: 'tenant-emp', name: 'Employee Business', status: 'ACTIVE' };

  it('1. Returns null if unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const ctx = await getDashboardContext();
    expect(ctx).toBeNull();
  });

  it('2. SuperAdmin impersonation context overrides any normal membership', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'super-admin-id', impersonatedTenantId: 'tenant-target' },
    } as any);

    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({
      id: 'mem-target',
      tenantId: 'tenant-target',
      userId: 'super-admin-id',
      role: 'ADMIN',
      tenant: { id: 'tenant-target', name: 'Target Corp', status: 'ACTIVE' },
    } as any);

    const ctx = await getDashboardContext();
    expect(ctx?.tenant.id).toBe('tenant-target');
    expect(ctx?.role).toBe('ADMIN');
  });

  it('3. Single operational membership user automatically resolves that tenant', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-single' },
    } as any);

    vi.mocked(prisma.tenantMembership.findMany).mockResolvedValue([
      {
        id: 'mem-1',
        tenantId: tenantOwner.id,
        userId: 'user-single',
        role: 'OWNER',
        createdAt: new Date('2026-01-01'),
        tenant: tenantOwner,
      } as any,
    ]);

    const ctx = await getDashboardContext();
    expect(ctx?.tenant.id).toBe('tenant-owner');
    expect(ctx?.role).toBe('OWNER');
  });

  it('4. Multi-membership user prioritizes role: OWNER > ADMIN > EMPLOYEE when no cookie set', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'multi-user' },
    } as any);

    // User is EMPLOYEE in an older business, and OWNER in a newer business
    vi.mocked(prisma.tenantMembership.findMany).mockResolvedValue([
      {
        id: 'mem-emp',
        tenantId: tenantEmployee.id,
        userId: 'multi-user',
        role: 'EMPLOYEE',
        createdAt: new Date('2025-01-01'), // Older
        tenant: tenantEmployee,
      } as any,
      {
        id: 'mem-own',
        tenantId: tenantOwner.id,
        userId: 'multi-user',
        role: 'OWNER',
        createdAt: new Date('2026-01-01'), // Newer
        tenant: tenantOwner,
      } as any,
    ]);

    const ctx = await getDashboardContext();
    // Must select OWNER tenant, not the older EMPLOYEE tenant!
    expect(ctx?.tenant.id).toBe('tenant-owner');
    expect(ctx?.role).toBe('OWNER');
  });

  it('5. User with only CUSTOMER membership cannot access dashboard context', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-user' },
    } as any);

    vi.mocked(prisma.tenantMembership.findMany).mockResolvedValue([]); // filtered out by role: in [OWNER, ADMIN, EMPLOYEE]

    const ctx = await getDashboardContext();
    expect(ctx).toBeNull();
  });

  it('6. setActiveTenant allows selecting a tenant the user is a member of', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-switch' },
    } as any);

    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({
      id: 'mem-target',
      tenantId: 'tenant-target',
      userId: 'user-switch',
      role: 'ADMIN',
    } as any);

    const res = await setActiveTenant('tenant-target');
    expect(res).toEqual({ success: true });
  });

  it('7. setActiveTenant rejects switching to a tenant the user is NOT a member of', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-switch' },
    } as any);

    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue(null);

    await expect(setActiveTenant('unauthorized-tenant')).rejects.toThrow(
      'Cannot select tenant: not an active member'
    );
  });
});
