# Booking Engine Architecture (Future Proofing)

## Overview
While the booking engine is not fully implemented in Phase 1, the architecture must support complex, dynamic availability calculations. There are no fixed "15-minute slots."

## Core Determinants of Availability
Availability is the mathematical intersection of multiple time constraints. To calculate available slots for a specific Service, the engine must evaluate:

1. **Service Duration:** `Service.durationMinutes`. The required contiguous time block.
2. **Location Hours:** The business hours for the selected `Location`.
3. **Employee Shifts:** The working hours of the specific `Employee` performing the service on that day.
4. **Employee Absences:** Vacations, sick leave, or custom time blocks that make the employee unavailable.
5. **Existing Bookings:** Confirmed or pending appointments that consume employee time.
6. **Booking Rules (Config):**
   - **Buffer Time:** e.g., 10 minutes required between appointments to clean up.
   - **Notice Rules:** e.g., "Cannot book less than 2 hours in advance."

## Calculation Strategy
Instead of pre-generating millions of "slots" in the database, availability is calculated dynamically on-the-fly (On-Demand Generation).

1. **Query Window:** Fetch all constraints (shifts, bookings, blocks) for the requested Date Range (e.g., one week).
2. **Time Matrix:** Create a timeline representing the Employee's shift.
3. **Subtraction:** Subtract existing Bookings and Blocks from the shift timeline.
4. **Slot Fitting:** Iterate through the remaining free time blocks and identify all possible start times where `free_duration >= (Service.durationMinutes + Buffer)`.

## Concurrency and Double-Booking Prevention
- **Database Locks:** When a customer clicks "Confirm Booking", the transaction must enforce atomicity.
- PostgreSQL constraints (e.g., `EXCLUDE USING GIST` on time ranges for the same employee) or explicit row-level locking (`SELECT FOR UPDATE` on the employee record) will be used to guarantee that two concurrent requests cannot book overlapping time slots for the same employee.
