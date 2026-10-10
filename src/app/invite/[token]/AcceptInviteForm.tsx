"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { acceptInvitation } from "@/actions/team"

export function AcceptInviteForm({ token, email }: { token: string, email: string }) {
  const router = useRouter()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await acceptInvitation(token, firstName, lastName)
      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleAccept} className="space-y-4">
      <div className="p-3 bg-muted rounded mb-4">
        <p className="text-sm font-medium">Logged in as: {email}</p>
      </div>
      
      <div className="space-y-2">
        <Label>First Name</Label>
        <Input required value={firstName} onChange={e => setFirstName(e.target.value)} />
      </div>
      
      <div className="space-y-2">
        <Label>Last Name</Label>
        <Input required value={lastName} onChange={e => setLastName(e.target.value)} />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Accepting..." : "Accept Invitation"}
      </Button>
    </form>
  )
}
