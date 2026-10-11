import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import { format } from "date-fns"
import BookingStatusActions from "../BookingStatusActions"
import InternalNotes from "./InternalNotes"
import { getDashboardTenant } from "@/lib/tenant/context"

export default async function DashboardBookingDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  const tenant = await getDashboardTenant()
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=/dashboard/bookings/${id}`)

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    include: { employeeProfile: true }
  })

  if (!membership || !["OWNER", "ADMIN", "EMPLOYEE"].includes(membership.role)) {
    redirect(`/dashboard`)
  }

  const role = membership.role
  const employeeId = membership.employeeProfile?.id

  const booking = await prisma.booking.findFirst({
    where: { id: id, tenantId: tenant.id },
    include: {
      services: { include: { service: true } },
      employee: true,
      location: true,
      customer: true,
      oneTimeClient: true,
      notes: { orderBy: { createdAt: 'desc' } },
      statusHistory: { orderBy: { createdAt: 'desc' } }
    }
  })

  if (!booking) notFound()

  if (role === "EMPLOYEE" && booking.employeeId !== employeeId) {
    redirect(`/dashboard/bookings`)
  }

  const clientName = booking.customer 
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : booking.oneTimeClient 
      ? `${booking.oneTimeClient.firstName} ${booking.oneTimeClient.lastName}`
      : "Unknown"

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href={`/dashboard/bookings`} className="text-blue-600 hover:underline text-sm font-medium">
        &larr; Back to Bookings
      </Link>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main Details */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-xl shadow border p-6">
            <div className="flex justify-between items-start mb-6 border-b pb-6">
              <div>
                <h1 className="text-2xl font-bold">{format(booking.startTime, "EEEE, MMMM d, yyyy")}</h1>
                <div className="text-xl text-gray-600 mt-1">
                  {format(booking.startTime, "h:mm a")} - {format(booking.endTime, "h:mm a")}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 font-bold text-sm rounded-full ${
                  booking.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                  booking.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                  booking.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                  booking.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {booking.status}
                </span>
                <span className="text-xs text-gray-500 font-mono">Ref: {booking.bookingReference}</span>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Actions</h2>
              <BookingStatusActions 
                tenantId={tenant.id}
                userId={session.user.id}
                bookingId={booking.id}
                currentStatus={booking.status}
                role={role as any}
                compact={false}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Client</h3>
                <div className="font-medium text-lg">{clientName}</div>
                {booking.oneTimeClient && <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded">One-Time Client</span>}
                {booking.customer?.phone && <div className="text-gray-600">{booking.customer.phone}</div>}
                {booking.oneTimeClient?.phone && <div className="text-gray-600">{booking.oneTimeClient.phone}</div>}
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-2">Location & Staff</h3>
                <div className="font-medium">{booking.location.name}</div>
                <div className="text-gray-600">with {booking.employee.name}</div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="font-bold text-gray-900 mb-2">Services</h3>
              <ul className="space-y-2 border-t pt-4">
                {booking.services.map(s => (
                  <li key={s.id} className="flex justify-between">
                    <div>
                      <div className="font-medium">{s.serviceName}</div>
                      <div className="text-sm text-gray-500">{s.durationMinutes} min</div>
                    </div>
                    <div className="font-bold">€{(s.price / 100).toFixed(2)}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>€{(booking.services.reduce((acc, s) => acc + s.price, 0) / 100).toFixed(2)}</span>
              </div>
            </div>
            
            {booking.lateCancellation && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded border border-red-200">
                <strong>Late Cancellation</strong>
                <p className="text-sm">This booking was cancelled after the tenant&apos;s cancellation deadline.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Notes and History */}
        <div className="w-full md:w-80 flex flex-col gap-6">
          <InternalNotes 
            tenantId={tenant.id}
            userId={session.user.id}
            bookingId={booking.id}
            notes={booking.notes}
            initialCustomerNote={booking.customerNote || booking.internalNote} // fallback for MVP 
          />

          <div className="bg-white rounded-xl shadow border p-6">
            <h3 className="font-bold mb-4">Status History</h3>
            <ul className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
              {booking.statusHistory.map((sh, idx) => (
                <li key={sh.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-4 h-4 rounded-full border border-white bg-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                  <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded border bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm">{sh.status}</div>
                      <time className="text-xs text-gray-500">{format(sh.createdAt, "MMM d, h:mm a")}</time>
                    </div>
                    {sh.reason && <div className="text-sm text-gray-600">{sh.reason}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
