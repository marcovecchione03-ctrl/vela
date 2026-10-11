import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { resolveTenantFromHost } from "@/lib/tenant/server"
import Wizard from "./Wizard"

export default async function BookingPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ domain: string }>
  searchParams: Promise<{ serviceIds?: string, employeeId?: string, locationId?: string }>
}) {
  const { domain } = await params;
  const { serviceIds, employeeId, locationId } = await searchParams;
  
  const baseTenant = await resolveTenantFromHost(domain)
  if (!baseTenant) notFound()

  const tenant = await prisma.tenant.findUnique({
    where: { id: baseTenant.id },
    include: {
      locations: true,
      services: { where: { isActive: true } },
      employees: { where: { isActive: true } }
    }
  })

  if (!tenant) notFound()

  if (tenant.status === "SUSPENDED") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Temporarily Unavailable</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          This booking page is currently suspended. If you are the owner, please sign in and navigate to your dashboard to update your billing information.
        </p>
        <a href={`/dashboard/subscription`} className="px-4 py-2 bg-gray-900 text-white rounded-md font-medium">
          Manage Subscription
        </a>
      </div>
    )
  }

  // Fetch Session
  const session = await getServerSession(authOptions)
  let customerProfile = null
  
  if (session?.user?.id) {
    const membership = await prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } }
    })
    if (membership && membership.role === "CUSTOMER") {
      customerProfile = await prisma.customerProfile.findUnique({
        where: { tenantMembershipId: membership.id }
      })
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow border p-6">
      <h2 className="text-2xl font-bold mb-6 border-b pb-4">Book Appointment - {tenant.name}</h2>
      <Wizard 
        tenantId={tenant.id}
        locations={tenant.locations}
        services={tenant.services}
        employees={tenant.employees}
        customerProfile={customerProfile}
        initialServiceIds={serviceIds ? serviceIds.split(",") : undefined}
        initialEmployeeId={employeeId}
        initialLocationId={locationId}
      />
    </div>
  )
}
