"use client"

import { format, startOfWeek, addDays, isSameDay } from "date-fns"
import Link from "next/link"

export default function WeekView({ date, bookings, timeBlocks, exceptions, employees, role, employeeId, domain }: any) {
  const startDate = startOfWeek(date, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
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

      {/* Day Columns */}
      <div className="flex-1 flex divide-x">
        {days.map((day, i) => {
          const isToday = isSameDay(day, new Date())
          
          const dayBookings = bookings.filter((b: any) => isSameDay(new Date(b.startTime), day))
          const dayTimeBlocks = (timeBlocks || []).filter((tb: any) => isSameDay(new Date(tb.startTime), day))
          const dayExceptions = (exceptions || []).filter((ex: any) => isSameDay(new Date(ex.date), day))
          
          return (
            <div key={i} className="flex-1 relative min-w-[120px]">
              <div className={`h-12 border-b flex flex-col items-center justify-center sticky top-0 z-10 bg-white ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                <div className="text-xs font-bold uppercase">{format(day, "EEE")}</div>
                <div className={`text-sm ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{format(day, "d")}</div>
              </div>
              
              <div className="relative">
                {/* Grid lines */}
                {hours.map(h => (
                  <div key={h} className="h-20 border-b border-gray-100"></div>
                ))}

                {/* Exceptions (Vacations) */}
                {dayExceptions.map((ex: any) => {
                  const empName = employees.find((e:any)=>e.id === ex.employeeId)?.name?.split(' ')[0] || "Staff"
                  return (
                    <div 
                      key={ex.id}
                      className="absolute left-1 right-1 p-1 rounded shadow-sm overflow-hidden text-xs flex flex-col items-center justify-center bg-gray-200 text-gray-600 border border-gray-300"
                      style={{ top: '0px', height: '100%', zIndex: 3, opacity: 0.7 }}
                      title={`${ex.reason || "Unavailable"} - ${empName}`}
                    >
                      <div className="font-bold truncate">{ex.reason || "Away"}</div>
                      <div className="text-[10px] truncate">{empName}</div>
                    </div>
                  )
                })}
                
                {/* TimeBlocks (Lunch/Busy) */}
                {dayTimeBlocks.map((tb: any) => {
                  const bStart = new Date(tb.startTime)
                  const bEnd = new Date(tb.endTime)
                  const startHour = bStart.getHours() + bStart.getMinutes() / 60
                  const endHour = bEnd.getHours() + bEnd.getMinutes() / 60
                  const top = Math.max(0, (startHour - 8) * 80)
                  const height = Math.max(20, (endHour - Math.max(8, startHour)) * 80)
                  const empName = employees.find((e:any)=>e.id === tb.employeeId)?.name?.split(' ')[0] || "Staff"
                  
                  return (
                    <div 
                      key={tb.id}
                      className="absolute left-1 right-1 p-1 rounded shadow-sm overflow-hidden text-xs flex flex-col items-center justify-center bg-gray-200 text-gray-600 border border-gray-300 pattern-diagonal-lines-sm"
                      style={{ top: `${top}px`, height: `${height}px`, zIndex: 4, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.05) 5px, rgba(0,0,0,0.05) 10px)' }}
                      title={`${tb.reason || "Blocked"} - ${empName}`}
                    >
                      <div className="font-bold truncate">{tb.reason || "Blocked"}</div>
                      <div className="text-[10px] truncate">{empName}</div>
                    </div>
                  )
                })}
                
                {/* Bookings */}
                {dayBookings.map((b: any) => {
                  const bStart = new Date(b.startTime)
                  const bEnd = new Date(b.endTime)
                  
                  const startHour = bStart.getHours() + bStart.getMinutes() / 60
                  const endHour = bEnd.getHours() + bEnd.getMinutes() / 60
                  
                  const top = Math.max(0, (startHour - 8) * 80)
                  const height = Math.max(20, (endHour - Math.max(8, startHour)) * 80)
                  
                  const empName = b.employee?.name?.split(' ')[0] || "Staff"

                  return (
                    <Link 
                      href={`/${domain}/dashboard/bookings/${b.id}`}
                      key={b.id} 
                      className={`absolute left-1 right-1 p-1 rounded shadow-sm overflow-hidden text-xs transition hover:brightness-95 border ${
                        b.status === "PENDING" ? "bg-yellow-100 border-yellow-200 text-yellow-900" :
                        b.status === "CONFIRMED" ? "bg-blue-100 border-blue-200 text-blue-900" :
                        b.status === "COMPLETED" ? "bg-green-100 border-green-200 text-green-900" :
                        b.status === "CANCELLED" ? "bg-red-100 border-red-200 text-red-900 line-through opacity-70" :
                        "bg-gray-100 border-gray-200 text-gray-900"
                      }`}
                      style={{ top: `${top}px`, height: `${height}px`, zIndex: 5 }}
                      title={`${b.customer ? b.customer.firstName : b.oneTimeClient ? b.oneTimeClient.firstName : 'Client'} w/ ${empName}`}
                    >
                      <div className="font-bold truncate">
                        {b.customer ? b.customer.firstName : b.oneTimeClient ? b.oneTimeClient.firstName : "Unknown"}
                      </div>
                      <div className="text-[10px] truncate opacity-75">{empName}</div>
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
