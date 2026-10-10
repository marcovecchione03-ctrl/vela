import { prisma } from "@/lib/db/prisma"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { resolveTenantFromHost } from "@/lib/tenant/server"
import Link from "next/link"
import { format } from "date-fns"

export default async function CustomerAppointmentsPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ domain: string }>
  searchParams: Promise<{ tab?: string, page?: string }>
}) {
  const { domain } = await params;
  const { tab = "upcoming", page = "1" } = await searchParams;

  const tenant = await resolveTenantFromHost(domain)
  if (!tenant) notFound()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow border p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Sign in required</h2>
        <p>You must be signed in to view your appointments.</p>
        <Link href={`/api/auth/signin?callbackUrl=/${domain}/appointments`} className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Sign In
        </Link>
      </div>
    )
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } }
  })

  if (!membership || membership.role !== "CUSTOMER") {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow border p-6 text-center">
        <h2 className="text-xl font-bold mb-4 text-red-600">Access Denied</h2>
        <p>You do not have a customer profile for this business.</p>
      </div>
    )
  }

  const customerProfile = await prisma.customerProfile.findUnique({
    where: { tenantMembershipId: membership.id }
  })

  if (!customerProfile) {
    return (
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow border p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Complete Registration</h2>
        <p>Please complete your customer profile before viewing appointments.</p>
      </div>
    )
  }

  const now = new Date()
  const take = 10
  const skip = (Math.max(1, parseInt(page)) - 1) * take

  const whereClause: any = { tenantId: tenant.id, customerId: customerProfile.id }

  if (tab === "upcoming") {
    whereClause.startTime = { gt: now }
    whereClause.status = { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] }
  } else if (tab === "history") {
    whereClause.OR = [
      { startTime: { lte: now } },
      { status: "COMPLETED" }
    ]
  } else if (tab === "cancelled") {
    whereClause.status = { in: ["CANCELLED", "NO_SHOW"] }
  }

  // Fetch paginated appointments
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: whereClause,
      include: {
        services: true,
        employee: true,
        location: true
      },
      orderBy: { startTime: tab === "history" || tab === "cancelled" ? 'desc' : 'asc' },
      skip,
      take
    }),
    prisma.booking.count({ where: whereClause })
  ])

  const totalPages = Math.ceil(total / take)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Appointments</h1>
        <Link href={`/${domain}/book`} className="px-4 py-2 bg-black text-white font-medium rounded hover:bg-gray-800 transition">
          Book New
        </Link>
      </div>

      <div className="flex gap-4 border-b">
        <Link 
          href={`/${domain}/appointments?tab=upcoming`} 
          className={`pb-2 px-1 border-b-2 font-medium ${tab === 'upcoming' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Upcoming
        </Link>
        <Link 
          href={`/${domain}/appointments?tab=history`} 
          className={`pb-2 px-1 border-b-2 font-medium ${tab === 'history' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          History
        </Link>
        <Link 
          href={`/${domain}/appointments?tab=cancelled`} 
          className={`pb-2 px-1 border-b-2 font-medium ${tab === 'cancelled' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Cancelled
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="divide-y">
          {bookings.length === 0 ? (
            <p className="p-6 text-gray-500">No appointments found.</p>
          ) : (
            bookings.map(b => (
              <div key={b.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-lg">{format(b.startTime, "EEEE, MMMM d, yyyy 'at' h:mm a")}</div>
                  <div className="text-gray-600">{b.services.map(s => s.serviceName).join(", ")}</div>
                  <div className="text-sm text-gray-500 mt-1">with {b.employee.name} • {b.location.name}</div>
                  <div className="mt-2 flex gap-2 items-center">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {b.status}
                    </span>
                    {b.lateCancellation && <span className="text-xs text-red-500 font-medium">Late Cancellation</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/${domain}/appointments/${b.id}`} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                    Details
                  </Link>
                  {["PENDING", "CONFIRMED"].includes(b.status) && (
                    <Link href={`/${domain}/appointments/${b.id}/reschedule`} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
                      Reschedule
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center bg-gray-50 text-sm">
            <Link 
              href={`/${domain}/appointments?tab=${tab}&page=${Math.max(1, parseInt(page) - 1)}`}
              className={`px-3 py-1 rounded border bg-white ${parseInt(page) <= 1 ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50'}`}
            >
              Previous
            </Link>
            <span>Page {page} of {totalPages}</span>
            <Link 
              href={`/${domain}/appointments?tab=${tab}&page=${Math.min(totalPages, parseInt(page) + 1)}`}
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
