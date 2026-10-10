"use server"

import { prisma } from "@/lib/db/prisma"
import { 
  computeDayAvailability,
  getEffectiveDuration,
  getEffectiveConcurrency,
  getEffectiveBuffer,
  timeStringToDate,
  Block
} from "@/lib/booking-engine/availability"

export async function searchAvailability(
  tenantId: string, 
  locationId: string, 
  serviceIds: string[], 
  employeeId: string, 
  dateStr: string // YYYY-MM-DD
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  if (!tenant || tenant.status !== "ACTIVE") throw new Error("Tenant invalid")
  
  const location = await prisma.location.findUnique({ where: { id: locationId } })
  if (!location || !location.isActive) throw new Error("Location invalid")
  const timezone = location.timezone || tenant.timezone
  
  const services = await prisma.service.findMany({ where: { id: { in: serviceIds }, isActive: true } })
  if (services.length !== serviceIds.length) throw new Error("Some services are invalid")
  
  const targetDate = new Date(`${dateStr}T00:00:00Z`)
  const dayOfWeek = targetDate.getUTCDay()
  
  // Service Weekday Filter
  for (const s of services) {
    if (!s.availableDays.includes(dayOfWeek)) {
      throw new Error(`Service ${s.name} is not available on this day.`)
    }
  }
  
  const effectiveDuration = getEffectiveDuration(services)
  const effectiveBuffer = getEffectiveBuffer(services, tenant.defaultBookingBufferMins)
  const effectiveCapacity = getEffectiveConcurrency(services)
  
  // Find Location Open Hours
  const locationRules = await prisma.availabilityRule.findMany({
    where: { tenantId, locationId, employeeId: null, dayOfWeek, isActive: true }
  })
  
  let locationOpenTime = undefined
  let locationCloseTime = undefined
  
  if (locationRules.length > 0) {
    // Assume one rule per day for location open hours for MVP
    locationOpenTime = locationRules[0].startTime
    locationCloseTime = locationRules[0].endTime
  }
  
  // Determine Employees
  let employeeIdsToSearch: string[] = []
  if (employeeId === "ANY") {
    // Any employee capable of ALL services
    let compatibleIds: string[] = []
    
    // Using simple approach: fetch all relationships for these services
    const empLists = await Promise.all(
      services.map(s => prisma.serviceEmployee.findMany({ where: { serviceId: s.id } }))
    )
    
    empLists.forEach((list, idx) => {
      const ids = list.map(e => e.employeeId)
      if (idx === 0) compatibleIds = ids
      else compatibleIds = compatibleIds.filter(id => ids.includes(id))
    })
    
    employeeIdsToSearch = compatibleIds
  } else {
    employeeIdsToSearch = [employeeId]
  }
  
  if (employeeIdsToSearch.length === 0) return []
  
  const allAvailableSlots = new Set<string>() // ISO strings to deduplicate
  
  for (const empId of employeeIdsToSearch) {
    const rules = await prisma.availabilityRule.findMany({
      where: { employeeId: empId, dayOfWeek, isActive: true }
    })
    
    const workingHours = rules.map(r => ({ startTime: r.startTime, endTime: r.endTime }))
    if (workingHours.length === 0) continue
    
    const blocks: Block[] = []
    
    // 1. Exceptions (Vacations/Closures)
    const exceptions = await prisma.availabilityException.findMany({
      where: {
        employeeId: empId,
        date: {
          gte: new Date(targetDate.setUTCHours(0,0,0,0)),
          lt: new Date(targetDate.setUTCHours(23,59,59,999))
        }
      }
    })
    for (const ex of exceptions) {
      if (ex.isClosed) {
        // Entire day is blocked, we simulate a 00:00 to 23:59 block
        const st = new Date(targetDate)
        st.setUTCHours(0,0,0,0)
        const ed = new Date(targetDate)
        ed.setUTCHours(23,59,59,999)
        blocks.push({ type: "EXCEPTION", startTime: st, endTime: ed })
      } else if (ex.startTime && ex.endTime) {
        blocks.push({ 
          type: "EXCEPTION", 
          startTime: timeStringToDate(dateStr, ex.startTime, timezone), 
          endTime: timeStringToDate(dateStr, ex.endTime, timezone) 
        })
      }
    }
    
    // Fetch timeBlocks
    const timeBlocks = await prisma.timeBlock.findMany({
      where: {
        employeeId: empId,
        endTime: { gt: new Date(targetDate.setUTCHours(0,0,0,0)) },
        startTime: { lt: new Date(targetDate.setUTCHours(23,59,59,999)) }
      }
    })
    timeBlocks.forEach(tb => blocks.push({ type: "TIME_BLOCK", startTime: tb.startTime, endTime: tb.endTime }))
    
    // Fetch bookings
    const bookings = await prisma.booking.findMany({
      where: {
        employeeId: empId,
        status: { in: ["PENDING", "CONFIRMED", "ARRIVED", "IN_PROGRESS"] },
        endTime: { gt: new Date(targetDate.setUTCHours(0,0,0,0)) },
        startTime: { lt: new Date(targetDate.setUTCHours(23,59,59,999)) }
      }
    })
    bookings.forEach(b => blocks.push({ type: "BOOKING", startTime: b.startTime, endTime: b.endTime }))
    
    const config = {
      timezone,
      locationOpenTime,
      locationCloseTime,
      employeeWorkingHours: workingHours,
      blocks,
      minNoticeMinutes: tenant.minBookingNoticeHours * 60,
      maxAdvanceDays: tenant.maxAdvanceBookingDays,
      slotStepMinutes: 5
    }
    
    const slotsForEmp = computeDayAvailability(dateStr, config, effectiveDuration, effectiveBuffer, effectiveCapacity)
    slotsForEmp.forEach(s => allAvailableSlots.add(s.toISOString()))
  }
  
  return Array.from(allAvailableSlots).sort()
}
