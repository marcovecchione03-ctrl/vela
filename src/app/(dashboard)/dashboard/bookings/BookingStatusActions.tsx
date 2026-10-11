"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BookingStatus, Role } from "@prisma/client"
import { isValidTransition } from "@/lib/booking-engine/status-machine"
import { updateAppointmentStatus } from "@/actions/appointments"

export default function BookingStatusActions({
  tenantId,
  userId,
  bookingId,
  currentStatus,
  role,
  compact = false
}: {
  tenantId: string
  userId: string
  bookingId: string
  currentStatus: BookingStatus
  role: Role
  compact?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: BookingStatus) => {
    setLoading(true)
    try {
      await updateAppointmentStatus(tenantId, userId, bookingId, newStatus)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const canConfirm = isValidTransition(currentStatus, "CONFIRMED", role)
  const canCancel = isValidTransition(currentStatus, "CANCELLED", role)
  const canArrive = isValidTransition(currentStatus, "ARRIVED", role)
  const canInProgress = isValidTransition(currentStatus, "IN_PROGRESS", role)
  const canComplete = isValidTransition(currentStatus, "COMPLETED", role)
  const canNoShow = isValidTransition(currentStatus, "NO_SHOW", role)

  if (compact) {
    return (
      <div className="flex gap-2">
        {canConfirm && (
          <button 
            disabled={loading}
            onClick={() => handleStatusChange("CONFIRMED")}
            className="px-3 py-1 bg-green-600 text-white rounded font-medium text-xs hover:bg-green-700 disabled:opacity-50"
          >
            Confirm
          </button>
        )}
        {canCancel && (
          <button 
            disabled={loading}
            onClick={() => handleStatusChange("CANCELLED")}
            className="px-3 py-1 bg-red-600 text-white rounded font-medium text-xs hover:bg-red-700 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canConfirm && (
        <button disabled={loading} onClick={() => handleStatusChange("CONFIRMED")} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          Mark Confirmed
        </button>
      )}
      {canArrive && (
        <button disabled={loading} onClick={() => handleStatusChange("ARRIVED")} className="px-4 py-2 bg-yellow-600 text-white rounded text-sm font-medium hover:bg-yellow-700 disabled:opacity-50">
          Mark Arrived
        </button>
      )}
      {canInProgress && (
        <button disabled={loading} onClick={() => handleStatusChange("IN_PROGRESS")} className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          Start Service
        </button>
      )}
      {canComplete && (
        <button disabled={loading} onClick={() => handleStatusChange("COMPLETED")} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          Mark Completed
        </button>
      )}
      {canNoShow && (
        <button disabled={loading} onClick={() => handleStatusChange("NO_SHOW")} className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
          No-Show
        </button>
      )}
      {canCancel && (
        <button disabled={loading} onClick={() => handleStatusChange("CANCELLED")} className="px-4 py-2 border border-red-600 text-red-600 rounded text-sm font-medium hover:bg-red-50 disabled:opacity-50">
          Cancel Booking
        </button>
      )}
    </div>
  )
}
