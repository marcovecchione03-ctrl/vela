import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import RescheduleForm from "./RescheduleForm"

export default async function CustomerReschedulePage({ 
  params 
}: { 
  params: Promise<{ domain: string, id: string }> 
}) {
  const { domain, id } = await params;

  let tenant = await prisma.tenant.findUnique({
    where: { slug: domain },
    include: { employees: { where: { isActive: true } } }
  })
  if (!tenant && domain.length === 36) {
    tenant = await prisma.tenant.findUnique({ 
      where: { id: domain },
      include: { employees: { where: { isActive: true } } }
    })
  }
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect(`/${domain}/appointments`)
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } }
  })

  if (!membership || membership.role !== "CUSTOMER") {
    redirect(`/${domain}/appointments`)
  }

  const customerProfile = await prisma.customerProfile.findUnique({
    where: { tenantMembershipId: membership.id }
  })

  if (!customerProfile) {
    redirect(`/${domain}/appointments`)
  }

  const booking = await prisma.booking.findUnique({
    where: { id: id, tenantId: tenant.id, customerId: customerProfile.id },
    include: { services: true }
  })

  if (!booking || !["PENDING", "CONFIRMED"].includes(booking.status)) {
    redirect(`/${domain}/appointments/${id}`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href={`/${domain}/appointments/${id}`} className="text-blue-600 hover:underline">
        &larr; Back to Appointment
      </Link>

      <div className="bg-white rounded-xl shadow border p-6">
        <h1 className="text-2xl font-bold mb-6 border-b pb-4">Reschedule Appointment</h1>
        <RescheduleForm 
          tenantId={tenant.id}
          userId={session.user.id}
          bookingId={booking.id}
          locationId={booking.locationId}
          serviceIds={booking.services.map(s => s.serviceId)}
          employees={tenant.employees}
          currentEmployeeId={booking.employeeId}
          currentStartTime={booking.startTime.toISOString()}
        />
      </div>
    </div>
  )
}
