import { BookingStatus, Prisma } from "@prisma/client"

export type BookingStatusGroup =
  | "ALL"
  | "ACTIVE"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"

export const BOOKING_STATUS_GROUPS: Record<
  Exclude<BookingStatusGroup, "ALL">,
  BookingStatus[]
> = {
  ACTIVE: ["PENDING", "ARRIVED", "IN_PROGRESS"],
  CONFIRMED: ["CONFIRMED"],
  COMPLETED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "NO_SHOW"]
}

export function resolveBookingStatusFilter(params: {
  statusGroup?: string
  status?: string
}): {
  activeGroup: BookingStatusGroup
  statuses: BookingStatus[] | null
  whereStatus: Prisma.EnumBookingStatusFilter | undefined
} {
  const raw = (params.statusGroup || params.status || "ALL").toUpperCase()

  switch (raw) {
    case "ACTIVE":
    case "PENDING":
    case "ARRIVED":
    case "IN_PROGRESS":
      return {
        activeGroup: "ACTIVE",
        statuses: BOOKING_STATUS_GROUPS.ACTIVE,
        whereStatus: { in: BOOKING_STATUS_GROUPS.ACTIVE }
      }
    case "CONFIRMED":
      return {
        activeGroup: "CONFIRMED",
        statuses: BOOKING_STATUS_GROUPS.CONFIRMED,
        whereStatus: { in: BOOKING_STATUS_GROUPS.CONFIRMED }
      }
    case "COMPLETED":
      return {
        activeGroup: "COMPLETED",
        statuses: BOOKING_STATUS_GROUPS.COMPLETED,
        whereStatus: { in: BOOKING_STATUS_GROUPS.COMPLETED }
      }
    case "CANCELLED":
    case "NO_SHOW":
      return {
        activeGroup: "CANCELLED",
        statuses: BOOKING_STATUS_GROUPS.CANCELLED,
        whereStatus: { in: BOOKING_STATUS_GROUPS.CANCELLED }
      }
    case "ALL":
    default:
      return {
        activeGroup: "ALL",
        statuses: null,
        whereStatus: undefined
      }
  }
}

export function buildBookingFilterHref(
  group: BookingStatusGroup,
  date?: string,
  page?: number
): string {
  const query = new URLSearchParams()
  if (group !== "ALL") {
    query.set("statusGroup", group)
  }
  if (date) {
    query.set("date", date)
  }
  if (page && page > 1) {
    query.set("page", String(page))
  }
  const qs = query.toString()
  return qs ? `/dashboard/bookings?${qs}` : "/dashboard/bookings"
}

const ITALIAN_WEEKDAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"]
const ITALIAN_MONTHS = [
  "GEN",
  "FEB",
  "MAR",
  "APR",
  "MAG",
  "GIU",
  "LUG",
  "AGO",
  "SET",
  "OTT",
  "NOV",
  "DIC"
]

export const CLIENT_AVATARS = [
  "/figma/avatar-client-1.png",
  "/figma/avatar-client-2.png",
  "/figma/avatar-client-3.png",
  "/figma/avatar-client-4.png",
  "/figma/avatar-client-5.png",
  "/figma/avatar-client-6.png",
  "/figma/avatar-client-7.png",
  "/figma/avatar-client-8.png",
  "/figma/avatar-client-9.png",
  "/figma/avatar-client-10.png"
]

export function formatBookingDateParts(dateInput: Date | string) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  const weekday = ITALIAN_WEEKDAYS[d.getDay()] || "Lun"
  const day = String(d.getDate()).padStart(2, "0")
  const month = ITALIAN_MONTHS[d.getMonth()] || "GEN"
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")

  return {
    shortDate: `${weekday} ${day} ${month}`,
    fullDate: `${weekday} ${day} ${month} ${year}`,
    time24: `${hours}:${minutes}`
  }
}

export function getBookingStatusVisual(status: BookingStatus | string): {
  label: string
  semanticState: "confirmed" | "active" | "completed" | "cancelled"
  capsuleClass: string
} {
  switch (status) {
    case "CONFIRMED":
      return {
        label: "Confermata",
        semanticState: "confirmed",
        capsuleClass: "vela-status-capsule vela-status-confirmed"
      }
    case "COMPLETED":
      return {
        label: "Completata",
        semanticState: "completed",
        capsuleClass: "vela-status-capsule vela-status-completed"
      }
    case "CANCELLED":
    case "NO_SHOW":
      return {
        label: "Annullata",
        semanticState: "cancelled",
        capsuleClass: "vela-status-capsule vela-status-cancelled"
      }
    case "PENDING":
    case "ARRIVED":
    case "IN_PROGRESS":
    default:
      return {
        label: "In corso",
        semanticState: "active",
        capsuleClass: "vela-status-capsule vela-status-active"
      }
  }
}

export function getClientAvatarSrc(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return CLIENT_AVATARS[hash % CLIENT_AVATARS.length]
}
