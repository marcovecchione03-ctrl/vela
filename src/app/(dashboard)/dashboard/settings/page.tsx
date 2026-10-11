import { getDashboardContext } from "@/lib/tenant/context"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Palette, Globe, Shield } from "lucide-react"

export default async function SettingsPage() {
  const context = await getDashboardContext()
  if (!context) redirect("/auth/login")

  const { role } = context

  // EMPLOYEE cannot access settings
  if (role === "EMPLOYEE") {
    redirect("/dashboard")
  }

  const isOwner = role === "OWNER"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Settings & Configuration</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage tenant configuration and workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/settings/customization" className="block group">
          <Card className="h-full transition hover:border-neutral-400">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-2">
                <Palette className="w-5 h-5 text-neutral-700" />
              </div>
              <CardTitle className="group-hover:text-neutral-900">Customization</CardTitle>
              <CardDescription>
                Customize brand colors, logos, and themes for your booking pages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                Owner & Admin
              </span>
            </CardContent>
          </Card>
        </Link>

        {isOwner ? (
          <Link href="/dashboard/settings/domains" className="block group">
            <Card className="h-full transition hover:border-neutral-400">
              <CardHeader>
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center mb-2">
                  <Globe className="w-5 h-5 text-neutral-700" />
                </div>
                <CardTitle className="group-hover:text-neutral-900">Custom Domains</CardTitle>
                <CardDescription>
                  Configure and verify custom domains and hostnames for your business.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  Owner Only
                </span>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card className="opacity-60 bg-neutral-50 border-dashed">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-neutral-200 flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-neutral-400" />
              </div>
              <CardTitle className="text-neutral-500">Custom Domains</CardTitle>
              <CardDescription>
                Domain configuration is restricted to business Owners.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2 py-1 rounded">
                Owner Only
              </span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

