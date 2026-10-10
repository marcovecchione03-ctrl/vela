# Custom Domain Strategy

## The Goal
Every business using Vela can connect its own domain (e.g., `barbermario.it`) or a subdomain (e.g., `booking.beautylab.it`). When a user visits that domain, the application serves that specific tenant's experience.

## DNS & Infrastructure
1. **CNAME/A Record:** The tenant configures their DNS to point to the Vela infrastructure.
2. **Platform Setup:** The hosting platform must be configured to accept wildcard subdomains.

## Request Resolution Flow (Next.js Middleware)
1. **Incoming Request:** A user visits `https://barbermario.it`.
2. **Middleware Intercept:** Next.js Middleware runs at the Edge before the request hits the application.
3. **Host Header Extraction:** Middleware extracts the `Host` header (`barbermario.it`) and normalizes it (lowercases, removes ports).
4. **Header Handoff:** Middleware sets the `x-vela-host` header and forwards the request. **It does NOT query Prisma** due to Edge runtime limitations.
5. **Application Layer (Node.js):** 
   - The Server Component/API route calls `getTenantContext()`.
   - The DB is queried for the Domain mapping: `barbermario.it -> tenant_id: 123`.
   - If not found, it returns a 404.

## Security Implication
- The Customer cannot manipulate the Host header to access a different tenant's data while logged in, because their `TenantUser` profile is verified against the resolved `tenantId`.
- Domain verification (TXT record) will be required before a custom domain becomes active to prevent domain hijacking.
- Unknown domains fail closed immediately.
