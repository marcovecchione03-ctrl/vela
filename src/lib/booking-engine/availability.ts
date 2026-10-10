import { toZonedTime, fromZonedTime } from "date-fns-tz"
import { addDays, addMinutes, differenceInMinutes, isBefore, isAfter, max } from "date-fns"

export type TimeInterval = {
  startTime: Date
  endTime: Date
}

export type Block = TimeInterval & {
  type: "BOOKING" | "TIME_BLOCK" | "EXCEPTION"
}

export type AvailabilityConfig = {
  timezone: string
  locationOpenTime?: string // "09:00"
  locationCloseTime?: string // "18:00"
  employeeWorkingHours: { startTime: string; endTime: string }[] // Array of working intervals for the day
  blocks: Block[]
  minNoticeMinutes: number
  maxAdvanceDays: number
  slotStepMinutes?: number // Default 5
}

/**
 * Helper to convert "HH:mm" to a UTC Date on the given local day
 */
export function timeStringToDate(dateStr: string, timeStr: string, timezone: string): Date {
  // dateStr must be YYYY-MM-DD
  const localStr = `${dateStr}T${timeStr}:00`
  return fromZonedTime(localStr, timezone)
}

/**
 * Generate all possible slot starts within a given time interval
 */
function generateSlotsForInterval(
  start: Date,
  end: Date,
  stepMinutes: number
): Date[] {
  const slots: Date[] = []
  let current = new Date(start)
  while (current < end) {
    slots.push(new Date(current))
    current = addMinutes(current, stepMinutes)
  }
  return slots
}

/**
 * Filter slots that overlap with blocks (unless concurrency rules apply, handled elsewhere)
 * For basic availability, we treat a block as completely unavailable if the slot strictly falls inside it.
 * Wait, for a block, any slot that *overlaps* with the block is invalid.
 * If slot starts at 10:00 and duration is 30, it overlaps a block [10:15 - 10:45].
 * So we don't just subtract blocks from start times, we must check if the FULL [start, start + duration] interval overlaps.
 */
export function isSlotValid(
  slotStart: Date,
  durationMinutes: number,
  blocks: Block[],
  capacity: number = 1
): boolean {
  const slotEnd = addMinutes(slotStart, durationMinutes)

  let overlappingCount = 0
  for (const block of blocks) {
    // Overlap condition: max(start1, start2) < min(end1, end2)
    const overlapStart = slotStart > block.startTime ? slotStart : block.startTime
    const overlapEnd = slotEnd < block.endTime ? slotEnd : block.endTime
    
    if (overlapStart < overlapEnd) {
      if (block.type === "EXCEPTION" || block.type === "TIME_BLOCK") {
        // Hard blocks completely prevent booking
        return false
      }
      if (block.type === "BOOKING") {
        overlappingCount++
      }
    }
  }

  return overlappingCount < capacity
}

/**
 * Main function to compute available start times for a given day
 */
export function computeDayAvailability(
  dateStr: string, // "YYYY-MM-DD"
  config: AvailabilityConfig,
  requiredDurationMins: number,
  effectiveBufferMins: number,
  concurrentCapacity: number = 1
): Date[] {
  const { timezone, locationOpenTime, locationCloseTime, employeeWorkingHours, blocks, minNoticeMinutes, maxAdvanceDays } = config
  const stepMinutes = config.slotStepMinutes || 5
  
  const totalDuration = requiredDurationMins + effectiveBufferMins
  
  // 1. Establish the current time in the local timezone to enforce Min Notice & Max Advance
  const now = new Date()
  const minAllowedTime = addMinutes(now, minNoticeMinutes)
  const maxAllowedTime = addDays(now, maxAdvanceDays)
  
  // 2. Determine Location Bounds
  let locStart: Date | null = null
  let locEnd: Date | null = null
  if (locationOpenTime && locationCloseTime) {
    locStart = timeStringToDate(dateStr, locationOpenTime, timezone)
    locEnd = timeStringToDate(dateStr, locationCloseTime, timezone)
  }

  const availableSlots: Date[] = []

  // 3. Process each employee working interval
  for (const interval of employeeWorkingHours) {
    const empStart = timeStringToDate(dateStr, interval.startTime, timezone)
    const empEnd = timeStringToDate(dateStr, interval.endTime, timezone)
    
    // Intersect with location bounds
    const effectiveStart = locStart ? new Date(Math.max(empStart.getTime(), locStart.getTime())) : empStart
    const effectiveEnd = locEnd ? new Date(Math.min(empEnd.getTime(), locEnd.getTime())) : empEnd
    
    if (effectiveStart >= effectiveEnd) continue
    
    // Generate all 5-minute slots in this interval
    const candidateStarts = generateSlotsForInterval(effectiveStart, effectiveEnd, stepMinutes)
    
    for (const slotStart of candidateStarts) {
      const slotEnd = addMinutes(slotStart, totalDuration)
      
      // Ensure the entire duration fits within the effective working hours
      if (slotEnd > effectiveEnd) continue
      
      // Check Min Notice and Max Advance
      if (slotStart < minAllowedTime) continue
      if (slotStart > maxAllowedTime) continue
      
      // Check against all blocks
      if (isSlotValid(slotStart, totalDuration, blocks, concurrentCapacity)) {
        availableSlots.push(slotStart)
      }
    }
  }

  return availableSlots
}

export function getEffectiveConcurrency(services: { concurrentCapacity: number }[]): number {
  if (services.length === 0) return 1
  return Math.min(...services.map(s => s.concurrentCapacity))
}

export function getEffectiveDuration(services: { durationMinutes: number }[]): number {
  return services.reduce((sum, s) => sum + s.durationMinutes, 0)
}

export function getEffectiveBuffer(services: { bufferOverrideMins: number | null }[], defaultBuffer: number): number {
  if (services.length === 0) return defaultBuffer
  const buffers = services.map(s => s.bufferOverrideMins ?? defaultBuffer)
  return Math.max(...buffers)
}
