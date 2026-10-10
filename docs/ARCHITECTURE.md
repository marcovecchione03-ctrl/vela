# Architecture Overview

Vela is a B2B2C SaaS built for appointment-based businesses.

## Technology Stack
- **Framework:** Next.js 16.4 (App Router)
- **Database ORM:** Prisma 6.4 (Stable)
- **Authentication:** NextAuth v4 (Auth.js stable)
- **CSS:** Tailwind CSS v4
- **Testing:** Vitest

## Application Structure
- `src/app`: Next.js pages and API routes
- `src/modules`: Business logic (DAOs, Repositories) grouped by domain (e.g., `booking`, `customer`)
- `src/lib`: Core utilities (`db`, `auth`, `tenant`, `env`)
- `prisma`: Database schema and seed data
- `tests`: Vitest integration tests

## Key Principles
- **Defense in Depth:** No single layer of security. We use PostgreSQL constraints + DAOs + Prisma Extensions.
- **Server-Side Enforcement:** RBAC, Tenant Context, Plan Limits, and Form Data integrity are validated exclusively on the server using Zod and Prisma transactions.
- **Idempotency:** State-mutating onboarding and tenant creation operations guarantee safety against double-submission and malicious overrides.
