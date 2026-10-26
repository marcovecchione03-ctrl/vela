"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { addInternalNote } from "@/actions/appointments"

export interface BookingNotePillProps {
  tenantId: string
  userId: string
  bookingId: string
  initialNote?: string | null
  variant?: "mobile" | "desktop"
}

export default function BookingNotePill({
  tenantId,
  userId,
  bookingId,
  initialNote = null,
  variant = "mobile"
}: BookingNotePillProps) {
  const router = useRouter()
  const [note, setNote] = useState(initialNote || "")
  const [savedNote, setSavedNote] = useState(initialNote || "")
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = note.trim()
    if (!trimmed || trimmed === savedNote || saving) return

    setSaving(true)
    try {
      await addInternalNote(tenantId, userId, bookingId, trimmed)
      setSavedNote(trimmed)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className={`bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/[0.07] rounded-[11px] pl-[8px] pr-[12px] py-[7px] flex items-center gap-[5px] transition-colors focus-within:border-white/35 focus-within:ring-1 focus-within:ring-white/40 ${
        variant === "desktop" ? "w-[96px] xl:w-[140px] min-[1400px]:w-[161px]" : "w-full"
      }`}
    >
      <img
        alt=""
        src="/figma/fi-rr-comment.svg"
        className="size-[9px] shrink-0 pointer-events-none"
      />
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        disabled={saving}
        aria-label="Nota prenotazione"
        placeholder="Aggiungi una nota..."
        className={`w-full min-w-0 bg-transparent border-none outline-none font-normal leading-normal truncate ${
          variant === "desktop" ? "text-[11px]" : "text-[8px] sm:text-[10px]"
        } ${
          note
            ? "text-white/90"
            : "text-[var(--textdeselected,#8c95a9)]"
        } placeholder:text-[var(--textdeselected,#8c95a9)]`}
      />
    </form>
  )
}
