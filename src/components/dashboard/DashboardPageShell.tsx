import React from "react"

export type DashboardContentWidthVariant = "standard" | "wide" | "full"

export interface DashboardPageShellProps {
  variant?: DashboardContentWidthVariant
  className?: string
  children?: React.ReactNode
}

const variantClasses: Record<DashboardContentWidthVariant, string> = {
  // Standard: settings, configuration, forms, detail screens
  standard: "max-w-4xl mx-auto w-full",
  // Wide: bookings, customers, analytics, manual booking
  wide: "max-w-7xl mx-auto w-full",
  // Full: calendar, data-dense scheduling views
  full: "max-w-none w-full"
}

export function DashboardPageShell({
  variant = "wide",
  className = "",
  children
}: DashboardPageShellProps) {
  const widthClass = variantClasses[variant] || variantClasses.wide

  return (
    <div 
      data-testid="dashboard-page-shell"
      data-shell-variant={variant}
      className={`${widthClass} ${className}`.trim()}
    >
      {children}
    </div>
  )
}
