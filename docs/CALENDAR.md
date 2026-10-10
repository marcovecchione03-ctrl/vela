# Calendar UI Engine

The Phase 6 Calendar UI is a server-driven React implementation relying on `date-fns` for lightweight timezone and date math.

## Data Fetching
Instead of fetching all bookings for a tenant, the `CalendarWrapper.tsx` syncs the `view` (Day, Week, Month, Agenda) and `date` state to the URL search params.
The Next.js server page (`page.tsx`) computes the exact visual bounds (e.g., Sunday to Saturday of the current week) and queries Prisma for exactly that window using `startTime: { gte, lte }`.

## Role Isolation
When `role === "EMPLOYEE"`, the server silently injects `employeeId: membership.employeeProfile.id` into the Prisma query. This ensures Employees cannot access or render bookings of other staff members in the calendar, reinforcing the multi-tenant and multi-role RBAC boundaries.

## Components
- `DayView.tsx`: Displays hours vertically and employees horizontally.
- `WeekView.tsx`: Displays hours vertically and days of the week horizontally.
- `MonthView.tsx`: Standard 7x5 or 7x6 month grid.
- `AgendaView.tsx`: Linear list of today's bookings.
