"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { inviteMember, revokeInvitation } from "@/actions/team"
import { Role } from "@prisma/client"

export function TeamList({ employees, pendingInvitations, currentUserRole }: any) {
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("EMPLOYEE")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successLink, setSuccessLink] = useState("")

  const canInvite = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessLink("")

    try {
      const res = await inviteMember({ email: inviteEmail, role: inviteRole })
      if (res.success && res.inviteLink) {
        setSuccessLink(res.inviteLink)
        setInviteEmail("")
      } else {
        setError("Failed to invite member.")
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this invitation?")) return
    try {
      await revokeInvitation(id)
      window.location.reload()
    } catch (err: any) {
      alert(err.message || "Failed to revoke")
    }
  }

  return (
    <div className="space-y-8">
      {canInvite && (
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Invite Team Member</h2>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="w-full">
              <Label>Email</Label>
              <Input 
                type="email" 
                required 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                placeholder="mario@example.com" 
              />
            </div>
            <div className="w-full sm:w-48">
              <Label>Role</Label>
              <Select 
                value={inviteRole} 
                onChange={e => setInviteRole(e.target.value as Role)}
              >
                <option value="EMPLOYEE">Employee</option>
                {currentUserRole === "OWNER" && <option value="ADMIN">Admin</option>}
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Invite"}
            </Button>
          </form>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {successLink && (
            <div className="mt-4 p-4 bg-green-50/10 border border-green-500 rounded text-sm break-all">
              <p className="font-semibold text-green-500 mb-2">Development Invite Link Generated:</p>
              <a href={successLink} target="_blank" className="text-blue-500 underline">{successLink}</a>
              <p className="text-xs text-muted-foreground mt-1">Copy this link or click it to accept the invitation in a new window.</p>
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Active Team</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp: any) => (
            <div key={emp.id} className="p-4 bg-card rounded-lg border flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-semibold">
                {emp.name[0]}{emp.surname?.[0]}
              </div>
              <div>
                <p className="font-medium">{emp.name} {emp.surname}</p>
                <p className="text-sm text-muted-foreground">{emp.tenantMembership.role}</p>
              </div>
            </div>
          ))}
          {employees.length === 0 && <p className="text-muted-foreground">No active team members found.</p>}
        </div>
      </div>

      {pendingInvitations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingInvitations.map((inv: any) => (
              <div key={inv.id} className="p-4 bg-card rounded-lg border">
                <p className="font-medium truncate">{inv.email}</p>
                <p className="text-sm text-muted-foreground mb-4">Role: {inv.role}</p>
                <Button variant="destructive" size="sm" onClick={() => handleRevoke(inv.id)}>
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
