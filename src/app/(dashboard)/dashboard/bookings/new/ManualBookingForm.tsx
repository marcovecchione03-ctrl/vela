"use client"

import { useState, useId } from "react"
import { useRouter } from "next/navigation"
import { searchAvailability } from "@/actions/availability-search"
import { createManualBooking } from "@/actions/appointments"
import { searchCustomers } from "@/actions/customer-search"
import { 
  computeVelaTheme, 
  getVelaThemeStyles, 
  TenantBranding 
} from "@/lib/theme"
import { 
  MapPin, 
  Briefcase, 
  User, 
  Calendar, 
  Clock, 
  Users, 
  Search, 
  Check, 
  AlertCircle, 
  ChevronDown 
} from "lucide-react"
import { GlassPanel } from "@/components/ui/GlassPanel"

export interface ManualBookingFormProps {
  tenantId: string
  userId: string
  locations: Array<{ id: string; name: string }>
  services: Array<{ id: string; name: string; durationMinutes: number; price: number }>
  employees: Array<{ id: string; name: string }>
  customers: Array<{ id: string; firstName: string; lastName: string; phone: string | null }>
  role: "OWNER" | "ADMIN" | "EMPLOYEE"
  currentEmployeeId?: string
  branding?: TenantBranding | null
  primaryColor?: string
  secondaryColor?: string
}

