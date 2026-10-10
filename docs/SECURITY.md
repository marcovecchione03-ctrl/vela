# Security & Authentication

## Environment Variables
Environment variables are strictly validated at startup using `Zod` in `src/lib/env.ts` to ensure the server crashes immediately if misconfigured.

## NextAuth
We use **NextAuth v4** configured with a custom Credentials provider.
We augment the session types to include the `User.id` for cross-referencing tenant memberships.

## Password Security
Passwords are securely hashed using `bcryptjs` with a work factor of 10. The logic is centralized in `src/lib/auth/password.ts`.

## Role Based Access Control (RBAC)
Server-side helpers are centralized in `src/lib/auth/rbac.ts`.
- **Tenant Roles:** `requireOwner`, `requireEmployeeSelf`, `requireCustomerSelf`, etc.
- **Platform Role:** `requireSuperAdmin` checks the `isSuperAdmin` boolean on the global `User` model. This is completely separated from `TenantMembership` to prevent accidental inheritance.
