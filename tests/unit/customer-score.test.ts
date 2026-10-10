import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getScoreBand, CUSTOMER_SCORE_CONFIG } from '../../src/lib/crm/customer-score'

describe('Customer Score Logic', () => {
  it('correctly maps scores to bands', () => {
    expect(getScoreBand(95).label).toBe("Excellent")
    expect(getScoreBand(80).label).toBe("Good")
    expect(getScoreBand(60).label).toBe("Attention")
    expect(getScoreBand(30).label).toBe("High risk")
  })

  it('verifies configuration points', () => {
    expect(CUSTOMER_SCORE_CONFIG.EVENTS.BOOKING_COMPLETED).toBe(4)
    expect(CUSTOMER_SCORE_CONFIG.EVENTS.NO_SHOW).toBe(-25)
    expect(CUSTOMER_SCORE_CONFIG.EVENTS.LATE_CANCELLATION).toBe(-12)
    expect(CUSTOMER_SCORE_CONFIG.EVENTS.NORMAL_CANCELLATION).toBe(-3)
  })
})
