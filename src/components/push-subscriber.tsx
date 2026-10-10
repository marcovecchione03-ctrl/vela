"use client"

import { useState, useEffect } from "react"
import { subscribeToPush, unsubscribeFromPush } from "@/actions/push"
import { toast } from "react-hot-toast"

export function PushSubscriber({ tenantId }: { tenantId: string }) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(() => {
    if (typeof window === 'undefined') return false
    return "serviceWorker" in navigator && "PushManager" in window
  })
  const [loading, setLoading] = useState(false)

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (e) {
      console.error("Error checking push subscription", e)
    }
  }

  useEffect(() => {
    if (isSupported) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      checkSubscription()
    }
  }, [isSupported])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  const handleSubscribe = async () => {
    try {
      setLoading(true)
      const registration = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidKey) throw new Error("VAPID key not configured")

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const p256dh = subscription.getKey("p256dh")
      const auth = subscription.getKey("auth")

      if (!p256dh || !auth) throw new Error("Missing keys")

      await subscribeToPush({
        tenantId,
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dh)))),
        auth: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(auth))))
      })

      setIsSubscribed(true)
      toast.success("Push notifications enabled")
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to enable notifications")
    } finally {
      setLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    try {
      setLoading(true)
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        await unsubscribeFromPush({ endpoint: subscription.endpoint })
      }
      
      setIsSubscribed(false)
      toast.success("Push notifications disabled")
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to disable notifications")
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) return null

  return (
    <div className="flex items-center space-x-4">
      <span className="text-sm text-gray-700">Push Notifications</span>
      <button
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        disabled={loading}
        className={`px-4 py-2 text-sm font-medium rounded-md ${
          isSubscribed 
            ? "bg-red-50 text-red-600 hover:bg-red-100" 
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        } disabled:opacity-50`}
      >
        {loading ? "Processing..." : isSubscribed ? "Disable" : "Enable"}
      </button>
    </div>
  )
}
