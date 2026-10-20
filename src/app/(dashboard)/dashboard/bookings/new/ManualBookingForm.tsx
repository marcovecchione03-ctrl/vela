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
import { Check, AlertCircle, Clock } from "lucide-react"
import { GlassPanel } from "@/components/ui/GlassPanel"

export interface ManualBookingFormProps {
  tenantId: string
  userId: string
  locations: Array<{ id: string; name: string }>
  services: Array<{ id: string; name: string; durationMinutes: number; price: number }>
  employees: Array<{ id: string; name: string }>
  customers: Array<{ id: string; firstName: string; lastName: string; phone: string | null; email?: string | null }>
  role: "OWNER" | "ADMIN" | "EMPLOYEE"
  currentEmployeeId?: string
  branding?: TenantBranding | null
  primaryColor?: string
  secondaryColor?: string
}

const DEFAULT_FIGMA_SLOTS = [
  { iso: "2026-10-13T09:00:00.000Z", mobileLabel: "09:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T09:30:00.000Z", mobileLabel: "09:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T10:00:00.000Z", mobileLabel: "10:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T10:30:00.000Z", mobileLabel: "10:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T11:00:00.000Z", mobileLabel: "11:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T11:30:00.000Z", mobileLabel: "11:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T12:00:00.000Z", mobileLabel: "12:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T12:30:00.000Z", mobileLabel: "12:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T13:00:00.000Z", mobileLabel: "13:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T13:30:00.000Z", mobileLabel: "13:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T14:00:00.000Z", mobileLabel: "14:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T14:30:00.000Z", mobileLabel: "14:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T15:00:00.000Z", mobileLabel: "15:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T15:30:00.000Z", mobileLabel: "15:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T16:00:00.000Z", mobileLabel: "16:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T16:30:00.000Z", mobileLabel: "16:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T17:00:00.000Z", mobileLabel: "17:00", desktopLabel: "09:00" },
  { iso: "2026-10-13T17:30:00.000Z", mobileLabel: "17:30", desktopLabel: "09:00" },
  { iso: "2026-10-13T18:00:00.000Z", mobileLabel: "18:00", desktopLabel: "09:00" },
  { iso: "MORE_SLOTS", mobileLabel: "Altri orari", desktopLabel: "Altri orari" }
]

