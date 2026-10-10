"use client"

import { format, startOfDay } from "date-fns"
import Link from "next/link"

export default function AgendaView({ date, bookings, timeBlocks, exceptions, domain }: any) {
  // Filter bookings to just this day
  const start = startOfDay(date).getTime()
  const end = start + 86400000
  
  const dayBookings = bookings.filter((b: any) => {
    const time = new Date(b.startTime).getTime()
    return time >= start && time < end
  })

  const dayTimeBlocks = (timeBlocks || []).filter((tb: any) => {
    const time = new Date(tb.startTime).getTime()
    return time >= start && time < end
  })

  const dayExceptions = (exceptions || []).filter((ex: any) => {
    const time = new Date(ex.date).getTime()
    return time >= start && time < end
  })

  // Combine and sort
  const agendaItems = [
    ...dayBookings.map((b: any) => ({ type: 'BOOKING', time: new Date(b.startTime).getTime(), data: b })),
    ...dayTimeBlocks.map((tb: any) => ({ type: 'TIMEBLOCK', time: new Date(tb.startTime).getTime(), data: tb })),
    ...dayExceptions.map((ex: any) => ({ type: 'EXCEPTION', time: Math.max(start, new Date(ex.date).getTime()), data: ex }))
  ].sort((a, b) => a.time - b.time)

  return (
    <div className="p-6 max-w-4xl mx-auto h-full">
      <h3 className="text-xl font-bold mb-6 pb-2 border-b">Agenda for {format(date, "MMMM d, yyyy")}</h3>
      
      {agendaItems.length === 0 ? (
        <div className="text-gray-500 italic">No items scheduled for today.</div>
      ) : (
        <div className="space-y-4">
          {agendaItems.map((item, idx) => {
            if (item.type === 'EXCEPTION') {
              const ex = item.data
              return (
                <div key={`ex-${ex.id}`} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border bg-gray-50 shadow-sm border-gray-300">
                  <div className="w-32 shrink-0 font-bold text-lg text-gray-700 border-b md:border-b-0 md:border-r pb-2 md:pb-0 md:pr-4">
                    All Day
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-700">Away / Unavailable</div>
                    <div className="text-gray-600 text-sm mt-1">{ex.reason || "Vacation / Sick Leave"}</div>
                  </div>
                  <div className="w-48 shrink-0 text-sm font-medium text-gray-500">
                    Employee ID: {ex.employeeId}
                  </div>
                </div>
              )
            }

            if (item.type === 'TIMEBLOCK') {
              const tb = item.data
              return (
                <div key={`tb-${tb.id}`} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border bg-gray-50 shadow-sm border-gray-300">
                  <div className="w-32 shrink-0 font-bold text-lg text-gray-700 border-b md:border-b-0 md:border-r pb-2 md:pb-0 md:pr-4">
                    {format(new Date(tb.startTime), "h:mm a")}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-700">Blocked Time</div>
                    <div className="text-gray-600 text-sm mt-1">{tb.reason || "Lunch / Meeting"}</div>
                  </div>
                  <div className="w-48 shrink-0 text-sm font-medium text-gray-500">
                    Employee ID: {tb.employeeId}
                  </div>
                </div>
              )
            }

            const b = item.data
            return (
              <Link 
                href={`/${domain}/dashboard/bookings/${b.id}`}
                key={`b-${b.id}`} 
                className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border bg-white shadow-sm hover:border-blue-300 hover:shadow transition"
              >
                <div className="w-32 shrink-0 font-bold text-lg text-gray-900 border-b md:border-b-0 md:border-r pb-2 md:pb-0 md:pr-4">
                  {format(new Date(b.startTime), "h:mm a")}
                </div>
                
                <div className="flex-1">
                  <div className="font-bold text-lg">
                    {b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : b.oneTimeClient ? `${b.oneTimeClient.firstName} ${b.oneTimeClient.lastName}` : "Unknown"}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {b.services.map((s:any) => s.serviceName).join(", ")}
                  </div>
                </div>
                
                <div className="w-48 shrink-0 text-sm text-gray-500">
                  <div>{b.employee.name}</div>
                  <div>{b.location.name}</div>
                </div>
                
                <div className="shrink-0">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    b.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                    b.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                    b.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                    b.status === "CANCELLED" ? "bg-red-100 text-red-800 line-through" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {b.status}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
