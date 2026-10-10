export function validateCustomRange(startStr: string, endStr: string): { startDate: Date, endDate: Date } {
  if (!startStr || !endStr) throw new Error("Missing custom range parameters")
  const startDate = new Date(startStr)
  const endDate = new Date(endStr)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error("Invalid date format")
  if (startDate > endDate) throw new Error("Start date must be before or equal to end date")
  
  const diffMonths = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  if (diffMonths > 24) throw new Error("Custom range cannot exceed 24 months")

  return { startDate, endDate }
}

export function classifyNewVsReturning(
  customerIds: string[], 
  earliestBookingMap: Record<string, Date>, 
  startDate: Date
): { newCustomers: number, returningCustomers: number } {
  let newCustomersCount = 0
  let returningCustomersCount = 0

  for (const cid of customerIds) {
    const firstBooking = earliestBookingMap[cid]
    if (firstBooking && firstBooking >= startDate) {
      newCustomersCount++
    } else {
      returningCustomersCount++
    }
  }

  return { newCustomers: newCustomersCount, returningCustomers: returningCustomersCount }
}
