import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import ManualBookingForm from "./ManualBookingForm"
import { getDashboardTenant } from "@/lib/tenant/context"

import { VelaThemeScope } from "@/components/theme/VelaThemeScope"
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell"

export default async function DashboardNewBookingPage() {
  const baseTenant = await getDashboardTenant()
  if (!baseTenant) notFound()

  // We need to fetch the tenant with relations
  const tenant = await prisma.tenant.findUnique({
    where: { id: baseTenant.id },
    include: {
      locations: true,
      services: { where: { isActive: true } },
      employees: { where: { isActive: true } },
      customers: {
        orderBy: { firstName: "asc" },
        select: { id: true, firstName: true, lastName: true, phone: true }
      }
    }
  })
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=/dashboard/bookings/new`)

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    include: { employeeProfile: true }
  })

  if (!membership || !["OWNER", "ADMIN", "EMPLOYEE"].includes(membership.role)) {
    redirect(`/dashboard`)
  }

  const role = membership.role
  const currentEmployeeId = membership.employeeProfile?.id

  return (
    <VelaThemeScope branding={tenant} className="w-full">
      <DashboardPageShell
        variant="wide"
        className="pt-[13.45px] lg:pt-[65.62px] max-w-[329px] sm:max-w-[540px] lg:max-w-[1068.45px] mx-auto lg:mx-0"
      >
        {/* Top Utility & Navigation Bar (Figma 59:869 Mobile & 101:1312 Desktop) */}
        <div className="flex items-center justify-between w-full">
          {/* Back Button (Mobile: 28.535px node 58:634 | Desktop: 40px node 102:2173) */}
          <Link
            href="/dashboard/bookings"
            className="relative size-[28.535px] lg:size-[40px] lg:mt-[12.38px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <img
              alt=""
              src="/figma/fi-rr-angle-small-left.svg"
              className="size-[15px] lg:size-[20px]"
            />
            <span className="sr-only">Back to Bookings</span>
          </Link>

          {/* Mobile Top-Right Settings Action (Figma node 59:676) */}
          <Link
            href="/dashboard/settings"
            aria-label="Impostazioni"
            className="lg:hidden relative size-[28.535px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/25 flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <img
              alt=""
              src="/figma/fi-rr-settings.svg"
              className="size-[15px]"
            />
          </Link>

          {/* Desktop Top-Right Utility Bar: Search + Notification Bell + Profile Avatar (Figma nodes 102:2206, 102:2192, 102:2183) */}
          <div className="hidden lg:flex items-center gap-[12px] lg:mr-[34px]">
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
              className="relative size-[41px] rounded-full flex items-center justify-center shrink-0 cursor-pointer"
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

        {/* Page Title & Subtitle (Mobile node 59:769 | Desktop nodes 102:2065 & 102:2068) */}
        <div className="mt-[14.46px] lg:mt-[23.26px] flex flex-col gap-[6px] lg:gap-[4px] items-start">
          <h1 className="text-[20px] lg:text-[33px] font-medium lg:font-semibold text-white leading-tight tracking-tight">
            <span className="sr-only">Manual Staff Booking </span>
            Nuova prenotazione
          </h1>
          <p className="text-[10px] lg:text-[19px] font-normal text-[var(--textdeselected,#8c95a9)] lg:text-white/75 leading-tight">
            <span className="lg:hidden">Crea un nuovo appuntamento</span>
            <span className="hidden lg:inline">Crea un nuovo appuntamento nel tuo salone</span>
          </p>
        </div>

        {/* Main Booking Form Surface */}
        <div className="mt-[13px] lg:mt-[24px]">
          <ManualBookingForm
            tenantId={tenant.id}
            userId={session.user.id}
            locations={tenant.locations}
            services={tenant.services}
            employees={tenant.employees}
            customers={tenant.customers}
            role={role as any}
            currentEmployeeId={currentEmployeeId}
            branding={{
              primaryColor: tenant.primaryColor,
              secondaryColor: tenant.secondaryColor,
              bgColor: tenant.bgColor,
              textColor: tenant.textColor
            }}
          />
        </div>
      </DashboardPageShell>
    </VelaThemeScope>
  )
}
