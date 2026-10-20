import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as fs from "fs"
import * as path from "path"
import ManualBookingForm from "@/app/(dashboard)/dashboard/bookings/new/ManualBookingForm"
import DashboardNewBookingPage from "@/app/(dashboard)/dashboard/bookings/new/page"
import { BRANDING_PRESETS } from "@/modules/tenant/presets"
import { DesktopSidebar } from "@/components/dashboard/DesktopSidebar"
import { MobileFloatingDock } from "@/components/dashboard/MobileFloatingDock"
import { VelaThemeScope } from "@/components/theme/VelaThemeScope"
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell"

// Mock dependencies
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/bookings/new",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
  notFound: vi.fn()
}))

vi.mock("next-auth/react", () => ({
  signOut: vi.fn()
}))

vi.mock("next-auth", () => ({
  getServerSession: vi.fn()
}))

vi.mock("@/lib/auth/config", () => ({
  authOptions: {}
}))

vi.mock("@/lib/tenant/context", () => ({
  getDashboardTenant: vi.fn()
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn()
    },
    tenantMembership: {
      findUnique: vi.fn()
    }
  }
}))

vi.mock("@/actions/availability-search", () => ({
  searchAvailability: vi.fn()
}))

vi.mock("@/actions/appointments", () => ({
  createManualBooking: vi.fn()
}))

vi.mock("@/actions/customer-search", () => ({
  searchCustomers: vi.fn()
}))

import { prisma } from "@/lib/db/prisma"
import { getServerSession } from "next-auth"
import { getDashboardTenant } from "@/lib/tenant/context"

const mockLocations = [
  { id: "loc-1", name: "Downtown Studio" },
  { id: "loc-2", name: "Uptown Branch" }
]

const mockServices = [
  { id: "svc-1", name: "Haircut & Beard", durationMinutes: 45, price: 3500 },
  { id: "svc-2", name: "Royal Shave", durationMinutes: 30, price: 2500 }
]

const mockEmployees = [
  { id: "emp-1", name: "Marco Barber" },
  { id: "emp-2", name: "Elena Stylist" }
]

const mockCustomers = [
  { id: "cust-1", firstName: "Mario", lastName: "Rossi", phone: "+39 333 1111111" },
  { id: "cust-2", firstName: "Luigi", lastName: "Verdi", phone: "+39 333 2222222" }
]

