import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import { format } from "date-fns"
import CancelAppointmentButton from "./CancelAppointmentButton"
import { isValidTransition } from "@/lib/booking-engine/status-machine"

export default async function CustomerAppointmentDetail({ 
  params 
}: { 
  params: Promise<{ domain: string, id: string }> 
}) {
  const { domain, id } = await params;

  let tenant = await prisma.tenant.findUnique({
    where: { slug: domain }
  })
  if (!tenant && domain.length === 36) {
    tenant = await prisma.tenant.findUnique({ where: { id: domain } })
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
    include: {
      services: { include: { service: true } },
      employee: true,
      location: true
    }
  })

  if (!booking) notFound()

  const isLate = new Date() > new Date(booking.startTime.getTime() - tenant.cancellationDeadlineHours * 60 * 60 * 1000)
  const canCancel = isValidTransition(booking.status, "CANCELLED", "CUSTOMER")
  // Only allow rescheduling if it's strictly in the future (plus a small buffer maybe, but for MVP strict future)
  const canReschedule = ["PENDING", "CONFIRMED"].includes(booking.status) && new Date() < booking.startTime

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Link href={`/${domain}/appointments`} className="text-blue-600 hover:underline">
        &larr; Back to Appointments
      </Link>

      <div className="bg-white rounded-xl shadow border p-6">
        <div className="flex justify-between items-start mb-6 border-b pb-6">
          <div>
            <h1 className="text-2xl font-bold">{format(booking.startTime, "EEEE, MMMM d, yyyy")}</h1>
            <div className="text-xl text-gray-600 mt-1">
              {format(booking.startTime, "h:mm a")} - {format(booking.endTime, "h:mm a")}
            </div>
          </div>
          <div className="px-3 py-1 bg-gray-100 rounded-full font-medium text-sm">
            {booking.status}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Services</h3>
            <ul className="space-y-2">
              {booking.services.map(s => (
                <li key={s.id} className="flex justify-between">
                  <span>{s.serviceName} ({s.durationMinutes} min)</span>
                  <span className="font-medium">€{(s.price / 100).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t flex justify-between font-bold">
              <span>Total</span>
              <span>€{(booking.services.reduce((acc, s) => acc + s.price, 0) / 100).toFixed(2)}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-1">Staff</h3>
            <p>{booking.employee.name}</p>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-1">Location</h3>
            <p>{booking.location.name}</p>
            {booking.location.address && <p className="text-sm text-gray-500">{booking.location.address}</p>}
          </div>

          <div className="pt-6 border-t flex gap-4">
            {canReschedule && (
              <Link 
                href={`/${domain}/appointments/${booking.id}/reschedule`}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition flex-1 text-center"
              >
                Reschedule
              </Link>
            )}
            {canCancel && (
              <CancelAppointmentButton 
                tenantId={tenant.id}
                userId={session.user.id}
                bookingId={booking.id}
                isLateCancellation={isLate}
              />
            )}
          </div>
          
          {["CANCELLED", "COMPLETED", "NO_SHOW"].includes(booking.status) && (
            <div className="pt-6 border-t flex justify-center">
              <Link 
                href={`/${domain}/book?serviceIds=${booking.services.map(s => s.serviceId).join(",")}&employeeId=${booking.employeeId}`}
                className="px-6 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition"
              >
                Book Again
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
