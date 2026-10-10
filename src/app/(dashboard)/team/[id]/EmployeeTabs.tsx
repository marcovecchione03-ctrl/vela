"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { updateEmployeeProfile } from "@/actions/employee"
import { setRecurringAvailability } from "@/actions/availability"

export function EmployeeTabs({ employee, locations, currentUserRole }: any) {
  const [activeTab, setActiveTab] = useState("profile")

  return (
    <div>
      <div className="flex space-x-4 border-b mb-6">
        <button 
          className={`pb-2 ${activeTab === "profile" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("profile")}
        >
          Profile & Locations
        </button>
        <button 
          className={`pb-2 ${activeTab === "schedule" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("schedule")}
        >
          Availability
        </button>
        <button 
          className={`pb-2 ${activeTab === "timeblocks" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("timeblocks")}
        >
          Time Blocks
        </button>
        <button 
          className={`pb-2 ${activeTab === "vacations" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("vacations")}
        >
          Vacations
        </button>
        <button 
          className={`pb-2 ${activeTab === "requests" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          onClick={() => setActiveTab("requests")}
        >
          Requests
        </button>
      </div>

      {activeTab === "profile" && (
        <ProfileForm employee={employee} locations={locations} currentUserRole={currentUserRole} />
      )}
      
      {activeTab === "schedule" && (
        <ScheduleForm employee={employee} currentUserRole={currentUserRole} />
      )}

      {activeTab === "timeblocks" && (
        <TimeBlockForm employee={employee} currentUserRole={currentUserRole} />
      )}

      {activeTab === "vacations" && (
        <VacationForm employee={employee} currentUserRole={currentUserRole} />
      )}

      {activeTab === "requests" && (
        <RequestsForm employee={employee} currentUserRole={currentUserRole} />
      )}
    </div>
  )
}

function ProfileForm({ employee, locations, currentUserRole }: any) {
  const [name, setName] = useState(employee.name || "")
  const [surname, setSurname] = useState(employee.surname || "")
  const [bio, setBio] = useState(employee.bio || "")
  const [jobTitle, setJobTitle] = useState(employee.jobTitle || "")
  const [isActive, setIsActive] = useState(employee.isActive)
  const [publicVisibility, setPublicVisibility] = useState(employee.publicVisibility)
  
  const initialLocs = employee.locations.map((l: any) => l.locationId)
  const [selectedLocs, setSelectedLocs] = useState<string[]>(initialLocs)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const canEdit = currentUserRole === "OWNER" || (currentUserRole === "ADMIN" && employee.tenantMembership.role === "EMPLOYEE")

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      await updateEmployeeProfile({
        employeeId: employee.id,
        name,
        surname,
        bio,
        jobTitle,
        isActive,
        publicVisibility,
        locationIds: selectedLocs
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleLocation(id: string) {
    setSelectedLocs(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-xl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input required value={name} onChange={e => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input value={surname} onChange={e => setSurname(e.target.value)} disabled={!canEdit} />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Job Title</Label>
        <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} disabled={!canEdit} />
      </div>

      <div className="space-y-2">
        <Label>Locations</Label>
        <div className="space-y-2 border rounded-md p-4 bg-card">
          {locations.map((loc: any) => (
            <div key={loc.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`loc-${loc.id}`} 
                checked={selectedLocs.includes(loc.id)}
                onChange={() => toggleLocation(loc.id)}
                disabled={!canEdit}
              />
              <Label htmlFor={`loc-${loc.id}`}>{loc.name}</Label>
            </div>
          ))}
          {locations.length === 0 && <p className="text-sm text-muted-foreground">No locations available.</p>}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="isActive" 
            checked={isActive} 
            onChange={(e) => setIsActive(e.target.checked)} 
            disabled={!canEdit} 
          />
          <Label htmlFor="isActive">Account Active (can login and be booked)</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="publicVisibility" 
            checked={publicVisibility} 
            onChange={(e) => setPublicVisibility(e.target.checked)} 
            disabled={!canEdit} 
          />
          <Label htmlFor="publicVisibility">Public Visibility (visible to customers)</Label>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">Profile updated successfully.</p>}

      {canEdit && (
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      )}
    </form>
  )
}

function ScheduleForm({ employee, currentUserRole }: any) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  
  // Initialize state based on existing rules or defaults
  const [rules, setRules] = useState(() => {
    return days.map((_, index) => {
      const existing = employee.availabilityRules.find((r: any) => r.dayOfWeek === index)
      return {
        dayOfWeek: index,
        isActive: existing ? existing.isActive : (index > 0 && index < 6), // M-F default
        startTime: existing ? existing.startTime : "09:00",
        endTime: existing ? existing.endTime : "17:00",
      }
    })
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      const activeRules = rules.filter(r => r.isActive)
      await setRecurringAvailability({
        employeeId: employee.id,
        rules: activeRules
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateRule(index: number, field: string, value: any) {
    setRules(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center space-x-4 p-4 border rounded-md bg-card">
            <div className="w-32 flex items-center space-x-2">
              <Checkbox 
                id={`day-${index}`} 
                checked={rule.isActive} 
                onChange={(e) => updateRule(index, "isActive", e.target.checked)}
                disabled={!canEdit}
              />
              <Label htmlFor={`day-${index}`} className="font-medium">{days[index]}</Label>
            </div>
            
            {rule.isActive ? (
              <div className="flex items-center space-x-2 flex-1">
                <Input 
                  type="time" 
                  value={rule.startTime} 
                  onChange={e => updateRule(index, "startTime", e.target.value)}
                  disabled={!canEdit}
                  required
                />
                <span>to</span>
                <Input 
                  type="time" 
                  value={rule.endTime} 
                  onChange={e => updateRule(index, "endTime", e.target.value)}
                  disabled={!canEdit}
                  required
                />
              </div>
            ) : (
              <div className="flex-1 text-muted-foreground text-sm">Off</div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-500 text-sm">Schedule updated successfully.</p>}

      {canEdit && (
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save Schedule"}
        </Button>
      )}
    </form>
  )
}

import { createTimeBlock, createAvailabilityException } from "@/actions/availability"

function TimeBlockForm({ employee, currentUserRole }: any) {
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  // Employee can only create time block for themselves (or OWNER/ADMIN can)
  const canEdit = currentUserRole === "OWNER" || currentUserRole === "ADMIN" || currentUserRole === "EMPLOYEE"

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createTimeBlock({
        employeeId: employee.id,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        reason
      })
      alert("Time block created successfully")
      setStart("")
      setEnd("")
      setReason("")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-sm p-4 border rounded bg-card">
      <h3 className="font-bold">Add Temporary Block</h3>
      <div className="space-y-2">
        <Label>Start Time</Label>
        <Input type="datetime-local" required value={start} onChange={e => setStart(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>End Time</Label>
        <Input type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Reason (optional)</Label>
        <Input value={reason} onChange={e => setReason(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading || !canEdit}>Save Time Block</Button>
    </form>
  )
}

function VacationForm({ employee, currentUserRole }: any) {
  const [date, setDate] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  const canEdit = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await createAvailabilityException({
        employeeId: employee.id,
        date: new Date(date).toISOString(),
        isClosed: true,
        reason
      })
      alert("Vacation added successfully")
      setDate("")
      setReason("")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-sm p-4 border rounded bg-card">
      <h3 className="font-bold">Add Vacation/Absence</h3>
      {!canEdit && <p className="text-red-500 text-sm">Only Owners and Admins can manage vacations.</p>}
      <div className="space-y-2">
        <Label>Date</Label>
        <Input type="date" required value={date} onChange={e => setDate(e.target.value)} disabled={!canEdit} />
      </div>
      <div className="space-y-2">
        <Label>Reason (optional)</Label>
        <Input value={reason} onChange={e => setReason(e.target.value)} disabled={!canEdit} />
      </div>
      <Button type="submit" disabled={loading || !canEdit}>Save Vacation</Button>
    </form>
  )
}

import { requestAvailabilityChange, respondToAvailabilityRequest } from "@/actions/availability"

function RequestsForm({ employee, currentUserRole }: any) {
  const [changes, setChanges] = useState("")
  const [loading, setLoading] = useState(false)

  const isEmployee = currentUserRole === "EMPLOYEE"
  const canApprove = currentUserRole === "OWNER" || currentUserRole === "ADMIN"

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await requestAvailabilityChange({
        employeeId: employee.id,
        requestedChanges: changes
      })
      alert("Request submitted successfully")
      setChanges("")
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRespond(requestId: string, approve: boolean) {
    try {
      await respondToAvailabilityRequest(requestId, approve)
      alert(approve ? "Request approved" : "Request rejected")
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-8">
      {isEmployee && (
        <form onSubmit={handleRequest} className="space-y-4 max-w-lg p-4 border rounded bg-card">
          <h3 className="font-bold">Submit Change Request</h3>
          <p className="text-sm text-muted-foreground">Propose new recurring hours or long-term schedule changes.</p>
          <div className="space-y-2">
            <Label>Requested Changes</Label>
            <textarea 
              required 
              value={changes} 
              onChange={e => setChanges(e.target.value)} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="e.g. I would like to change my Tuesdays to 09:00 - 14:00"
            />
          </div>
          <Button type="submit" disabled={loading}>Submit Request</Button>
        </form>
      )}

      <div>
        <h3 className="font-bold mb-4">Request History</h3>
        {employee.availabilityRequests?.length === 0 && (
          <p className="text-muted-foreground">No requests found.</p>
        )}
        <div className="space-y-4">
          {employee.availabilityRequests?.map((req: any) => (
            <div key={req.id} className="p-4 border rounded space-y-2 bg-card">
              <div className="flex justify-between">
                <span className="font-medium text-sm">{new Date(req.createdAt).toLocaleDateString()}</span>
                <span className={`text-xs px-2 py-1 rounded font-bold ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : req.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{req.requestedChanges}</p>
              
              {canApprove && req.status === 'PENDING' && (
                <div className="flex space-x-2 pt-2">
                  <Button size="sm" onClick={() => handleRespond(req.id, true)}>Approve</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleRespond(req.id, false)}>Reject</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