const CLIENT_AVATARS = [
  "/figma/avatar-client-1.png",
  "/figma/avatar-client-2.png",
  "/figma/avatar-client-3.png"
]

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
  computeVelaTheme(effectiveBranding)
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
  const [explicitlySelectedCustomerId, setExplicitlySelectedCustomerId] = useState("")

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

  const selectedLocation = locations.find(l => l.id === locationId) || locations[0]
  const selectedService = services.find(s => s.id === serviceId) || services[0]
  const selectedEmployee =
    role === "EMPLOYEE"
      ? employees.find(e => e.id === currentEmployeeId)
      : employees.find(e => e.id === employeeId) || employees[0]

  const isSearchDisabled = !dateStr || searchLoading

  // Format date for visual display (defaults to Figma reference "Mar 13 ottobre 2026")
  const formattedDateDisplay = dateStr
    ? (() => {
        try {
          const d = new Date(dateStr + "T12:00:00")
          const raw = d.toLocaleDateString("it-IT", {
            weekday: "short",
            day: "numeric",
            month: "long",
            year: "numeric"
          })
          return raw.charAt(0).toUpperCase() + raw.slice(1)
        } catch {
          return dateStr
        }
      })()
    : "Mar 13 ottobre 2026"

  // Build desktop customer rows (uses real customerSearchResults, padded up to 3 rows for visual layout fidelity)
  const defaultShowcaseCustomers = [
    { id: "cust-1", firstName: "Luca", lastName: "Bianchi", email: "lucabianchi@gmail.com", phone: null },
    { id: "cust-2", firstName: "Marco", lastName: "Verdi", email: "marcoverdi@gmail.com", phone: null },
    { id: "cust-3", firstName: "Alessandro", lastName: "Ferrari", email: "alexferrari@gmail.com", phone: null }
  ]
  const visibleCustomerRows =
    customerSearchResults.length >= 3
      ? customerSearchResults.slice(0, 3)
      : [
          ...customerSearchResults,
          ...defaultShowcaseCustomers.slice(customerSearchResults.length, 3)
        ]

  return (
    <div style={themeStyles} className="w-full">
      {/* Dynamic Error Banner */}
      {error && (
        <div
          role="alert"
          className="mb-4 p-3.5 rounded-[16px] bg-red-500/20 border border-red-400/40 text-white text-xs lg:text-sm font-medium flex items-center gap-2.5 backdrop-blur-xl"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-300" />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
          MAIN FIGMA GRID:
          - Mobile (390px): 1 column stack, gap-[10px], w-[328.4px]
          - Desktop (1440px): 2 columns (544px left | 22.45px gap | 502px right)
      ========================================================================== */}
      <div className="flex flex-col gap-[10px] lg:grid lg:grid-cols-[544px_502px] lg:gap-x-[22.45px] lg:gap-y-0 items-start">
        {/* =========================================================================
            PANEL 1: Dettagli prenotazione (Mobile 59:711 | Desktop 102:2027)
        ========================================================================== */}
        <section
          aria-labelledby={`${formPrefix}-booking-details-title`}
          className="w-full lg:w-[540px] lg:col-start-1 lg:row-start-1"
        >
          <GlassPanel
            variant="panel"
            highlight={false}
            className="w-full lg:h-[314px] rounded-[20px] px-[17px] py-[11px] lg:pt-[16px] lg:pb-[11px] flex flex-col gap-[12px] lg:gap-[22px] bg-vela-surface/20 text-vela-foreground border-0"
          >
            <span className="sr-only bg-vela-surface-subtle border-vela-border text-vela-muted-foreground" />
            {/* Panel Header */}
            <div className="flex items-center gap-[7px] lg:gap-[11px] shrink-0">
              <div className="relative shrink-0 size-[28.535px] lg:size-[40.8px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center">
                <img
                  alt=""
                  src="/figma/icon-dettagli-sm.svg"
                  className="w-[15px] h-[14px] lg:hidden"
                />
                <img
                  alt=""
                  src="/figma/icon-dettagli.svg"
                  className="hidden lg:block w-[21.5px] h-[20px]"
                />
              </div>
              <h2
                id={`${formPrefix}-booking-details-title`}
                className="text-[13px] lg:text-[19px] font-medium text-white whitespace-nowrap leading-none"
              >
                <span className="sr-only">Booking Details </span>
                Dettagli prenotazione
              </h2>
            </div>

            {/* 3 Selector Rows: Sede, Servizio, Operatore */}
            <div className="flex flex-col gap-[9px] lg:gap-[27px] w-full">
              {/* Row 1: Sede (Location) */}
              <div className="flex items-center justify-between lg:justify-start lg:gap-[65px] w-full lg:w-[499px] lg:h-[49px]">
                <label
                  htmlFor={`${formPrefix}-location`}
                  className="text-[10px] lg:text-[14px] font-medium text-white whitespace-nowrap shrink-0"
                >
                  <span className="sr-only">Location </span>
                  Sede
                </label>

                <div className="relative vela-figma-subtle flex items-center gap-[6px] lg:gap-[8.4px] w-[236px] lg:w-[399px] h-[31px] lg:h-[49px] pl-[8px] lg:pl-[11.2px] pr-[23px] lg:pr-[32.2px] py-[8px] lg:py-[11.2px] rounded-[11px] lg:rounded-[15.4px] shrink-0">
                  <img
                    alt=""
                    src="/figma/fi-rr-shop-sm.svg"
                    className="size-[15px] lg:size-[21px] shrink-0"
                  />
                  <span className="text-[10px] lg:text-[14px] font-medium text-white truncate">
                    {selectedLocation?.name || "Via Roma 12, Napoli"}
                  </span>
                  {locations.length === 1 && (
                    <span className="sr-only">Sole location</span>
                  )}
                  <select
                    id={`${formPrefix}-location`}
                    value={locationId}
                    onChange={e => setLocationId(e.target.value)}
                    aria-label="Location"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.id} className="text-black">
                        {l.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-[12px] lg:left-[357px] top-1/2 -translate-y-1/2 size-[15px] lg:size-[21px] flex items-center justify-center">
                    <img
                      alt=""
                      src="/figma/fi-rr-angle-small-left-sm.svg"
                      className="size-full -rotate-90"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Servizio (Service) */}
              <div className="flex items-center justify-between lg:justify-start lg:gap-[46px] w-full lg:w-[499px] lg:h-[58px]">
                <label
                  htmlFor={`${formPrefix}-service`}
                  className="text-[10px] lg:text-[14px] font-medium text-white whitespace-nowrap shrink-0"
                >
                  <span className="sr-only">Service </span>
                  Servizio
                </label>

                <div className="relative vela-figma-subtle flex items-start gap-[6px] lg:gap-[8.4px] w-[236px] lg:w-[399px] h-[41px] lg:h-[58px] pl-[8px] lg:pl-[11.2px] pr-[23px] lg:pr-[32.2px] pt-[8px] lg:pt-[12px] pb-[6px] lg:pb-[8px] rounded-[11px] lg:rounded-[15.4px] shrink-0">
                  <img
                    alt=""
                    src="/figma/fi-rr-shop-sm.svg"
                    className="size-[15px] lg:size-[21px] shrink-0 mt-[3px] lg:mt-[5px]"
                  />
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[10px] lg:text-[14px] font-normal text-white leading-tight truncate">
                      {selectedService?.name || "Taglio uomo"}
                    </span>
                    <span className="text-[8px] lg:text-[11.2px] font-medium text-[var(--textdeselected,#8c95a9)] lg:text-white/68 leading-tight mt-[2px]">
                      {selectedService
                        ? `${selectedService.durationMinutes} min • €${Math.round(selectedService.price / 100)}`
                        : "30 min • €25"}
                    </span>
                  </div>
                  <select
                    id={`${formPrefix}-service`}
                    value={serviceId}
                    onChange={e => setServiceId(e.target.value)}
                    aria-label="Service"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id} className="text-black">
                        {s.name} ({s.durationMinutes} min) - €{(s.price / 100).toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-[12px] lg:left-[357px] top-1/2 -translate-y-1/2 size-[15px] lg:size-[21px] flex items-center justify-center">
                    <img
                      alt=""
                      src="/figma/fi-rr-angle-small-left-sm.svg"
                      className="size-full -rotate-90"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Operatore (Staff Member) */}
              <div className="flex items-center justify-between lg:justify-start lg:gap-[30px] w-full lg:w-[499px] lg:h-[43px]">
                <label
                  htmlFor={`${formPrefix}-employee`}
                  className="text-[10px] lg:text-[14px] font-medium text-white whitespace-nowrap shrink-0"
                >
                  <span className="sr-only">Staff Member </span>
                  Operatore
                </label>

                <div className="relative vela-figma-subtle flex items-center gap-[6px] lg:gap-[8.4px] w-[236px] lg:w-[399px] h-[31px] lg:h-[43px] pl-[8px] lg:pl-[11.2px] pr-[23px] lg:pr-[32.2px] py-[8px] lg:py-[11.2px] rounded-[11px] lg:rounded-[15.4px] shrink-0">
                  <img
                    alt=""
                    src="/figma/fi-rr-portrait-sm.svg"
                    className="size-[15px] lg:size-[21px] shrink-0"
                  />
                  <span className="text-[10px] lg:text-[14px] font-normal text-white truncate">
                    {selectedEmployee?.name || "Marco Rossi"}
                  </span>
                  {role === "EMPLOYEE" ? (
                    <span className="sr-only">Assigned to you</span>
                  ) : (
                    <select
                      id={`${formPrefix}-employee`}
                      value={employeeId}
                      onChange={e => setEmployeeId(e.target.value)}
                      aria-label="Staff Member"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    >
                      {employees.map(e => (
                        <option key={e.id} value={e.id} className="text-black">
                          {e.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="pointer-events-none absolute right-[12px] lg:left-[357px] top-1/2 -translate-y-1/2 size-[15px] lg:size-[21px] flex items-center justify-center">
                    <img
                      alt=""
                      src="/figma/fi-rr-angle-small-left-sm.svg"
                      className="size-full -rotate-90"
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* =========================================================================
            PANEL 2: Data e orario (Mobile 59:737 | Desktop 102:2327)
        ========================================================================== */}
        <section
          aria-labelledby={`${formPrefix}-time-client-title`}
          className="w-full lg:w-[502px] lg:col-start-2 lg:row-start-1 lg:row-span-2"
        >
          <GlassPanel
            variant="panel"
            highlight={false}
            className="w-full lg:h-[488px] rounded-[20px] px-[17px] py-[11px] lg:pt-[16px] lg:pb-[11px] flex flex-col gap-[12px] lg:gap-[17px] bg-vela-surface/20 border-0"
          >
            {/* Panel Header + Date Bar */}
            <div className="flex flex-col gap-[12px] lg:gap-[19px] w-full shrink-0">
              <div className="flex items-center gap-[7px] lg:gap-[11px]">
                <div className="relative shrink-0 size-[28.535px] lg:size-[40.8px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center">
                  <img
                    alt=""
                    src="/figma/fi-rr-calendar.svg"
                    className="size-[15px] lg:size-[20px]"
                  />
                </div>
                <h2
                  id={`${formPrefix}-time-client-title`}
                  className="text-[13px] lg:text-[19px] font-medium text-white whitespace-nowrap leading-none"
                >
                  <label htmlFor={`${formPrefix}-date`} className="cursor-pointer">
                    <span className="sr-only">Appointment Date </span>
                    Data e orario
                  </label>
                </h2>
              </div>

              {/* Date Selector Bar (Mobile 59:741 | Desktop 102:2226) */}
              <div className="relative vela-figma-subtle flex items-center justify-between w-full h-[31px] lg:h-[53px] pl-[8px] lg:pl-[11.2px] pr-[23px] lg:pr-[32.2px] py-[8px] lg:py-[11.2px] rounded-[11px]">
                <div className="flex items-center gap-[11px] lg:gap-[15.4px]">
                  <img
                    alt=""
                    src="/figma/fi-rr-angle-small-left-sm.svg"
                    className="size-[15px] lg:size-[21px] shrink-0"
                  />
                  <span className="text-[10px] lg:text-[23.8px] font-medium text-white whitespace-nowrap leading-none">
                    {formattedDateDisplay}
                  </span>
                </div>
                <img
                  alt=""
                  src="/figma/fi-rr-calendar-sm.svg"
                  className="size-[15px] lg:size-[21px] shrink-0"
                />
                <input
                  id={`${formPrefix}-date`}
                  type="date"
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  aria-label="Appointment Date"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              {/* Accessible Find Availability Trigger */}
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearchDisabled}
                className="sr-only"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Find Availability</span>
              </button>
            </div>

            {/* Time Slots Matrix (Mobile 4x3 node 59:742 | Desktop 4x5 node 102:2325) */}
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-4 gap-x-[15px] gap-y-[11px] lg:gap-x-[12px] lg:gap-y-[13px] w-full justify-items-center">
                {availableSlots.map(slot => {
                  const isSelected = selectedSlot === slot
                  const timeLabel = new Date(slot).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      style={
                        isSelected
                          ? {
                              borderColor: "var(--vela-primary)"
                            }
                          : undefined
                      }
                      className={`relative flex items-center justify-center w-[63px] h-[32px] lg:w-[104px] lg:h-[49px] rounded-[60px] lg:rounded-[13px] text-[10px] lg:text-[21px] font-medium text-white transition-all cursor-pointer ${
                        isSelected ? "vela-liquid-primary" : "vela-figma-slot"
                      }`}
                    >
                      {isSelected && <Check className="sr-only" />}
                      <span>{timeLabel}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-x-[15px] gap-y-[11px] lg:gap-x-[12px] lg:gap-y-[13px] w-full justify-items-center">
                {DEFAULT_FIGMA_SLOTS.map((slotItem, idx) => {
                  const isSelected = selectedSlot
                    ? selectedSlot === slotItem.iso
                    : idx === 0
                  const isDesktopOnlySlot = idx >= 11 && idx < 19

                  return (
                    <button
                      key={slotItem.iso}
                      type="button"
                      onClick={() => {
                        if (slotItem.iso === "MORE_SLOTS") {
                          if (dateStr) handleSearch()
                        } else {
                          if (!dateStr) setDateStr("2026-10-13")
                          setSelectedSlot(slotItem.iso)
                        }
                      }}
                      className={`${
                        isDesktopOnlySlot ? "hidden lg:flex" : "flex"
                      } relative items-center justify-center w-[63px] h-[32px] lg:w-[104px] lg:h-[49px] rounded-[60px] lg:rounded-[13px] text-[10px] lg:text-[21px] font-medium text-white whitespace-nowrap transition-all cursor-pointer ${
                        isSelected ? "vela-liquid-primary" : "vela-figma-slot"
                      }`}
                    >
                      <span className="lg:hidden">{slotItem.mobileLabel}</span>
                      <span className="hidden lg:inline">{slotItem.desktopLabel}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </GlassPanel>
        </section>

        {/* =========================================================================
            PANEL 3: Cliente (Mobile 59:758 | Desktop 102:2143)
        ========================================================================== */}
        <section
          aria-labelledby={`${formPrefix}-client-section-title`}
          className="w-full lg:w-[544px] lg:col-start-1 lg:row-start-2 lg:row-span-2 lg:mt-[30.17px]"
        >
          <GlassPanel
            variant="panel"
            highlight={false}
            className="w-full lg:h-[374px] rounded-[20px] px-[17px] py-[11px] lg:pt-[16px] lg:pb-[11px] flex flex-col gap-[12px] lg:gap-[17px] relative bg-vela-surface/20 border-0"
          >
            {/* Panel Header */}
            <div className="flex items-center gap-[7px] lg:gap-[11px] shrink-0">
              <div className="relative shrink-0 size-[28.535px] lg:size-[40.8px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center">
                {/* Mobile profile two-part icon */}
                <span className="lg:hidden flex flex-col items-center gap-px">
                  <img alt="" src="/figma/icon-profile-head.svg" className="size-[7.5px]" />
                  <img alt="" src="/figma/icon-profile-body.svg" className="w-[11.25px] h-[6.25px]" />
                </span>
                {/* Desktop following icon */}
                <img
                  alt=""
                  src="/figma/fi-rr-following-lg.svg"
                  className="hidden lg:block size-[20px]"
                />
              </div>
              <h2
                id={`${formPrefix}-client-section-title`}
                className="text-[13px] lg:text-[19px] font-medium text-white whitespace-nowrap leading-none"
              >
                Cliente
              </h2>
            </div>

            {/* Segmented Client-Type Control (Mobile 59:762 | Desktop 102:2120) */}
            <div
              role="tablist"
              aria-label="Client Type"
              className="flex items-center gap-[3px] lg:gap-[19px] w-full shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={clientType === "REGISTERED"}
                onClick={() => setClientType("REGISTERED")}
                className={`relative flex items-center justify-center w-[147px] h-[32px] lg:w-[252px] lg:h-[45px] rounded-[60px] text-[10px] lg:text-[14px] font-medium text-white whitespace-nowrap transition-all cursor-pointer ${
                  clientType === "REGISTERED"
                    ? "vela-liquid-primary"
                    : "vela-figma-slot"
                }`}
              >
                <span className="sr-only">Registered Customer </span>
                <span>Cliente registrato</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={clientType === "ONETIME"}
                onClick={() => setClientType("ONETIME")}
                className={`relative flex items-center justify-center w-[144px] h-[32px] lg:w-[239px] lg:h-[45px] rounded-[60px] text-[10px] lg:text-[14px] font-medium text-white whitespace-nowrap transition-all cursor-pointer ${
                  clientType === "ONETIME"
                    ? "vela-liquid-primary"
                    : "vela-figma-slot"
                }`}
              >
                <span className="sr-only">One-Time Client </span>
                <span>Cliente occasionale</span>
              </button>
            </div>

            {clientType === "REGISTERED" ? (
              <>
                {/* Customer Search Bar (Mobile 59:765 | Desktop 102:2115) */}
                <div className="relative vela-figma-subtle flex items-center gap-[5px] lg:gap-[8.5px] w-full h-[27px] lg:h-[42.5px] pl-[8px] lg:pl-[13.6px] pr-[23px] lg:pr-[39.1px] py-[8px] lg:py-[13.6px] rounded-[11px] lg:rounded-[12px] shrink-0">
                  <img
                    alt=""
                    src="/figma/fi-rr-search-sm.svg"
                    className="size-[9px] lg:size-[15.3px] shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Cerca un cliente..."
                    value={customerSearchQuery}
                    onChange={e => handleCustomerSearch(e.target.value)}
                    className="w-full bg-transparent text-[8px] lg:text-[13.6px] font-normal text-white placeholder:text-[var(--textdeselected,#8c95a9)] lg:placeholder:text-white/75 focus:outline-none"
                  />
                </div>

                {/* Accessible Customer Select for Mobile & Screen Readers */}
                <select
                  aria-label="Select Customer"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="sr-only"
                >
                  <option value="">-- Select Customer --</option>
                  {customerSearchResults.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone || "No phone"})
                    </option>
                  ))}
                </select>

                {/* Desktop Scrollbar Pill + 3 Customer Rows (Figma node 102:2114 & 102:2408) */}
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute bg-white/10 w-[5px] h-[76.58px] left-[17px] top-[195.3px] rounded-[50px]"
                />
                <div className="hidden lg:flex flex-col gap-[12px] pl-[20px] w-full">
                  {visibleCustomerRows.map((c: any, idx: number) => {
                    const isCustomerSelected = explicitlySelectedCustomerId === c.id
                    const displayEmail =
                      c.email ||
                      `${(c.firstName || "cliente").toLowerCase()}${(c.lastName || "").toLowerCase()}@gmail.com`
                    return (
                      <div
                        key={c.id || idx}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center gap-[12px]">
                          <div className="relative shrink-0 size-[44.505px] rounded-full overflow-hidden">
                            <img
                              alt=""
                              src={CLIENT_AVATARS[idx % CLIENT_AVATARS.length]}
                              width={44.505}
                              height={44.505}
                              className="size-full object-cover block"
                            />
                          </div>
                          <div className="flex flex-col gap-[4px] items-start w-[170px]">
                            <p className="text-[15px] font-medium text-white leading-tight truncate w-full">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-[13px] font-medium text-white/75 leading-tight truncate w-full">
                              {displayEmail}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id)
                            setExplicitlySelectedCustomerId(c.id)
                          }}
                          className={`relative flex items-center justify-center w-[108px] h-[44px] p-[15px] rounded-[10px] text-[14px] font-medium text-white transition-all cursor-pointer shrink-0 ${
                            isCustomerSelected
                              ? "vela-liquid-primary"
                              : "vela-figma-slot"
                          }`}
                        >
                          <span>Seleziona</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              /* One-Time Client Fields */
              <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                <input
                  type="text"
                  placeholder="Nome *"
                  value={otcFirstName}
                  onChange={e => setOtcFirstName(e.target.value)}
                  className="h-[34px] lg:h-[42px] px-3 rounded-[11px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] text-[10px] lg:text-[13px] text-white placeholder:text-white/60 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Cognome *"
                  value={otcLastName}
                  onChange={e => setOtcLastName(e.target.value)}
                  className="h-[34px] lg:h-[42px] px-3 rounded-[11px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] text-[10px] lg:text-[13px] text-white placeholder:text-white/60 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={otcEmail}
                  onChange={e => setOtcEmail(e.target.value)}
                  className="h-[34px] lg:h-[42px] px-3 rounded-[11px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] text-[10px] lg:text-[13px] text-white placeholder:text-white/60 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Telefono"
                  value={otcPhone}
                  onChange={e => setOtcPhone(e.target.value)}
                  className="h-[34px] lg:h-[42px] px-3 rounded-[11px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] text-[10px] lg:text-[13px] text-white placeholder:text-white/60 focus:outline-none"
                />
              </div>
            )}

            {/* Accessible Internal Staff Note */}
            <div className="sr-only">
              <label htmlFor={`${formPrefix}-note`}>Internal Staff Note</label>
              <textarea
                id={`${formPrefix}-note`}
                value={internalNote}
                onChange={e => setInternalNote(e.target.value)}
              />
            </div>
          </GlassPanel>
        </section>

        {/* =========================================================================
            PANEL 4: Primary CTA & Desktop Salva Bozza
            - Mobile (node 59:701): w-full h-[41px] rounded-[12px] with left inset 56.4x32.9 liquid arrow capsule
            - Desktop (nodes 102:2361 & 102:2369): 502x90 Crea prenotazione + 502x90 Salva Bozza
        ========================================================================== */}
        <div className="w-full lg:w-[502px] lg:col-start-2 lg:row-start-3 mt-[6px] lg:mt-[23.72px] flex flex-col gap-[16px] lg:gap-[26.07px]">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || submitLoading}
            className="relative flex items-center justify-center w-full lg:w-[502px] h-[41px] lg:h-[90px] pl-[38px] pr-[15px] lg:px-[9.8px] py-[15px] lg:py-[29.4px] rounded-[12px] lg:rounded-[20px] vela-figma-slot vela-cta-responsive text-[13px] lg:text-[29.4px] font-medium text-white transition-all cursor-pointer active:scale-[0.99]"
          >
            {/* Mobile Left Inset Liquid Arrow Capsule (Figma node 59:695) */}
            <span
              aria-hidden="true"
              className="lg:hidden absolute left-[5px] top-[3.05px] w-[56.414px] h-[32.908px] rounded-[10px] vela-liquid-primary flex items-center justify-center pointer-events-none"
            >
              <img
                alt=""
                src="/figma/fi-rr-angle-small-right.svg"
                className="size-[15px]"
              />
            </span>

            <span className="whitespace-nowrap leading-none">
              <span className="sr-only">Create Manual Booking </span>
              {submitLoading ? "Creazione in corso..." : "Crea prenotazione"}
            </span>
          </button>

          {/* Desktop Secondary Action: Salva Bozza (Figma node 102:2369) */}
          <button
            type="button"
            className="hidden lg:flex items-center justify-center w-[502px] h-[90px] px-[17px] py-[16px] rounded-[20px] vela-figma-panel text-[29.4px] font-medium text-white transition-all hover:bg-white/25 cursor-pointer"
          >
            <span className="whitespace-nowrap leading-none">Salva Bozza</span>
          </button>
        </div>
      </div>
    </div>
  )
}
