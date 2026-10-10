import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Set 'x-vela-host'
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-vela-host');
  requestHeaders.set('x-vela-host', hostname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Auth routing enforcement
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAuthPage = pathname.startsWith('/auth');

  // Define public paths that don't require authentication globally
  const isPublicRoute = 
    pathname === '/' || 
    pathname.startsWith('/api/') || 
    pathname.startsWith('/_next/') || 
    pathname === '/favicon.ico';

  // In our development setup, paths might start with /[domain] for tenant routing.
  // We need to ensure customers can access tenant public pages (like /tenant-a/book) without being forced to global login.
  // However, we will enforce auth AT THE COMPONENT OR ACTION level for booking itself.
  const isTenantRoute = pathname.split('/').length > 1 && !['auth', 'dashboard', 'api', '_next', 'invite', 'onboarding', 'services', 'team'].includes(pathname.split('/')[1]);

  if (!token && !isAuthPage && !isPublicRoute && !isTenantRoute) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // --- HOSTNAME BASED TENANT RESOLUTION ---
  // In production, the Host header is authoritative.
  const isApex = hostname === 'vela.localhost' || hostname === 'localhost:3000' || hostname === 'vela.app' || hostname.endsWith('.vercel.app'); 

  // Rewrite custom domains to the dynamic [domain] route
  if (
    !isApex && 
    !pathname.startsWith('/api') && 
    !pathname.startsWith('/_next') && 
    !pathname.startsWith('/auth') && 
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/invite') &&
    !pathname.startsWith('/onboarding')
  ) {
    // If the path doesn't already start with the domain (to prevent double-rewriting in dev)
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments[0] !== hostname) {
      return NextResponse.rewrite(new URL(`/${hostname}${pathname}${request.nextUrl.search}`, request.url), {
        request: {
          headers: requestHeaders,
        },
      });
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
