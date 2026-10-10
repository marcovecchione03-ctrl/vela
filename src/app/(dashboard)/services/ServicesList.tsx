"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select } from "@/components/ui/select"
import { upsertCategory, upsertService } from "@/actions/services"

export function ServicesList({ categories, allLocations, allEmployees, currentUserRole }: any) {
  const [activeTab, setActiveTab] = useState("list")
  const [editingService, setEditingService] = useState<any>(null)
  
  const canEdit = currentUserRole === "OWNER"

  return (
    <div>
      {canEdit && (
        <div className="flex space-x-4 mb-6">
          <Button variant={activeTab === "list" ? "default" : "outline"} onClick={() => { setActiveTab("list"); setEditingService(null); }}>Services & Categories</Button>
          <Button variant={activeTab === "add_category" ? "default" : "outline"} onClick={() => { setActiveTab("add_category"); setEditingService(null); }}>New Category</Button>
          <Button variant={activeTab === "add_service" && !editingService ? "default" : "outline"} onClick={() => { setActiveTab("add_service"); setEditingService(null); }}>New Service</Button>
          <Button variant={activeTab === "add_combined" && !editingService ? "default" : "outline"} onClick={() => { setActiveTab("add_combined"); setEditingService(null); }}>New Combined Service</Button>
        </div>
      )}

      {activeTab === "list" && (
        <div className="space-y-8">
          {categories.length === 0 && (
            <p className="text-muted-foreground">No categories or services found.</p>
          )}
          {categories.map((cat: any) => (
            <div key={cat.id} className="p-4 border rounded-lg bg-card">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-xl font-bold">{cat.name}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.services.map((svc: any) => (
                  <div key={svc.id} className={`p-4 border rounded ${!svc.isActive ? "opacity-50" : ""}`}>
                    <h3 className="font-semibold text-lg">{svc.name}</h3>
                    <p className="text-muted-foreground text-sm">{svc.durationMinutes} min</p>
                    <p className="font-medium mt-2">
                      {svc.priceMode === "STARTING_FROM" ? "Da " : ""}€{(svc.price / 100).toFixed(2)}
                    </p>
                    {!svc.isActive && <span className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block">Inactive</span>}
                    {canEdit && (
                      <div className="mt-4 pt-2 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setEditingService(svc)
                            setActiveTab(svc.components?.length > 0 ? "add_combined" : "add_service")
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {cat.services.length === 0 && <p className="text-sm text-muted-foreground">No services in this category.</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "add_category" && (
        <CategoryForm onComplete={() => window.location.reload()} />
      )}

      {activeTab === "add_service" && (
        <ServiceForm 
          categories={categories} 
          locations={allLocations} 
          employees={allEmployees}
          initialData={editingService}
          onComplete={() => window.location.reload()} 
        />
      )}
      {activeTab === "add_combined" && (
        <CombinedServiceForm 
          categories={categories} 
          locations={allLocations} 
          employees={allEmployees}
          initialData={editingService}
          onComplete={() => window.location.reload()} 
        />
      )}
    </div>
  )
}

function CategoryForm({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await upsertCategory({ name, orderIndex: 0 })
      onComplete()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-sm p-4 border rounded bg-card">
      <div className="space-y-2">
        <Label>Category Name</Label>
        <Input required value={name} onChange={e => setName(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading}>Save Category</Button>
    </form>
  )
}

function ServiceForm({ categories, locations, employees, initialData, onComplete }: any) {
  const [name, setName] = useState(initialData?.name || "")
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || "")
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes?.toString() || "30")
  const [priceStr, setPriceStr] = useState(initialData ? (initialData.price / 100).toString() : "0")
  const [priceMode, setPriceMode] = useState<any>(initialData?.priceMode || "FIXED")
  const [selectedLocs, setSelectedLocs] = useState<string[]>(
    initialData?.locations ? initialData.locations.map((l: any) => l.locationId || l.id) : []
  )
  const [selectedEmps, setSelectedEmps] = useState<string[]>(
    initialData?.employees ? initialData.employees.map((e: any) => e.employeeId || e.id) : []
  )
  const [loading, setLoading] = useState(false)

  if (categories.length === 0) {
    return <p className="text-red-500">Please create a category first.</p>
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const priceCents = Math.round(parseFloat(priceStr) * 100)
      
      await upsertService({
        id: initialData?.id,
        categoryId,
        name,
        durationMinutes: parseInt(durationMinutes, 10),
        price: priceCents,
        priceMode,
        isActive: true,
        concurrentCapacity: initialData?.concurrentCapacity || 1,
        availableDays: initialData?.availableDays || [0, 1, 2, 3, 4, 5, 6],
        locationIds: selectedLocs,
        employeeIds: selectedEmps
      })
      onComplete()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  function toggleLocation(id: string) {
    setSelectedLocs(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])
  }

  function toggleEmployee(id: string) {
    setSelectedEmps(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl p-6 border rounded bg-card">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Name</Label>
          <Input required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Duration (mins)</Label>
          <Input type="number" required min="5" value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Price (€)</Label>
          <Input type="number" step="0.01" min="0" required value={priceStr} onChange={e => setPriceStr(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Price Mode</Label>
          <Select value={priceMode} onChange={e => setPriceMode(e.target.value)}>
            <option value="FIXED">Fixed</option>
            <option value="STARTING_FROM">Starting From</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Available Locations</Label>
        <div className="flex gap-4">
          {locations.map((loc: any) => (
            <div key={loc.id} className="flex items-center space-x-2">
              <Checkbox id={`sloc-${loc.id}`} checked={selectedLocs.includes(loc.id)} onChange={() => toggleLocation(loc.id)} />
              <Label htmlFor={`sloc-${loc.id}`}>{loc.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Enabled Employees</Label>
        <div className="flex gap-4 flex-wrap">
          {employees.map((emp: any) => (
            <div key={emp.id} className="flex items-center space-x-2">
              <Checkbox id={`semp-${emp.id}`} checked={selectedEmps.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
              <Label htmlFor={`semp-${emp.id}`}>{emp.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={loading}>Save Service</Button>
    </form>
  )
}

import { upsertCombinedService } from "@/actions/services"

function CombinedServiceForm({ categories, locations, employees, initialData, onComplete }: any) {
  const [name, setName] = useState(initialData?.name || "")
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories[0]?.id || "")
  const [priceStr, setPriceStr] = useState(initialData ? (initialData.price / 100).toString() : "0")
  const [selectedServices, setSelectedServices] = useState<string[]>(
    initialData?.components ? initialData.components.map((c: any) => c.componentId || c.serviceId) : []
  )
  const [selectedLocs, setSelectedLocs] = useState<string[]>(
    initialData?.locations ? initialData.locations.map((l: any) => l.locationId || l.id) : []
  )
  const [selectedEmps, setSelectedEmps] = useState<string[]>(
    initialData?.employees ? initialData.employees.map((e: any) => e.employeeId || e.id) : []
  )
  const [loading, setLoading] = useState(false)

  if (categories.length === 0) return <p>Please create a category first.</p>

  const allBaseServices = categories.flatMap((c: any) => c.services)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (selectedServices.length < 2) return alert("Select at least 2 services")
    setLoading(true)
    try {
      const priceCents = Math.round(parseFloat(priceStr) * 100)
      
      await upsertCombinedService({
        id: initialData?.id,
        categoryId,
        name,
        price: priceCents,
        priceMode: "FIXED",
        isActive: true,
        components: selectedServices.map((id, idx) => ({ serviceId: id, orderIndex: idx })),
        locationIds: selectedLocs,
        employeeIds: selectedEmps
      })
      onComplete()
    } catch (err: any) {
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl p-6 border rounded bg-card">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Combined Service Name</Label>
          <Input required value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Price (€)</Label>
        <Input type="number" step="0.01" min="0" required value={priceStr} onChange={e => setPriceStr(e.target.value)} />
      </div>

      <div className="space-y-2 border p-4 rounded">
        <Label className="mb-2 block">Components (Select at least 2)</Label>
        <div className="grid gap-2">
          {allBaseServices.map((svc: any) => (
            <div key={svc.id} className="flex items-center space-x-2">
              <Checkbox 
                id={`comp-${svc.id}`} 
                checked={selectedServices.includes(svc.id)} 
                onChange={() => setSelectedServices(p => p.includes(svc.id) ? p.filter(id => id !== svc.id) : [...p, svc.id])} 
              />
              <Label htmlFor={`comp-${svc.id}`}>{svc.name}</Label>
            </div>
          ))}
        </div>
      </div>
      <Button type="submit" disabled={loading}>Save Combined Service</Button>
    </form>
  )
}

