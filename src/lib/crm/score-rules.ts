/**
 * Customer Score — pure, framework-free rules.
 *
 * This module is the single source of truth for score deltas, clamping,
 * lifecycle-to-event mapping, deterministic rebuild, and reliability bands.
 * It performs no I/O so it can be unit-tested exhaustively; the Prisma-backed
 * persistence lives in `customer-score.ts` and calls into these functions.
 */

export const SCORE_RULES = {
  BASE_SCORE: 80,
  MIN_SCORE: 0,
  MAX_SCORE: 100,
  EVENTS: {
    BOOKING_COMPLETED: 4,
    NORMAL_CANCELLATION: -3,
    LATE_CANCELLATION: -12,
    NO_SHOW: -25,
  },
} as const

export type BookingScoreEventType = keyof typeof SCORE_RULES.EVENTS
export type ScoreEventType = BookingScoreEventType | "MANUAL_ADJUSTMENT"

export const BOOKING_SCORE_EVENT_TYPES = Object.keys(SCORE_RULES.EVENTS) as BookingScoreEventType[]

export function isBookingScoreEventType(value: string): value is BookingScoreEventType {
  return (BOOKING_SCORE_EVENT_TYPES as string[]).includes(value)
}

export function clampScore(score: number): number {
  if (score < SCORE_RULES.MIN_SCORE) return SCORE_RULES.MIN_SCORE
  if (score > SCORE_RULES.MAX_SCORE) return SCORE_RULES.MAX_SCORE
  return score
}

/** Applies a delta and returns the clamped score plus the delta actually applied. */
export function applyScoreDelta(current: number, delta: number): { newScore: number; actualDelta: number } {
  const newScore = clampScore(current + delta)
  return { newScore, actualDelta: newScore - current }
}

export type ScorableStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW"

/**
 * Maps a booking lifecycle transition to the score event it must produce.
 *
 * Returns `null` when no score impact is allowed:
 * - OneTimeClient bookings (no registered CustomerProfile) never score
 * - a retry of the same status (idempotent no-op)
 * - non-final statuses (PENDING, CONFIRMED, ARRIVED, IN_PROGRESS)
 * - reschedules (they do not change status and never call this)
 */
export function scoreEventForTransition(params: {
  fromStatus: ScorableStatus
  toStatus: ScorableStatus
  lateCancellation: boolean
  hasRegisteredCustomer: boolean
}): BookingScoreEventType | null {
  const { fromStatus, toStatus, lateCancellation, hasRegisteredCustomer } = params
  if (!hasRegisteredCustomer) return null
  if (fromStatus === toStatus) return null

  switch (toStatus) {
    case "COMPLETED":
      return "BOOKING_COMPLETED"
    case "NO_SHOW":
      return "NO_SHOW"
    case "CANCELLED":
      return lateCancellation ? "LATE_CANCELLATION" : "NORMAL_CANCELLATION"
    default:
      return null
  }
}

export type RebuildableScoreEvent = {
  id: string
  eventType: string
  scoreChange: number
  createdAt: Date
}

/**
 * Deterministically rebuilds a score from its event history.
 *
 * Ordering: createdAt ASC, then id ASC (stable tie-break for identical timestamps).
 * Booking-derived events re-read their delta from SCORE_RULES; manual or
 * compensating events (MANUAL_ADJUSTMENT, REVERSE_*) use their recorded delta.
 * Every step is clamped to [0, 100], starting from BASE_SCORE.
 */
export function rebuildScoreFromEvents(events: RebuildableScoreEvent[]): number {
  const ordered = [...events].sort((a, b) => {
    const t = a.createdAt.getTime() - b.createdAt.getTime()
    if (t !== 0) return t
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  let score: number = SCORE_RULES.BASE_SCORE
  for (const event of ordered) {
    const delta = isBookingScoreEventType(event.eventType)
      ? SCORE_RULES.EVENTS[event.eventType]
      : event.scoreChange
    score = clampScore(score + delta)
  }
  return score
}

export type ReliabilityBandKey = "EXCELLENT" | "GOOD" | "ATTENTION" | "HIGH_RISK"

export type ReliabilityBand = {
  key: ReliabilityBandKey
  label: string
  min: number
  max: number
  color: string
  bg: string
}

/** Central band definitions — Owner/Admin only. Never rendered to customers. */
export const RELIABILITY_BANDS: readonly ReliabilityBand[] = [
  { key: "EXCELLENT", label: "Excellent", min: 90, max: 100, color: "text-green-700", bg: "bg-green-100" },
  { key: "GOOD", label: "Good", min: 75, max: 89, color: "text-blue-700", bg: "bg-blue-100" },
  { key: "ATTENTION", label: "Attention", min: 50, max: 74, color: "text-yellow-800", bg: "bg-yellow-100" },
  { key: "HIGH_RISK", label: "High risk", min: 0, max: 49, color: "text-red-700", bg: "bg-red-100" },
]

export function getReliabilityBand(score: number): ReliabilityBand {
  const s = clampScore(Math.round(score))
  return RELIABILITY_BANDS.find((b) => s >= b.min && s <= b.max) ?? RELIABILITY_BANDS[RELIABILITY_BANDS.length - 1]
}

/** Score thresholds used by CRM directory filters, derived from the bands. */
export const HIGH_RELIABILITY_MIN = 75 // Good or Excellent
export const LOW_RELIABILITY_MAX = 49 // High risk

/**
 * A customer with no score history has not earned their score yet: the 80 is
 * only the starting value. Owner/Admin UI shows "New customer" in that case.
 */
export function getReliabilityLabel(params: { score: number; scoreEventCount: number }): {
  label: string
  isNewCustomer: boolean
  band: ReliabilityBand
} {
  const band = getReliabilityBand(params.score)
  if (params.scoreEventCount === 0) {
    return { label: "New customer", isNewCustomer: true, band }
  }
  return { label: band.label, isNewCustomer: false, band }
}
