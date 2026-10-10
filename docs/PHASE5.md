# Phase 5: Production Booking Engine and Customer Booking Experience

## Overview

This phase implements the most critical product subsystem: the production booking engine. It establishes a multi-tenant public booking site for customers, and the transactional backend to process and reserve bookings while guaranteeing data consistency (no double bookings), strict tenant isolation, and adhering to complex availability rules.

## Core Implementations

### 1. Booking Engine (`src/lib/booking-engine/availability.ts`)
The booking engine performs on-the-fly availability calculations. Instead of pre-generating massive slot tables, we calculate available slots dynamically by:
- Taking an employee's working hours for the specific day (`AvailabilityRule`).
- Creating a matrix of 5-minute intervals.
- Fetching all overlapping existing `Booking` and `TimeBlock` events.
- Subtracting blocked intervals from the day's matrix.
- Sliding a window representing the *effective duration* of the requested services (including padding/cleanup time) over the remaining free slots to determine valid start times.

This approach is highly memory-efficient, precise to the minute, and automatically respects multi-service combined durations.

### 2. Transactional Booking Action (`src/actions/booking.ts`)
The `createBookingTransaction` action handles the safe, atomic insertion of bookings:
- Validates the tenant and the requested services.
- Checks that the employee belongs to the location and tenant.
- Calculates the true service duration.
- Executes a **Prisma Interactive Transaction**:
  - Uses raw SQL (`SELECT ... FOR UPDATE`) to acquire a row-level lock on the `EmployeeProfile`, ensuring sequential transaction execution per employee to prevent double-booking race conditions.
  - Verifies no conflicting bookings exist in the time window (after acquiring the lock).
  - Creates the booking and links the required services.
  - Generates a unique 6-character `bookingReference`.

### 3. Rate Limiting (`src/lib/rate-limiter.ts`)
To protect against brute-force booking and API abuse, an in-memory Rate Limiter is implemented and applied to customer registration, availability searches, and booking creation.

### 4. Customer Authentication & Registration (`src/actions/customer-auth.ts`)
A dedicated customer registration flow enables new users to create accounts tied to a specific tenant via `TenantMembership` (role `CUSTOMER`). A unified `CustomerProfile` is maintained per tenant. For development, a bypass allows guest-like registration that auto-provisions a user and profile.

### 5. Public Tenant Pages
- **Public Homepage** (`app/[domain]/page.tsx`): Renders a simple, tenant-branded landing page with their cover, logo, description, and list of active services and locations.
- **Booking Wizard** (`app/[domain]/book`): A multi-step state machine handling the customer booking flow:
  1. Location Selection
  2. Service Selection
  3. Employee Selection (or "Anyone available")
  4. Date Selection & Availability Search
  5. Time Slot Selection
  6. Customer Details & Confirmation
- **Customer Dashboard** (`app/[domain]/appointments/page.tsx`): A view for authenticated customers to see their upcoming and past bookings, their statuses, and references.

### 6. Verification and Unit Testing
We added comprehensive unit tests for the booking engine pure logic (`tests/unit/phase5-engine.test.ts`) covering simple slots, overlapping subtractions, and multiple durations. We also added mock-based tests for the transactional action (`tests/unit/phase5-action.test.ts`).

## Security & Tenant Isolation guarantees
- Tenant Isolation is enforced at the route level by resolving the tenant `domain` (slug) from the URL and fetching explicitly scoped data.
- Row-level locking on `EmployeeProfile` prevents cross-tenant and same-tenant double bookings.
- The compound unique constraint on `[tenantId, bookingReference]` guarantees isolation of reference numbers.
- `CustomerProfile` records strictly reference a `TenantMembership`, which strictly references the `tenantId`.

## Next Steps
The Phase 5 backend and frontend foundations are fully typed, verified, and complete. Future phases will integrate real payment providers (e.g., Stripe) and build the dashboard calendar for the business owner.
