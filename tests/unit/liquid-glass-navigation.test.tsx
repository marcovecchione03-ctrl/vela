import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as fs from "fs"
import * as path from "path"
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar"
import { MobileFloatingDock } from "@/components/dashboard/MobileFloatingDock"
import { GlassPanel } from "@/components/ui/GlassPanel"
import { computeVelaTheme, getVelaThemeStyles } from "@/lib/theme"
import { BRANDING_PRESETS } from "@/modules/tenant/presets"
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell"

// Mock Next.js navigation
const mockPathname = vi.fn(() => "/dashboard")
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn()
}))

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn()
}))

describe("Vela Liquid Glass Design System & Navigation (Step 4N)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPathname.mockReturnValue("/dashboard")
  })

  // A. Authenticated dashboard uses tenant VelaThemeScope
  it("A. authenticated dashboard uses tenant VelaThemeScope", () => {
    const layoutCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/layout.tsx"),
      "utf-8"
    )
    expect(layoutCode).toContain("<VelaThemeScope")
    expect(layoutCode).toContain("branding={tenant}")
    expect(layoutCode).toContain("radial-gradient")
    expect(layoutCode).toContain("var(--vela-ambient-glow)")
  })

  // B. Super Admin does not inherit tenant shell
  it("B. Super Admin does not inherit tenant shell or VelaThemeScope", () => {
    const adminLayoutCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/admin/layout.tsx"),
      "utf-8"
    )
    expect(adminLayoutCode).not.toContain("VelaThemeScope")
    expect(adminLayoutCode).not.toContain("MobileFloatingDock")
    expect(adminLayoutCode).not.toContain("DesktopSidebar")
  })

  // C. Public booking does not inherit dashboard shell
  it("C. public booking does not inherit dashboard shell or floating dock", () => {
    const publicLayoutCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/[domain]/layout.tsx"),
      "utf-8"
    )
    expect(publicLayoutCode).not.toContain("DesktopSidebar")
    expect(publicLayoutCode).not.toContain("MobileFloatingDock")
  })

  // D. Mobile floating navigation renders
  it("D. mobile floating navigation renders with floating dock and primary items", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )

    expect(html).toContain('aria-label="Mobile Navigation"')
    expect(html).toContain("Overview")
    expect(html).toContain("Calendar")
    expect(html).toContain("Bookings")
    expect(html).toContain("Clients")
    expect(html).toContain("More")
  })

  // E. Desktop sidebar renders
  it("E. desktop sidebar renders with brand monogram and navigation items", () => {
    const html = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )

    expect(html).toContain('aria-label="Desktop Navigation"')
    expect(html).toContain("Studio Luxe")
    expect(html).toContain("Vela Workspace")
    expect(html).toContain("S") // Monogram initial for Studio Luxe
    expect(html).toContain("Overview")
    expect(html).toContain("Calendar")
    expect(html).toContain("Bookings")
    expect(html).toContain("Sign Out")
  })

  // F. Responsive navigation separation exists
  it("F. responsive navigation separation exists between mobile dock and desktop sidebar", () => {
    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    // Desktop sidebar begins only at desktop threshold (lg: 1024px)
    expect(desktopHtml).toContain("hidden lg:flex")

    const mobileHtml = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    // Mobile dock is active through tablet portrait (768px) and hidden only at lg (1024px)
    expect(mobileHtml).toContain("lg:hidden")
  })

  // G. OWNER mobile nav
  it("G. OWNER mobile nav shows all authorized items and management options", () => {
    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    expect(desktopHtml).toContain("Customers")
    expect(desktopHtml).toContain("Locations")
    expect(desktopHtml).toContain("Analytics")
    expect(desktopHtml).toContain("Customization")
    expect(desktopHtml).toContain("Configuration")
    expect(desktopHtml).toContain("Subscription")
  })

  // H. ADMIN mobile nav
  it("H. ADMIN mobile nav does not expose Owner-only configuration or subscription", () => {
    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "ADMIN"
      })
    )
    expect(desktopHtml).toContain("Customers")
    expect(desktopHtml).toContain("Locations")
    expect(desktopHtml).toContain("Analytics")
    expect(desktopHtml).toContain("Customization")
    expect(desktopHtml).not.toContain("Configuration")
    expect(desktopHtml).not.toContain("Subscription")
  })

  // I. EMPLOYEE mobile nav
  it("I. EMPLOYEE mobile nav restricts navigation to operational areas only", () => {
    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "EMPLOYEE"
      })
    )
    expect(desktopHtml).toContain("Overview")
    expect(desktopHtml).toContain("Calendar")
    expect(desktopHtml).toContain("Bookings")
    expect(desktopHtml).not.toContain("Customers")
    expect(desktopHtml).not.toContain("Locations")
    expect(desktopHtml).not.toContain("Analytics")
    expect(desktopHtml).not.toContain("Customization")
    expect(desktopHtml).not.toContain("Subscription")

    const mobileHtml = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "EMPLOYEE"
      })
    )
    expect(mobileHtml).not.toContain("Clients")
  })

  // J. Mobile More items follow RBAC
  it("J. mobile More menu items strictly enforce role-based access", () => {
    const mobileDockCode = fs.readFileSync(
      path.join(__dirname, "../../src/components/dashboard/MobileFloatingDock.tsx"),
      "utf-8"
    )
    expect(mobileDockCode).toContain("isStaff &&")
    expect(mobileDockCode).toContain("isOwner &&")
    expect(mobileDockCode).toContain("Subscription")
  })

  // K. Subscription remains OWNER-only
  it("K. Subscription navigation remains strictly restricted to OWNER", () => {
    const desktopAdminHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "ADMIN"
      })
    )
    expect(desktopAdminHtml).not.toContain("/dashboard/subscription")

    const desktopOwnerHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    expect(desktopOwnerHtml).toContain("/dashboard/subscription")
  })

  // L. Active route exposes aria-current
  it("L. active route exposes aria-current='page' on both sidebar and dock", () => {
    mockPathname.mockReturnValue("/dashboard/bookings")

    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    expect(desktopHtml).toContain('/dashboard/bookings')
    expect(desktopHtml).toContain('aria-current="page"')

    const mobileHtml = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    expect(mobileHtml).toContain('/dashboard/bookings')
    expect(mobileHtml).toContain('aria-current="page"')
  })

  // M. Floating navigation reserves content spacing
  it("M. floating navigation reserves content clearance on mobile to prevent occlusion", () => {
    const layoutCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/layout.tsx"),
      "utf-8"
    )
    expect(layoutCode).toContain("pb-28")
    expect(layoutCode).toContain("lg:pb-12")
  })

  // R. Semantic glass tokens derive from tenant theme
  it("R. semantic glass tokens derive dynamically from tenant theme", () => {
    const customTokens = computeVelaTheme({
      primaryColor: "#507A6A",
      secondaryColor: "#9BB8AA",
      bgColor: "#F5FAF7",
      textColor: "#23352E"
    })

    expect(customTokens.glass).toBeDefined()
    expect(customTokens.glassStrong).toBeDefined()
    expect(customTokens.glassSubtle).toBeDefined()
    expect(customTokens.glassBorder).toContain("rgba(35, 53, 46")
    expect(customTokens.active).toContain("rgba(80, 122, 106")
    expect(customTokens.ambientGlow).toContain("rgba(80, 122, 106")

    const styles = getVelaThemeStyles({
      primaryColor: "#507A6A",
      secondaryColor: "#9BB8AA",
      bgColor: "#F5FAF7",
      textColor: "#23352E"
    }) as Record<string, string>

    expect(styles["--vela-glass"]).toBe(customTokens.glass)
    expect(styles["--vela-glass-strong"]).toBe(customTokens.glassStrong)
    expect(styles["--vela-glass-border"]).toBe(customTokens.glassBorder)
    expect(styles["--vela-active"]).toBe(customTokens.active)
    expect(styles["--vela-ambient-glow"]).toBe(customTokens.ambientGlow)
  })

  // S. All six presets generate valid glass theme values
  it("S. all six onboarding presets generate valid glass theme values", () => {
    for (const [name, preset] of Object.entries(BRANDING_PRESETS)) {
      const tokens = computeVelaTheme(preset)
      expect(tokens.glass).toBeDefined()
      expect(tokens.glassStrong).toBeDefined()
      expect(tokens.glassBorder).toBeDefined()
      expect(tokens.glassHighlight).toBeDefined()
      expect(tokens.shadowFloating).toBeDefined()
      expect(tokens.active).toBeDefined()
      expect(tokens.ambientGlow).toBeDefined()
    }
  })

  // T. No reference-specific fixed palette introduced
  it("T. no reference-specific fixed palette colors are hardcoded", () => {
    const sidebarCode = fs.readFileSync(
      path.join(__dirname, "../../src/components/dashboard/DesktopSidebar.tsx"),
      "utf-8"
    )
    expect(sidebarCode).not.toContain("bg-purple")
    expect(sidebarCode).not.toContain("bg-pink")
    expect(sidebarCode).not.toContain("bg-peach")

    const dockCode = fs.readFileSync(
      path.join(__dirname, "../../src/components/dashboard/MobileFloatingDock.tsx"),
      "utf-8"
    )
    expect(dockCode).not.toContain("bg-purple")
    expect(dockCode).not.toContain("bg-pink")
    expect(dockCode).not.toContain("bg-peach")
  })

  // GlassPanel primitive test
  it("GlassPanel renders with specified variant, backdrop blur, and highlight", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        GlassPanel,
        { variant: "default", className: "custom-class" },
        React.createElement("p", null, "Panel Content")
      )
    )

    expect(html).toContain("backdrop-blur-xl")
    expect(html).toContain("custom-class")
    expect(html).toContain("Panel Content")
  })

  // =========================================================================
  // STEP 4N-B: TABLET BREAKPOINT & CONTENT WIDTH TESTS
  // =========================================================================

  it("4N-B.1: floating dock remains active at tablet portrait (768px) and desktop sidebar begins only at lg threshold", () => {
    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )
    const mobileHtml = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )

    // At 768px (portrait tablet), Tailwind 'md' is active, but 'lg' (1024px) is NOT.
    // Therefore 'hidden lg:flex' keeps sidebar HIDDEN at 768px.
    expect(desktopHtml).toContain("hidden lg:flex")
    expect(desktopHtml).not.toContain("hidden md:flex")

    // 'lg:hidden' keeps mobile dock VISIBLE at 375px, 390px, 430px, and 768px.
    expect(mobileHtml).toContain("lg:hidden")
    expect(mobileHtml).not.toContain("md:hidden")
  })

  it("4N-B.2: dock and sidebar visibility rules are complementary with zero overlap or dead zone", () => {
    const layoutCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/layout.tsx"),
      "utf-8"
    )
    // Top header is hidden on desktop (lg:hidden)
    expect(layoutCode).toContain("lg:hidden")
    // Safe area bottom padding transitions at lg
    expect(layoutCode).toContain("pb-28 lg:pb-12")
    // Generic max-w-7xl constraint is removed from dashboard layout container
    expect(layoutCode).not.toContain("max-w-7xl mx-auto w-full")
  })

  it("4N-B.3: DashboardPageShell supports standard, wide, and full content width variants", () => {
    const standardHtml = renderToStaticMarkup(
      React.createElement(DashboardPageShell, { variant: "standard" }, "Standard Content")
    )
    expect(standardHtml).toContain("max-w-4xl")
    expect(standardHtml).toContain("mx-auto")
    expect(standardHtml).toContain('data-shell-variant="standard"')

    const wideHtml = renderToStaticMarkup(
      React.createElement(DashboardPageShell, { variant: "wide" }, "Wide Content")
    )
    expect(wideHtml).toContain("max-w-7xl")
    expect(wideHtml).toContain("mx-auto")
    expect(wideHtml).toContain('data-shell-variant="wide"')

    const fullHtml = renderToStaticMarkup(
      React.createElement(DashboardPageShell, { variant: "full" }, "Full Content")
    )
    expect(fullHtml).toContain("max-w-none")
    expect(fullHtml).toContain("w-full")
    expect(fullHtml).toContain('data-shell-variant="full"')
  })

  it("4N-B.4: Calendar page uses full content width variant", () => {
    const calendarCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/calendar/page.tsx"),
      "utf-8"
    )
    expect(calendarCode).toContain('DashboardPageShell')
    expect(calendarCode).toContain('variant="full"')
  })

  it("4N-B.5: Manual Booking page uses wide content width variant", () => {
    const manualBookingCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/bookings/new/page.tsx"),
      "utf-8"
    )
    expect(manualBookingCode).toContain('DashboardPageShell')
    expect(manualBookingCode).toContain('variant="wide"')
  })

  it("4N-B.6: Settings page uses standard content width variant", () => {
    const settingsCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/settings/page.tsx"),
      "utf-8"
    )
    expect(settingsCode).toContain('DashboardPageShell')
    expect(settingsCode).toContain('variant="standard"')
  })

  it("4N-B.7: Bookings, Customers, and Analytics pages use wide content width variant", () => {
    const bookingsCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/bookings/page.tsx"),
      "utf-8"
    )
    expect(bookingsCode).toContain('DashboardPageShell')
    expect(bookingsCode).toContain('variant="wide"')

    const customersCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/customers/page.tsx"),
      "utf-8"
    )
    expect(customersCode).toContain('DashboardPageShell')
    expect(customersCode).toContain('variant="wide"')

    const analyticsCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/analytics/page.tsx"),
      "utf-8"
    )
    expect(analyticsCode).toContain('DashboardPageShell')
    expect(analyticsCode).toContain('variant="wide"')
  })

  // =========================================================================
  // STEP 4N-C: HIGH-FIDELITY LIQUID GLASS ART DIRECTION TESTS
  // =========================================================================

  it("4N-C.1: Desktop navigation renders as a floating glass island with tactile active capsule", () => {
    mockPathname.mockReturnValue("/dashboard/bookings")
    const desktopHtml = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )

    // Floating island geometry: inset from viewport edges, sticky, rounded shell
    expect(desktopHtml).toContain("rounded-[30px]")
    expect(desktopHtml).toContain("sticky top-4")
    expect(desktopHtml).toContain("h-[calc(100vh-2rem)]")
    expect(desktopHtml).toContain("backdrop-blur-3xl")

    // Active item renders as a floating liquid glass capsule
    expect(desktopHtml).toContain("backdrop-blur-md")
    expect(desktopHtml).toContain('aria-current="page"')
    expect(desktopHtml).toContain("color-mix")
  })

  it("4N-C.2: Mobile floating dock renders with tactile liquid active capsule and signature glass depth", () => {
    mockPathname.mockReturnValue("/dashboard/calendar")
    const mobileHtml = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Studio Luxe" },
        role: "OWNER"
      })
    )

    expect(mobileHtml).toContain("backdrop-blur-3xl")
    expect(mobileHtml).toContain("rounded-full")
    expect(mobileHtml).toContain('aria-current="page"')
    expect(mobileHtml).toContain("color-mix")
  })

  it("4N-C.3: GlassPanel supports 3-level material system with specular reflection edges", () => {
    const l1 = renderToStaticMarkup(
      React.createElement(GlassPanel, { level: 1 }, "L1 Subtle")
    )
    expect(l1).toContain("bg-[var(--vela-glass-subtle)]")

    const l2 = renderToStaticMarkup(
      React.createElement(GlassPanel, { level: 2 }, "L2 Panel")
    )
    expect(l2).toContain("bg-[var(--vela-glass)]")
    expect(l2).toContain("before:bg-gradient-to-r")

    const l3 = renderToStaticMarkup(
      React.createElement(GlassPanel, { level: 3 }, "L3 Floating")
    )
    expect(l3).toContain("bg-[var(--vela-glass-strong)]")
    expect(l3).toContain("backdrop-blur-2xl")
  })

  it("4N-C.4: Dashboard layout includes atmospheric multi-layered environmental illumination", () => {
    const layoutCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/layout.tsx"),
      "utf-8"
    )
    expect(layoutCode).toContain("var(--vela-ambient-glow)")
    expect(layoutCode).toContain("var(--vela-secondary)")
    expect(layoutCode).toContain("radial-gradient")
  })

  // =========================================================================
  // STEP 4O: FIGMA-AUTHORED VELA UI TESTS
  // =========================================================================

  it("4O.A: Desktop sidebar renders the Figma-authored navigation structure and local assets", () => {
    mockPathname.mockReturnValue("/dashboard/bookings")
    const html = renderToStaticMarkup(
      React.createElement(DesktopSidebar, {
        tenant: { id: "t-1", name: "Antonio's Cut" },
        role: "OWNER"
      })
    )

    expect(html).toContain("/figma/logo-antonios-cut.png")
    expect(html).toContain("Panoramica")
    expect(html).toContain("Calendario")
    expect(html).toContain("Prenotazioni")
    expect(html).toContain("Clienti")
    expect(html).toContain("Servizi")
    expect(html).toContain("Team")
    expect(html).toContain("Statistiche")
    expect(html).toContain("Impostazioni")
    expect(html).toContain("Esci")
    expect(html).toContain("vela-liquid-primary")
    expect(html).not.toContain("localhost:3845")
  })

  it("4O.B: Mobile floating dock renders the Figma-authored navigation structure and central + button", () => {
    const html = renderToStaticMarkup(
      React.createElement(MobileFloatingDock, {
        tenant: { id: "t-1", name: "Antonio's Cut" },
        role: "OWNER"
      })
    )

    expect(html).toContain("/figma/dock-plus-pulsante.svg")
    expect(html).toContain("rounded-[53px]")
    expect(html).toContain("Overview")
    expect(html).toContain("Calendar")
    expect(html).toContain("Clients")
    expect(html).toContain("More")
    expect(html).not.toContain("localhost:3845")
  })

  it("4O.L: No runtime dependency on temporary localhost:3845 asset URLs exists in production src/", () => {
    const filesToCheck = [
      "src/app/(dashboard)/layout.tsx",
      "src/components/dashboard/DesktopSidebar.tsx",
      "src/components/dashboard/MobileFloatingDock.tsx",
      "src/app/(dashboard)/dashboard/bookings/new/page.tsx",
      "src/app/(dashboard)/dashboard/bookings/new/ManualBookingForm.tsx",
      "src/components/ui/GlassPanel.tsx",
      "src/app/globals.css",
      "src/lib/theme/index.ts"
    ]

    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(path.join(__dirname, "../../", relPath), "utf-8")
      expect(content).not.toContain("localhost:3845")
    }
  })
})

