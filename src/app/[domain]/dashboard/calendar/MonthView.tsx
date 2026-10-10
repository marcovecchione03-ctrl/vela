"use client"

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay } from "date-fns"
import Link from "next/link"

export default function MonthView({ date, bookings, timeBlocks, exceptions, domain }: any) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days = []
  let day = startDate
  while (day <= endDate) {
    days.push(day)
    day = addDays(day, 1)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-gray-50 shrink-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-bold text-gray-500 uppercase">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-6">
        {days.map((d, i) => {
          const isCurrentMonth = isSameMonth(d, monthStart)
          const isToday = isSameDay(d, new Date())
          const dayBookings = bookings.filter((b: any) => isSameDay(new Date(b.startTime), d))

          const dayTimeBlocks = (timeBlocks || []).filter((tb: any) => isSameDay(new Date(tb.startTime), d))
          const dayExceptions = (exceptions || []).filter((ex: any) => isSameDay(new Date(ex.date), d))

          return (
            <div key={i} className={`border-b border-r p-1 overflow-hidden flex flex-col ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}`}>
              <div className={`text-right text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                <span className={isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 inline-flex items-center justify-center' : ''}>
                  {format(d, "d")}
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-1 no-scrollbar">
                {dayExceptions.map((ex: any) => (
                  <div key={ex.id} className="block px-1 py-0.5 text-[10px] md:text-xs truncate rounded bg-gray-200 text-gray-700">
                    Away
                  </div>
                ))}
                {dayTimeBlocks.map((tb: any) => (
                  <div key={tb.id} className="block px-1 py-0.5 text-[10px] md:text-xs truncate rounded bg-gray-200 text-gray-700">
                    {format(new Date(tb.startTime), "HH:mm")} Blocked
                  </div>
                ))}
                {dayBookings.slice(0, 4 - dayExceptions.length - dayTimeBlocks.length).map((b: any) => (
                  <Link
                    href={`/${domain}/dashboard/bookings/${b.id}`}
                    key={b.id}
                    className={`block px-1 py-0.5 text-[10px] md:text-xs truncate rounded ${
                      b.status === "PENDING" ? "bg-yellow-100 text-yellow-900" :
                      b.status === "CONFIRMED" ? "bg-blue-100 text-blue-900" :
                      b.status === "COMPLETED" ? "bg-green-100 text-green-900" :
                      b.status === "CANCELLED" ? "bg-red-100 text-red-900 line-through" :
                      "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {format(new Date(b.startTime), "HH:mm")} {b.customer ? b.customer.firstName : b.oneTimeClient?.firstName}
                  </Link>
                ))}
                {dayBookings.length > (4 - dayExceptions.length - dayTimeBlocks.length) && (
                  <div className="text-[10px] text-gray-500 text-center">
                    +more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
