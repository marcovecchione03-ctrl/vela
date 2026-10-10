"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createPortalSession } from "@/actions/billing"

export function ManageBillingButton({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleManage() {
    try {
      setLoading(true)
      const returnUrl = window.location.href
      const url = await createPortalSession(tenantId, returnUrl)
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error(error)
      alert("Failed to open billing portal.")
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleManage} disabled={loading}>
      {loading ? "Redirecting..." : "Manage Billing & Invoices"}
    </Button>
  )
}
