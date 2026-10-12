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
        orderBy: { firstName: 'asc' },
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
      <DashboardPageShell variant="wide" className="space-y-6 sm:space-y-8">
        {/* Spatial Floating Page Header */}
        <div className="flex flex-col gap-3">
          <div>
            <Link 
              href="/dashboard/bookings" 
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--vela-foreground)] bg-white/60 hover:bg-white/90 backdrop-blur-xl border border-white/60 px-3.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] transition-all cursor-pointer hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0"
            >
              <span aria-hidden="true" className="text-sm leading-none">&larr;</span>
              <span>Back to Bookings</span>
            </Link>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--vela-foreground)]">
              Manual Staff Booking
            </h1>
            <p className="text-xs sm:text-sm text-[var(--vela-muted-foreground)] max-w-xl font-normal leading-relaxed">
              Schedule an appointment directly on behalf of a walk-in, phone caller, or registered client.
            </p>
          </div>
        </div>

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
      </DashboardPageShell>
    </VelaThemeScope>
  )
}


