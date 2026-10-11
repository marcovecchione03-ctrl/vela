import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { getDashboardContext } from "@/lib/tenant/context"
import Link from "next/link"
import { Calendar, Users, Briefcase, MapPin, Settings, BarChart, LogOut, LayoutDashboard, Palette, CreditCard } from "lucide-react"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  const context = await getDashboardContext()
  if (!context) {
    redirect("/onboarding")
  }

  const { tenant, role } = context
  if (role === "OWNER" && tenant.onboardingState !== "COMPLETED") {
    redirect("/onboarding")
  }

  const isOwner = role === "OWNER"
  const isStaff = role === "OWNER" || role === "ADMIN"

  return (
    <div className="flex flex-col h-screen bg-neutral-50 overflow-hidden">
      <ImpersonationBanner />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Desktop */}
      <aside className="w-64 bg-white border-r border-neutral-200 hidden md:flex md:flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-neutral-900 truncate">{tenant.name}</h2>
          <p className="text-sm text-neutral-500 truncate">Vela Dashboard</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>Overview</NavLink>
          <NavLink href="/dashboard/calendar" icon={<Calendar className="w-4 h-4" />}>Calendar</NavLink>
          <NavLink href="/dashboard/bookings" icon={<Briefcase className="w-4 h-4" />}>Bookings</NavLink>
          {isStaff && (
            <>
              <NavLink href="/dashboard/customers" icon={<Users className="w-4 h-4" />}>Customers</NavLink>
              <NavLink href="/dashboard/locations" icon={<MapPin className="w-4 h-4" />}>Locations</NavLink>
              <NavLink href="/dashboard/analytics" icon={<BarChart className="w-4 h-4" />}>Analytics</NavLink>
            </>
          )}
          {isStaff && (
            <div className="pt-4 mt-4 border-t border-neutral-200">
              <p className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Settings</p>
              <NavLink href="/dashboard/settings/customization" icon={<Palette className="w-4 h-4" />}>Customization</NavLink>
              {isOwner && (
                <>
                  <NavLink href="/dashboard/settings" icon={<Settings className="w-4 h-4" />}>Configuration</NavLink>
                  <NavLink href="/dashboard/subscription" icon={<CreditCard className="w-4 h-4" />}>Subscription</NavLink>
                </>
              )}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-neutral-200">
          <form action={async () => {
            "use server"
            // We can't actually do signOut() easily from server action without importing a lot,
            // so we will just provide a client component or link to an api route later.
            // For now, this is a placeholder.
          }}>
            <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-neutral-600 rounded-md hover:text-neutral-900 hover:bg-neutral-100">
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="bg-white border-b border-neutral-200 md:hidden flex items-center justify-between p-4">
          <h2 className="text-lg font-bold text-neutral-900 truncate">{tenant.name}</h2>
          <button className="text-neutral-500">Menu</button>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      </div>
    </div>
  )
}

function NavLink({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <Link 
      href={href}
      className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 rounded-md hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
    >
      <span className="mr-3">{icon}</span>
      {children}
    </Link>
  )
}
