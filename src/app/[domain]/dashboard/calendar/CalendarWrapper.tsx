"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from "date-fns"
import Link from "next/link"

import DayView from "./DayView"
import WeekView from "./WeekView"
import MonthView from "./MonthView"
import AgendaView from "./AgendaView"

export default function CalendarWrapper({
  domain,
  tenantId,
  initialView,
  initialDate,
  bookings,
  timeBlocks,
  exceptions,
  employees,
  role,
  employeeId
}: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [currentDate, setCurrentDate] = useState(new Date(initialDate))
  const [view, setView] = useState(initialView)

  // Sync state to URL without full refresh to fetch new data
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", view)
    params.set("date", format(currentDate, "yyyy-MM-dd"))
    router.push(`${pathname}?${params.toString()}`)
  }, [currentDate, view, pathname, router, searchParams])

  const handlePrev = () => {
    if (view === "DAY" || view === "AGENDA") setCurrentDate(d => subDays(d, 1))
    else if (view === "WEEK") setCurrentDate(d => subWeeks(d, 1))
    else if (view === "MONTH") setCurrentDate(d => subMonths(d, 1))
  }

  const handleNext = () => {
    if (view === "DAY" || view === "AGENDA") setCurrentDate(d => addDays(d, 1))
    else if (view === "WEEK") setCurrentDate(d => addWeeks(d, 1))
    else if (view === "MONTH") setCurrentDate(d => addMonths(d, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const dateLabel = () => {
    if (view === "DAY" || view === "AGENDA") return format(currentDate, "MMMM d, yyyy")
    if (view === "WEEK") return `Week of ${format(currentDate, "MMMM d")}`
    if (view === "MONTH") return format(currentDate, "MMMM yyyy")
    return format(currentDate, "MMMM d, yyyy")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 border-b bg-gray-50 shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={handleToday} className="px-4 py-2 bg-white border shadow-sm rounded font-medium text-sm hover:bg-gray-50">
            Today
          </button>
          <div className="flex items-center">
            <button onClick={handlePrev} className="p-2 bg-white border shadow-sm rounded-l hover:bg-gray-50">
              &lt;
            </button>
            <button onClick={handleNext} className="p-2 bg-white border-y border-r shadow-sm rounded-r hover:bg-gray-50">
              &gt;
            </button>
          </div>
          <h2 className="text-xl font-bold min-w-[200px]">{dateLabel()}</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-gray-200 p-1 rounded-lg">
            {["DAY", "WEEK", "MONTH", "AGENDA"].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition ${view === v ? 'bg-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {v.charAt(0) + v.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <Link 
            href={`/${domain}/dashboard/bookings/new`}
            className="px-4 py-2 bg-black text-white rounded font-medium text-sm shadow hover:bg-gray-800"
          >
            + New
          </Link>
        </div>
      </div>

      {/* Calendar Body Area */}
      <div className="flex-1 overflow-auto bg-white relative">
        {view === "DAY" && <DayView date={currentDate} bookings={bookings} timeBlocks={timeBlocks} exceptions={exceptions} employees={employees} role={role} employeeId={employeeId} domain={domain} />}
        {view === "WEEK" && <WeekView date={currentDate} bookings={bookings} timeBlocks={timeBlocks} exceptions={exceptions} employees={employees} role={role} employeeId={employeeId} domain={domain} />}
        {view === "MONTH" && <MonthView date={currentDate} bookings={bookings} timeBlocks={timeBlocks} exceptions={exceptions} domain={domain} />}
        {view === "AGENDA" && <AgendaView date={currentDate} bookings={bookings} timeBlocks={timeBlocks} exceptions={exceptions} domain={domain} />}
      </div>
    </div>
  )
}
