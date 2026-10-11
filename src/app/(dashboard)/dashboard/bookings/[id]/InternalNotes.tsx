"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addInternalNote } from "@/actions/appointments"
import { format } from "date-fns"

export default function InternalNotes({
  tenantId,
  userId,
  bookingId,
  notes,
  initialCustomerNote
}: {
  tenantId: string
  userId: string
  bookingId: string
  notes: any[]
  initialCustomerNote?: string | null
}) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    try {
      await addInternalNote(tenantId, userId, bookingId, content)
      setContent("")
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow border p-6 flex flex-col h-full">
      <h3 className="font-bold mb-4">Notes</h3>
      
      {initialCustomerNote && (
        <div className="mb-4 p-3 bg-yellow-50 text-yellow-900 rounded text-sm">
          <strong>Customer Note:</strong>
          <p className="mt-1">{initialCustomerNote}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto max-h-60 mb-4 space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No internal notes.</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="p-3 bg-gray-50 rounded border text-sm">
              <div className="whitespace-pre-wrap mb-2">{note.content}</div>
              <div className="text-xs text-gray-400 flex justify-between">
                <span>Staff</span>
                <span>{format(new Date(note.createdAt), "MMM d, h:mm a")}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-auto">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add an internal note..."
          className="w-full p-3 border rounded text-sm mb-2 focus:ring-2 focus:ring-blue-600 outline-none"
          rows={3}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="w-full py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-black disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Note"}
        </button>
      </form>
    </div>
  )
}
