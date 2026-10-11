"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  Users, 
  MapPin, 
  BarChart, 
  Palette, 
  Settings, 
  CreditCard, 
  MoreHorizontal, 
  LogOut, 
  X 
} from "lucide-react"

export interface MobileFloatingDockProps {
  tenant: {
    id: string
    name: string
    primaryColor?: string | null
    secondaryColor?: string | null
  }
  role: "OWNER" | "ADMIN" | "EMPLOYEE" | "CUSTOMER"
}

export function MobileFloatingDock({ tenant, role }: MobileFloatingDockProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const isOwner = role === "OWNER"
  const isStaff = role === "OWNER" || role === "ADMIN"

  const isRouteActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === href || pathname?.startsWith(href + "/")
  }

  // Reset open state when pathname changes
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMoreOpen(false)
  }

  // Close sheet on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false)
      }
    }
    if (moreOpen) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [moreOpen])

  // Check if current route is one of the "More" items
  const isMoreItemActive = [
    "/dashboard/locations",
    "/dashboard/analytics",
    "/dashboard/settings/customization",
    "/dashboard/settings",
    "/dashboard/subscription"
  ].some(p => pathname === p || pathname?.startsWith(p + "/"))

  return (
    <>
      {/* Mobile Floating Glass Dock */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-1.5rem)] w-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="bg-[var(--vela-glass-strong)] backdrop-blur-2xl border border-[var(--vela-glass-border-strong)] shadow-[var(--vela-shadow-floating)] rounded-full px-2 py-1.5 flex items-center gap-1">
          <DockItem 
            href="/dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Overview"
            isActive={isRouteActive("/dashboard")}
          />

          <DockItem 
            href="/dashboard/calendar"
            icon={<Calendar className="w-4 h-4" />}
            label="Calendar"
            isActive={isRouteActive("/dashboard/calendar")}
          />

          <DockItem 
            href="/dashboard/bookings"
            icon={<Briefcase className="w-4 h-4" />}
            label="Bookings"
            isActive={isRouteActive("/dashboard/bookings")}
          />

          {isStaff && (
            <DockItem 
              href="/dashboard/customers"
              icon={<Users className="w-4 h-4" />}
              label="Clients"
              isActive={isRouteActive("/dashboard/customers")}
            />
          )}

          <button
            type="button"
            aria-label="More options"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[46px] px-2 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              moreOpen || isMoreItemActive
                ? "bg-[var(--vela-active)] text-[var(--vela-foreground)] shadow-xs border border-[var(--vela-glass-border-strong)]"
                : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)]"
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
            <span className="text-[10px] tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Liquid Glass Sheet Modal */}
      {moreOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Additional Navigation Options"
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false)
          }}
        >
          <div 
            ref={sheetRef}
            className="w-full max-w-sm bg-[var(--vela-glass-strong)] backdrop-blur-2xl border border-[var(--vela-glass-border-strong)] shadow-[var(--vela-shadow-floating)] rounded-3xl p-5 space-y-4"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--vela-glass-border-muted)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--vela-foreground)]">
                  More Options
                </h3>
                <p className="text-xs text-[var(--vela-muted-foreground)] truncate">
                  {tenant.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 overflow-y-auto max-h-[60vh] py-1">
              {isStaff && (
                <>
                  <SheetNavLink 
                    href="/dashboard/locations" 
                    icon={<MapPin className="w-4 h-4" />}
                    isActive={isRouteActive("/dashboard/locations")}
                    onClick={() => setMoreOpen(false)}
                  >
                    Locations
                  </SheetNavLink>

                  <SheetNavLink 
                    href="/dashboard/analytics" 
                    icon={<BarChart className="w-4 h-4" />}
                    isActive={isRouteActive("/dashboard/analytics")}
                    onClick={() => setMoreOpen(false)}
                  >
                    Analytics
                  </SheetNavLink>

                  <div className="pt-2 my-2 border-t border-[var(--vela-glass-border-muted)]">
                    <p className="px-3 text-[10px] font-semibold text-[var(--vela-muted-foreground)] uppercase tracking-wider mb-1.5">
                      Management
                    </p>
                    <SheetNavLink 
                      href="/dashboard/settings/customization" 
                      icon={<Palette className="w-4 h-4" />}
                      isActive={isRouteActive("/dashboard/settings/customization")}
                      onClick={() => setMoreOpen(false)}
                    >
                      Customization
                    </SheetNavLink>

                    {isOwner && (
                      <>
                        <SheetNavLink 
                          href="/dashboard/settings" 
                          icon={<Settings className="w-4 h-4" />}
                          isActive={isRouteActive("/dashboard/settings")}
                          onClick={() => setMoreOpen(false)}
                        >
                          Configuration
                        </SheetNavLink>

                        <SheetNavLink 
                          href="/dashboard/subscription" 
                          icon={<CreditCard className="w-4 h-4" />}
                          isActive={isRouteActive("/dashboard/subscription")}
                          onClick={() => setMoreOpen(false)}
                        >
                          Subscription
                        </SheetNavLink>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="pt-2 my-2 border-t border-[var(--vela-glass-border-muted)]">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-semibold text-[var(--vela-muted-foreground)] rounded-xl hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)] transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DockItem({
  href,
  icon,
  label,
  isActive
}: {
  href: string
  icon: React.ReactNode
  label: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex flex-col items-center justify-center min-w-[56px] min-h-[46px] px-2 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
        isActive
          ? "bg-[var(--vela-active)] text-[var(--vela-foreground)] shadow-xs border border-[var(--vela-glass-border-strong)]"
          : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="text-[10px] tracking-tight mt-0.5 truncate">{label}</span>
    </Link>
  )
}

function SheetNavLink({
  href,
  icon,
  isActive,
  onClick,
  children
}: {
  href: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
        isActive
          ? "bg-[var(--vela-active)] text-[var(--vela-foreground)] shadow-xs border border-[var(--vela-glass-border-strong)]"
          : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  )
}
