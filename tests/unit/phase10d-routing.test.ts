import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlatformRootPage from '@/app/page';
import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}));

// Provide a fake authOptions so the import in page.tsx doesn't crash
vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}));

describe('Phase 10D - Platform Root Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('src/app/page.tsx (Platform Root)', () => {
    it('redirects to /auth/login if unauthenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      const { redirect } = await import('next/navigation');
      
      await PlatformRootPage();
      
      expect(redirect).toHaveBeenCalledWith('/auth/login');
      // Verify the Next.js starter page text is gone
      expect(PlatformRootPage.toString()).not.toContain('To get started, edit the');
    });

    it('redirects to /dashboard if authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { id: 'test' } } as any);
      const { redirect } = await import('next/navigation');
      
      await PlatformRootPage();
      
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('src/middleware.ts (Hostname Resolution)', () => {
    it('treats *.vercel.app hostnames as apex', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const req = new NextRequest('https://vela-mu-seven.vercel.app/');
      req.headers.set('host', 'vela-mu-seven.vercel.app');
      
      const res = await middleware(req);
      
      // Since it's apex, it should NOT rewrite.
      // And since pathname is '/' and token is null, it should NOT redirect (because of isPublicRoute)
      // So it should just return a response without rewriting
      expect(res.headers.get('x-middleware-rewrite')).toBeNull();
      expect(res.status).toBe(200); // 200 Next response, not 307 Redirect or Rewrite
    });

    it('rewrites tenant domains to /[domain]', async () => {
      vi.mocked(getToken).mockResolvedValue(null);
      const req = new NextRequest('https://tenant1.com/');
      req.headers.set('host', 'tenant1.com');
      
      const res = await middleware(req);
      
      // Tenant domain should trigger a rewrite to /tenant1.com/
      expect(res.headers.get('x-middleware-rewrite')).toBe('https://tenant1.com/tenant1.com/');
    });
  });
});
