"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  MapPin,
  BarChart,
  Palette,
  Settings,
  CreditCard,
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

  const isBookingsActive = isRouteActive("/dashboard/bookings")

  return (
    <>
      {/* Mobile Floating Glass Dock (Figma node 46:68 inside 59:869 / 111:429) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-[20px] left-[30.5px] right-[30.5px] sm:left-8 sm:right-8 md:left-10 md:right-10 z-40"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="vela-figma-floating backdrop-blur-3xl rounded-full rounded-[53px] h-[63px] w-full px-[17px] py-[11px] flex items-center justify-between gap-[20px] border border-white/10">
          <DockItem
            href="/dashboard"
            variant="overview"
            label="Overview"
            isActive={isRouteActive("/dashboard")}
          />

          <DockItem
            href="/dashboard/calendar"
            variant="calendar"
            label="Calendar"
            isActive={isRouteActive("/dashboard/calendar")}
          />

          {/* Central Raised Pulsante '+' Button (Figma node 46:213) */}
          <Link
            href="/dashboard/bookings"
            aria-current={isBookingsActive ? "page" : undefined}
            className="relative shrink-0 size-[48.524px] rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            style={
              isBookingsActive
                ? {
                    backgroundColor: "color-mix(in srgb, var(--vela-primary) 12%, transparent)"
                  }
                : undefined
            }
          >
            <span className="absolute inset-[-32.97%_-49.46%_-65.95%_-49.46%] pointer-events-none">
              <img
                alt=""
                src="/figma/dock-plus-pulsante.svg"
                className="block max-w-none size-full"
              />
            </span>
            <span className="sr-only">Bookings</span>
          </Link>

          {isStaff && (
            <DockItem
              href="/dashboard/customers"
              variant="clients"
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
            className="group relative flex flex-col items-center justify-center gap-[4px] w-[35px] rounded-full transition-all duration-200 cursor-pointer"
            style={
              moreOpen || isMoreItemActive
                ? {
                    backgroundColor: "color-mix(in srgb, var(--vela-primary) 12%, transparent)"
                  }
                : undefined
            }
          >
            <DockIconBadge variant="more" isActive={moreOpen || isMoreItemActive} />
            <span className="text-[8px] font-medium text-white text-center leading-none">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Liquid Glass Sheet Modal */}
      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Additional Navigation Options"
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={e => {
            if (e.target === e.currentTarget) setMoreOpen(false)
          }}
        >
          <div
            ref={sheetRef}
            className="w-full max-w-sm vela-figma-floating bg-[#131c38]/90 backdrop-blur-3xl border border-white/15 rounded-[24px] p-5 space-y-4 text-white"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="font-semibold text-sm text-white tracking-tight">
                  More Options
                </h3>
                <p className="text-[11px] text-[#8c95a9] truncate font-medium">
                  {tenant.name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMoreOpen(false)}
                className="size-[28.535px] rounded-full flex items-center justify-center text-white bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] hover:bg-white/25 transition-all cursor-pointer"
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

                  <div className="pt-2.5 my-2 border-t border-white/10">
                    <p className="px-3 text-[10px] font-semibold text-[#8c95a9] uppercase tracking-wider mb-2">
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

              <div className="pt-2.5 my-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  className="flex items-center gap-3 w-full px-3.5 py-2.5 text-xs font-medium text-white/80 rounded-xl hover:text-white hover:bg-white/10 transition-all cursor-pointer"
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
  variant,
  label,
  isActive
}: {
  href: string
  variant: "overview" | "calendar" | "clients"
  label: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="group relative flex flex-col items-center justify-center gap-[4px] w-[37px] rounded-full transition-all duration-200 cursor-pointer"
      style={
        isActive
          ? {
              backgroundColor: "color-mix(in srgb, var(--vela-primary) 12%, transparent)"
            }
          : undefined
      }
    >
      <DockIconBadge variant={variant} isActive={isActive} />
      <span className="text-[8px] font-medium text-white text-center leading-none truncate">
        {label}
      </span>
    </Link>
  )
}

function DockIconBadge({
  variant,
  isActive
}: {
  variant: "overview" | "calendar" | "clients" | "more"
  isActive?: boolean
}) {
  return (
    <span
      className={`relative shrink-0 size-[28.535px] rounded-[100px] flex items-center justify-center transition-all ${
        isActive
          ? "vela-liquid-primary"
          : "bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]"
      }`}
    >
      {variant === "overview" && (
        <span className="relative size-[15px] block">
          <img alt="" src="/figma/icon-apps-tl.svg" className="absolute inset-[0_54.17%_54.17%_0] size-[45.83%]" />
          <img alt="" src="/figma/icon-apps-tr.svg" className="absolute inset-[0_0_54.17%_54.17%] size-[45.83%]" />
          <img alt="" src="/figma/icon-apps-bl.svg" className="absolute inset-[54.17%_54.17%_0_0] size-[45.83%]" />
          <img alt="" src="/figma/icon-apps-br.svg" className="absolute inset-[54.17%_0_0_54.17%] size-[45.83%]" />
        </span>
      )}
      {variant === "calendar" && (
        <img alt="" src="/figma/fi-rr-calendar.svg" className="size-[15px]" />
      )}
      {variant === "clients" && (
        <img alt="" src="/figma/fi-rr-following.svg" className="size-[15px]" />
      )}
      {variant === "more" && (
        <img alt="" src="/figma/fi-rr-menu-dots.svg" className="w-[15px] h-[3.5px]" />
      )}
    </span>
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
      className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer ${
        isActive
          ? "vela-liquid-primary text-white"
          : "text-white/80 hover:text-white hover:bg-white/10"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  )
}
