"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookingStatus, Role } from "@prisma/client"
import { isValidTransition } from "@/lib/booking-engine/status-machine"
import { updateAppointmentStatus } from "@/actions/appointments"

export default function BookingStatusActions({
  tenantId,
  userId,
  bookingId,
  currentStatus,
  role,
  compact = false
}: {
  tenantId: string
  userId: string
  bookingId: string
  currentStatus: BookingStatus
  role: Role
  compact?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleStatusChange = async (newStatus: BookingStatus) => {
    setLoading(true)
    setMenuOpen(false)
    try {
      await updateAppointmentStatus(tenantId, userId, bookingId, newStatus)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!menuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false)
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("mousedown", handleClickOutside)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuOpen])

  const canConfirm = isValidTransition(currentStatus, "CONFIRMED", role)
  const canCancel = isValidTransition(currentStatus, "CANCELLED", role)
  const canArrive = isValidTransition(currentStatus, "ARRIVED", role)
  const canInProgress = isValidTransition(currentStatus, "IN_PROGRESS", role)
  const canComplete = isValidTransition(currentStatus, "COMPLETED", role)
  const canNoShow = isValidTransition(currentStatus, "NO_SHOW", role)

  const hasTransitions =
    canConfirm || canArrive || canInProgress || canComplete || canNoShow || canCancel

  if (compact) {
    return (
      <div ref={containerRef} className="relative inline-flex items-center">
        <button
          type="button"
          disabled={loading}
          aria-label="Azioni prenotazione"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen(prev => !prev)}
          className="relative size-[28.535px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 after:content-[''] after:absolute after:-inset-2"
        >
          <img
            alt=""
            src="/figma/fi-rr-menu-dots.svg"
            className="w-[15px] h-[3.5px] pointer-events-none"
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label="Menu azioni prenotazione"
            className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[190px] vela-figma-floating bg-[#131c38]/95 backdrop-blur-3xl border border-white/20 rounded-[16px] p-1.5 shadow-2xl flex flex-col gap-0.5 text-left"
          >
            <Link
              href={`/dashboard/bookings/${bookingId}`}
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2 text-[11px] font-medium text-white/90 hover:text-white hover:bg-white/15 rounded-[10px] transition-colors flex items-center justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span>Dettagli prenotazione</span>
              <span aria-hidden="true" className="text-white/50">→</span>
            </Link>

            {hasTransitions && <div className="my-1 h-px bg-white/10" />}

            {canConfirm && (
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => handleStatusChange("CONFIRMED")}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-emerald-300 hover:text-white hover:bg-emerald-500/25 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Conferma prenotazione
              </button>
            )}

            {canArrive && (
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => handleStatusChange("ARRIVED")}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-amber-200 hover:text-white hover:bg-amber-500/25 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Segna come arrivato
              </button>
            )}

            {canInProgress && (
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => handleStatusChange("IN_PROGRESS")}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-amber-300 hover:text-white hover:bg-amber-500/25 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Inizia servizio
              </button>
            )}

            {canComplete && (
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => handleStatusChange("COMPLETED")}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-sky-300 hover:text-white hover:bg-sky-500/25 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Segna come completata
              </button>
            )}

            {canNoShow && (
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => handleStatusChange("NO_SHOW")}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-white/75 hover:text-white hover:bg-white/15 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Segna No-Show
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                role="menuitem"
                disabled={loading}
                onClick={() => handleStatusChange("CANCELLED")}
                className="w-full text-left px-3 py-2 text-[11px] font-medium text-rose-300 hover:text-white hover:bg-rose-500/25 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Annulla prenotazione
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canConfirm && (
        <button disabled={loading} onClick={() => handleStatusChange("CONFIRMED")} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          Mark Confirmed
        </button>
      )}
      {canArrive && (
        <button disabled={loading} onClick={() => handleStatusChange("ARRIVED")} className="px-4 py-2 bg-yellow-600 text-white rounded text-sm font-medium hover:bg-yellow-700 disabled:opacity-50">
          Mark Arrived
        </button>
      )}
      {canInProgress && (
        <button disabled={loading} onClick={() => handleStatusChange("IN_PROGRESS")} className="px-4 py-2 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
          Start Service
        </button>
      )}
      {canComplete && (
        <button disabled={loading} onClick={() => handleStatusChange("COMPLETED")} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          Mark Completed
        </button>
      )}
      {canNoShow && (
        <button disabled={loading} onClick={() => handleStatusChange("NO_SHOW")} className="px-4 py-2 bg-gray-600 text-white rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50">
          No-Show
        </button>
      )}
      {canCancel && (
        <button disabled={loading} onClick={() => handleStatusChange("CANCELLED")} className="px-4 py-2 border border-red-600 text-red-600 rounded text-sm font-medium hover:bg-red-50 disabled:opacity-50">
          Cancel Booking
        </button>
      )}
    </div>
  )
}
