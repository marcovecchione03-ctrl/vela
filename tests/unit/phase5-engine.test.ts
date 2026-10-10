import { describe, it, expect } from "vitest"
import {
  computeDayAvailability,
  getEffectiveConcurrency,
  getEffectiveDuration,
  getEffectiveBuffer,
  AvailabilityConfig,
  timeStringToDate,
  Block
} from "../../src/lib/booking-engine/availability"

describe("Phase 5: Booking Engine Pure Logic", () => {
  describe("Duration & Concurrency", () => {
    it("1. 45-minute service occupies 45 minutes", () => {
      const eff = getEffectiveDuration([{ durationMinutes: 45 }])
      expect(eff).toBe(45)
    })

    it("2. multiple services sum duration", () => {
      const eff = getEffectiveDuration([{ durationMinutes: 30 }, { durationMinutes: 45 }])
      expect(eff).toBe(75)
    })

    it("3. mixed capacities use conservative minimum", () => {
      const eff = getEffectiveConcurrency([
        { concurrentCapacity: 3 },
        { concurrentCapacity: 1 },
        { concurrentCapacity: 2 }
      ])
      expect(eff).toBe(1)
    })
    
    it("4. highest buffer is used", () => {
      const buf = getEffectiveBuffer([{ bufferOverrideMins: 15 }, { bufferOverrideMins: 30 }], 0)
      expect(buf).toBe(30)
    })
  })

  describe("Day Availability & Timezones", () => {
    const tz = "Europe/Rome"

    const baseConfig: AvailabilityConfig = {
      timezone: tz,
      locationOpenTime: "09:00",
      locationCloseTime: "18:00",
      employeeWorkingHours: [{ startTime: "09:00", endTime: "18:00" }],
      blocks: [],
      minNoticeMinutes: 0,
      maxAdvanceDays: 365,
      slotStepMinutes: 5
    }

    it("5. generates 5-minute start resolution", () => {
      // Create a test config for a 1-hour window to keep test fast
      const cfg = { ...baseConfig, employeeWorkingHours: [{ startTime: "09:00", endTime: "10:00" }] }
      // Test future date to avoid minNotice limits
      const dateStr = "2026-10-15"
      const slots = computeDayAvailability(dateStr, cfg, 30, 0, 1)
      
      // A 30m booking inside a 60m window (09:00-10:00).
      // Max start time is 09:30.
      // Starts: 09:00, 09:05, ... , 09:30 => (30 / 5) + 1 = 7 slots.
      expect(slots).toHaveLength(7)
      expect(slots[0].toISOString()).toBe(timeStringToDate(dateStr, "09:00", tz).toISOString())
      expect(slots[6].toISOString()).toBe(timeStringToDate(dateStr, "09:30", tz).toISOString())
    })

    it("6. exceptions (vacation) block the day completely", () => {
      const dateStr = "2026-10-15"
      const cfg: AvailabilityConfig = {
        ...baseConfig,
        employeeWorkingHours: [{ startTime: "09:00", endTime: "10:00" }],
        blocks: [{
          type: "EXCEPTION",
          startTime: timeStringToDate(dateStr, "00:00", tz),
          endTime: timeStringToDate(dateStr, "23:59", tz)
        }]
      }
      
      const slots = computeDayAvailability(dateStr, cfg, 30, 0, 1)
      expect(slots).toHaveLength(0)
    })

    it("7. overlap strictly removes invalid slots", () => {
      const dateStr = "2026-10-15"
      
      // Block from 09:15 to 09:30
      const blocks: Block[] = [{
        type: "BOOKING",
        startTime: timeStringToDate(dateStr, "09:15", tz),
        endTime: timeStringToDate(dateStr, "09:30", tz)
      }]
      
      const cfg: AvailabilityConfig = {
        ...baseConfig,
        employeeWorkingHours: [{ startTime: "09:00", endTime: "10:00" }],
        blocks
      }
      
      // We want to book 20 mins.
      // Spaces: 09:00-09:15 (15m, too small), 09:30-10:00 (30m, fits)
      const slots = computeDayAvailability(dateStr, cfg, 20, 0, 1)
      
      // Starts: 09:30, 09:35, 09:40
      expect(slots).toHaveLength(3)
      expect(slots[0].toISOString()).toBe(timeStringToDate(dateStr, "09:30", tz).toISOString())
    })
    
    it("8. concurrency rules allow overlap up to capacity", () => {
      const dateStr = "2026-10-15"
      
      // One booking from 09:00 to 09:30
      const blocks: Block[] = [{
        type: "BOOKING",
        startTime: timeStringToDate(dateStr, "09:00", tz),
        endTime: timeStringToDate(dateStr, "09:30", tz)
      }]
      
      const cfg: AvailabilityConfig = {
        ...baseConfig,
        employeeWorkingHours: [{ startTime: "09:00", endTime: "10:00" }],
        blocks
      }
      
      // If capacity is 1, 09:00-09:30 is blocked.
      const slotsCap1 = computeDayAvailability(dateStr, cfg, 30, 0, 1)
      expect(slotsCap1).toHaveLength(1)
      expect(slotsCap1[0].toISOString()).toBe(timeStringToDate(dateStr, "09:30", tz).toISOString())
      
      // If capacity is 2, 09:00-09:30 is available!
      const slotsCap2 = computeDayAvailability(dateStr, cfg, 30, 0, 2)
      // Available starts: 09:00, 09:05, 09:10, 09:15, 09:20, 09:25, 09:30 => 7 slots
      expect(slotsCap2).toHaveLength(7)
    })
  })
})
