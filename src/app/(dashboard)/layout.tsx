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
      className="min-h-screen flex flex-col font-sans bg-[#0f162c] text-white antialiased relative overflow-x-hidden selection:bg-[var(--vela-primary)] selection:text-[var(--vela-primary-foreground)]"
      style={{
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -10%, var(--vela-ambient-glow), transparent 70%), radial-gradient(circle 600px at 15% 25%, color-mix(in srgb, var(--vela-secondary) 5%, transparent), transparent 70%), radial-gradient(circle 750px at 85% 75%, color-mix(in srgb, var(--vela-primary) 4%, transparent), transparent 70%)"
      }}
    >
      {/* Authored Mobile Background Layer (390px reference: #0f162c + overlay texture) */}
      <div aria-hidden="true" className="lg:hidden fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#0f162c]" />
        <div className="absolute inset-0 mix-blend-overlay opacity-20 overflow-hidden">
          <img
            alt=""
            src="/figma/bg-mobile.png"
            className="absolute h-full max-w-none top-0 left-[-101.81%] w-[303.61%] object-cover"
          />
        </div>
      </div>

      {/* Authored Desktop Background Layer (1440px reference: blurred barbershop environment + dark left column) */}
      <div aria-hidden="true" className="hidden lg:block fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0a0f24]">
        <img
          alt=""
          src="/figma/bg-desktop.png"
          className="absolute inset-0 w-full h-full object-cover blur-[7px] scale-[1.03]"
        />
        <div className="absolute inset-y-0 left-0 w-[300px] bg-[rgba(0,10,67,0.3)]" />
      </div>

      <ImpersonationBanner />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 min-h-screen relative z-10">
        <DesktopSidebar tenant={tenant} role={role} />

        <main className="flex-1 overflow-y-auto min-w-0 pb-28 lg:pb-12">
          <div className="px-[30.5px] sm:px-8 md:px-10 lg:pl-[33.55px] lg:pr-[38px] w-full min-w-0">
            {children}
          </div>
        </main>

        <MobileFloatingDock tenant={tenant} role={role} />
      </div>
    </VelaThemeScope>
  )
}
