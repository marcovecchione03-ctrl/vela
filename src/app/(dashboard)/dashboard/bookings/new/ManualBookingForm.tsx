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
        if (!customerId) throw new Error("Please select a registered customer")
        payload.customerId = customerId
      } else {
        if (!otcFirstName || !otcLastName) throw new Error("Please provide customer first and last name")
        payload.oneTimeClient = {
          firstName: otcFirstName,
          lastName: otcLastName,
          email: otcEmail || undefined,
          phone: otcPhone || undefined
        }
      }

      const res = await createManualBooking(tenantId, userId, payload)
      if (res?.id) {
        router.push(`/dashboard/bookings/${res.id}`)
      } else {
        router.push(`/dashboard/bookings`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to create booking")
      setSubmitLoading(false)
    }
  }

  const selectedService = services.find(s => s.id === serviceId)
  const isSearchDisabled = !dateStr || searchLoading

  return (
    <div style={themeStyles} className="w-full space-y-6">
      {/* Dynamic Error Banner with Refractive Styling */}
      {error && (
        <div 
          role="alert" 
          className="p-4 rounded-2xl bg-red-50/90 border border-red-200/80 text-red-700 text-sm font-medium flex items-center gap-3 shadow-[0_4px_16px_rgba(239,68,68,0.08),inset_0_1px_1px_rgba(255,255,255,0.6)] backdrop-blur-md"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Spatial Asymmetric Floating Glass Sheets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* =========================================================================
            LEFT PANEL: 1. Booking Details (Floating Glass Sheet)
        ========================================================================== */}
        <section aria-labelledby={`${formPrefix}-booking-details-title`} className="lg:col-span-5">
          <GlassPanel 
            variant="panel" 
            highlight={true} 
            className="p-6 sm:p-7 md:p-8 space-y-6 bg-vela-surface/75 border border-white/60 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.85)]"
          >
            {/* Panel Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--vela-glass-border-muted)]">
              <div 
                className="w-8 h-8 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/30"
                style={{ backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" }}
              >
                1
              </div>
              <div className="min-w-0">
                <h2 id={`${formPrefix}-booking-details-title`} className="text-base font-bold text-vela-foreground tracking-tight">
                  Booking Details
                </h2>
                <p className="text-xs text-vela-muted-foreground font-normal">
                  Select location, service, staff, and date
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Location Field */}
              <div className="space-y-2">
                <label 
                  htmlFor={`${formPrefix}-location`}
                  className="flex items-center gap-2 text-xs font-semibold text-vela-foreground"
                >
                  <MapPin className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Location</span>
                </label>
                {locations.length === 1 ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-vela-surface-subtle/50 backdrop-blur-md border border-vela-border/30 rounded-2xl text-vela-foreground font-medium text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02),inset_0_0_0_1px_rgba(255,255,255,0.6)]">
                    <span className="truncate">{locations[0]?.name}</span>
                    <span className="text-[11px] font-semibold text-vela-muted-foreground bg-white/70 px-2.5 py-0.5 rounded-full border border-white/60 shadow-2xs shrink-0">
                      Sole location
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id={`${formPrefix}-location`}
                      value={locationId}
                      onChange={e => setLocationId(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 border border-vela-border/40 rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 appearance-none transition-all cursor-pointer"
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
              <div className="space-y-2">
                <label 
                  htmlFor={`${formPrefix}-service`}
                  className="flex items-center gap-2 text-xs font-semibold text-vela-foreground"
                >
                  <Briefcase className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Service</span>
                </label>
                <div className="relative">
                  <select
                    id={`${formPrefix}-service`}
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    className="w-full h-12 pl-4 pr-10 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 appearance-none transition-all cursor-pointer"
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
                  <div className="flex items-center justify-between text-xs text-vela-muted-foreground pt-0.5 px-1 font-medium">
                    <span>Duration: {selectedService.durationMinutes} min</span>
                    <span className="font-semibold text-vela-foreground">€{(selectedService.price / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Staff Member Field */}
              <div className="space-y-2">
                <label 
                  htmlFor={`${formPrefix}-employee`}
                  className="flex items-center gap-2 text-xs font-semibold text-vela-foreground"
                >
                  <User className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Staff Member</span>
                </label>
                {role === "EMPLOYEE" ? (
                  <div className="flex items-center justify-between px-4 py-3 bg-white/60 backdrop-blur-md border border-[var(--vela-glass-border)] rounded-2xl text-vela-foreground font-medium text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.02),inset_0_0_0_1px_rgba(255,255,255,0.6)]">
                    <span className="truncate">
                      {employees.find(e => e.id === currentEmployeeId)?.name || "Current Staff"}
                    </span>
                    <span className="text-[11px] font-semibold text-vela-muted-foreground bg-white/70 px-2.5 py-0.5 rounded-full border border-white/60 shadow-2xs shrink-0">
                      Assigned to you
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      id={`${formPrefix}-employee`}
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 appearance-none transition-all cursor-pointer"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-vela-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Appointment Date Field */}
              <div className="space-y-2">
                <label 
                  htmlFor={`${formPrefix}-date`}
                  className="flex items-center gap-2 text-xs font-semibold text-vela-foreground"
                >
                  <Calendar className="w-3.5 h-3.5 text-vela-muted-foreground" />
                  <span>Appointment Date</span>
                </label>
                <input
                  id={`${formPrefix}-date`}
                  type="date"
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  className="w-full h-12 px-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all cursor-pointer"
                />
                <p className="text-[11px] text-vela-muted-foreground px-1 font-normal">
                  Pick a calendar date to check live availability slots.
                </p>
              </div>

              {/* Find Availability Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearchDisabled}
                  style={!isSearchDisabled ? { backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" } : undefined}
                  className={`w-full h-12 rounded-2xl font-bold text-xs tracking-tight transition-all flex items-center justify-center gap-2 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12),inset_0_1px_1.5px_rgba(255,255,255,0.35)] ${
                    isSearchDisabled 
                      ? "bg-vela-surface-subtle/60 text-vela-muted-foreground/60 border border-vela-border/40 cursor-not-allowed shadow-none" 
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
            RIGHT PANEL: 2. Time & Client (Floating Glass Sheet)
        ========================================================================== */}
        <section aria-labelledby={`${formPrefix}-time-client-title`} className="lg:col-span-7">
          <GlassPanel 
            variant="panel" 
            highlight={true} 
            className="p-6 sm:p-7 md:p-8 space-y-6 bg-vela-surface/75 border border-white/60 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.85)]"
          >
            {/* Panel Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[var(--vela-glass-border-muted)]">
              <div 
                className="w-8 h-8 rounded-2xl flex items-center justify-center font-bold text-xs shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.4)] border border-white/30"
                style={{ backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" }}
              >
                2
              </div>
              <div className="min-w-0">
                <h2 id={`${formPrefix}-time-client-title`} className="text-base font-bold text-vela-foreground tracking-tight">
                  Time & Client
                </h2>
                <p className="text-xs text-vela-muted-foreground font-normal">
                  Pick an available slot and enter client information
                </p>
              </div>
            </div>

            {/* Available Times Slot Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-vela-foreground flex items-center gap-2">
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
                <div className="p-8 bg-white/40 border border-white/50 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 backdrop-blur-md">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin text-vela-muted-foreground" />
                  <p className="text-xs font-medium text-vela-muted-foreground">
                    Scanning staff schedules and location rules...
                  </p>
                </div>
              ) : availableSlots.length === 0 ? (
                <GlassPanel variant="subtle" className="p-7 sm:p-8 bg-white/40 border border-white/50 rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center backdrop-blur-md">
                  <Clock className="w-8 h-8 text-vela-muted-foreground/70 mb-2" />
                  <p className="text-sm font-semibold text-vela-foreground tracking-tight">
                    {hasSearched ? "No open slots on this date" : "Select date and find availability"}
                  </p>
                  <p className="text-xs text-vela-muted-foreground max-w-sm mt-1 leading-relaxed">
                    {hasSearched 
                      ? "Try choosing a different date or another staff member to see open booking windows."
                      : "Choose your booking details on the left, then click 'Find Availability' to display open times."}
                  </p>
                </GlassPanel>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-56 overflow-y-auto p-2 border border-white/50 rounded-2xl bg-black/[0.02] backdrop-blur-md">
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
                        className={`group relative flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "shadow-[0_4px_16px_rgba(0,0,0,0.14),inset_0_1px_1.5px_rgba(255,255,255,0.4)] ring-2 ring-offset-1 ring-[var(--vela-focus)] scale-[1.02]"
                            : "bg-white/75 hover:bg-white/95 text-vela-foreground border-white/60 shadow-[0_2px_6px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.7)] hover:-translate-y-0.5"
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

            {/* Client Type Liquid Segmented Control */}
            <div className="pt-2 space-y-3">
              <label className="text-xs font-semibold text-vela-foreground block">
                Client Type
              </label>
              <div 
                role="tablist" 
                aria-label="Client Type"
                className="bg-black/[0.03] p-1.5 rounded-2xl flex gap-1.5 border border-white/50 backdrop-blur-md shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={clientType === "REGISTERED"}
                  onClick={() => setClientType("REGISTERED")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    clientType === "REGISTERED"
                      ? "bg-white/90 text-vela-foreground shadow-[0_3px_12px_rgba(0,0,0,0.07),inset_0_1px_1.5px_rgba(255,255,255,0.9)] border border-white/70"
                      : "text-vela-muted-foreground hover:text-vela-foreground hover:bg-white/30"
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
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    clientType === "ONETIME"
                      ? "bg-white/90 text-vela-foreground shadow-[0_3px_12px_rgba(0,0,0,0.07),inset_0_1px_1.5px_rgba(255,255,255,0.9)] border border-white/70"
                      : "text-vela-muted-foreground hover:text-vela-foreground hover:bg-white/30"
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
                    <Search className="w-4 h-4 text-vela-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search customers by name or phone..."
                      value={customerSearchQuery}
                      onChange={e => handleCustomerSearch(e.target.value)}
                      className="w-full h-12 pl-11 pr-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={customerId}
                      onChange={e => setCustomerId(e.target.value)}
                      className="w-full h-12 pl-4 pr-10 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 appearance-none transition-all cursor-pointer"
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
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-vela-foreground">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={otcFirstName}
                        onChange={e => setOtcFirstName(e.target.value)}
                        className="w-full h-12 px-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-vela-foreground">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={otcLastName}
                        onChange={e => setOtcLastName(e.target.value)}
                        className="w-full h-12 px-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-vela-foreground">
                        Email Address <span className="text-vela-muted-foreground/70 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={otcEmail}
                        onChange={e => setOtcEmail(e.target.value)}
                        className="w-full h-12 px-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-vela-foreground">
                        Phone Number <span className="text-vela-muted-foreground/70 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="+39 333 1234567"
                        value={otcPhone}
                        onChange={e => setOtcPhone(e.target.value)}
                        className="w-full h-12 px-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Staff Note */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-vela-foreground block">
                  Internal Staff Note <span className="text-vela-muted-foreground/70 font-normal">(Optional)</span>
                </label>
                <textarea
                  placeholder="Special requests, treatment notes, or instructions for the staff..."
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  rows={2}
                  className="w-full p-4 border border-[var(--vela-glass-border)] rounded-2xl bg-white/60 backdrop-blur-md text-sm font-medium text-vela-foreground placeholder:text-vela-muted-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.03),inset_0_0_0_1px_rgba(255,255,255,0.6)] focus:outline-none focus:ring-2 focus:ring-[var(--vela-focus)] focus:bg-white/85 transition-all resize-none"
                />
              </div>

              {/* Final Confirm Action CTA */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedSlot || submitLoading}
                  style={selectedSlot && !submitLoading ? { backgroundColor: "var(--vela-primary)", color: "var(--vela-primary-foreground)" } : undefined}
                  className={`w-full h-14 rounded-2xl font-bold text-sm tracking-tight transition-all flex items-center justify-center gap-2.5 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.18),0_4px_10px_-2px_rgba(0,0,0,0.08),inset_0_1px_2px_rgba(255,255,255,0.35)] ${
                    !selectedSlot || submitLoading
                      ? "bg-vela-surface-subtle/60 text-vela-muted-foreground border border-vela-border/40 cursor-not-allowed shadow-none"
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
                  <p className="text-center text-[11px] text-vela-muted-foreground font-medium mt-2.5">
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
