import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import { BookingStatus, Prisma } from "@prisma/client"
import BookingStatusActions from "./BookingStatusActions"
import BookingNotePill from "./BookingNotePill"
import { getDashboardTenant } from "@/lib/tenant/context"
import { VelaThemeScope } from "@/components/theme/VelaThemeScope"
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell"
import {
  BookingStatusGroup,
  buildBookingFilterHref,
  formatBookingDateParts,
  getBookingStatusVisual,
  getClientAvatarSrc,
  resolveBookingStatusFilter
} from "./booking-ui-helpers"

function BookingStatusCapsule({
  status,
  variant = "mobile"
}: {
  status: BookingStatus | string
  variant?: "mobile" | "desktop"
}) {
  const { label, semanticState, capsuleClass } = getBookingStatusVisual(status)
  return (
    <span
      data-testid="booking-status-capsule"
      data-booking-status={status}
      data-semantic-state={semanticState}
      className={`${capsuleClass} inline-flex items-center justify-center h-[32px] px-[5px] rounded-[60px] font-medium text-white text-center whitespace-nowrap shrink-0 ${
        variant === "desktop"
          ? "w-[82px] xl:w-[97px] text-[10px] xl:text-[11px]"
          : "w-[97px] text-[10px]"
      }`}
    >
      <span className="sr-only">Stato: </span>
      {label}
    </span>
  )
}

