"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cancelAppointment } from "@/actions/appointments"

export default function CancelAppointmentButton({ 
  tenantId, 
  userId, 
  bookingId,
  isLateCancellation 
}: { 
  tenantId: string
  userId: string
  bookingId: string
  isLateCancellation: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleCancel = async () => {
    setLoading(true)
    try {
      await cancelAppointment(tenantId, userId, bookingId)
      router.refresh()
      setIsOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 transition"
      >
        Cancel Appointment
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold mb-2">Cancel Appointment</h3>
        
        {isLateCancellation ? (
          <div className="p-4 mb-4 bg-orange-50 border border-orange-200 text-orange-800 rounded">
            <strong>Warning: Late Cancellation</strong>
            <p className="text-sm mt-1">
              You are cancelling past the allowed deadline. Late cancellations may limit your ability to make future bookings.
            </p>
          </div>
        ) : (
          <p className="text-gray-600 mb-4">Are you sure you want to cancel this appointment?</p>
        )}

        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Go Back
          </button>
          <button 
            onClick={handleCancel}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center min-w-[100px]"
            disabled={loading}
          >
            {loading ? "Cancelling..." : "Confirm Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}
