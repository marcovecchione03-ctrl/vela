"use client"

import { useState } from "react"
import { searchAvailability } from "@/actions/availability-search"
import { registerCustomer } from "@/actions/customer-auth"
import { createBookingTransaction } from "@/actions/booking"

export default function Wizard({ 
  tenantId, 
  locations, 
  services, 
  employees, 
  customerProfile,
  initialServiceIds,
  initialEmployeeId,
  initialLocationId
}: any) {
  const [step, setStep] = useState(initialServiceIds ? 4 : 1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // State
  const [locationId, setLocationId] = useState(initialLocationId || (locations.length === 1 ? locations[0].id : ""))
  const [serviceIds, setServiceIds] = useState<string[]>(initialServiceIds || [])
  const [employeeId, setEmployeeId] = useState(initialEmployeeId || "ANY")
  const [dateStr, setDateStr] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState("")
  const [alternatives, setAlternatives] = useState<string[]>([])
  
  const [bookingRef, setBookingRef] = useState("")

  async function handleSearch() {
    setLoading(true)
    setError("")
    try {
      const slots = await searchAvailability(tenantId, locationId, serviceIds, employeeId, dateStr)
      setAvailableSlots(slots)
      setStep(5)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!customerProfile) return

    setLoading(true)
    setError("")
    try {
      const booking = await createBookingTransaction({
        tenantId,
        locationId,
        serviceIds,
        employeeId,
        customerId: customerProfile.id,
        startTime: selectedSlot
      })

      if (!booking) throw new Error("Booking creation failed.")

      setBookingRef(booking.bookingReference)
      setStep(7)
      
    } catch (err: any) {
      if (err.message.startsWith('{')) {
        try {
          const parsed = JSON.parse(err.message)
          if (parsed.code === "SLOT_UNAVAILABLE") {
            setError(parsed.message)
            setAlternatives(parsed.alternatives || [])
            return
          }
        } catch(e) {}
      }
      setError(err.message)
      setAlternatives([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-bold">Select Location</h3>
          <select 
            value={locationId} 
            onChange={e => setLocationId(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">-- Choose Location --</option>
            {locations.map((loc: any) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <button 
            disabled={!locationId} 
            onClick={() => setStep(2)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-bold">Select Services</h3>
          {services.map((svc: any) => (
            <div key={svc.id} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                checked={serviceIds.includes(svc.id)}
                onChange={e => {
                  if (e.target.checked) setServiceIds([...serviceIds, svc.id])
                  else setServiceIds(serviceIds.filter(id => id !== svc.id))
                }}
              />
              <label>
                {svc.name} - {svc.durationMinutes} min - {svc.priceMode === 'STARTING_FROM' ? 'From ' : ''}€{(svc.price/100).toFixed(2)}
              </label>
            </div>
          ))}
          <button 
            disabled={serviceIds.length === 0} 
            onClick={() => setStep(3)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-bold">Select Staff</h3>
          <select 
            value={employeeId} 
            onChange={e => setEmployeeId(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="ANY">Anyone available</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.name} {emp.surname}</option>
            ))}
          </select>
          <button 
            onClick={() => setStep(4)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Next
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h3 className="font-bold">Select Date</h3>
          <input 
            type="date" 
            value={dateStr}
            onChange={e => setDateStr(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <button 
            disabled={!dateStr || loading}
            onClick={handleSearch}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            {loading ? "Searching..." : "Find Availability"}
          </button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <h3 className="font-bold">Select Time</h3>
          {availableSlots.length === 0 ? (
            <p className="text-red-500">No availability on this date. Please go back.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-2 border rounded ${selectedSlot === slot ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}
                >
                  {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
          )}
          <button 
            disabled={!selectedSlot} 
            onClick={() => setStep(6)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded mt-4"
          >
            Next
          </button>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-4">
          <h3 className="font-bold">Confirm Booking</h3>
          
          {!customerProfile ? (
            <div className="p-4 bg-gray-50 border rounded text-center space-y-4">
              <p>You must be logged in to confirm your booking.</p>
              <div className="flex justify-center space-x-4">
                <a 
                  href={`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded inline-block"
                >
                  Log In
                </a>
                <a 
                  href={`/auth/signup?callbackUrl=${encodeURIComponent(window.location.href)}`}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded inline-block"
                >
                  Sign Up
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border rounded">
                <p><strong>Name:</strong> {customerProfile.firstName} {customerProfile.lastName}</p>
                <p><strong>Phone:</strong> {customerProfile.phone || "N/A"}</p>
                <p className="text-sm text-gray-500 mt-2">Booking as authenticated customer.</p>
              </div>

              {customerProfile.isBlocked && (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
                  <p className="font-bold">Online booking unavailable</p>
                  <p className="text-sm mt-1">Your account is currently blocked from online booking. Please contact the business for assistance.</p>
                </div>
              )}

              {alternatives.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mt-4">
                  <p className="font-bold text-yellow-800 mb-2">Nearest Alternatives:</p>
                  <div className="flex flex-col gap-2">
                    {alternatives.map((alt) => (
                      <button
                        key={alt}
                        onClick={() => {
                          setSelectedSlot(alt)
                          setAlternatives([])
                          setError("")
                        }}
                        className="bg-white border border-yellow-300 text-yellow-800 px-3 py-2 rounded text-left hover:bg-yellow-100"
                      >
                        {new Date(alt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                disabled={loading || customerProfile.isBlocked}
                onClick={handleConfirm}
                className="bg-primary text-primary-foreground px-4 py-2 rounded mt-4 w-full disabled:opacity-50"
              >
                {loading ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 7 && (
        <div className="space-y-4 text-center">
          <h3 className="text-2xl font-bold text-green-600">Booking Confirmed!</h3>
          <p>Your booking reference is <strong>{bookingRef}</strong></p>
          <a href={`/${tenantId}/appointments`} className="text-primary hover:underline block mt-4">View My Appointments</a>
        </div>
      )}

      {step > 1 && step < 7 && (
        <button onClick={() => setStep(step - 1)} className="text-sm text-gray-500 hover:underline block mt-4">
          Go Back
        </button>
      )}
    </div>
  )
}
