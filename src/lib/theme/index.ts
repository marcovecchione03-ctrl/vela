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
  // Figma-Authored Liquid Glass Material Tokens (Step 4O)
  glassSubtleFill: string
  glassPanelFill: string
  glassFloatingFill: string
  liquidGradient: string
  liquidGlow: string
  liquidGlowLg: string
  // Semantic Booking Status Tokens (Step 4P)
  statusConfirmedBg: string
  statusConfirmedBorder: string
  statusConfirmedFg: string
  statusActiveBg: string
  statusActiveBorder: string
  statusActiveFg: string
  statusCompletedBg: string
  statusCompletedBorder: string
  statusCompletedFg: string
  statusCancelledBg: string
  statusCancelledBorder: string
  statusCancelledFg: string
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

  // Figma-Authored 3-Level Glass Material System & Liquid Primary Mapping
  const glassSubtleFill = "rgba(211, 211, 211, 0.15)"
  const glassPanelFill = "rgba(213, 213, 213, 0.20)"
  const glassFloatingFill = "rgba(213, 213, 213, 0.20)"

  const [pr, pg, pb] = parseHex(primary)
  const chroma = Math.max(pr, pg, pb) - Math.min(pr, pg, pb)
  const isChromatic = chroma >= 24 && primary.toUpperCase() !== "#297BFF"

  const stop1 = isChromatic ? toRgba(blendHex(primary, "#297BFF", 0.65), 0.42) : "rgba(41, 123, 255, 0.4)"
  const stop2 = isChromatic ? toRgba(blendHex(primary, "#5665E9", 0.55), 0.42) : "rgba(86, 101, 233, 0.4)"
  const stop3 = isChromatic ? toRgba(blendHex(secondary, "#9A7DDE", 0.60), 0.42) : "rgba(154, 125, 222, 0.4)"
  const stop4 = isChromatic ? toRgba(blendHex(secondary, "#E1B0D7", 0.55), 0.42) : "rgba(225, 176, 215, 0.4)"

  const liquidGradient = `linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(13.635deg, ${stop1} 14.063%, ${stop2} 47.24%, ${stop3} 69.359%, ${stop4} 87.791%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)`
  const glowColor = isChromatic ? toRgba(blendHex(primary, "#3977FF", 0.45), 0.35) : "rgba(57, 119, 255, 0.35)"
  const liquidGlow = `0px 8px 24px 0px ${glowColor}`
  const liquidGlowLg = `0px 15.68px 47.04px 0px ${glowColor}`

  // Semantic Functional Booking Status Tokens (Step 4P — Figma Component 2/6/9)
  const statusConfirmedBg =
    "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(18.25756307538974deg, rgba(32, 186, 114, 0.62) 14.063%, rgba(50, 187, 43, 0.62) 47.24%, rgba(45, 186, 73, 0.62) 69.359%, rgba(35, 203, 52, 0.62) 87.791%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)"
  const statusConfirmedBorder = "rgba(0, 164, 41, 0.44)"
  const statusConfirmedFg = "#ffffff"

  const statusActiveBg =
    "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(18.25756307538974deg, rgba(255, 177, 59, 0.62) 14.063%, rgba(227, 134, 3, 0.62) 47.24%, rgba(227, 132, 0, 0.62) 69.359%, rgba(238, 155, 30, 0.62) 87.791%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)"
  const statusActiveBorder = "rgba(255, 138, 4, 0.44)"
  const statusActiveFg = "#ffffff"

  const statusCompletedBg =
    "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(18.25756307538974deg, rgba(64, 155, 234, 0.62) 14.063%, rgba(28, 116, 184, 0.62) 47.24%, rgba(45, 139, 186, 0.62) 69.359%, rgba(35, 94, 203, 0.62) 87.791%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)"
  const statusCompletedBorder = "rgba(3, 162, 255, 0.44)"
  const statusCompletedFg = "#ffffff"

  const statusCancelledBg =
    "linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), linear-gradient(18.25756307538974deg, rgba(221, 29, 29, 0.62) 14.063%, rgba(239, 35, 38, 0.62) 47.24%, rgba(184, 0, 0, 0.62) 69.359%, rgba(183, 14, 14, 0.62) 87.791%), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.1) 100%)"
  const statusCancelledBorder = "rgba(230, 7, 7, 0.44)"
  const statusCancelledFg = "#ffffff"

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
    ambientGlow,
    glassSubtleFill,
    glassPanelFill,
    glassFloatingFill,
    liquidGradient,
    liquidGlow,
    liquidGlowLg,
    statusConfirmedBg,
    statusConfirmedBorder,
    statusConfirmedFg,
    statusActiveBg,
    statusActiveBorder,
    statusActiveFg,
    statusCompletedBg,
    statusCompletedBorder,
    statusCompletedFg,
    statusCancelledBg,
    statusCancelledBorder,
    statusCancelledFg
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
    "--pulsantiglass": tokens.glassSubtleFill,
    "--textdeselected": "#8c95a9",
    "--vela-figma-glass-subtle": tokens.glassSubtleFill,
    "--vela-figma-glass-panel": tokens.glassPanelFill,
    "--vela-figma-glass-floating": tokens.glassFloatingFill,
    "--vela-liquid-gradient": tokens.liquidGradient,
    "--vela-liquid-glow": tokens.liquidGlow,
    "--vela-liquid-glow-lg": tokens.liquidGlowLg,
    "--vela-status-confirmed-bg": tokens.statusConfirmedBg,
    "--vela-status-confirmed-border": tokens.statusConfirmedBorder,
    "--vela-status-confirmed-fg": tokens.statusConfirmedFg,
    "--vela-status-active-bg": tokens.statusActiveBg,
    "--vela-status-active-border": tokens.statusActiveBorder,
    "--vela-status-active-fg": tokens.statusActiveFg,
    "--vela-status-completed-bg": tokens.statusCompletedBg,
    "--vela-status-completed-border": tokens.statusCompletedBorder,
    "--vela-status-completed-fg": tokens.statusCompletedFg,
    "--vela-status-cancelled-bg": tokens.statusCancelledBg,
    "--vela-status-cancelled-border": tokens.statusCancelledBorder,
    "--vela-status-cancelled-fg": tokens.statusCancelledFg,
  } as React.CSSProperties
}
