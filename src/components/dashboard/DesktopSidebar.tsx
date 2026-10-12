"use client"

import React from "react"
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
  LogOut 
} from "lucide-react"

export interface DesktopSidebarProps {
  tenant: {
    id: string
    name: string
    primaryColor?: string | null
    secondaryColor?: string | null
  }
  role: "OWNER" | "ADMIN" | "EMPLOYEE" | "CUSTOMER"
}

export function DesktopSidebar({ tenant, role }: DesktopSidebarProps) {
  const pathname = usePathname()

  const isOwner = role === "OWNER"
  const isStaff = role === "OWNER" || role === "ADMIN"

  const isRouteActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname === href || pathname?.startsWith(href + "/")
  }

  const monogram = (tenant.name?.charAt(0) || "V").toUpperCase()

  return (
    <aside 
      aria-label="Desktop Navigation"
      className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 h-[calc(100vh-2rem)] sticky top-4 rounded-[30px] xl:rounded-[34px] bg-[var(--vela-glass-strong)] backdrop-blur-3xl border border-white/60 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.4),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all z-20 overflow-hidden"
    >
      {/* Tenant Brand Identity: Soft Glass Card */}
      <div className="p-5 border-b border-[var(--vela-glass-border-muted)] flex items-center gap-3.5 relative overflow-hidden bg-gradient-to-b from-white/40 to-transparent">
        <div 
          className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_1.5px_rgba(255,255,255,0.4)] border border-white/30 transition-transform hover:scale-105"
          style={{ 
            backgroundColor: "var(--vela-primary)", 
            color: "var(--vela-primary-foreground)" 
          }}
        >
          {monogram}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-[var(--vela-foreground)] truncate tracking-tight">
            {tenant.name}
          </h2>
          <p className="text-[11px] text-[var(--vela-muted-foreground)] truncate font-medium flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>Vela Workspace</span>
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav aria-label="Main menu" className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <SidebarNavLink 
          href="/dashboard" 
          icon={<LayoutDashboard className="w-4 h-4" />}
          isActive={isRouteActive("/dashboard")}
        >
          Overview
        </SidebarNavLink>

        <SidebarNavLink 
          href="/dashboard/calendar" 
          icon={<Calendar className="w-4 h-4" />}
          isActive={isRouteActive("/dashboard/calendar")}
        >
          Calendar
        </SidebarNavLink>

        <SidebarNavLink 
          href="/dashboard/bookings" 
          icon={<Briefcase className="w-4 h-4" />}
          isActive={isRouteActive("/dashboard/bookings")}
        >
          Bookings
        </SidebarNavLink>

        {isStaff && (
          <>
            <SidebarNavLink 
              href="/dashboard/customers" 
              icon={<Users className="w-4 h-4" />}
              isActive={isRouteActive("/dashboard/customers")}
            >
              Customers
            </SidebarNavLink>

            <SidebarNavLink 
              href="/dashboard/locations" 
              icon={<MapPin className="w-4 h-4" />}
              isActive={isRouteActive("/dashboard/locations")}
            >
              Locations
            </SidebarNavLink>

            <SidebarNavLink 
              href="/dashboard/analytics" 
              icon={<BarChart className="w-4 h-4" />}
              isActive={isRouteActive("/dashboard/analytics")}
            >
              Analytics
            </SidebarNavLink>
          </>
        )}

        {isStaff && (
          <div className="pt-3.5 mt-3.5 border-t border-[var(--vela-glass-border-muted)] space-y-1.5">
            <p className="px-3 text-[10px] font-semibold text-[var(--vela-muted-foreground)] uppercase tracking-wider mb-2">
              Management
            </p>
            <SidebarNavLink 
              href="/dashboard/settings/customization" 
              icon={<Palette className="w-4 h-4" />}
              isActive={isRouteActive("/dashboard/settings/customization")}
            >
              Customization
            </SidebarNavLink>

            {isOwner && (
              <>
                <SidebarNavLink 
                  href="/dashboard/settings" 
                  icon={<Settings className="w-4 h-4" />}
                  isActive={isRouteActive("/dashboard/settings")}
                >
                  Configuration
                </SidebarNavLink>

                <SidebarNavLink 
                  href="/dashboard/subscription" 
                  icon={<CreditCard className="w-4 h-4" />}
                  isActive={isRouteActive("/dashboard/subscription")}
                >
                  Subscription
                </SidebarNavLink>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Quiet Sign Out Footer */}
      <div className="p-3.5 border-t border-[var(--vela-glass-border-muted)] bg-gradient-to-t from-white/30 to-transparent">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-xs font-semibold text-[var(--vela-muted-foreground)] rounded-2xl hover:text-[var(--vela-foreground)] hover:bg-white/50 hover:shadow-2xs transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

function SidebarNavLink({
  href,
  icon,
  isActive,
  children
}: {
  href: string
  icon: React.ReactNode
  isActive: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-2xl transition-all duration-200 cursor-pointer ${
        isActive
          ? "text-[var(--vela-foreground)] shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_1.5px_rgba(255,255,255,0.9),inset_0_0_0_1px_rgba(255,255,255,0.7)] border border-[var(--vela-glass-border-strong)] bg-white/70 backdrop-blur-md"
          : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-white/40 hover:shadow-2xs"
      }`}
      style={isActive ? {
        backgroundColor: "color-mix(in srgb, var(--vela-primary) 10%, rgba(255, 255, 255, 0.75))"
      } : undefined}
    >
      <span className={`shrink-0 transition-transform duration-200 ${isActive ? "text-[var(--vela-primary)] scale-110" : "group-hover:scale-105"}`}>
        {icon}
      </span>
      <span className="truncate">{children}</span>
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--vela-primary)] shadow-[0_0_8px_var(--vela-primary)] shrink-0" />
      )}
    </Link>
  )
}
