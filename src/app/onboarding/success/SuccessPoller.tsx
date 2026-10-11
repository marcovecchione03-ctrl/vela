"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"

export default function SuccessPoller() {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 15 // 15 * 2s = 30 seconds max polling

  useEffect(() => {
    if (attempts >= maxAttempts) return

    const timer = setInterval(() => {
      setAttempts(a => a + 1)
      router.refresh()
    }, 2000)
    
    return () => clearInterval(timer)
  }, [router, attempts])

  if (attempts >= maxAttempts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2 text-neutral-900">Activation is taking longer than expected</h2>
        <p className="text-neutral-500 mb-6">
          Your payment was confirmed, but we are still setting up your workspace. 
          Please try refreshing the page in a few moments.
        </p>
        <button 
          onClick={() => { setAttempts(0); router.refresh(); }}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
      <h2 className="text-2xl font-bold mb-2 text-neutral-900">Payment Confirmed</h2>
      <p className="text-neutral-500">
        Activating your Vela workspace...<br />
        This usually takes just a few seconds.
      </p>
    </div>
  )
}
