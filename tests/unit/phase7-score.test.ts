import { describe, it, expect } from 'vitest';
import { 
  SCORE_RULES, 
  clampScore, 
  applyScoreDelta, 
  scoreEventForTransition, 
  rebuildScoreFromEvents 
} from '../../src/lib/crm/score-rules';

describe('Phase 7 Customer Score Logic (Unit)', () => {
  describe('Clamping & Deltas', () => {
    it('1. should clamp score between 0 and 100', () => {
      expect(clampScore(-5)).toBe(0);
      expect(clampScore(0)).toBe(0);
      expect(clampScore(105)).toBe(100);
      expect(clampScore(100)).toBe(100);
      expect(clampScore(80)).toBe(80);
    });

    it('2. should calculate correct deltas when hitting boundaries', () => {
      const res1 = applyScoreDelta(98, 4);
      expect(res1.newScore).toBe(100);
      expect(res1.actualDelta).toBe(2);

      const res2 = applyScoreDelta(10, -25);
      expect(res2.newScore).toBe(0);
      expect(res2.actualDelta).toBe(-10);
    });
  });

  describe('Transitions (Idempotency & Exclusions)', () => {
    it('3. should map final statuses correctly', () => {
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "COMPLETED", lateCancellation: false, hasRegisteredCustomer: true })).toBe("BOOKING_COMPLETED");
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "NO_SHOW", lateCancellation: false, hasRegisteredCustomer: true })).toBe("NO_SHOW");
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "CANCELLED", lateCancellation: false, hasRegisteredCustomer: true })).toBe("NORMAL_CANCELLATION");
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "CANCELLED", lateCancellation: true, hasRegisteredCustomer: true })).toBe("LATE_CANCELLATION");
    });

    it('4. should be idempotent (same transition yields null)', () => {
      expect(scoreEventForTransition({ fromStatus: "COMPLETED", toStatus: "COMPLETED", lateCancellation: false, hasRegisteredCustomer: true })).toBeNull();
    });

    it('5. should yield null for non-final statuses', () => {
      expect(scoreEventForTransition({ fromStatus: "PENDING", toStatus: "CONFIRMED", lateCancellation: false, hasRegisteredCustomer: true })).toBeNull();
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "ARRIVED", lateCancellation: false, hasRegisteredCustomer: true })).toBeNull();
      expect(scoreEventForTransition({ fromStatus: "ARRIVED", toStatus: "IN_PROGRESS", lateCancellation: false, hasRegisteredCustomer: true })).toBeNull();
    });

    it('6. should exclude OneTimeClient bookings (hasRegisteredCustomer = false)', () => {
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "COMPLETED", lateCancellation: false, hasRegisteredCustomer: false })).toBeNull();
      expect(scoreEventForTransition({ fromStatus: "CONFIRMED", toStatus: "NO_SHOW", lateCancellation: false, hasRegisteredCustomer: false })).toBeNull();
    });
  });

  describe('Rebuild Score from Events', () => {
    it('7. should deterministically rebuild score with stable sorting and clamping', () => {
      const events = [
        { id: "c", eventType: "NO_SHOW", scoreChange: -25, createdAt: new Date("2024-01-03T10:00Z") },
        { id: "a", eventType: "BOOKING_COMPLETED", scoreChange: 4, createdAt: new Date("2024-01-01T10:00Z") },
        { id: "b", eventType: "BOOKING_COMPLETED", scoreChange: 4, createdAt: new Date("2024-01-02T10:00Z") },
        { id: "d", eventType: "LATE_CANCELLATION", scoreChange: -12, createdAt: new Date("2024-01-03T10:00Z") }, // Same timestamp as c, but id "d" > "c"
      ];

      // Base is 80.
      // 1. (a) completed -> 84
      // 2. (b) completed -> 88
      // 3. (c) no-show -> 63
      // 4. (d) late cancel -> 51
      
      const rebuiltScore = rebuildScoreFromEvents(events);
      expect(rebuiltScore).toBe(51);
    });

    it('8. should use manual recorded delta for MANUAL_ADJUSTMENT', () => {
      const events = [
        { id: "a", eventType: "MANUAL_ADJUSTMENT", scoreChange: 50, createdAt: new Date("2024-01-01T10:00Z") }
      ];
      // 80 + 50 -> clamped to 100
      expect(rebuildScoreFromEvents(events)).toBe(100);
    });
  });
});
