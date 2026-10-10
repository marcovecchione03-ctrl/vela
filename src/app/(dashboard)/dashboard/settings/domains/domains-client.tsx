"use client"

import { useState } from "react"
import { addDomain, verifyDomain, removeDomain } from "@/actions/domain"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DomainStatus } from "@prisma/client"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"

type DomainType = {
  id: string
  hostname: string
  status: DomainStatus
  verificationToken: string | null
}

export function DomainsClient({ tenantId, initialDomains }: { tenantId: string, initialDomains: DomainType[] }) {
  const [hostname, setHostname] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await addDomain(tenantId, hostname)
      setHostname("")
      toast.success("Domain added!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerify(domainId: string) {
    try {
      const res = await verifyDomain(tenantId, domainId)
      if (res.verified) {
        toast.success("Domain verified!")
      } else {
        toast.error("DNS records not found. Try again later.")
      }
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleRemove(domainId: string) {
    if (!confirm("Are you sure you want to remove this domain?")) return
    try {
      await removeDomain(tenantId, domainId)
      toast.success("Domain removed")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Add Domain</CardTitle>
          <CardDescription>Enter the hostname you want to connect.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex space-x-2">
            <Input 
              value={hostname} 
              onChange={e => setHostname(e.target.value)} 
              placeholder="e.g. bookings.mycompany.com" 
              required
            />
            <Button type="submit" disabled={isSubmitting}>Add</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4 max-w-2xl">
        {initialDomains.map(domain => (
          <Card key={domain.id}>
            <CardHeader className="py-4">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">{domain.hostname}</CardTitle>
                  <CardDescription>Status: <span className="font-semibold">{domain.status}</span></CardDescription>
                </div>
                <div className="space-x-2">
                  {domain.status === "PENDING_VERIFICATION" && (
                    <Button variant="outline" size="sm" onClick={() => handleVerify(domain.id)}>
                      Verify
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => handleRemove(domain.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            </CardHeader>
            {domain.status === "PENDING_VERIFICATION" && domain.verificationToken && (
              <CardContent className="bg-neutral-50 p-4 border-t text-sm">
                <p className="font-semibold mb-2">Required DNS TXT Record:</p>
                <div className="grid grid-cols-12 gap-2 font-mono text-xs">
                  <div className="col-span-3 text-neutral-500">Type</div>
                  <div className="col-span-9">TXT</div>
                  
                  <div className="col-span-3 text-neutral-500">Name</div>
                  <div className="col-span-9">{domain.hostname}</div>
                  
                  <div className="col-span-3 text-neutral-500">Value</div>
                  <div className="col-span-9 break-all">{domain.verificationToken}</div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
