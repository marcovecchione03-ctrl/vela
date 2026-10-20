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

  // Material system hierarchy (Figma-authored 3-level hierarchy)
  const variantStyles: Record<GlassVariant, string> = {
    // Level 1: Glass / Subtle (rgba(211,211,211,0.15) embedded controls, fields, slot surfaces)
    subtle: "vela-figma-subtle bg-[var(--vela-glass-subtle)] border-[var(--vela-glass-border-muted)] backdrop-blur-xl",
    ambient: "vela-figma-subtle bg-[var(--vela-glass-subtle)] border-[var(--vela-glass-border-muted)] backdrop-blur-xl",
    
    // Level 2: Glass / Panel (rgba(213,213,213,0.20) booking cards, client panel, date/time panel)
    default: "vela-figma-panel bg-[var(--vela-glass)] border-white/10 shadow-[inset_-1px_-4px_4px_0px_rgba(200,237,247,0.25),inset_0px_4px_4px_0px_rgba(191,246,255,0.25)] backdrop-blur-xl",
    panel: "vela-figma-panel bg-[var(--vela-glass)] border-white/10 shadow-[inset_-1px_-4px_4px_0px_rgba(200,237,247,0.25),inset_0px_4px_4px_0px_rgba(191,246,255,0.25)] backdrop-blur-xl",

    // Level 3: Glass / Floating (navigation island, mobile dock, elevated actions)
    strong: "vela-figma-floating bg-[var(--vela-glass-strong)] border-white/10 shadow-[inset_-1px_-4px_4px_0px_rgba(200,237,247,0.25),inset_0px_4px_4px_0px_rgba(191,246,255,0.25)] backdrop-blur-2xl",
    floating: "vela-figma-floating bg-[var(--vela-glass-strong)] border-white/10 shadow-[inset_-1px_-4px_4px_0px_rgba(200,237,247,0.25),inset_0px_4px_4px_0px_rgba(191,246,255,0.25)] backdrop-blur-2xl"
  }

  const selectedStyle = variantStyles[effectiveVariant] || variantStyles.default

  return (
    <Component
      className={`relative rounded-[20px] transition-all ${selectedStyle} ${
        highlight 
          ? "before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-[inherit] before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:pointer-events-none" 
          : ""
      } ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Component>
  )
}

