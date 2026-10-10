import { describe, it, expect } from 'vitest';
import { validateCustomRange, classifyNewVsReturning } from '../../src/lib/logic/analytics';
import { computeCustomerAggregates, rankDeterministic, RankedItem, AggregateBooking } from '../../src/lib/crm/aggregates';

describe('Phase 7 Analytics Logic (Unit)', () => {
  describe('Custom Range Validation', () => {
    it('1. should accept valid custom range', () => {
      const { startDate, endDate } = validateCustomRange('2024-01-01', '2024-12-31');
      expect(startDate.getFullYear()).toBe(2024);
      expect(endDate.getFullYear()).toBe(2024);
    });

    it('2. should reject start date > end date', () => {
      expect(() => validateCustomRange('2024-12-31', '2024-01-01')).toThrow(/Start date must be before or equal to end date/);
    });

    it('3. should reject ranges exceeding 24 months', () => {
      expect(() => validateCustomRange('2020-01-01', '2024-01-01')).toThrow(/exceed 24 months/);
    });
  });

  describe('New vs Returning Classification', () => {
    it('4. classifies customer as NEW if earliest booking >= startDate', () => {
      const res = classifyNewVsReturning(
        ['c1'], 
        { 'c1': new Date('2024-02-01') }, 
        new Date('2024-01-01')
      );
      expect(res.newCustomers).toBe(1);
      expect(res.returningCustomers).toBe(0);
    });

    it('5. classifies customer as RETURNING if earliest booking < startDate', () => {
      const res = classifyNewVsReturning(
        ['c2'], 
        { 'c2': new Date('2023-12-01') }, 
        new Date('2024-01-01')
      );
      expect(res.newCustomers).toBe(0);
      expect(res.returningCustomers).toBe(1);
    });
  });

  describe('Dashboards & Aggregates zero-denominator safety', () => {
    it('6. gracefully handles 0 finalized bookings for completionRate', () => {
      const bookings: AggregateBooking[] = [];
      const res = computeCustomerAggregates(bookings, new Date());
      expect(res.completionRate).toBeNull();
      expect(res.total).toBe(0);
      expect(res.theoreticalValueMinor).toBe(0);
    });

    it('7. safely calculates completionRate and other aggregates', () => {
      const bookings: AggregateBooking[] = [
        { id: "1", status: "COMPLETED", startTime: new Date(), lateCancellation: false, employeeId: "e1", employeeName: "E1", services: [{serviceId: "s1", serviceName: "S1", price: 1000}] },
        { id: "2", status: "NO_SHOW", startTime: new Date(), lateCancellation: false, employeeId: "e1", employeeName: "E1", services: [] },
        { id: "3", status: "CANCELLED", startTime: new Date(), lateCancellation: true, employeeId: "e1", employeeName: "E1", services: [] }
      ];
      const res = computeCustomerAggregates(bookings, new Date());
      // Finalized = 3 (COMPLETED + NO_SHOW + CANCELLED)
      // completionRate = 1/3 = 0.333...
      expect(res.completionRate).toBeCloseTo(0.333, 2);
      expect(res.lateCancelled).toBe(1);
    });
  });

  describe('Tie-Breakers', () => {
    it('8. rankDeterministic tie breaks by most recent, then by ID', () => {
      const items: RankedItem[] = [
        { id: "sB", name: "Service B", count: 2, lastAt: new Date('2024-01-01') },
        { id: "sA", name: "Service A", count: 2, lastAt: new Date('2024-01-02') }, // higher lastAt wins
      ];
      const ranked = rankDeterministic(items);
      expect(ranked[0].id).toBe("sA");
    });
    
    it('9. rankDeterministic tie breaks by ID if count and lastAt are identical', () => {
      const sameDate = new Date('2024-01-01');
      const items: RankedItem[] = [
        { id: "sZ", name: "Z", count: 2, lastAt: sameDate },
        { id: "sC", name: "C", count: 2, lastAt: sameDate }, // smaller ID wins
      ];
      const ranked = rankDeterministic(items);
      expect(ranked[0].id).toBe("sC");
    });
  });
});
