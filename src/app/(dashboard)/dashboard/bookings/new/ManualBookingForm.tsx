"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { searchAvailability } from "@/actions/availability-search"
import { createManualBooking } from "@/actions/appointments"
import { searchCustomers } from "@/actions/customer-search"

export default function ManualBookingForm({
  tenantId,
  userId,
  locations,
  services,
  employees,
  customers,
  role,
  currentEmployeeId
}: any) {
  const [locationId, setLocationId] = useState(locations[0]?.id || "")
  const [serviceId, setServiceId] = useState(services[0]?.id || "")
  const [employeeId, setEmployeeId] = useState(role === "EMPLOYEE" ? currentEmployeeId : (employees[0]?.id || ""))
  const [dateStr, setDateStr] = useState("")
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState("")
  
  const [clientType, setClientType] = useState<"REGISTERED" | "ONETIME">("REGISTERED")
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState(customers || [])
  const [customerId, setCustomerId] = useState(customers[0]?.id || "")
  
  const handleCustomerSearch = async (query: string) => {
    setCustomerSearchQuery(query)
    if (query.length >= 2) {
      const results = await searchCustomers(tenantId, query)
      setCustomerSearchResults(results)
    } else {
      setCustomerSearchResults(customers) // fallback to initial
    }
  }
  const [otcFirstName, setOtcFirstName] = useState("")
  const [otcLastName, setOtcLastName] = useState("")
  const [otcEmail, setOtcEmail] = useState("")
  const [otcPhone, setOtcPhone] = useState("")
  const [internalNote, setInternalNote] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const router = useRouter()

  const handleSearch = async () => {
    if (!dateStr || !serviceId || !locationId || !employeeId) return
    setLoading(true)
    setError("")
    setAvailableSlots([])
    setSelectedSlot("")
    try {
      const slots = await searchAvailability(tenantId, locationId, [serviceId], employeeId, dateStr)
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
    
    // Find service duration to compute end time
    const svc = services.find((s: any) => s.id === serviceId)
    const start = new Date(selectedSlot)
    const end = new Date(start.getTime() + (svc?.durationMinutes || 0) * 60000)

    try {
      const payload: any = {
        locationId,
        serviceIds: [serviceId],
        employeeId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        internalNote
      }

      if (clientType === "REGISTERED") {
        if (!customerId) throw new Error("Please select a customer.")
        payload.customerId = customerId
      } else {
        if (!otcFirstName || !otcLastName) throw new Error("First and Last name required for One-Time Client.")
        payload.oneTimeClient = {
          firstName: otcFirstName,
          lastName: otcLastName,
          email: otcEmail,
          phone: otcPhone
        }
      }

      const res = await createManualBooking(tenantId, userId, payload)
      router.push(`./${res.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-red-50 text-red-600 rounded">{error}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Step 1: Booking Details */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">Booking Details</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <select value={locationId} onChange={e => setLocationId(e.target.value)} className="w-full p-2 border rounded" disabled={locations.length === 1}>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Service</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="w-full p-2 border rounded">
              {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}m)</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Employee</label>
            <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full p-2 border rounded" disabled={role === "EMPLOYEE"}>
              {role === "EMPLOYEE" 
                ? <option value={currentEmployeeId}>{employees.find((e: any) => e.id === currentEmployeeId)?.name}</option>
                : employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full p-2 border rounded" />
          </div>

          <button onClick={handleSearch} disabled={loading || !dateStr} className="w-full py-2 bg-black text-white rounded font-medium disabled:opacity-50 hover:bg-gray-800">
            {loading ? "Searching..." : "Find Availability"}
          </button>
        </div>

        {/* Step 2: Time and Client */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">Time & Client</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Available Times</label>
            {availableSlots.length === 0 ? (
              <div className="p-4 bg-gray-50 border rounded text-sm text-gray-500 text-center">Select date and search to see times.</div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded bg-gray-50">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 text-xs font-medium rounded border ${selectedSlot === slot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:border-blue-600'}`}
                  >
                    {new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4">
            <div className="flex gap-4 mb-4 border-b">
              <button 
                onClick={() => setClientType("REGISTERED")} 
                className={`pb-2 font-medium ${clientType === "REGISTERED" ? "border-b-2 border-black text-black" : "text-gray-500"}`}
              >
                Registered Customer
              </button>
              <button 
                onClick={() => setClientType("ONETIME")} 
                className={`pb-2 font-medium ${clientType === "ONETIME" ? "border-b-2 border-black text-black" : "text-gray-500"}`}
              >
                One-Time Client
              </button>
            </div>

            {clientType === "REGISTERED" ? (
              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="Search customers by name or phone..."
                  value={customerSearchQuery}
                  onChange={e => handleCustomerSearch(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                />
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded">
                  <option value="">-- Select Customer --</option>
                  {customerSearchResults.map((c: any) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone || "No phone"})</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="First Name *" value={otcFirstName} onChange={e => setOtcFirstName(e.target.value)} className="w-full p-2 border rounded text-sm" />
                  <input placeholder="Last Name *" value={otcLastName} onChange={e => setOtcLastName(e.target.value)} className="w-full p-2 border rounded text-sm" />
                </div>
                <input placeholder="Email (optional)" value={otcEmail} onChange={e => setOtcEmail(e.target.value)} className="w-full p-2 border rounded text-sm" type="email" />
                <input placeholder="Phone (optional)" value={otcPhone} onChange={e => setOtcPhone(e.target.value)} className="w-full p-2 border rounded text-sm" type="tel" />
              </div>
            )}
          </div>
          
          <div className="pt-2">
            <textarea 
              placeholder="Internal Note (Optional)" 
              value={internalNote} 
              onChange={e => setInternalNote(e.target.value)}
              className="w-full p-2 border rounded text-sm"
              rows={2}
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedSlot || loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg mt-4 disabled:opacity-50 hover:bg-blue-700 transition"
          >
            {loading ? "Creating Booking..." : "Create Manual Booking"}
          </button>
        </div>
      </div>
    </div>
  )
}
