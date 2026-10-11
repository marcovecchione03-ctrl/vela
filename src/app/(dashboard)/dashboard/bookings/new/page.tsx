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
      <DashboardPageShell variant="wide" className="space-y-6">
        <div className="space-y-2">
          <Link 
            href="/dashboard/bookings" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-vela-foreground bg-vela-surface border border-vela-border px-3 py-1.5 rounded-full shadow-xs hover:bg-vela-surface-subtle transition-all cursor-pointer"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Back to Bookings</span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-vela-foreground">Manual Staff Booking</h1>
            <p className="text-sm text-vela-muted-foreground mt-1">
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