export default async function DashboardBookingsPage({
  searchParams
}: {
  searchParams: Promise<{
    statusGroup?: string
    status?: string
    date?: string
    page?: string
  }>
}) {
  const { statusGroup, status, date, page = "1" } = await searchParams
  const resolvedFilter = resolveBookingStatusFilter({ statusGroup, status })

  const tenant = await getDashboardTenant()
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=/dashboard/bookings`)

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    include: { employeeProfile: true }
  })

  if (!membership || !["OWNER", "ADMIN", "EMPLOYEE"].includes(membership.role)) {
    redirect(`/dashboard`)
  }

  const role = membership.role
  const employeeId = membership.employeeProfile?.id

  const whereClause: Prisma.BookingWhereInput = { tenantId: tenant.id }

  if (role === "EMPLOYEE" && employeeId) {
    whereClause.employeeId = employeeId
  }

  if (resolvedFilter.whereStatus) {
    whereClause.status = resolvedFilter.whereStatus
  }

  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23, 59, 59, 999)
    whereClause.startTime = { gte: startOfDay, lte: endOfDay }
  }

  const take = 15
  const currentPage = Math.max(1, parseInt(page) || 1)
  const skip = (currentPage - 1) * take

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: {
        services: true,
        employee: true,
        customer: true,
        oneTimeClient: true,
        location: true,
        notes: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { startTime: "asc" },
      skip,
      take
    }),
    prisma.booking.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(total / take)

  const filterItems: Array<{
    key: BookingStatusGroup
    href: string
    mobileLabel: string
    desktopLabel: string
    mobileWidth: string
    desktopWidth: string
    isActive: boolean
  }> = [
    {
      key: "ALL",
      href: buildBookingFilterHref("ALL", date),
      mobileLabel: "Tutte",
      desktopLabel: "Tutte",
      mobileWidth: "w-[72px]",
      desktopWidth: "w-[79px]",
      isActive: resolvedFilter.activeGroup === "ALL"
    },
    {
      key: "ACTIVE",
      href: buildBookingFilterHref("ACTIVE", date),
      mobileLabel: "In corso",
      desktopLabel: "In corso",
      mobileWidth: "w-[91px]",
      desktopWidth: "w-[91px]",
      isActive: resolvedFilter.activeGroup === "ACTIVE"
    },
    {
      key: "CONFIRMED",
      href: buildBookingFilterHref("CONFIRMED", date),
      mobileLabel: "Confermate",
      desktopLabel: "Confermato",
      mobileWidth: "w-[112px]",
      desktopWidth: "w-[109px]",
      isActive: resolvedFilter.activeGroup === "CONFIRMED"
    },
    {
      key: "COMPLETED",
      href: buildBookingFilterHref("COMPLETED", date),
      mobileLabel: "Completate",
      desktopLabel: "Completato",
      mobileWidth: "w-[101px]",
      desktopWidth: "w-[109px]",
      isActive: resolvedFilter.activeGroup === "COMPLETED"
    },
    {
      key: "CANCELLED",
      href: buildBookingFilterHref("CANCELLED", date),
      mobileLabel: "Cancellate",
      desktopLabel: "Cancellato",
      mobileWidth: "w-[105px]",
      desktopWidth: "w-[109px]",
      isActive: resolvedFilter.activeGroup === "CANCELLED"
    }
  ]

  return (
    <VelaThemeScope branding={tenant} className="w-full">
      <DashboardPageShell
        variant="full"
        className="pt-[13.45px] lg:pt-[65.62px] lg:pr-[35px] w-full max-w-none"
      >
        {/* Top Utility & Navigation Bar (Figma 111:429 Mobile & 114:1135 Desktop) */}
        <div className="flex items-center lg:items-start justify-between w-full relative">
          {/* Back Button (Mobile: 28.535px node 58:634 | Desktop: 40px node 114:1237 at top=78px) */}
          <Link
            href="/dashboard"
            className="relative size-[28.535px] lg:size-[40px] lg:mt-[12.38px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 flex items-center justify-center transition-all cursor-pointer shrink-0 after:content-[''] after:absolute after:-inset-2"
          >
            <img
              alt=""
              src="/figma/fi-rr-angle-small-left.svg"
              className="size-[15px] lg:size-[20px]"
            />
            <span className="sr-only">Torna alla dashboard</span>
          </Link>

          {/* Mobile Centered Tenant Name (Figma node 111:491) */}
          <span className="lg:hidden text-[13px] font-medium text-white text-center truncate max-w-[200px]">
            {tenant.name}
          </span>

          {/* Mobile Top-Right Settings Action (Figma node 59:676) */}
          <Link
            href="/dashboard/settings"
            aria-label="Impostazioni"
            className="lg:hidden relative size-[28.535px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 flex items-center justify-center transition-all cursor-pointer shrink-0 after:content-[''] after:absolute after:-inset-2"
          >
            <img
              alt=""
              src="/figma/fi-rr-settings.svg"
              className="size-[15px]"
            />
          </Link>

          {/* Desktop Top-Right Utility Bar: Search + Notification Bell + Profile Avatar (Figma nodes 114:1239, 102:2192, 114:1236) */}
          <div className="hidden lg:flex items-center gap-[12px]">
            <div className="vela-figma-subtle flex items-center gap-[8.5px] h-[42px] w-[202px] pl-[13.6px] pr-[16px] py-[13.6px] rounded-[12px]">
              <img
                alt=""
                src="/figma/fi-rr-search.svg"
                className="size-[15.3px] shrink-0"
              />
              <span className="text-[13.6px] font-normal text-white/75 whitespace-nowrap">
                Cerca...
              </span>
            </div>

            <button
              type="button"
              aria-label="Notifiche"
              className="relative size-[41px] rounded-full flex items-center justify-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <img
                alt=""
                src="/figma/notification-bell-unread.svg"
                className="size-full block"
              />
            </button>

            <div className="relative size-[41px] rounded-full overflow-hidden shrink-0">
              <img
                alt="Profilo"
                src="/figma/avatar-profile.png"
                width={41}
                height={41}
                className="size-full object-cover block"
              />
            </div>
          </div>
        </div>

        {/* Page Title & Subtitle (Mobile node 111:487 at top=72.45px | Desktop nodes 114:1201 & 114:1202 at top=141.21px) */}
        <div className="mt-[30.5px] lg:mt-[23.2px] flex flex-col gap-[6px] lg:gap-[4px] items-start">
          <h1 className="text-[20px] lg:text-[33px] font-medium lg:font-semibold text-white leading-none tracking-tight">
            Prenotazioni
          </h1>
          <p className="text-[10px] lg:text-[19px] font-normal text-[var(--textdeselected,#8c95a9)] lg:text-white/75 leading-none">
            Gestisci le prenotazioni del tuo salone
          </p>
        </div>

        {/* Mobile Primary "Nuova prenotazione" CTA (Figma node 114:812 at top=121px, h=50px) */}
        <div className="lg:hidden mt-[12.5px]">
          <Link
            href="/dashboard/bookings/new"
            data-testid="mobile-new-booking-cta"
            className="vela-liquid-primary-lg flex items-center justify-center gap-[19.6px] h-[50px] w-full px-[9.8px] py-[12px] rounded-[13px] text-[13px] font-medium text-white transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <img
              alt=""
              src="/figma/fi-rr-calendar-cta.svg"
              className="size-[15px] shrink-0"
            />
            <span>Nuova prenotazione</span>
          </Link>
        </div>

        {/* Mobile Status Filter Pills (Figma node 114:836 at top=185px) */}
        <nav
          aria-label="Filtra prenotazioni per stato (mobile)"
          data-testid="mobile-status-filters"
          className="lg:hidden mt-[14px] flex flex-wrap items-center gap-x-[13px] gap-y-[12px] w-full"
        >
          {filterItems.map(item => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.isActive ? "page" : undefined}
              data-filter-status={item.key}
              className={`${item.mobileWidth} h-[32px] px-3 rounded-[60px] text-[10px] font-medium text-white text-center whitespace-nowrap flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                item.isActive ? "vela-liquid-primary" : "vela-figma-slot hover:bg-white/25"
              }`}
            >
              {item.mobileLabel}
            </Link>
          ))}
        </nav>

        {/* Desktop Full-Width Glass Filter Bar + Right CTA (Figma node 114:3238 at left=333px, top=213px, w=1034px, h=53px) */}
        <div
          data-testid="desktop-filter-bar"
          className="hidden lg:flex mt-[16px] vela-figma-panel rounded-[20px] min-h-[53px] py-2 xl:py-0 xl:h-[53px] w-full px-6 xl:pl-[44px] xl:pr-[45px] flex-wrap xl:flex-nowrap items-center justify-between gap-2.5 xl:gap-4"
        >
          <nav
            aria-label="Filtra prenotazioni per stato"
            className="flex flex-wrap xl:flex-nowrap items-center gap-2.5 xl:gap-[16px]"
          >
            {filterItems.map(item => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={item.isActive ? "page" : undefined}
                data-filter-status={item.key}
                className={`${item.desktopWidth} h-[32px] px-3 rounded-[60px] text-[12px] font-medium text-white text-center whitespace-nowrap flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                  item.isActive ? "vela-liquid-primary" : "vela-figma-slot hover:bg-white/25"
                }`}
              >
                {item.desktopLabel}
              </Link>
            ))}
          </nav>

          <Link
            href="/dashboard/bookings/new"
            data-testid="desktop-new-booking-cta"
            className="vela-liquid-primary-lg flex items-center justify-center gap-3 xl:gap-[19.6px] h-[33px] w-auto px-4 xl:w-[248px] xl:px-[9.8px] rounded-[13px] text-[13px] font-medium text-white shrink-0 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <img
              alt=""
              src="/figma/fi-rr-calendar-cta.svg"
              className="size-[15px] shrink-0"
            />
            <span>Nuova prenotazione</span>
          </Link>
        </div>

        {/* MOBILE VIEWPORT (< 1024px): Vertical Glass Booking Cards (Figma node 111:746 at top=270.45px, w=328.4px) */}
        <section
          aria-label="Elenco prenotazioni"
          data-testid="mobile-bookings-list"
          className="lg:hidden mt-[9.5px] pb-[24px] flex flex-col gap-[12px] w-full"
        >
          {bookings.length === 0 ? (
            <div
              data-testid="bookings-empty-state-mobile"
              className="vela-figma-panel rounded-[20px] px-6 py-12 min-h-[280px] flex flex-col items-center justify-center text-center gap-3.5 w-full"
            >
              <div className="vela-figma-subtle size-[48px] rounded-full flex items-center justify-center mb-0.5">
                <img
                  alt=""
                  src="/figma/fi-rr-calendar-cta.svg"
                  className="size-[19px] opacity-85"
                />
              </div>
              <h2 className="text-[15px] font-medium text-white leading-snug">
                Nessuna prenotazione trovata
              </h2>
              <p className="text-[11px] font-normal text-[var(--textdeselected,#8c95a9)] max-w-[240px] leading-relaxed">
                Non ci sono appuntamenti per il filtro selezionato. Crea una nuova prenotazione per iniziare.
              </p>
              <Link
                href="/dashboard/bookings/new"
                className="mt-2 vela-liquid-primary rounded-[13px] h-[40px] px-6 inline-flex items-center justify-center gap-2.5 text-[12px] font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              >
                <img
                  alt=""
                  src="/figma/fi-rr-calendar-cta.svg"
                  className="size-[13px] shrink-0"
                />
                <span>Nuova prenotazione</span>
              </Link>
            </div>
          ) : (
            bookings.map(booking => {
              const clientName = booking.customer
                ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
                : booking.oneTimeClient
                  ? `${booking.oneTimeClient.firstName} ${booking.oneTimeClient.lastName}`.trim()
                  : "Cliente"
              const employeeName = booking.employee
                ? `${booking.employee.name}${
                    booking.employee.surname ? ` ${booking.employee.surname}` : ""
                  }`.trim()
                : "Staff"
              const serviceNames =
                booking.services && booking.services.length > 0
                  ? booking.services.map(s => s.serviceName).join(" + ")
                  : "Servizio"
              const dateParts = formatBookingDateParts(booking.startTime)
              const avatarSrc = getClientAvatarSrc(
                booking.customerId || booking.oneTimeClientId || clientName || booking.id
              )
              const latestNote =
                (booking as any).notes?.[0]?.content ||
                booking.internalNote ||
                booking.customerNote ||
                null

              return (
                <article
                  key={booking.id}
                  data-testid="mobile-booking-card"
                  className="vela-figma-panel rounded-[20px] px-[17px] py-[11px] flex flex-col gap-[12px] w-full relative"
                >
                  {/* Card Row 1: Date & Time + Status Capsule + Overflow Menu */}
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex flex-col items-start gap-[2px] leading-none text-white font-medium whitespace-nowrap">
                      <span className="text-[13px]">{dateParts.shortDate}</span>
                      <span className="text-[16px]">{dateParts.time24}</span>
                    </div>

                    <div className="flex items-center gap-[10px] shrink-0">
                      <BookingStatusCapsule status={booking.status} variant="mobile" />
                      <BookingStatusActions
                        tenantId={tenant.id}
                        userId={session.user.id}
                        bookingId={booking.id}
                        currentStatus={booking.status}
                        role={role as any}
                        compact={true}
                      />
                    </div>
                  </div>

                  {/* Card Row 2: Customer Avatar + Name & Service + Right Detail Chevron */}
                  <div className="flex items-center justify-between w-full gap-[12px]">
                    <div className="relative shrink-0 size-[35px] rounded-full overflow-hidden">
                      <img
                        alt={clientName}
                        src={avatarSrc}
                        width={35}
                        height={35}
                        className="size-full object-cover block"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex items-center justify-between gap-[10px]">
                      <div className="min-w-0 flex-1 flex flex-col gap-[5px] items-start leading-none">
                        <h2 className="text-[11px] font-medium text-white truncate w-full">
                          {clientName}
                        </h2>
                        <p className="text-[10px] font-medium text-white/75 truncate w-full">
                          {serviceNames}
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        aria-label={`Dettagli prenotazione di ${clientName}`}
                        data-testid="booking-detail-chevron"
                        className="relative shrink-0 size-[28.535px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 flex items-center justify-center transition-all after:content-[''] after:absolute after:-inset-2"
                      >
                        <img
                          alt=""
                          src="/figma/fi-rr-angle-small-right.svg"
                          className="size-[15px]"
                        />
                      </Link>
                    </div>
                  </div>

                  {/* Card Row 3: Assigned Employee */}
                  <div className="flex items-center gap-[12px]">
                    <img
                      alt=""
                      src="/figma/fi-rr-portrait.svg"
                      className="size-[15px] shrink-0"
                    />
                    <span className="text-[10px] font-medium text-white/75 truncate">
                      {employeeName}
                    </span>
                  </div>

                  {/* Card Row 4: Note Input / Display Pill */}
                  <BookingNotePill
                    tenantId={tenant.id}
                    userId={session.user.id}
                    bookingId={booking.id}
                    initialNote={latestNote}
                    variant="mobile"
                  />
                </article>
              )
            })
          )}
        </section>

        {/* Mobile Bottom Fade Vignette Behind Floating Dock (Figma node 114:837) */}
        <div
          aria-hidden="true"
          className="lg:hidden fixed bottom-0 left-0 right-0 h-[96.55px] bg-gradient-to-b from-[rgba(15,22,44,0)] to-[#0f162c] to-[52%] pointer-events-none z-30"
        />

        {/* DESKTOP VIEWPORT (>= 1024px): Single Large Glass Booking Table (Figma node 114:3206 at left=333px, top=279px, w=1034px, h=667px) */}
        <section
          aria-label="Tabella prenotazioni"
          data-testid="desktop-bookings-container"
          className="hidden lg:flex mt-[13px] vela-figma-panel rounded-[20px] px-6 xl:px-[44px] py-[20px] min-h-[667px] w-full flex-col justify-between"
        >
          <div className="w-full overflow-x-auto">
            <table
              data-testid="desktop-bookings-table"
              className="w-full border-collapse text-left"
            >
              <thead>
                <tr className="border-b border-white/15">
                  <th
                    scope="col"
                    className="pb-[15px] pr-2 xl:pr-3 text-[11px] font-medium text-white whitespace-nowrap"
                  >
                    Cliente
                  </th>
                  <th
                    scope="col"
                    className="pb-[15px] px-2 xl:px-3 text-[11px] font-medium text-white whitespace-nowrap"
                  >
                    Data &amp; Orario
                  </th>
                  <th
                    scope="col"
                    className="pb-[15px] px-2 xl:px-3 text-[11px] font-medium text-white whitespace-nowrap"
                  >
                    Staff
                  </th>
                  <th
                    scope="col"
                    className="pb-[15px] px-2 xl:px-3 text-[11px] font-medium text-white whitespace-nowrap"
                  >
                    Servizio
                  </th>
                  <th
                    scope="col"
                    className="pb-[15px] px-2 xl:px-3 text-[11px] font-medium text-white whitespace-nowrap"
                  >
                    Note
                  </th>
                  <th
                    scope="col"
                    className="pb-[15px] px-2 xl:px-3 text-[11px] font-medium text-white whitespace-nowrap"
                  >
                    Stato
                  </th>
                  <th
                    scope="col"
                    className="pb-[15px] pl-2 xl:pl-3 text-[11px] font-medium text-white text-right whitespace-nowrap"
                  >
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/12">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-36 px-8 text-center">
                      <div
                        data-testid="bookings-empty-state-desktop"
                        className="flex flex-col items-center justify-center gap-4 max-w-[420px] mx-auto"
                      >
                        <div className="vela-figma-subtle size-[54px] rounded-full flex items-center justify-center mb-0.5">
                          <img
                            alt=""
                            src="/figma/fi-rr-calendar-cta.svg"
                            className="size-[22px] opacity-85"
                          />
                        </div>
                        <h2 className="text-[18px] font-semibold text-white">
                          Nessuna prenotazione trovata
                        </h2>
                        <p className="text-[13px] font-normal text-white/75 leading-relaxed">
                          Non ci sono appuntamenti per il filtro selezionato. Crea una nuova prenotazione per aggiungere un appuntamento in agenda.
                        </p>
                        <Link
                          href="/dashboard/bookings/new"
                          className="mt-2 vela-liquid-primary-lg rounded-[13px] h-[40px] px-6 inline-flex items-center justify-center gap-3 text-[13px] font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                        >
                          <img
                            alt=""
                            src="/figma/fi-rr-calendar-cta.svg"
                            className="size-[15px] shrink-0"
                          />
                          <span>Nuova prenotazione</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map(booking => {
                    const clientName = booking.customer
                      ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
                      : booking.oneTimeClient
                        ? `${booking.oneTimeClient.firstName} ${booking.oneTimeClient.lastName}`.trim()
                        : "Cliente"
                    const employeeName = booking.employee
                      ? `${booking.employee.name}${
                          booking.employee.surname ? ` ${booking.employee.surname}` : ""
                        }`.trim()
                      : "Staff"
                    const serviceNames =
                      booking.services && booking.services.length > 0
                        ? booking.services.map(s => s.serviceName).join(" + ")
                        : "Servizio"
                    const totalDuration =
                      booking.services?.reduce(
                        (acc, s) => acc + (s.durationMinutes || 0),
                        0
                      ) || 0
                    const totalPriceCents =
                      booking.services?.reduce((acc, s) => acc + (s.price || 0), 0) || 0
                    const totalPriceEuros = totalPriceCents / 100
                    const formattedPrice = Number.isInteger(totalPriceEuros)
                      ? `€${totalPriceEuros}`
                      : `€${totalPriceEuros.toFixed(2)}`
                    const durationAndPrice =
                      totalDuration > 0
                        ? `${totalDuration} min • ${formattedPrice}`
                        : formattedPrice
                    const dateParts = formatBookingDateParts(booking.startTime)
                    const avatarSrc = getClientAvatarSrc(
                      booking.customerId ||
                        booking.oneTimeClientId ||
                        clientName ||
                        booking.id
                    )
                    const latestNote =
                      (booking as any).notes?.[0]?.content ||
                      booking.internalNote ||
                      booking.customerNote ||
                      null

                    return (
                      <tr
                        key={booking.id}
                        data-testid="desktop-booking-row"
                        className="border-b border-white/12 hover:bg-white/[0.04] transition-colors"
                      >
                        {/* 1. Cliente */}
                        <td className="py-[9px] pr-2 xl:pr-3 align-middle">
                          <Link
                            href={`/dashboard/bookings/${booking.id}`}
                            className="flex items-center gap-[8px] xl:gap-[10px] min-w-[95px] xl:min-w-[125px] group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                          >
                            <span className="relative shrink-0 size-[28px] xl:size-[35px] rounded-full overflow-hidden block">
                              <img
                                alt={clientName}
                                src={avatarSrc}
                                width={35}
                                height={35}
                                className="size-full object-cover block"
                              />
                            </span>
                            <span className="text-[11px] font-semibold text-white leading-tight group-hover:underline">
                              {clientName}
                            </span>
                          </Link>
                        </td>

                        {/* 2. Data & Orario */}
                        <td className="py-[9px] px-2 xl:px-3 align-middle whitespace-nowrap">
                          <div className="flex flex-col gap-[2px] text-[10px] xl:text-[11px] font-medium text-white leading-tight">
                            <span>{dateParts.fullDate}</span>
                            <span>{dateParts.time24}</span>
                          </div>
                        </td>

                        {/* 3. Staff */}
                        <td className="py-[9px] px-2 xl:px-3 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-[8px] xl:gap-[12px]">
                            <img
                              alt=""
                              src="/figma/fi-rr-portrait.svg"
                              className="size-[14px] xl:size-[15px] shrink-0"
                            />
                            <span className="text-[10px] xl:text-[11px] font-medium text-white/75">
                              {employeeName}
                            </span>
                          </div>
                        </td>

                        {/* 4. Servizio */}
                        <td className="py-[9px] px-2 xl:px-3 align-middle">
                          <div className="flex items-center gap-[8px] xl:gap-[10px]">
                            <img
                              alt=""
                              src="/figma/icon-service-cube.svg"
                              className="w-[13.784px] h-[14.947px] shrink-0"
                            />
                            <div className="flex flex-col text-[10px] font-medium leading-tight">
                              <span className="text-white">{serviceNames}</span>
                              <span className="text-white/75">{durationAndPrice}</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Note */}
                        <td className="py-[9px] px-2 xl:px-3 align-middle">
                          <BookingNotePill
                            tenantId={tenant.id}
                            userId={session.user.id}
                            bookingId={booking.id}
                            initialNote={latestNote}
                            variant="desktop"
                          />
                        </td>

                        {/* 6. Stato */}
                        <td className="py-[9px] px-2 xl:px-3 align-middle whitespace-nowrap">
                          <BookingStatusCapsule
                            status={booking.status}
                            variant="desktop"
                          />
                        </td>

                        {/* 7. Actions */}
                        <td className="py-[9px] pl-2 xl:pl-3 align-middle text-right whitespace-nowrap">
                          <BookingStatusActions
                            tenantId={tenant.id}
                            userId={session.user.id}
                            bookingId={booking.id}
                            currentStatus={booking.status}
                            role={role as any}
                            compact={true}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pagination Bar (Liquid Glass) */}
        {totalPages > 1 && (
          <div className="mt-4 vela-figma-panel rounded-[16px] px-6 py-3 flex items-center justify-between text-xs text-white">
            <Link
              href={buildBookingFilterHref(
                resolvedFilter.activeGroup,
                date,
                Math.max(1, currentPage - 1)
              )}
              className={`vela-figma-subtle px-3.5 py-1.5 rounded-full font-medium transition-all ${
                currentPage <= 1
                  ? "opacity-40 pointer-events-none"
                  : "hover:bg-white/25"
              }`}
            >
              Precedente
            </Link>
            <span className="text-white/80 font-medium">
              Pagina {currentPage} di {totalPages}
            </span>
            <Link
              href={buildBookingFilterHref(
                resolvedFilter.activeGroup,
                date,
                Math.min(totalPages, currentPage + 1)
              )}
              className={`vela-figma-subtle px-3.5 py-1.5 rounded-full font-medium transition-all ${
                currentPage >= totalPages
                  ? "opacity-40 pointer-events-none"
                  : "hover:bg-white/25"
              }`}
            >
              Successiva
            </Link>
          </div>
        )}
      </DashboardPageShell>
    </VelaThemeScope>
  )
}
