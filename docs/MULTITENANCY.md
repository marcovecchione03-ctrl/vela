# Multi-Tenancy Architecture

Vela uses a modular monolith approach where data is isolated logically by `tenantId`.

## Edge vs Node Resolution
Because Prisma does not run in the Next.js Edge runtime, `src/middleware.ts` normalizes the `Host` header and passes it internally as `x-vela-host`.
To prevent client spoofing, `middleware.ts` explicitly strips any incoming `x-vela-host` header before setting it.
The actual database resolution of Domain -> Tenant occurs in `src/lib/tenant/context.ts` running in Node.js server context.

## Defense in Depth Strategy
1. **Database Constraints (Compound FKs):** **IMPLEMENTED** - All major tenant-scoped relationships (like `Booking` -> `Location`) use compound foreign keys `[locationId, tenantId]`. This ensures that cross-tenant leaks are mathematically impossible at the PostgreSQL schema layer.
2. **Data Access Objects (DAOs):** All access must go through repositories which strictly demand a `tenantId`.
3. **Prisma Client Extension:** A fallback extension automatically intercepts standard queries and injects `tenantId: ...` into the WHERE and data clauses. Note that this extension does NOT protect `$queryRaw` or nested `connect` queries relying only on IDs.

## Missing/Planned
- Real-time billing isolation (tenant suspension enforcement) is planned but currently mocked.
