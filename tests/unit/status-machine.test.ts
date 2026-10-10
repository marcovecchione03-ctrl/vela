import { describe, it, expect } from "vitest"
import { isValidTransition } from "../../src/lib/booking-engine/status-machine"

describe("Phase 6: Status Machine Rules", () => {
  it("Customer valid transitions", () => {
    expect(isValidTransition("PENDING", "CANCELLED", "CUSTOMER")).toBe(true)
    expect(isValidTransition("CONFIRMED", "CANCELLED", "CUSTOMER")).toBe(true)
  })

  it("Customer invalid transitions", () => {
    expect(isValidTransition("PENDING", "CONFIRMED", "CUSTOMER")).toBe(false)
    expect(isValidTransition("CONFIRMED", "ARRIVED", "CUSTOMER")).toBe(false)
    expect(isValidTransition("ARRIVED", "IN_PROGRESS", "CUSTOMER")).toBe(false)
    expect(isValidTransition("IN_PROGRESS", "COMPLETED", "CUSTOMER")).toBe(false)
    expect(isValidTransition("CANCELLED", "PENDING", "CUSTOMER")).toBe(false)
    expect(isValidTransition("COMPLETED", "PENDING", "CUSTOMER")).toBe(false)
  })

  it("Employee valid transitions", () => {
    expect(isValidTransition("PENDING", "CONFIRMED", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("PENDING", "CANCELLED", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("CONFIRMED", "ARRIVED", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("CONFIRMED", "CANCELLED", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("CONFIRMED", "NO_SHOW", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("ARRIVED", "IN_PROGRESS", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("ARRIVED", "CANCELLED", "EMPLOYEE")).toBe(true)
    expect(isValidTransition("IN_PROGRESS", "COMPLETED", "EMPLOYEE")).toBe(true)
  })

  it("Employee invalid transitions", () => {
    expect(isValidTransition("PENDING", "ARRIVED", "EMPLOYEE")).toBe(false)
    expect(isValidTransition("CONFIRMED", "IN_PROGRESS", "EMPLOYEE")).toBe(false)
    expect(isValidTransition("ARRIVED", "COMPLETED", "EMPLOYEE")).toBe(false)
    expect(isValidTransition("IN_PROGRESS", "CANCELLED", "EMPLOYEE")).toBe(false)
  })

  it("Admin valid transitions", () => {
    expect(isValidTransition("PENDING", "CONFIRMED", "ADMIN")).toBe(true)
    expect(isValidTransition("PENDING", "CANCELLED", "ADMIN")).toBe(true)
    expect(isValidTransition("CONFIRMED", "ARRIVED", "ADMIN")).toBe(true)
    expect(isValidTransition("CONFIRMED", "CANCELLED", "ADMIN")).toBe(true)
    expect(isValidTransition("CONFIRMED", "NO_SHOW", "ADMIN")).toBe(true)
    expect(isValidTransition("CONFIRMED", "PENDING", "ADMIN")).toBe(true)
    expect(isValidTransition("ARRIVED", "IN_PROGRESS", "ADMIN")).toBe(true)
    expect(isValidTransition("ARRIVED", "CANCELLED", "ADMIN")).toBe(true)
    expect(isValidTransition("ARRIVED", "CONFIRMED", "ADMIN")).toBe(true)
    expect(isValidTransition("IN_PROGRESS", "COMPLETED", "ADMIN")).toBe(true)
    expect(isValidTransition("IN_PROGRESS", "ARRIVED", "ADMIN")).toBe(true)
  })

  it("Final states cannot transition to active states", () => {
    // COMPLETED
    expect(isValidTransition("COMPLETED", "IN_PROGRESS", "ADMIN")).toBe(false)
    expect(isValidTransition("COMPLETED", "IN_PROGRESS", "EMPLOYEE")).toBe(false)
    expect(isValidTransition("COMPLETED", "CONFIRMED", "ADMIN")).toBe(false)
    
    // CANCELLED
    expect(isValidTransition("CANCELLED", "CONFIRMED", "ADMIN")).toBe(false)
    expect(isValidTransition("CANCELLED", "CONFIRMED", "EMPLOYEE")).toBe(false)
    expect(isValidTransition("CANCELLED", "PENDING", "ADMIN")).toBe(false)

    // NO_SHOW
    expect(isValidTransition("NO_SHOW", "COMPLETED", "ADMIN")).toBe(false)
    expect(isValidTransition("NO_SHOW", "COMPLETED", "EMPLOYEE")).toBe(false)
    expect(isValidTransition("NO_SHOW", "PENDING", "ADMIN")).toBe(false)
  })

  it("System role can bypass rules", () => {
    expect(isValidTransition("COMPLETED", "PENDING", "SYSTEM")).toBe(true)
    expect(isValidTransition("CANCELLED", "CONFIRMED", "SYSTEM")).toBe(true)
  })
})