export default function ManualBookingForm({
  tenantId,
  userId,
  locations = [],
  services = [],
  employees = [],
  customers = [],
  role,
  currentEmployeeId,
  branding,
  primaryColor,
  secondaryColor
}: ManualBookingFormProps) {
  const router = useRouter()
  const formPrefix = useId()

  // Resolve complete 4-color tenant branding
  const effectiveBranding: TenantBranding = branding || {
    primaryColor: primaryColor || "#171717",
    secondaryColor: secondaryColor || "#737373"
  }
  const themeTokens = computeVelaTheme(effectiveBranding)
  const themeStyles = getVelaThemeStyles(effectiveBranding)

  const [locationId, setLocationId] = useState(locations[0]?.id || "")
  const [serviceId, setServiceId] = useState(services[0]?.id || "")
  const [employeeId, setEmployeeId] = useState(
    role === "EMPLOYEE" ? (currentEmployeeId || "") : (employees[0]?.id || "")
  )
  const [dateStr, setDateStr] = useState("")

  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  const [clientType, setClientType] = useState<"REGISTERED" | "ONETIME">("REGISTERED")
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState(customers || [])
  const [customerId, setCustomerId] = useState(customers[0]?.id || "")

  const [otcFirstName, setOtcFirstName] = useState("")
  const [otcLastName, setOtcLastName] = useState("")
  const [otcEmail, setOtcEmail] = useState("")
  const [otcPhone, setOtcPhone] = useState("")
  const [internalNote, setInternalNote] = useState("")

  const [searchLoading, setSearchLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCustomerSearch = async (query: string) => {
    setCustomerSearchQuery(query)
    if (query.length >= 2) {
      try {
        const results = await searchCustomers(tenantId, query)
        setCustomerSearchResults(results)
      } catch {
        setCustomerSearchResults(customers)
      }
    } else {
      setCustomerSearchResults(customers)
    }
  }

  const handleSearch = async () => {
    if (!dateStr || !serviceId || !locationId || !employeeId) return
    setSearchLoading(true)
    setError("")
    setAvailableSlots([])
    setSelectedSlot("")
    setHasSearched(true)
    try {
      const slots = await searchAvailability(tenantId, locationId, [serviceId], employeeId, dateStr)
      setAvailableSlots(slots)
    } catch (err: any) {
      setError(err.message || "Failed to search availability")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedSlot) return
    setSubmitLoading(true)
    setError("")

    const svc = services.find(s => s.id === serviceId)
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
        if (!otcFirstName || !otcLastName) {
          throw new Error("First and Last name required for One-Time Client.")
        }
        payload.oneTimeClient = {
          firstName: otcFirstName,
          lastName: otcLastName,
          email: otcEmail || undefined,
          phone: otcPhone || undefined
        }
      }

      const res = await createManualBooking(tenantId, userId, payload)
      router.push(`/dashboard/bookings/${res.id}`)
    } catch (err: any) {
      setError(err.message || "Failed to create booking")
    } finally {
      setSubmitLoading(false)
    }
  }

  const selectedService = services.find(s => s.id === serviceId)
  const isSearchDisabled = searchLoading || !dateStr || !serviceId || !locationId || !employeeId

  return (
    <div 
      className="space-y-6"
      style={themeStyles}
    >
      {error && (
        <div 
          role="alert" 
          className="p-4 rounded-xl bg-red-50/90 border border-red-200/80 text-red-700 text-sm font-medium flex items-center gap-3 shadow-xs"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* =========================================================================
            LEFT PANEL: 1. Service & Schedule
        ========================================================================== */}
        <section aria-labelledby={`${formPrefix}-booking-details-title`} className="lg:col-span-5">
          <GlassPanel className="p-6 md:p-7 space-y-6 bg-vela-surface/80 border border-vela-border shadow-[var(--vela-shadow-soft)]">
            <div className="flex items-center gap-3 pb-4 border-b border-vela-border-muted">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" }}
              >
                1
              </div>
              <div>
                <h2 id={`${formPrefix}-booking-details-title`} className="text-base font-bold text-vela-foreground tracking-tight">
                  Booking Details
                </h2>
                <p className="text-xs text-vela-muted-foreground">
                  Select location, service, staff, and date
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Location Field */}
              <div className="space-y-1.5">
                <label 
                  htmlFor={`${formPrefix}-location`}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Location</span>
                </label>
                {locations.length === 1 ? (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-vela-surface-subtle border border-vela-border rounded-xl text-vela-foreground font-medium text-sm">
                    <span className="truncate">{locations[0]?.name}</span>
                    <span className="text-[11px] font-semibold text-vela-muted-foreground bg-vela-surface px-2 py-0.5 rounded-full border border-vela-border-muted shrink-0">
                      Sole location
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id={`${formPrefix}-location`}
                      value={locationId}
                      onChange={e => setLocationId(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] appearance-none transition-shadow"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-vela-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Service Field */}
              <div className="space-y-1.5">
                <label 
                  htmlFor={`${formPrefix}-service`}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground"
                >
                  <Briefcase className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Service</span>
                </label>
                <div className="relative">
                  <select
                    id={`${formPrefix}-service`}
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    className="w-full h-11 pl-3.5 pr-10 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] appearance-none transition-shadow"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} min) - €{(s.price / 100).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-vela-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {selectedService && (
                  <div className="flex items-center justify-between text-xs text-vela-muted-foreground pt-0.5 px-1">
                    <span>Duration: {selectedService.durationMinutes} min</span>
                    <span className="font-semibold text-vela-foreground">€{(selectedService.price / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Employee Field */}
              <div className="space-y-1.5">
                <label 
                  htmlFor={`${formPrefix}-employee`}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground"
                >
                  <User className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Staff Member</span>
                </label>
                {role === "EMPLOYEE" ? (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-vela-surface-subtle border border-vela-border rounded-xl text-vela-foreground font-medium text-sm">
                    <span className="truncate">
                      {employees.find(e => e.id === currentEmployeeId)?.name || "Current Staff"}
                    </span>
                    <span className="text-[11px] font-semibold text-vela-muted-foreground bg-vela-surface px-2 py-0.5 rounded-full border border-vela-border-muted shrink-0">
                      Assigned to you
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id={`${formPrefix}-employee`}
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] appearance-none transition-shadow"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-vela-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Date Field */}
              <div className="space-y-1.5">
                <label 
                  htmlFor={`${formPrefix}-date`}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground"
                >
                  <Calendar className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Appointment Date</span>
                </label>
                <input
                  id={`${formPrefix}-date`}
                  type="date"
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  className="w-full h-11 px-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow"
                />
                <p className="text-[11px] text-vela-muted-foreground px-1">
                  Pick a calendar date to check live availability slots.
                </p>
              </div>

              {/* Find Availability Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearchDisabled}
                  style={!isSearchDisabled ? { backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" } : undefined}
                  className={`w-full h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs ${
                    isSearchDisabled 
                      ? "bg-vela-surface-subtle text-vela-muted-foreground border border-vela-border cursor-not-allowed" 
                      : "hover:opacity-95 active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  {searchLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Checking Availability...</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      <span>Find Availability</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* =========================================================================
            RIGHT PANEL: 2. Time & Client
        ========================================================================== */}
        <section aria-labelledby={`${formPrefix}-time-client-title`} className="lg:col-span-7">
          <GlassPanel className="p-6 md:p-7 space-y-6 bg-vela-surface/80 border border-vela-border shadow-[var(--vela-shadow-soft)]">
            <div className="flex items-center gap-3 pb-4 border-b border-vela-border-muted">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" }}
              >
                2
              </div>
              <div>
                <h2 id={`${formPrefix}-time-client-title`} className="text-base font-bold text-vela-foreground tracking-tight">
                  Time & Client
                </h2>
                <p className="text-xs text-vela-muted-foreground">
                  Pick an available slot and enter client information
                </p>
              </div>
            </div>

            {/* Available Times Slot Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Available Times</span>
                </label>
                {availableSlots.length > 0 && (
                  <span className="text-xs font-semibold text-vela-muted-foreground">
                    {availableSlots.length} {availableSlots.length === 1 ? "slot" : "slots"} found
                  </span>
                )}
              </div>

              {searchLoading ? (
                <div className="p-8 bg-vela-surface-subtle border border-vela-border-muted rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin text-vela-muted-foreground" />
                  <p className="text-xs font-medium text-vela-muted-foreground">
                    Scanning staff schedules and location rules...
                  </p>
                </div>
              ) : availableSlots.length === 0 ? (
                <GlassPanel variant="subtle" className="p-7 bg-vela-surface-subtle/80 border border-dashed border-vela-border rounded-2xl text-center flex flex-col items-center justify-center">
                  <Clock className="w-7 h-7 text-vela-muted-foreground mb-2" />
                  <p className="text-sm font-semibold text-vela-foreground">
                    {hasSearched ? "No open slots on this date" : "Select date and find availability"}
                  </p>
                  <p className="text-xs text-vela-muted-foreground max-w-sm mt-1">
                    {hasSearched 
                      ? "Try choosing a different date or another staff member to see open booking windows."
                      : "Choose your booking details on the left, then click 'Find Availability' to display open times."}
                  </p>
                </GlassPanel>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-52 overflow-y-auto p-1.5 border border-vela-border-muted rounded-2xl bg-vela-surface-subtle">
                  {availableSlots.map(slot => {
                    const isSelected = selectedSlot === slot
                    const timeLabel = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={isSelected ? { 
                          backgroundColor: "var(--vela-primary)", 
                          color: "var(--vela-primary-foreground)", 
                          borderColor: "var(--vela-primary)" 
                        } : undefined}
                        className={`flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? "ring-2 ring-offset-1 ring-[var(--vela-focus)] shadow-sm"
                            : "bg-vela-surface border-vela-border text-vela-foreground hover:border-vela-primary hover:bg-vela-surface-subtle"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        <span>{timeLabel}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Client Type Segmented Control */}
            <div className="pt-2 space-y-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground block">
                Client Type
              </label>
              <div 
                role="tablist" 
                aria-label="Client Type"
                className="bg-vela-surface-subtle p-1 rounded-xl flex gap-1 border border-vela-border-muted"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={clientType === "REGISTERED"}
                  onClick={() => setClientType("REGISTERED")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    clientType === "REGISTERED"
                      ? "bg-vela-surface text-vela-foreground shadow-xs"
                      : "text-vela-muted-foreground hover:text-vela-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Registered Customer</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={clientType === "ONETIME"}
                  onClick={() => setClientType("ONETIME")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    clientType === "ONETIME"
                      ? "bg-vela-surface text-vela-foreground shadow-xs"
                      : "text-vela-muted-foreground hover:text-vela-foreground"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>One-Time Client</span>
                </button>
              </div>

              {/* Client Form Fields */}
              {clientType === "REGISTERED" ? (
                <div className="space-y-3 pt-1">
                  <div className="relative">
                    <Search className="w-4 h-4 text-vela-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search customers by name or phone..."
                      value={customerSearchQuery}
                      onChange={e => handleCustomerSearch(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={customerId}
                      onChange={e => setCustomerId(e.target.value)}
                      className="w-full h-11 pl-3.5 pr-10 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] appearance-none transition-shadow"
                    >
                      <option value="">-- Select Customer --</option>
                      {customerSearchResults.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName} ({c.phone || "No phone"})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-vela-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[11px] text-vela-muted-foreground px-1">
                    Select an existing customer from your CRM or search above by keyword.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-vela-muted-foreground block">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        placeholder="e.g. Marco"
                        value={otcFirstName}
                        onChange={e => setOtcFirstName(e.target.value)}
                        className="w-full h-11 px-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-vela-muted-foreground block">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        placeholder="e.g. Bianchi"
                        value={otcLastName}
                        onChange={e => setOtcLastName(e.target.value)}
                        className="w-full h-11 px-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-vela-muted-foreground block">
                        Email <span className="text-vela-muted-foreground/70 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="marco@example.com"
                        value={otcEmail}
                        onChange={e => setOtcEmail(e.target.value)}
                        className="w-full h-11 px-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-vela-muted-foreground block">
                        Phone <span className="text-vela-muted-foreground/70 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+39 333 1234567"
                        value={otcPhone}
                        onChange={e => setOtcPhone(e.target.value)}
                        className="w-full h-11 px-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Note */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-vela-muted-foreground block">
                  Internal Staff Note <span className="text-vela-muted-foreground/70 font-normal normal-case">(Optional)</span>
                </label>
                <textarea
                  placeholder="Special requests, treatment notes, or instructions for the staff..."
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  rows={2}
                  className="w-full p-3.5 border border-vela-border rounded-xl bg-vela-surface text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] transition-shadow resize-none"
                />
              </div>

              {/* Final Confirm Action */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedSlot || submitLoading}
                  style={selectedSlot && !submitLoading ? { backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" } : undefined}
                  className={`w-full h-13 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs ${
                    !selectedSlot || submitLoading
                      ? "bg-vela-surface-subtle text-vela-muted-foreground border border-vela-border cursor-not-allowed"
                      : "hover:opacity-95 active:scale-[0.99] cursor-pointer"
                  }`}
                >
                  {submitLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Creating Manual Booking...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Create Manual Booking</span>
                    </>
                  )}
                </button>
                {!selectedSlot && (
                  <p className="text-center text-[11px] text-vela-muted-foreground font-medium mt-2">
                    Select an available time slot above to enable booking confirmation.
                  </p>
                )}
              </div>
            </div>
          </GlassPanel>
        </section>
      </div>
    </div>
  )
}
