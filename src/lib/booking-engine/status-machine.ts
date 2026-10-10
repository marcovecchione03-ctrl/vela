import { BookingStatus, Role } from "@prisma/client"

export type TransitionMap = {
  [currentStatus in BookingStatus]?: BookingStatus[]
}

const customerTransitions: TransitionMap = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["CANCELLED"]
}

const employeeTransitions: TransitionMap = {
  PENDING: ["CONFIRMED", "CANCELLED"], // Can approve/reject if they have permission, but baseline allows it
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"]
}

// Owners and Admins have full access to standard operational flow
const adminTransitions: TransitionMap = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW", "PENDING"], // Can move back to pending if needed
  ARRIVED: ["IN_PROGRESS", "CANCELLED", "CONFIRMED"],
  IN_PROGRESS: ["COMPLETED", "ARRIVED"],
  COMPLETED: [], // Final state
  CANCELLED: [], // Final state
  NO_SHOW: [] // Final state
}

/**
 * Validates if a requested status transition is allowed for a given role.
 */
export function isValidTransition(
  currentStatus: BookingStatus,
  newStatus: BookingStatus,
  role: Role | "SYSTEM" // SYSTEM can bypass
): boolean {
  if (currentStatus === newStatus) return true
  if (role === "SYSTEM") return true

  let allowed: BookingStatus[] = []

  switch (role) {
    case "CUSTOMER":
      allowed = customerTransitions[currentStatus] || []
      break
    case "EMPLOYEE":
      allowed = employeeTransitions[currentStatus] || []
      break
    case "ADMIN":
    case "OWNER":
      allowed = adminTransitions[currentStatus] || []
      break
  }

  return allowed.includes(newStatus)
}

export const statusColors: Record<BookingStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  ARRIVED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  IN_PROGRESS: "bg-purple-100 text-purple-800 border-purple-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
  NO_SHOW: "bg-gray-100 text-gray-800 border-gray-200"
}

export const statusLabels: Record<BookingStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show"
}
