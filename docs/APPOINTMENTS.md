# Appointment Management

This document details the appointment lifecycle, cancellation, rescheduling, and status management introduced in Phase 6.

## Status Machine
All booking status transitions are strictly governed by `src/lib/booking-engine/status-machine.ts`.
State transitions are role-based. For example:
- Customers can transition `CONFIRMED` -> `CANCELLED` (if before deadline).
- Employees can transition `CONFIRMED` -> `ARRIVED` -> `IN_PROGRESS` -> `COMPLETED`.
- Only Admins/Owners can transition `CANCELLED` -> `PENDING` (manual override).

Every state transition is recorded in `BookingChangeHistory`.

## Rescheduling
Rescheduling is treated as a highly critical operation.
We use row-level PostgreSQL locking (`SELECT ... FOR UPDATE`) inside `rescheduleAppointment` (in `src/actions/appointments.ts`).
1. Lock the target employee.
2. Verify the new slot does not cause capacity overlap (ignoring the current booking).
3. Ensure customer daily limits and overlaps are respected.
4. Update the booking and add to `BookingChangeHistory`.

## Cancellations
When a customer cancels an appointment, the system checks the `cancellationDeadlineHours` (default 24h) from the tenant config.
If the cancellation is closer to the appointment than the deadline, `lateCancellation` is flagged to `true`. This alerts staff to potentially charge a fee or penalize the customer.

## One-Time Clients
Manual bookings created by staff can use a `OneTimeClient` record rather than requiring the customer to create a full `CustomerProfile`. This ensures front-desk staff can instantly book walk-ins without friction.
