import React from "react"

export type GlassVariant = "default" | "strong" | "subtle" | "panel" | "floating" | "ambient"

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant
  level?: 1 | 2 | 3
  highlight?: boolean
  as?: React.ElementType
}

export function GlassPanel({
  variant = "default",
  level,
  highlight = true,
  as: Component = "div",
  className = "",
  children,
  style,
  ...props
}: GlassPanelProps) {
  // Map level to variant if specified
  const effectiveVariant: GlassVariant = level 
    ? (level === 1 ? "subtle" : level === 3 ? "strong" : "default")
    : variant

  // Material system hierarchy
  const variantStyles: Record<GlassVariant, string> = {
    // Level 1: Ambient / subtle (inner controls, wells, secondary surfaces)
    subtle: "bg-[var(--vela-glass-subtle)] border-[var(--vela-glass-border-muted)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl",
    ambient: "bg-[var(--vela-glass-subtle)] border-[var(--vela-glass-border-muted)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-xl",
    
    // Level 2: Panel (main content sheets, section cards)
    default: "bg-[var(--vela-glass)] border-[var(--vela-glass-border)] shadow-[var(--vela-shadow-soft)] shadow-[0_16px_36px_-12px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.7)] backdrop-blur-xl",
    panel: "bg-[var(--vela-glass)] border-[var(--vela-glass-border)] shadow-[var(--vela-shadow-soft)] shadow-[0_16px_36px_-12px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.7)] backdrop-blur-xl",

    // Level 3: Floating (floating navigation, elevated sheets, modals)
    strong: "bg-[var(--vela-glass-strong)] border-[var(--vela-glass-border-strong)] shadow-[var(--vela-shadow-floating)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12),inset_0_1px_1.5px_rgba(255,255,255,0.85)] backdrop-blur-2xl",
    floating: "bg-[var(--vela-glass-strong)] border-[var(--vela-glass-border-strong)] shadow-[var(--vela-shadow-floating)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.12),inset_0_1px_1.5px_rgba(255,255,255,0.85)] backdrop-blur-2xl"
  }

  const selectedStyle = variantStyles[effectiveVariant] || variantStyles.default

  return (
    <Component
      className={`relative border rounded-[24px] sm:rounded-[28px] md:rounded-[32px] transition-all ${selectedStyle} ${
        highlight 
          ? "before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-[inherit] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent before:pointer-events-none" 
          : ""
      } ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Component>
  )
}

