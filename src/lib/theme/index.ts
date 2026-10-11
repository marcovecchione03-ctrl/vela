import React from "react"

export interface TenantBranding {
  primaryColor?: string | null
  secondaryColor?: string | null
  bgColor?: string | null
  textColor?: string | null
}

export interface VelaThemeTokens {
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  background: string
  foreground: string
  surface: string
  surfaceSubtle: string
  border: string
  borderMuted: string
  muted: string
  mutedForeground: string
  focus: string
  // Liquid Glass Design System Tokens
  glass: string
  glassStrong: string
  glassSubtle: string
  glassBorder: string
  glassBorderMuted: string
  glassBorderStrong: string
  glassHighlight: string
  shadowSoft: string
  shadowFloating: string
  active: string
  hover: string
  ambientGlow: string
}

export function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace("#", "").trim()
  if (clean.length === 3) {
    clean = clean.split("").map(c => c + c).join("")
  }
  const r = parseInt(clean.substring(0, 2), 16) || 0
  const g = parseInt(clean.substring(2, 4), 16) || 0
  const b = parseInt(clean.substring(4, 6), 16) || 0
  return [r, g, b]
}

export function toRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function getChannelLinear(c: number): number {
  const norm = c / 255
  if (norm <= 0.04045) {
    return norm / 12.92
  }
  return Math.pow((norm + 0.055) / 1.055, 2.4)
}

/**
 * Standard WCAG 2.1 relative luminance calculation (sRGB).
 * L = 0.2126 * Rlinear + 0.7152 * Glinear + 0.0722 * Blinear
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  const rLinear = getChannelLinear(r)
  const gLinear = getChannelLinear(g)
  const bLinear = getChannelLinear(b)
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Standard WCAG contrast ratio between two colors:
 * (Llighter + 0.05) / (Ldarker + 0.05)
 * Returns a value between 1.0 (no contrast) and 21.0 (black on white).
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1)
  const l2 = getRelativeLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Selects the accessible foreground (light vs dark candidate) with the highest real WCAG contrast.
 * Targets >= 4.5:1 where achievable; if pathological custom colors prevent 4.5:1,
 * chooses the higher-contrast candidate deterministically.
 */
export function getAccessibleForeground(
  backgroundHex: string,
  darkCandidate = "#171717",
  lightCandidate = "#ffffff"
): string {
  const contrastWithDark = getContrastRatio(backgroundHex, darkCandidate)
  const contrastWithLight = getContrastRatio(backgroundHex, lightCandidate)
  return contrastWithLight >= contrastWithDark ? lightCandidate : darkCandidate
}

/**
 * Detailed foreground contrast selection with actual calculated ratios.
 */
export function getForegroundContrast(
  backgroundHex: string,
  darkCandidate = "#171717",
  lightCandidate = "#ffffff"
): { foreground: string; ratio: number; contrastWithDark: number; contrastWithLight: number } {
  const contrastWithDark = getContrastRatio(backgroundHex, darkCandidate)
  const contrastWithLight = getContrastRatio(backgroundHex, lightCandidate)
  const isLightBetter = contrastWithLight >= contrastWithDark
  return {
    foreground: isLightBetter ? lightCandidate : darkCandidate,
    ratio: isLightBetter ? contrastWithLight : contrastWithDark,
    contrastWithDark,
    contrastWithLight
  }
}

/**
 * Derives a calibrated muted foreground color that satisfies WCAG AA (>= 4.5:1)
 * across application surfaces (surface, background, surfaceSubtle) while remaining
 * visually distinct and softer than the primary foreground.
 */
export function getMutedForeground(
  foregroundHex: string,
  backgroundHex = "#ffffff",
  surfaceHex = "#ffffff",
  targetRatio = 4.5
): string {
  const subtleHex = blendHex(foregroundHex, surfaceHex, 0.05)
  const maxBg = getContrastRatio(foregroundHex, backgroundHex)
  const maxSurf = getContrastRatio(foregroundHex, surfaceHex)
  const maxSubtle = getContrastRatio(foregroundHex, subtleHex)
  const effectiveTarget = Math.min(targetRatio, maxBg, maxSurf, maxSubtle)

  // Blend foreground with surface starting from a soft ratio (0.55) up to 1.0 (full foreground)
  for (let r = 0.55; r <= 1.0; r += 0.01) {
    const candidate = blendHex(foregroundHex, surfaceHex, r)
    if (
      getContrastRatio(candidate, surfaceHex) >= effectiveTarget &&
      getContrastRatio(candidate, backgroundHex) >= effectiveTarget &&
      getContrastRatio(candidate, subtleHex) >= effectiveTarget
    ) {
      return candidate
    }
  }

  return foregroundHex
}

