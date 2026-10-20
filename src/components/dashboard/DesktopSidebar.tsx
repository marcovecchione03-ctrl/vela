"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

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
    <div className="hidden lg:flex lg:flex-col lg:w-[300px] shrink-0 pt-[78px] pb-[40px] pl-[22.4px] pr-[22.6px] relative z-20">
      <aside
        aria-label="Desktop Navigation"
        className="hidden lg:flex lg:flex-col w-[255px] min-h-[868px] h-[calc(100vh-2rem)] max-h-[868px] sticky top-4 rounded-[30px] lg:rounded-[20px] pt-[34px] pb-[11px] px-[17px] vela-figma-floating backdrop-blur-3xl border border-white/10 transition-all overflow-hidden"
      >
        {/* Tenant Brand Identity (Figma node 101:1322) */}
        <div className="flex items-center gap-[15px] h-[68.21px] ml-[7.02px] shrink-0">
          <div className="relative shrink-0 size-[68.21px] rounded-full overflow-hidden">
            <img
              alt={tenant.name}
              src="/figma/logo-antonios-cut.png"
              width={68.21}
              height={68.21}
              className="block size-full object-cover"
            />
            <span className="sr-only">{monogram}</span>
          </div>
          <div className="flex flex-col gap-[8px] items-start min-w-0 w-[118px]">
            <h2 className="text-[18px] font-medium text-white leading-tight truncate w-full">
              {tenant.name}
            </h2>
            <p className="text-[12px] font-medium text-[var(--textdeselected,#8c95a9)] leading-none truncate w-full">
              <span className="sr-only">Vela Workspace</span>
              <span>Workspace</span>
            </p>
          </div>
        </div>

        {/* Main Navigation Items (Figma node 101:1931) */}
        <nav aria-label="Main menu" className="flex flex-col gap-[15px] mt-[47px] flex-1">
          <SidebarNavLink
            href="/dashboard"
            icon={<SidebarIconBadge variant="overview" />}
            isActive={isRouteActive("/dashboard")}
            srLabel="Overview"
          >
            Panoramica
          </SidebarNavLink>

          <SidebarNavLink
            href="/dashboard/calendar"
            icon={<SidebarIconBadge variant="calendar" />}
            isActive={isRouteActive("/dashboard/calendar")}
            srLabel="Calendar"
          >
            Calendario
          </SidebarNavLink>

          <SidebarNavLink
            href="/dashboard/bookings"
            icon={<SidebarIconBadge variant="prenotazioni" />}
            isActive={isRouteActive("/dashboard/bookings")}
            srLabel="Bookings"
          >
            Prenotazioni
          </SidebarNavLink>

          {isStaff && (
            <>
              <SidebarNavLink
                href="/dashboard/customers"
                icon={<SidebarIconBadge variant="clients" />}
                isActive={isRouteActive("/dashboard/customers")}
                srLabel="Customers"
              >
                Clienti
              </SidebarNavLink>

              <SidebarNavLink
                href="/dashboard/locations"
                icon={<SidebarIconBadge variant="servizi" />}
                isActive={isRouteActive("/dashboard/locations")}
                srLabel="Locations"
              >
                Servizi
              </SidebarNavLink>

              <SidebarNavLink
                href="/dashboard/settings/customization"
                icon={<SidebarIconBadge variant="team" />}
                isActive={isRouteActive("/dashboard/settings/customization")}
                srLabel="Customization"
              >
                Team
              </SidebarNavLink>

              <SidebarNavLink
                href="/dashboard/analytics"
                icon={<SidebarIconBadge variant="stats" />}
                isActive={isRouteActive("/dashboard/analytics")}
                srLabel="Analytics"
              >
                Statistiche
              </SidebarNavLink>
            </>
          )}

          {isOwner && (
            <Link href="/dashboard/subscription" className="sr-only">
              Subscription
            </Link>
          )}
        </nav>

        {/* Bottom Utility Actions (Figma node 101:1961) */}
        <div className="mt-auto mb-[16px] ml-[7px] flex flex-col gap-[20px]">
          {isStaff && (
            <SidebarNavLink
              href={isOwner ? "/dashboard/settings" : "/dashboard/settings/customization"}
              icon={<SidebarIconBadge variant="settings" />}
              isActive={isOwner && isRouteActive("/dashboard/settings") && !isRouteActive("/dashboard/settings/customization")}
              srLabel={isOwner ? "Configuration" : undefined}
            >
              Impostazioni
            </SidebarNavLink>
          )}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-[22px] h-[36px] pl-[7px] pr-[12px] text-[15px] font-medium text-white rounded-[10px] hover:bg-white/10 transition-all cursor-pointer"
          >
            <SidebarIconBadge variant="exit" />
            <span className="whitespace-nowrap">
              <span className="sr-only">Sign Out </span>Esci
            </span>
          </button>
        </div>
      </aside>
    </div>
  )
}

function SidebarNavLink({
  href,
  icon,
  isActive,
  srLabel,
  children
}: {
  href: string
  icon: React.ReactNode
  isActive: boolean
  srLabel?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex items-center gap-[22px] w-[170.37px] h-[44.597px] pl-[7px] pr-[12px] text-[15px] font-medium text-white rounded-[10px] transition-all duration-200 cursor-pointer ${
        isActive
          ? "vela-liquid-primary backdrop-blur-md"
          : "hover:bg-white/10"
      }`}
      style={
        isActive
          ? {
              backgroundColor: "color-mix(in srgb, var(--vela-primary) 12%, rgba(255, 255, 255, 0.1))"
            }
          : undefined
      }
    >
      {icon}
      <span className="whitespace-nowrap leading-none">
        {srLabel && <span className="sr-only">{srLabel} </span>}
        {children}
      </span>
    </Link>
  )
}

function SidebarIconBadge({
  variant
}: {
  variant: "overview" | "calendar" | "prenotazioni" | "clients" | "servizi" | "team" | "stats" | "settings" | "exit"
}) {
  return (
    <span className="relative shrink-0 size-[28.535px] rounded-[100px] bg-[var(--pulsantiglass,rgba(211,211,211,0.15))] border border-white/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] flex items-center justify-center">
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
      {variant === "prenotazioni" && (
        <img alt="" src="/figma/fi-rr-list-check.svg" className="size-[15px]" />
      )}
      {variant === "clients" && (
        <img alt="" src="/figma/fi-rr-following.svg" className="size-[15px]" />
      )}
      {variant === "servizi" && (
        <img alt="" src="/figma/fi-rr-cube.svg" className="size-[15px]" />
      )}
      {variant === "team" && (
        <img alt="" src="/figma/fi-rr-chart-tree.svg" className="size-[15px]" />
      )}
      {variant === "stats" && (
        <img alt="" src="/figma/fi-rr-stats.svg" className="size-[15px]" />
      )}
      {variant === "settings" && (
        <img alt="" src="/figma/fi-rr-settings.svg" className="size-[15px]" />
      )}
      {variant === "exit" && (
        <img alt="" src="/figma/fi-rr-exit.svg" className="size-[15px]" />
      )}
    </span>
  )
}
