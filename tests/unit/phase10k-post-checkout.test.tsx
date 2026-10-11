import { describe, it, expect, vi, beforeEach } from "vitest"
import OnboardingSuccessPage from "../../src/app/onboarding/success/page"
import { prisma } from "../../src/lib/db/prisma"
import { getStripeClient } from "../../src/lib/billing/stripe"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({ refresh: vi.fn() }))
}))

vi.mock("../../src/lib/db/prisma", () => ({
  prisma: {
    tenantMembership: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("../../src/lib/billing/stripe", () => ({
  getStripeClient: vi.fn(),
}))

describe("Post-checkout success page (Phase 10k)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("redirects to /onboarding if no session_id is provided", async () => {
    try {
      await OnboardingSuccessPage({ searchParams: Promise.resolve({}) })
    } catch (e) {}
    expect(redirect).toHaveBeenCalledWith("/onboarding")
  })

  it("redirects to /auth/login if not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    try {
      await OnboardingSuccessPage({ searchParams: Promise.resolve({ session_id: "test" }) })
    } catch (e) {}
    expect(redirect).toHaveBeenCalledWith("/auth/login")
  })

  it("redirects to /onboarding if invalid stripe session", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1", email: "a@a.com" }, expires: "" })
    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({
      id: "mem1", userId: "user1", tenantId: "tenant1", role: "OWNER", createdAt: new Date(), updatedAt: new Date(),
      tenant: { id: "tenant1", slug: "t1", onboardingState: "IN_PROGRESS" }
    } as any)

    const mockStripe = {
      checkout: { sessions: { retrieve: vi.fn().mockRejectedValue(new Error("Invalid session")) } }
    }
    vi.mocked(getStripeClient).mockReturnValue(mockStripe as any)

    try {
      await OnboardingSuccessPage({ searchParams: Promise.resolve({ session_id: "invalid" }) })
    } catch (e) {}
    expect(redirect).toHaveBeenCalledWith("/onboarding")
  })
  
  it("redirects to /onboarding if stripe session belongs to another tenant", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1", email: "a@a.com" }, expires: "" })
    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({
      id: "mem1", userId: "user1", tenantId: "tenant1", role: "OWNER", createdAt: new Date(), updatedAt: new Date(),
      tenant: { id: "tenant1", slug: "t1", onboardingState: "IN_PROGRESS" }
    } as any)

    const mockStripe = {
      checkout: { sessions: { retrieve: vi.fn().mockResolvedValue({ metadata: { tenantId: "tenant2" }, payment_status: "paid" }) } }
    }
    vi.mocked(getStripeClient).mockReturnValue(mockStripe as any)

    try {
      await OnboardingSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_test" }) })
    } catch (e) {}
    expect(redirect).toHaveBeenCalledWith("/onboarding")
  })

  it("redirects to /dashboard if already completed", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user1", email: "a@a.com" }, expires: "" })
    vi.mocked(prisma.tenantMembership.findFirst).mockResolvedValue({
      id: "mem1", userId: "user1", tenantId: "tenant1", role: "OWNER", createdAt: new Date(), updatedAt: new Date(),
      tenant: { id: "tenant1", slug: "t1", onboardingState: "COMPLETED" }
    } as any)

    try {
      await OnboardingSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_test" }) })
    } catch (e) {}
    expect(redirect).toHaveBeenCalledWith("/dashboard")
  })
})
