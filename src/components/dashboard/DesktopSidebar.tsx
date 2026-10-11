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
      className="hidden lg:flex lg:flex-col lg:w-64 xl:w-72 shrink-0 h-screen sticky top-0 bg-[var(--vela-glass-strong)] backdrop-blur-2xl border-r border-[var(--vela-glass-border)] transition-all z-20"
    >
      {/* Tenant Brand Identity */}
      <div className="p-6 border-b border-[var(--vela-glass-border-muted)] flex items-center gap-3.5">
        <div 
          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm tracking-tight shrink-0 shadow-xs"
          style={{ 
            backgroundColor: "var(--vela-primary)", 
            color: "var(--vela-primary-foreground)" 
          }}
        >
          {monogram}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-[var(--vela-foreground)] truncate tracking-tight">
            {tenant.name}
          </h2>
          <p className="text-xs text-[var(--vela-muted-foreground)] truncate font-medium">
            Vela Workspace
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav aria-label="Main menu" className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto">
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
          <div className="pt-4 mt-4 border-t border-[var(--vela-glass-border-muted)] space-y-1.5">
            <p className="px-3.5 text-[11px] font-semibold text-[var(--vela-muted-foreground)] uppercase tracking-wider mb-2">
              Settings
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
      <div className="p-4 border-t border-[var(--vela-glass-border-muted)]">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 text-sm font-medium text-[var(--vela-muted-foreground)] rounded-xl hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)] transition-all cursor-pointer"
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
      className={`flex items-center gap-3 px-3.5 py-2.5 min-h-[44px] text-sm font-medium rounded-xl transition-all cursor-pointer ${
        isActive
          ? "bg-[var(--vela-active)] text-[var(--vela-foreground)] font-semibold shadow-xs border border-[var(--vela-glass-border-strong)]"
          : "text-[var(--vela-muted-foreground)] hover:text-[var(--vela-foreground)] hover:bg-[var(--vela-hover)]"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{children}</span>
    </Link>
  )
}
