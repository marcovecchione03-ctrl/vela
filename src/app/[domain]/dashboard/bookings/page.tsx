import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import Link from "next/link"
import { format } from "date-fns"
import BookingStatusActions from "./BookingStatusActions"
import { Prisma } from "@prisma/client"

export default async function DashboardBookingsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ domain: string }>
  searchParams: Promise<{ status?: string, date?: string, page?: string }>
}) {
  const { domain } = await params;
  const { status, date, page = "1" } = await searchParams;

  let tenant = await prisma.tenant.findUnique({
    where: { slug: domain }
  })
  if (!tenant && domain.length === 36) {
    tenant = await prisma.tenant.findUnique({ where: { id: domain } })
  }
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=/${domain}/dashboard/bookings`)

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
    include: { employeeProfile: true }
  })

  if (!membership || !["OWNER", "ADMIN", "EMPLOYEE"].includes(membership.role)) {
    redirect(`/${domain}`)
  }

  const role = membership.role
  const employeeId = membership.employeeProfile?.id

  const whereClause: Prisma.BookingWhereInput = { tenantId: tenant.id }
  
  if (role === "EMPLOYEE" && employeeId) {
    whereClause.employeeId = employeeId
  }

  if (status && status !== "ALL") {
    whereClause.status = status as any
  }

  if (date) {
    const startOfDay = new Date(date)
    startOfDay.setUTCHours(0,0,0,0)
    const endOfDay = new Date(date)
    endOfDay.setUTCHours(23,59,59,999)
    whereClause.startTime = { gte: startOfDay, lte: endOfDay }
  }

  const take = 15
  const skip = (Math.max(1, parseInt(page)) - 1) * take

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: {
        services: true,
        employee: true,
        customer: true,
        oneTimeClient: true,
        location: true
      },
      orderBy: { startTime: 'asc' },
      skip,
      take
    }),
    prisma.booking.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <div className="flex gap-2">
          <Link href={`/${domain}/dashboard/bookings/new`} className="px-4 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 text-sm">
            + New Booking
          </Link>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between bg-white p-4 rounded-xl shadow border">
        <div className="flex gap-2 flex-wrap">
          <Link href={`/${domain}/dashboard/bookings`} className={`px-3 py-1 rounded-full text-sm font-medium ${!status || status === 'ALL' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>All</Link>
          <Link href={`/${domain}/dashboard/bookings?status=PENDING`} className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'PENDING' ? 'bg-yellow-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>Pending</Link>
          <Link href={`/${domain}/dashboard/bookings?status=CONFIRMED`} className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'CONFIRMED' ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>Confirmed</Link>
          <Link href={`/${domain}/dashboard/bookings?status=COMPLETED`} className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>Completed</Link>
          <Link href={`/${domain}/dashboard/bookings?status=CANCELLED`} className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'CANCELLED' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>Cancelled</Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-sm text-gray-600">Client</th>
                <th className="p-4 font-medium text-sm text-gray-600">Date & Time</th>
                <th className="p-4 font-medium text-sm text-gray-600">Staff</th>
                <th className="p-4 font-medium text-sm text-gray-600">Services</th>
                <th className="p-4 font-medium text-sm text-gray-600">Status</th>
                <th className="p-4 font-medium text-sm text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const clientName = booking.customer 
                    ? `${booking.customer.firstName} ${booking.customer.lastName}`
                    : booking.oneTimeClient 
                      ? `${booking.oneTimeClient.firstName} ${booking.oneTimeClient.lastName}`
                      : "Unknown"

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{clientName}</div>
                        {!booking.customer && <span className="text-xs text-gray-500">One-Time</span>}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{format(booking.startTime, "MMM d, yyyy")}</div>
                        <div className="text-sm text-gray-500">{format(booking.startTime, "h:mm a")} - {format(booking.endTime, "h:mm a")}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.employee.name}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-900 line-clamp-2" title={booking.services.map(s => s.serviceName).join(", ")}>
                          {booking.services.map(s => s.serviceName).join(", ")}
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          booking.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                          booking.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                          booking.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                          booking.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {booking.status === "PENDING" && (
                            <BookingStatusActions 
                              tenantId={tenant.id}
                              userId={session.user.id}
                              bookingId={booking.id}
                              currentStatus={booking.status}
                              role={role as any}
                              compact={true}
                            />
                          )}
                          <Link href={`/${domain}/dashboard/bookings/${booking.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center bg-gray-50 text-sm">
            <Link 
              href={`/${domain}/dashboard/bookings?${status ? `status=${status}&` : ''}${date ? `date=${date}&` : ''}page=${Math.max(1, parseInt(page) - 1)}`}
              className={`px-3 py-1 rounded border bg-white ${parseInt(page) <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}
            >
              Previous
            </Link>
            <span>Page {page} of {totalPages}</span>
            <Link 
              href={`/${domain}/dashboard/bookings?${status ? `status=${status}&` : ''}${date ? `date=${date}&` : ''}page=${Math.min(totalPages, parseInt(page) + 1)}`}
              className={`px-3 py-1 rounded border bg-white ${parseInt(page) >= totalPages ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
