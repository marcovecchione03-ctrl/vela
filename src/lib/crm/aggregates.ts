/**
 * Customer CRM aggregates (pure).
 *
 * Inputs are BookingService snapshots, so historical values survive later
 * service/price edits. A combined offering is persisted as ONE BookingService
 * row (the parent service), so it is naturally counted once.
 */

export type AggregateBooking = {
  id: string
  status: string
  startTime: Date
  lateCancellation: boolean
  employeeId: string
  employeeName: string
  services: { serviceId: string; serviceName: string; price: number }[]
}

export type RankedItem = { id: string; name: string; count: number; lastAt: Date }

export type CustomerAggregates = {
  total: number
  completed: number
  cancelled: number
  lateCancelled: number
  noShows: number
  /** completed / (completed + cancelled + noShows); null when no finalized bookings. */
  completionRate: number | null
  lastAppointment: Date | null
  nextAppointment: Date | null
  preferredService: RankedItem | null
  preferredEmployee: RankedItem | null
  /** Sum of COMPLETED booking snapshot prices in minor units. NOT captured revenue. */
  theoreticalValueMinor: number
}

const UPCOMING_STATUSES = new Set(["PENDING", "CONFIRMED"])

/**
 * Deterministic ranking: count DESC, then most recent occurrence DESC, then id ASC.
 */
export function rankDeterministic(items: RankedItem[]): RankedItem[] {
  return [...items].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count
    const t = b.lastAt.getTime() - a.lastAt.getTime()
    if (t !== 0) return t
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}

function bump(map: Map<string, RankedItem>, id: string, name: string, at: Date) {
  const cur = map.get(id)
  if (!cur) {
    map.set(id, { id, name, count: 1, lastAt: at })
  } else {
    cur.count += 1
    if (at > cur.lastAt) {
      cur.lastAt = at
      cur.name = name // keep the most recent snapshot name
    }
  }
}

export function computeCustomerAggregates(bookings: AggregateBooking[], now: Date): CustomerAggregates {
  let completed = 0
  let cancelled = 0
  let lateCancelled = 0
  let noShows = 0
  let theoreticalValueMinor = 0
  let lastAppointment: Date | null = null
  let nextAppointment: Date | null = null

  const services = new Map<string, RankedItem>()
  const employees = new Map<string, RankedItem>()

  for (const b of bookings) {
    if (b.status === "COMPLETED") {
      completed++
      // Count each selected offering once per booking.
      const seen = new Set<string>()
      for (const s of b.services) {
        theoreticalValueMinor += s.price || 0
        if (seen.has(s.serviceId)) continue
        seen.add(s.serviceId)
        bump(services, s.serviceId, s.serviceName, b.startTime)
      }
      bump(employees, b.employeeId, b.employeeName, b.startTime)

      if (b.startTime <= now && (!lastAppointment || b.startTime > lastAppointment)) {
        lastAppointment = b.startTime
      }
    } else if (b.status === "CANCELLED") {
      cancelled++
      if (b.lateCancellation) lateCancelled++
    } else if (b.status === "NO_SHOW") {
      noShows++
    }

    if (UPCOMING_STATUSES.has(b.status) && b.startTime > now) {
      if (!nextAppointment || b.startTime < nextAppointment) nextAppointment = b.startTime
    }
  }

  const finalized = completed + cancelled + noShows

  return {
    total: bookings.length,
    completed,
    cancelled,
    lateCancelled,
    noShows,
    completionRate: finalized > 0 ? completed / finalized : null,
    lastAppointment,
    nextAppointment,
    preferredService: rankDeterministic([...services.values()])[0] ?? null,
    preferredEmployee: rankDeterministic([...employees.values()])[0] ?? null,
    theoreticalValueMinor,
  }
}

export function employeeDisplayName(e: { name: string; surname?: string | null }): string {
  return [e.name, e.surname].filter(Boolean).join(" ")
}