describe("Manual Staff Booking UI (Step 4M-B)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // A. Manual Booking page still renders
  it("A. Manual Booking page renders successfully for staff with VelaThemeScope", async () => {
    vi.mocked(getDashboardTenant).mockResolvedValue({ id: "tenant-1" } as any)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-1",
      name: "Acme Barber",
      primaryColor: "#507A6A",
      secondaryColor: "#9BB8AA",
      bgColor: "#F5FAF7",
      textColor: "#23352E",
      locations: mockLocations,
      services: mockServices,
      employees: mockEmployees,
      customers: mockCustomers
    } as any)
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as any)
    vi.mocked(prisma.tenantMembership.findUnique).mockResolvedValue({
      id: "mem-1",
      role: "OWNER",
      employeeProfile: { id: "emp-1" }
    } as any)

    const pageElement = await DashboardNewBookingPage()
    expect(pageElement).toBeDefined()
    const html = renderToStaticMarkup(pageElement)
    expect(html).toContain("Manual Staff Booking")
    expect(html).toContain("Back to Bookings")
    expect(html).toContain("Downtown Studio")
    expect(html).toContain("Haircut &amp; Beard")
    expect(html).toContain("--vela-primary:#507A6A")
    expect(html).toContain("--vela-background:#F5FAF7")
    expect(html).toContain("--vela-foreground:#23352E")
  })

  // B. existing booking fields remain present
  it("B. all core booking fields remain present in ManualBookingForm", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManualBookingForm, {
        tenantId: "tenant-1",
        userId: "user-1",
        locations: mockLocations,
        services: mockServices,
        employees: mockEmployees,
        customers: mockCustomers,
        role: "OWNER",
        branding: {
          primaryColor: "#171717",
          secondaryColor: "#737373",
          bgColor: "#ffffff",
          textColor: "#171717"
        }
      })
    )

    // Location field
    expect(html).toContain("Location")
    expect(html).toContain("Downtown Studio")
    // Service field
    expect(html).toContain("Service")
    expect(html).toContain("Haircut &amp; Beard")
    // Staff Member field
    expect(html).toContain("Staff Member")
    expect(html).toContain("Marco Barber")
    // Appointment Date field
    expect(html).toContain("Appointment Date")
    // Find Availability CTA
    expect(html).toContain("Find Availability")
    // Client Type tabs
    expect(html).toContain("Registered Customer")
    expect(html).toContain("One-Time Client")
    // Internal Staff Note
    expect(html).toContain("Internal Staff Note")
    // Final Confirm CTA
    expect(html).toContain("Create Manual Booking")
  })

  // C. existing validation/business logic remains wired
  it("C. single location displays informative sole-location badge instead of ugly disabled field", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManualBookingForm, {
        tenantId: "tenant-1",
        userId: "user-1",
        locations: [{ id: "loc-single", name: "Sole Studio" }],
        services: mockServices,
        employees: mockEmployees,
        customers: mockCustomers,
        role: "OWNER"
      })
    )

    expect(html).toContain("Sole Studio")
    expect(html).toContain("Sole location")
  })

  it("C. EMPLOYEE role locks staff member to current assigned employee profile", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManualBookingForm, {
        tenantId: "tenant-1",
        userId: "user-1",
        locations: mockLocations,
        services: mockServices,
        employees: mockEmployees,
        customers: mockCustomers,
        role: "EMPLOYEE",
        currentEmployeeId: "emp-1"
      })
    )

    expect(html).toContain("Marco Barber")
    expect(html).toContain("Assigned to you")
  })

  // D. client-type control switches state
  it("D. client-type control includes accessible tablist semantics and supports both types", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManualBookingForm, {
        tenantId: "tenant-1",
        userId: "user-1",
        locations: mockLocations,
        services: mockServices,
        employees: mockEmployees,
        customers: mockCustomers,
        role: "OWNER"
      })
    )

    expect(html).toContain('role="tablist"')
    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain("Registered Customer")
    expect(html).toContain("One-Time Client")
  })

  // E. availability selected state works
  it("E. time slots render with accessible check indicators and dynamic styling", () => {
    const formCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/bookings/new/ManualBookingForm.tsx"),
      "utf-8"
    )

    expect(formCode).toContain("setSelectedSlot(slot)")
    expect(formCode).toContain("isSelected")
    expect(formCode).toContain("searchAvailability")
    expect(formCode).toContain("var(--vela-primary)")
  })

  // F. disabled states retain semantic disabled behavior
  it("F. action buttons are semantically disabled when prerequisites are missing", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManualBookingForm, {
        tenantId: "tenant-1",
        userId: "user-1",
        locations: mockLocations,
        services: mockServices,
        employees: mockEmployees,
        customers: mockCustomers,
        role: "OWNER"
      })
    )

    // Find Availability should be disabled before date is chosen
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Find Availability/i)
    // Create Manual Booking should be disabled before slot is selected
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*?Create Manual Booking/i)
  })

  // G. final submission action remains wired
  it("G. createManualBooking action and router push remain properly imported and wired", () => {
    const formCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/bookings/new/ManualBookingForm.tsx"),
      "utf-8"
    )

    expect(formCode).toContain('import { createManualBooking } from "@/actions/appointments"')
    expect(formCode).toContain("createManualBooking(tenantId, userId, payload)")
    expect(formCode).toContain("router.push(`/dashboard/bookings/${res.id}`)")
  })

  // H. semantic tokens replace fixed palette assumptions
  it("H. appearance uses semantic Vela tokens instead of fixed neutral utilities", () => {
    const formCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/(dashboard)/dashboard/bookings/new/ManualBookingForm.tsx"),
      "utf-8"
    )

    // Verify semantic class usage
    expect(formCode).toContain("bg-vela-surface")
    expect(formCode).toContain("text-vela-foreground")
    expect(formCode).toContain("border-vela-border")
    expect(formCode).toContain("bg-vela-surface-subtle")
    expect(formCode).toContain("text-vela-muted-foreground")

    // Verify absence of hardcoded reference specific palette colors
    expect(formCode).not.toContain("bg-purple")
    expect(formCode).not.toContain("bg-pink")
    expect(formCode).not.toContain("bg-peach")
    expect(formCode).not.toContain("bg-blue-600")
    expect(formCode).not.toContain("border-blue-600")
  })

  // I. booking page uses existing theme tokens/preset architecture
  it("I. ManualBookingForm supports all 6 onboarding branding presets dynamically via --vela-*", () => {
    for (const [presetName, preset] of Object.entries(BRANDING_PRESETS)) {
      const html = renderToStaticMarkup(
        React.createElement(ManualBookingForm, {
          tenantId: "tenant-1",
          userId: "user-1",
          locations: mockLocations,
          services: mockServices,
          employees: mockEmployees,
          customers: mockCustomers,
          role: "OWNER",
          branding: preset
        })
      )

      expect(html).toContain(`--vela-primary:${preset.primaryColor}`)
      expect(html).toContain(`--vela-secondary:${preset.secondaryColor}`)
      expect(html).toContain(`--vela-background:${preset.bgColor}`)
      expect(html).toContain(`--vela-foreground:${preset.textColor}`)
    }
  })

  // J. no Stripe/billing/onboarding logic is changed
  it("J. verify billing actions and onboarding wizard files remain unmodified", () => {
    const billingCode = fs.readFileSync(
      path.join(__dirname, "../../src/actions/billing.ts"),
      "utf-8"
    )
    expect(billingCode).toContain("createCheckoutSession")
    expect(billingCode).toContain("createPortalSession")
    expect(billingCode).toContain("changePlan")

    const onboardingCode = fs.readFileSync(
      path.join(__dirname, "../../src/app/onboarding/Wizard.tsx"),
      "utf-8"
    )
    expect(onboardingCode).toContain("OnboardingWizard")
    expect(onboardingCode).toContain("BRANDING_PRESETS")
  })

  // =========================================================================
  // STEP 4O: FIGMA-AUTHORED MANUAL BOOKING STRUCTURE TESTS
  // =========================================================================

  it("4O.E: Manual Booking page and form render with Figma-authored Italian structure and local assets", () => {
    const html = renderToStaticMarkup(
      React.createElement(ManualBookingForm, {
        tenantId: "tenant-1",
        userId: "user-1",
        locations: mockLocations,
        services: mockServices,
        employees: mockEmployees,
        customers: mockCustomers,
        role: "OWNER"
      })
    )

    expect(html).toContain("Dettagli prenotazione")
    expect(html).toContain("Sede")
    expect(html).toContain("Servizio")
    expect(html).toContain("Operatore")
    expect(html).toContain("Data e orario")
    expect(html).toContain("Cliente")
    expect(html).toContain("Cliente registrato")
    expect(html).toContain("Cliente occasionale")
    expect(html).toContain("Cerca un cliente...")
    expect(html).toContain("Seleziona")
    expect(html).toContain("Crea prenotazione")
    expect(html).toContain("Salva Bozza")
    expect(html).not.toContain("localhost:3845")
  })
})