export function blendHex(c1: string, c2: string, ratio: number): string {
  const [r1, g1, b1] = parseHex(c1)
  const [r2, g2, b2] = parseHex(c2)
  const r = Math.round(r1 * ratio + r2 * (1 - ratio))
  const g = Math.round(g1 * ratio + g2 * (1 - ratio))
  const b = Math.round(b1 * ratio + b2 * (1 - ratio))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function computeVelaTheme(branding?: TenantBranding | null): VelaThemeTokens {
  const primary = branding?.primaryColor?.trim() || "#171717"
  const secondary = branding?.secondaryColor?.trim() || "#737373"
  const background = branding?.bgColor?.trim() || "#ffffff"
  const foreground = branding?.textColor?.trim() || "#171717"

  const primaryForeground = getAccessibleForeground(primary)
  const secondaryForeground = getAccessibleForeground(secondary)

  // Surface: elevated white card surface
  const surface = "#ffffff"

  // Surface subtle: soft background tint derived from foreground on surface
  const surfaceSubtle = toRgba(foreground, 0.05)

  // Subtle borders derived from foreground
  const border = toRgba(foreground, 0.12)
  const borderMuted = toRgba(foreground, 0.06)

  // Muted background & text derived for robust contrast across all surfaces
  const muted = toRgba(foreground, 0.03)
  const mutedForeground = getMutedForeground(foreground, background, surface, 4.5)

  // Focus glow matching primary
  const focus = toRgba(primary, 0.35)

  // Liquid Glass Design System Tokens
  // Standard glass panel surface: translucent white intended for backdrop-filter
  const glass = "rgba(255, 255, 255, 0.72)"
  // Elevated glass surface (floating dock, active sheets, elevated cards)
  const glassStrong = "rgba(255, 255, 255, 0.88)"
  // Subtle glass surface (nested pills, input backgrounds)
  const glassSubtle = "rgba(255, 255, 255, 0.45)"

  // Glass borders and highlights derived from foreground and specular reflection
  const glassBorder = toRgba(foreground, 0.08)
  const glassBorderMuted = toRgba(foreground, 0.04)
  const glassBorderStrong = toRgba(foreground, 0.16)
  const glassHighlight = "rgba(255, 255, 255, 0.65)"

  // Shadows
  const shadowSoft = "0 8px 30px -4px rgba(0, 0, 0, 0.04)"
  const shadowFloating = "0 16px 40px -6px rgba(0, 0, 0, 0.10), 0 4px 16px -2px rgba(0, 0, 0, 0.05)"

  // States & Ambient Lighting
  const active = toRgba(primary, 0.10)
  const hover = toRgba(foreground, 0.05)
  const ambientGlow = toRgba(primary, 0.04)

  return {
    primary,
    primaryForeground,
    secondary,
    secondaryForeground,
    background,
    foreground,
    surface,
    surfaceSubtle,
    border,
    borderMuted,
    muted,
    mutedForeground,
    focus,
    glass,
    glassStrong,
    glassSubtle,
    glassBorder,
    glassBorderMuted,
    glassBorderStrong,
    glassHighlight,
    shadowSoft,
    shadowFloating,
    active,
    hover,
    ambientGlow
  }
}

export function getVelaThemeStyles(branding?: TenantBranding | null): React.CSSProperties {
  const tokens = computeVelaTheme(branding)
  return {
    "--vela-primary": tokens.primary,
    "--vela-primary-foreground": tokens.primaryForeground,
    "--vela-secondary": tokens.secondary,
    "--vela-secondary-foreground": tokens.secondaryForeground,
    "--vela-background": tokens.background,
    "--vela-foreground": tokens.foreground,
    "--vela-surface": tokens.surface,
    "--vela-surface-subtle": tokens.surfaceSubtle,
    "--vela-border": tokens.border,
    "--vela-border-muted": tokens.borderMuted,
    "--vela-muted": tokens.muted,
    "--vela-muted-foreground": tokens.mutedForeground,
    "--vela-focus": tokens.focus,
    "--vela-glass": tokens.glass,
    "--vela-glass-strong": tokens.glassStrong,
    "--vela-glass-subtle": tokens.glassSubtle,
    "--vela-glass-border": tokens.glassBorder,
    "--vela-glass-border-muted": tokens.glassBorderMuted,
    "--vela-glass-border-strong": tokens.glassBorderStrong,
    "--vela-glass-highlight": tokens.glassHighlight,
    "--vela-shadow-soft": tokens.shadowSoft,
    "--vela-shadow-floating": tokens.shadowFloating,
    "--vela-active": tokens.active,
    "--vela-hover": tokens.hover,
    "--vela-ambient-glow": tokens.ambientGlow,
  } as React.CSSProperties
}
