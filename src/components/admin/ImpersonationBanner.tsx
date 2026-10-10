"use client"

import { useSession } from "next-auth/react"
import { AlertTriangle, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

export function ImpersonationBanner() {
  const { data: session, update } = useSession()
  const router = useRouter()

  if (!session?.user?.actualUserId) return null

  const handleExit = async () => {
    await update({ exitImpersonation: true })
    toast.success("Exited impersonation")
    router.push("/admin/tenants")
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-50 sticky top-0 w-full shadow-md">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        You are currently impersonating {session.user.id}. Sensitive actions are restricted.
      </div>
      <button onClick={handleExit} className="flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors">
        <LogOut className="w-4 h-4" />
        Exit
      </button>
    </div>
  )
}
