import { requireRole } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db/prisma"
import { getTenantFromDomain } from "@/lib/tenant/context"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getScoreBand } from "@/lib/crm/customer-score"
import Link from "next/link"

export default async function CustomersDirectoryPage({
  params,
  searchParams
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ search?: string; page?: string; filter?: string; tag?: string }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const tenant = await getTenantFromDomain(resolvedParams.domain)
  if (!tenant) notFound()

  // Strict RBAC: Only OWNER and ADMIN
  const { role } = await requireRole(tenant, ["OWNER", "ADMIN"])

  const search = resolvedSearchParams.search || ""
  const page = parseInt(resolvedSearchParams.page || "1", 10)
  const pageSize = 20
  const skip = (page - 1) * pageSize

  const filter = resolvedSearchParams.filter || "ALL"
  const tagFilter = resolvedSearchParams.tag || ""
  
  const whereClause: any = {
    tenantId: tenant
  }

  if (search) {
    whereClause.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { tenantMembership: { user: { email: { contains: search, mode: "insensitive" } } } }
    ]
  }

  const now = new Date()

  switch(filter) {
    case "ACTIVE":
      whereClause.isBlocked = false
      break
    case "BLOCKED":
      whereClause.isBlocked = true
      break
    case "HIGH_RELIABILITY":
      whereClause.score = { gte: 75 }
      break
    case "LOW_RELIABILITY":
      whereClause.score = { lt: 50 }
      break
    case "NEW_CUSTOMERS":
      // For a customer to be "New", their earliest booking is >= some threshold, or they have exactly 1 booking.
      // Easiest is they have exactly 1 booking, or their first booking is upcoming/recent.
      // Let's define "New" as having exactly 1 booking, or 0 bookings.
      // Wait, "New/Returning" logic is requested exactly for analytics, but for the filter, let's filter by:
      // customers who have <= 1 booking. Wait, Prisma doesn't support `bookings: { _count: 1 }` in where clause easily.
      // Let's fetch the list of IDs if we need complex aggregations, or we can use `bookings: { none: { ... } }`
      // For "Returning", they have > 1 booking.
      // Actually, we can just do a query for new/returning if it's too complex in prisma where:
      break
    case "RETURNING_CUSTOMERS":
      // Will handle in memory if too hard for Prisma, or use Prisma `_count`. 
      // Actually Prisma doesn't support filtering by relation count directly in `where`. 
      break
    case "UPCOMING_APPOINTMENT":
      whereClause.bookings = {
        some: { startTime: { gte: now }, status: "CONFIRMED" }
      }
      break
    case "NO_SHOW_HISTORY":
      whereClause.bookings = {
        some: { status: "NO_SHOW" }
      }
      break
  }

  if (tagFilter) {
    whereClause.tags = {
      some: { tag: { name: tagFilter } }
    }
  }

  // To support New/Returning properly, if they are selected, we might need to filter the fetched list.
  // Because Prisma doesn't support `where: { bookings: { _count: { gt: 1 } } }` until Prisma 4.3+, wait, Prisma *does* support relation count filtering in newer versions!
  // Let's try Prisma relation count filter:
  if (filter === "NEW_CUSTOMERS") {
    // New = 0 or 1 bookings
    whereClause.bookings = { _count: { lte: 1 } }
  } else if (filter === "RETURNING_CUSTOMERS") {
    // Returning = > 1 booking
    whereClause.bookings = { _count: { gt: 1 } }
  }

  const [totalCustomers, customers, allTags] = await Promise.all([
    prisma.customerProfile.count({ where: whereClause }),
    prisma.customerProfile.findMany({
      where: whereClause,
      include: {
        tenantMembership: {
          include: {
            user: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize
    }),
    prisma.customerTag.findMany({ where: { tenantId: tenant }, select: { name: true } })
  ])

  const totalPages = Math.ceil(totalCustomers / pageSize)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-500">Manage your CRM and view reliability scores.</p>
        </div>
        <Link href={`/${resolvedParams.domain}/dashboard/customers/export`} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">
          Export CSV
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-6 flex gap-4 flex-wrap">
            <input 
              type="text" 
              name="search" 
              defaultValue={search} 
              placeholder="Search by name, email, or phone..."
              className="border p-2 rounded flex-1 min-w-[200px]"
            />
            
            <select name="filter" defaultValue={filter} className="border p-2 rounded bg-white">
              <option value="ALL">All Customers</option>
              <option value="ACTIVE">Active</option>
              <option value="BLOCKED">Blocked</option>
              <option value="HIGH_RELIABILITY">High Reliability (&ge;75)</option>
              <option value="LOW_RELIABILITY">Low Reliability (&lt;50)</option>
              <option value="NEW_CUSTOMERS">New Customers</option>
              <option value="RETURNING_CUSTOMERS">Returning Customers</option>
              <option value="UPCOMING_APPOINTMENT">Upcoming Appointment</option>
              <option value="NO_SHOW_HISTORY">No-Show History</option>
            </select>

            <select name="tag" defaultValue={tagFilter} className="border p-2 rounded bg-white">
              <option value="">All Tags</option>
              {allTags.map(t => (
                <option key={t.name} value={t.name}>{t.name}</option>
              ))}
            </select>

            <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded">
              Filter
            </button>
            {(search || filter !== "ALL" || tagFilter) && (
              <Link href={`/${resolvedParams.domain}/dashboard/customers`} className="bg-gray-200 text-gray-800 px-4 py-2 rounded">
                Clear
              </Link>
            )}
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Phone</th>
                  <th className="p-3 font-semibold">Tags</th>
                  <th className="p-3 font-semibold">Score</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const scoreBand = getScoreBand(c.score)
                  const email = c.tenantMembership.user.email
                  return (
                    <tr key={c.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <Link href={`/${resolvedParams.domain}/dashboard/customers/${c.id}`} className="font-medium text-blue-600 hover:underline">
                          {c.firstName} {c.lastName}
                        </Link>
                      </td>
                      <td className="p-3">{email || "-"}</td>
                      <td className="p-3">{c.phone || "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {c.tags.map(t => (
                            <span key={t.tagId} className="text-xs px-2 py-1 bg-gray-200 rounded-full" style={{ backgroundColor: t.tag.color || undefined }}>
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${scoreBand.bg} ${scoreBand.color}`}>
                          {c.score} - {scoreBand.label}
                        </span>
                      </td>
                      <td className="p-3">
                        {c.isBlocked ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">Blocked</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">Active</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link href={`/${resolvedParams.domain}/dashboard/customers/${c.id}`} className="text-sm text-gray-500 hover:text-black">
                          View
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      No customers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex gap-2 justify-center">
              {Array.from({ length: totalPages }).map((_, i) => (
                <Link
                  key={i}
                  href={`/${resolvedParams.domain}/dashboard/customers?page=${i + 1}${search ? `&search=${search}` : ""}`}
                  className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-black text-white' : 'bg-gray-200 text-black hover:bg-gray-300'}`}
                >
                  {i + 1}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
