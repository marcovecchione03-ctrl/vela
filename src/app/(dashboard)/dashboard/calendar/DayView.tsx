"use client"

import { format, startOfDay } from "date-fns"
import Link from "next/link"

export default function DayView({ date, bookings, timeBlocks, exceptions, employees, role, employeeId, domain }: any) {
  const visibleEmployees = role === "EMPLOYEE" 
    ? employees.filter((e: any) => e.id === employeeId) 
    : employees

  // Filter bookings to just this day exactly (though they should be already if server query was exact)
  const start = startOfDay(date).getTime()
  const end = start + 86400000
  const dayBookings = bookings.filter((b: any) => {
    const time = new Date(b.startTime).getTime()
    return time >= start && time < end
  })

  // Hours to show (e.g., 8am to 8pm)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8)

  return (
    <div className="flex h-full min-w-[800px]">
      {/* Time axis */}
      <div className="w-20 shrink-0 border-r bg-white sticky left-0 z-10">
        <div className="h-12 border-b"></div> {/* Header spacer */}
        {hours.map(h => (
          <div key={h} className="h-20 border-b text-xs text-right pr-2 text-gray-500 pt-2 relative">
            {h > 12 ? `${h - 12} PM` : h === 12 ? '12 PM' : `${h} AM`}
            <span className="absolute right-0 top-0 w-2 border-t"></span>
          </div>
        ))}
      </div>

      {/* Employee Columns */}
      <div className="flex-1 flex divide-x">
        {visibleEmployees.map((emp: any) => {
          const empBookings = dayBookings.filter((b: any) => b.employeeId === emp.id)
          const empTimeBlocks = (timeBlocks || []).filter((tb: any) => 
            tb.employeeId === emp.id && 
            new Date(tb.startTime).getTime() >= start && 
            new Date(tb.endTime).getTime() <= end
          )
          const empExceptions = (exceptions || []).filter((ex: any) => 
            ex.employeeId === emp.id && 
            new Date(ex.date).getTime() >= start && 
            new Date(ex.date).getTime() < end
          )
          
          return (
            <div key={emp.id} className="flex-1 relative min-w-[200px]">
              <div className="h-12 border-b bg-gray-50 flex items-center justify-center font-bold sticky top-0 z-10 truncate px-2">
                {emp.name}
              </div>
              
              <div className="relative">
                {/* Grid lines */}
                {hours.map(h => (
                  <div key={h} className="h-20 border-b border-gray-100"></div>
                ))}
                {/* Exceptions (Vacations) */}
                {empExceptions.length > 0 && (
                  <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center z-20 backdrop-blur-[1px]">
                    <div className="bg-white px-4 py-2 rounded-full font-bold shadow text-gray-700 whitespace-nowrap rotate-[-45deg]">
                      {empExceptions[0].reason || "Unavailable"}
                    </div>
                  </div>
                )}
                
                {/* TimeBlocks (Lunch/Busy) */}
                {!empExceptions.length && empTimeBlocks.map((tb: any) => {
                  const bStart = new Date(tb.startTime)
                  const bEnd = new Date(tb.endTime)
                  const startHour = bStart.getHours() + bStart.getMinutes() / 60
                  const endHour = bEnd.getHours() + bEnd.getMinutes() / 60
                  const top = Math.max(0, (startHour - 8) * 80)
                  const height = Math.max(20, (endHour - Math.max(8, startHour)) * 80)
                  
                  return (
                    <div 
                      key={tb.id}
                      className="absolute left-1 right-1 p-2 rounded shadow-sm overflow-hidden text-xs flex items-center justify-center bg-gray-200 text-gray-600 border border-gray-300 pattern-diagonal-lines-sm"
                      style={{ top: `${top}px`, height: `${height}px`, zIndex: 4, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px)' }}
                      title={tb.reason || "Blocked Time"}
                    >
                      <div className="font-bold truncate">{tb.reason || "Blocked"}</div>
                    </div>
                  )
                })}

                {/* Bookings */}
                {!empExceptions.length && empBookings.map((b: any) => {
                  const bStart = new Date(b.startTime)
                  const bEnd = new Date(b.endTime)
                  
                  const startHour = bStart.getHours() + bStart.getMinutes() / 60
                  const endHour = bEnd.getHours() + bEnd.getMinutes() / 60
                  
                  // Limit bounds to visible hours (8 to 21)
                  const top = Math.max(0, (startHour - 8) * 80) // 80px per hour
                  const height = Math.max(20, (endHour - Math.max(8, startHour)) * 80)
                  
                  return (
                    <Link 
                      href={`/dashboard/bookings/${b.id}`}
                      key={b.id} 
                      className={`absolute left-1 right-1 p-2 rounded shadow-sm overflow-hidden text-xs transition hover:brightness-95 border ${
                        b.status === "PENDING" ? "bg-yellow-100 border-yellow-200 text-yellow-900" :
                        b.status === "CONFIRMED" ? "bg-blue-100 border-blue-200 text-blue-900" :
                        b.status === "COMPLETED" ? "bg-green-100 border-green-200 text-green-900" :
                        b.status === "CANCELLED" ? "bg-red-100 border-red-200 text-red-900 line-through opacity-70" :
                        "bg-gray-100 border-gray-200 text-gray-900"
                      }`}
                      style={{ top: `${top}px`, height: `${height}px`, zIndex: 5 }}
                    >
                      <div className="font-bold truncate">
                        {b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : b.oneTimeClient ? `${b.oneTimeClient.firstName} ${b.oneTimeClient.lastName}` : "Unknown"}
                      </div>
                      <div className="truncate opacity-80">{b.services.map((s:any)=>s.serviceName).join(", ")}</div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
