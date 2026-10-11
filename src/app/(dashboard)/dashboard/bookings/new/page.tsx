import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import ManualBookingForm from "./ManualBookingForm"
import { getDashboardTenant } from "@/lib/tenant/context"

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
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={`/dashboard/bookings`} className="text-blue-600 hover:underline text-sm font-medium">
        &larr; Back to Bookings
      </Link>

      <div className="bg-white rounded-xl shadow border p-6">
        <h1 className="text-2xl font-bold mb-6 border-b pb-4">Manual Staff Booking</h1>
        
        <ManualBookingForm 
          tenantId={tenant.id}
          userId={session.user.id}
          locations={tenant.locations}
          services={tenant.services}
          employees={tenant.employees}
          customers={tenant.customers}
          role={role as any}
          currentEmployeeId={currentEmployeeId}
        />
      </div>
    </div>
  )
}
