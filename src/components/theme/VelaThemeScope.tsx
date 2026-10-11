import React from "react"
import { getVelaThemeStyles, TenantBranding } from "@/lib/theme"

export interface VelaThemeScopeProps extends React.HTMLAttributes<HTMLDivElement> {
  branding?: TenantBranding | null
  children?: React.ReactNode
}

export function VelaThemeScope({
  branding,
  children,
  className,
  style,
  ...props
}: VelaThemeScopeProps) {
  const themeStyles = getVelaThemeStyles(branding)
  return (
    <div
      style={{ ...themeStyles, ...style }}
      className={className}
      {...props}
    >
      {children}
    </div>
  )
}
