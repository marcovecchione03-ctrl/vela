import { Prisma } from "@prisma/client"
import {
  SCORE_RULES,
  applyScoreDelta,
  getReliabilityBand,
  rebuildScoreFromEvents,
  scoreEventForTransition,
  type ScorableStatus,
  type ScoreEventType,
} from "./score-rules"

export type { ScoreEventType } from "./score-rules"

/** Back-compat alias for the central rules object. */
export const CUSTOMER_SCORE_CONFIG = {
  BASE_SCORE: SCORE_RULES.BASE_SCORE,
  MIN_SCORE: SCORE_RULES.MIN_SCORE,
  MAX_SCORE: SCORE_RULES.MAX_SCORE,
  EVENTS: SCORE_RULES.EVENTS,
}

/** Back-compat alias. Owner/Admin only — never render to customers. */
export function getScoreBand(score: number) {
  const band = getReliabilityBand(score)
  return { label: band.label, color: band.color, bg: band.bg }
}

/**
 * Applies a score event idempotently inside the caller's transaction.
 *
 * Idempotency is enforced twice:
 * 1. service check: an existing (bookingId, eventType) event short-circuits
 * 2. database: @@unique([bookingId, eventType]) on CustomerScoreEvent — a racing
 *    duplicate raises P2002 and rolls back the whole transaction, including the
 *    booking status change, so status and score can never diverge.
 */
export async function applyScoreEvent(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string
    customerId: string
    bookingId?: string
    eventType: ScoreEventType
    actorId?: string
    manualDelta?: number
    reason?: string
  }
): Promise<{ applied: boolean; score: number }> {
  const { tenantId, customerId, bookingId, eventType, actorId, manualDelta, reason } = params

  const customer = await tx.customerProfile.findUnique({
    where: { id: customerId, tenantId },
    select: { id: true, score: true },
  })
  if (!customer) throw new Error("Customer not found")

  if (bookingId) {
    const existing = await tx.customerScoreEvent.findUnique({
      where: { bookingId_eventType: { bookingId, eventType } },
      select: { id: true },
    })
    if (existing) return { applied: false, score: customer.score }
  }

  const delta = eventType === "MANUAL_ADJUSTMENT" ? manualDelta ?? 0 : SCORE_RULES.EVENTS[eventType]
  const { newScore, actualDelta } = applyScoreDelta(customer.score, delta)

  // The event is recorded even when clamping makes actualDelta 0, for auditability.
  await tx.customerScoreEvent.create({
    data: {
      tenantId,
      customerId,
      bookingId,
      eventType,
      scoreChange: actualDelta,
      previousScore: customer.score,
      newScore,
      actorId,
      reason: reason || `Automated score change for ${eventType}`,
    },
  })

  await tx.customerProfile.update({
    where: { id: customerId, tenantId },
    data: { score: newScore },
  })

  return { applied: true, score: newScore }
}

/**
 * Production lifecycle hook. Called inside the same transaction that updates
 * Booking.status and writes BookingStatusHistory.
 *
 * Final statuses (COMPLETED, CANCELLED, NO_SHOW) are terminal in the status
 * machine, so no compensating reversal path is needed; a retry of the same
 * status maps to `null` and is a no-op.
 */
export async function applyBookingStatusScore(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string
    booking: { id: string; customerId: string | null; status: ScorableStatus }
    toStatus: ScorableStatus
    lateCancellation: boolean
    actorId?: string
  }
): Promise<{ applied: boolean; eventType: string | null }> {
  const { tenantId, booking, toStatus, lateCancellation, actorId } = params

  const eventType = scoreEventForTransition({
    fromStatus: booking.status,
    toStatus,
    lateCancellation,
    hasRegisteredCustomer: !!booking.customerId,
  })
  if (!eventType || !booking.customerId) return { applied: false, eventType: null }

  const result = await applyScoreEvent(tx, {
    tenantId,
    customerId: booking.customerId,
    bookingId: booking.id,
    eventType,
    actorId,
  })
  return { applied: result.applied, eventType }
}

/**
 * Maintenance only: deterministically rebuilds one customer's score from their
 * event history. Never run automatically at startup.
 */
export async function recalculateCustomerScore(
  tx: Prisma.TransactionClient,
  tenantId: string,
  customerId: string,
  actorId: string | null = null
) {
  const customer = await tx.customerProfile.findUnique({
    where: { id: customerId, tenantId },
    select: { id: true, score: true },
  })
  if (!customer) throw new Error("Customer not found")

  const events = await tx.customerScoreEvent.findMany({
    where: { customerId, tenantId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, eventType: true, scoreChange: true, createdAt: true },
  })

  const rebuilt = rebuildScoreFromEvents(events)

  const updated = await tx.customerProfile.update({
    where: { id: customerId, tenantId },
    data: { score: rebuilt },
  })

  await tx.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: "SCORE_RECALCULATION",
      entityType: "CustomerProfile",
      entityId: customerId,
      metadata: JSON.stringify({ oldScore: customer.score, newScore: rebuilt, eventCount: events.length }),
    },
  })

  return updated
}
