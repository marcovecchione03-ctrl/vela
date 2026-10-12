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
        <div className="bg-[var(--vela-glass-strong)] backdrop-blur-3xl border border-white/60 shadow-[0_20px_40px_-6px_rgba(0,0,0,0.12),0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_2px_rgba(255,255,255,0.85)] rounded-full px-2.5 py-1.5 flex items-center gap-1.5">
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
            className={`group relative flex flex-col items-center justify-center min-w-[54px] min-h-[46px] px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
              moreOpen || isMoreItemActive
                ? "text-[var(--vela-foreground)] shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.9)] border border-[var(--vela-glass-border-strong)] bg-white/80 backdrop-blur-md"
                : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-white/40"
            }`}
            style={(moreOpen || isMoreItemActive) ? {
              backgroundColor: "color-mix(in srgb, var(--vela-primary) 12%, rgba(255, 255, 255, 0.85))"
            } : undefined}
          >
            <MoreHorizontal className={`w-4 h-4 shrink-0 transition-transform ${(moreOpen || isMoreItemActive) ? "text-[var(--vela-primary)] scale-110" : "group-hover:scale-105"}`} />
            <span className="tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Liquid Glass Sheet Modal */}
      {moreOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Additional Navigation Options"
          className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMoreOpen(false)
          }}
        >
          <div 
            ref={sheetRef}
            className="w-full max-w-sm bg-[var(--vela-glass-strong)] backdrop-blur-3xl border border-white/60 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.85)] rounded-[32px] p-5 space-y-4"
            style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--vela-glass-border-muted)]">
              <div>
                <h3 className="font-bold text-sm text-[var(--vela-foreground)] tracking-tight">
                  More Options
                </h3>
                <p className="text-[11px] text-[var(--vela-muted-foreground)] truncate font-medium">
                  {tenant.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] bg-white/40 hover:bg-white/70 border border-white/50 transition-all cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 overflow-y-auto max-h-[60vh] py-1">
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

                  <div className="pt-2.5 my-2 border-t border-[var(--vela-glass-border-muted)]">
                    <p className="px-3 text-[10px] font-semibold text-[var(--vela-muted-foreground)] uppercase tracking-wider mb-2">
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

              <div className="pt-2.5 my-2 border-t border-[var(--vela-glass-border-muted)]">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 text-xs font-semibold text-[var(--vela-muted-foreground)] rounded-2xl hover:text-[var(--vela-foreground)] hover:bg-white/50 hover:shadow-2xs transition-all cursor-pointer"
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
      className={`group relative flex flex-col items-center justify-center min-w-[54px] min-h-[46px] px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
        isActive
          ? "text-[var(--vela-foreground)] shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.9)] border border-[var(--vela-glass-border-strong)] bg-white/80 backdrop-blur-md"
          : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-white/40"
      }`}
      style={isActive ? {
        backgroundColor: "color-mix(in srgb, var(--vela-primary) 12%, rgba(255, 255, 255, 0.85))"
      } : undefined}
    >
      <span className={`shrink-0 transition-transform duration-200 ${isActive ? "text-[var(--vela-primary)] scale-110" : "group-hover:scale-105"}`}>
        {icon}
      </span>
      <span className="tracking-tight mt-0.5 truncate">{label}</span>
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
      className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-2xl transition-all duration-200 cursor-pointer ${
        isActive
          ? "text-[var(--vela-foreground)] shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.9)] border border-[var(--vela-glass-border-strong)] bg-white/80 backdrop-blur-md"
          : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-white/40"
      }`}
      style={isActive ? {
        backgroundColor: "color-mix(in srgb, var(--vela-primary) 10%, rgba(255, 255, 255, 0.8))"
      } : undefined}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  )
}
