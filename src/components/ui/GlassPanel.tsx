import React from "react"

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "subtle"
  highlight?: boolean
  as?: React.ElementType
}

export function GlassPanel({
  variant = "default",
  highlight = true,
  as: Component = "div",
  className = "",
  children,
  style,
  ...props
}: GlassPanelProps) {
  const variantStyles = {
    default: "bg-[var(--vela-glass)] border-[var(--vela-glass-border)] shadow-[var(--vela-shadow-soft)]",
    strong: "bg-[var(--vela-glass-strong)] border-[var(--vela-glass-border-strong)] shadow-[var(--vela-shadow-floating)]",
    subtle: "bg-[var(--vela-glass-subtle)] border-[var(--vela-glass-border-muted)]"
  }[variant]

  return (
    <Component
      className={`relative backdrop-blur-xl border rounded-2xl md:rounded-3xl transition-all ${variantStyles} ${
        highlight ? "before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-[var(--vela-glass-highlight)] before:pointer-events-none" : ""
      } ${className}`}
      style={style}
      {...props}
    >
      {children}
    </Component>
  )
}
