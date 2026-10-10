"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { searchAvailability } from "@/actions/availability-search"
import { rescheduleAppointment } from "@/actions/appointments"

export default function RescheduleForm({
  tenantId,
  userId,
  bookingId,
  locationId,
  serviceIds,
  employees,
  currentEmployeeId,
  currentStartTime
}: any) {
  const [employeeId, setEmployeeId] = useState(currentEmployeeId)
  const [dateStr, setDateStr] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState("")
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()

  const handleSearch = async () => {
    setLoading(true)
    setError("")
    setAvailableSlots([])
    setSelectedSlot("")
    try {
      const slots = await searchAvailability(tenantId, locationId, serviceIds, employeeId, dateStr)
      setAvailableSlots(slots)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedSlot) return
    setLoading(true)
    setError("")
    
    // Calculate new end time based on original duration. Since we don't have duration here easily, 
    // Wait, rescheduleAppointment needs newEndStr. I should adjust rescheduleAppointment to calculate newEnd automatically or pass it.
    // Actually, passing it is required. But I don't have duration here.
    // Let's modify rescheduleAppointment to only take newStartStr, and calculate newEnd automatically by finding the sum of service durations.
    // I will pass newStartStr and let the backend calculate newEndStr.
    
    try {
      await rescheduleAppointment(tenantId, userId, bookingId, selectedSlot, employeeId)
      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      if (err.message.startsWith('{')) {
        try {
          const parsed = JSON.parse(err.message)
          if (parsed.code === "SLOT_UNAVAILABLE") {
            setError("This slot is no longer available.")
          } else {
            setError(parsed.message || "An error occurred.")
          }
        } catch {
          setError(err.message)
        }
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">Appointment Rescheduled!</h2>
        <p className="text-gray-600 mb-6">Your appointment has been successfully updated.</p>
        <button 
          onClick={() => router.push("./")}
          className="px-6 py-2 bg-black text-white font-medium rounded hover:bg-gray-800"
        >
          View Appointment
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Staff</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setEmployeeId("ANY")}
            className={`p-3 border rounded text-left ${employeeId === "ANY" ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50' : 'hover:border-gray-400'}`}
          >
            <div className="font-medium">Anyone Available</div>
          </button>
          {employees.map((emp: any) => (
            <button
              key={emp.id}
              onClick={() => setEmployeeId(emp.id)}
              className={`p-3 border rounded text-left ${employeeId === emp.id ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50' : 'hover:border-gray-400'}`}
            >
              <div className="font-medium">{emp.name}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <input 
          type="date" 
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-600 outline-none"
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={!dateStr || loading}
        className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 transition"
      >
        {loading ? "Searching..." : "Search Availability"}
      </button>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded">
          {error}
        </div>
      )}

      {availableSlots.length > 0 && (
        <div className="pt-6 border-t mt-6">
          <h3 className="font-bold mb-4">Available Times</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {availableSlots.map(slot => {
              const d = new Date(slot)
              const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-2 border rounded text-center transition ${selectedSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-600 hover:text-blue-600'}`}
                >
                  {timeString}
                </button>
              )
            })}
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push("./")}
              className="flex-1 py-3 border rounded font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedSlot || loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Confirming..." : "Confirm Reschedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
