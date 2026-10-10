# Role-Based Access Control (RBAC)

## Roles Overview
Authorization is strictly enforced server-side. The following roles exist within the context of a specific Tenant:

1. **SUPER_ADMIN:** (Platform level, bypasses tenant scope) Manages the entire Vela SaaS infrastructure.
2. **OWNER:** Full control over a specific tenant (billing, services, admin management).
3. **ADMIN:** Operational management (calendar, employees, customers, visual settings).
4. **EMPLOYEE:** Staff member (manages own schedule, bookings, and availability).
5. **CUSTOMER:** End-user (books and manages own appointments).

## Implementation Strategy
RBAC will be implemented using a centralized policy/authorization utility, often referred to as a "CASL" approach or simple middleware checks.

### Server-Side Enforcement
Every protected Server Action or API Route must first resolve the current user's session and their `TenantUser.role` for the active `tenant_id`.

```typescript
// Example conceptual guard
export async function updateService(serviceId: string, data: any) {
  const session = await getTenantSession();
  
  if (session.role !== 'OWNER') {
    throw new UnauthorizedError('Only owners can modify services.');
  }
  
  // Proceed with update using tenant-scoped ORM
}
```

### Role Matrix Constraints
- **Billing & Services:** `OWNER` only.
- **User Management:** `OWNER` can create `ADMIN` and `EMPLOYEE`. `ADMIN` can create `EMPLOYEE`.
- **Calendar Visibility:** `ADMIN` sees all locations/employees. `EMPLOYEE` sees only their own assigned bookings (unless configured otherwise in tenant settings).
- **Customer Isolation:** `CUSTOMER` role can only ever query `Booking` records where `customerId === session.userId`.

## Audit Logging
Actions performed by `ADMIN` and `OWNER` roles (e.g., changing prices, deleting employees, modifying settings) will trigger an insert into the `AuditLog` table for security and compliance tracking.
