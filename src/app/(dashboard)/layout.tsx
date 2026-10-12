import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { redirect } from "next/navigation"
import { getDashboardContext } from "@/lib/tenant/context"
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner"
import { VelaThemeScope } from "@/components/theme/VelaThemeScope"
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar"
import { MobileFloatingDock } from "@/components/dashboard/MobileFloatingDock"

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

  const monogram = (tenant.name?.charAt(0) || "V").toUpperCase()

  return (
    <VelaThemeScope 
      branding={tenant} 
      className="min-h-screen flex flex-col font-sans bg-[var(--vela-background)] text-[var(--vela-foreground)] antialiased relative selection:bg-[var(--vela-primary)] selection:text-[var(--vela-primary-foreground)]"
      style={{
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, var(--vela-ambient-glow), transparent 70%), radial-gradient(circle 600px at 15% 25%, color-mix(in srgb, var(--vela-secondary) 5%, transparent), transparent 70%), radial-gradient(circle 750px at 85% 75%, color-mix(in srgb, var(--vela-primary) 4%, transparent), transparent 70%)"
      }}
    >
      <ImpersonationBanner />

      {/* Mobile Top Brand Bar (Minimal, Floating & Clean) */}
      <div className="lg:hidden px-3 pt-3 sticky top-0 z-30">
        <header className="flex items-center justify-between px-4 py-2.5 bg-[var(--vela-glass-strong)] backdrop-blur-2xl border border-[var(--vela-glass-border-strong)] shadow-[0_8px_20px_-4px_rgba(0,0,0,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.8)] rounded-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs tracking-tight shrink-0 shadow-xs"
              style={{ 
                backgroundColor: "var(--vela-primary)", 
                color: "var(--vela-primary-foreground)" 
              }}
            >
              {monogram}
            </div>
            <span className="font-bold text-sm text-[var(--vela-foreground)] truncate">
              {tenant.name}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[var(--vela-muted-foreground)] bg-[var(--vela-glass-subtle)] px-2.5 py-1 rounded-full border border-[var(--vela-glass-border-muted)] shrink-0">
            {role}
          </span>
        </header>
      </div>

      {/* Main Workspace Frame with Spatial Canvas Layout */}
      <div className="flex flex-1 min-h-0 relative lg:p-4 xl:p-5 lg:gap-5 xl:gap-6">
        <DesktopSidebar tenant={tenant} role={role} />

        <main className="flex-1 overflow-y-auto min-w-0 pb-28 lg:pb-12">
          <div className="p-4 sm:p-6 md:p-8 lg:p-2 xl:p-4 w-full min-w-0">
            {children}
          </div>
        </main>

        <MobileFloatingDock tenant={tenant} role={role} />
      </div>
    </VelaThemeScope>
  )
}
