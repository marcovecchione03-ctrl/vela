import { describe, it, expect } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { 
  computeVelaTheme, 
  getVelaThemeStyles, 
  getAccessibleForeground,
  getForegroundContrast,
  getRelativeLuminance,
  getContrastRatio,
  getChannelLinear,
  TenantBranding 
} from "@/lib/theme"
import { VelaThemeScope } from "@/components/theme/VelaThemeScope"
import { BRANDING_PRESETS } from "@/modules/tenant/presets"

describe("Vela Semantic Theme Layer & WCAG Contrast (Step 4M-C)", () => {
  // A. Relative luminance implementation
  describe("A. WCAG Relative Luminance Implementation", () => {
    it("linearizes sRGB channels according to WCAG 2.1 specification", () => {
      // Channel <= 0.04045
      expect(getChannelLinear(0)).toBe(0)
      expect(getChannelLinear(10)).toBeCloseTo((10 / 255) / 12.92, 5)
      // Channel > 0.04045
      expect(getChannelLinear(255)).toBeCloseTo(1, 5)
      expect(getChannelLinear(128)).toBeCloseTo(Math.pow((128 / 255 + 0.055) / 1.055, 2.4), 5)
    })

    it("calculates exact relative luminance for pure extremes and primaries", () => {
      // Pure black L = 0
      expect(getRelativeLuminance("#000000")).toBe(0)
      // Pure white L = 1
      expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1.0, 5)
      // Pure primaries
      expect(getRelativeLuminance("#ff0000")).toBeCloseTo(0.2126, 4)
      expect(getRelativeLuminance("#00ff00")).toBeCloseTo(0.7152, 4)
      expect(getRelativeLuminance("#0000ff")).toBeCloseTo(0.0722, 4)
    })
  })

  // B. Contrast ratio implementation
  describe("B. Contrast Ratio Implementation", () => {
    it("calculates exact WCAG 2.1 contrast ratios", () => {
      // Black vs White = 21:1
      expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21.0, 3)
      // Same color = 1:1
      expect(getContrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1.0, 3)
      expect(getContrastRatio("#171717", "#171717")).toBeCloseTo(1.0, 3)
      // Commutative property: ratio(A, B) === ratio(B, A)
      expect(getContrastRatio("#171717", "#ffffff")).toBeCloseTo(
        getContrastRatio("#ffffff", "#171717"),
        5
      )
    })
  })

  // C. Accessible foreground selection uses real contrast
  describe("C. White vs Dark Foreground Selection Using Real Contrast", () => {
    it("selects foreground with strictly higher WCAG contrast ratio", () => {
      const darkBg = "#171717"
      const lightBg = "#ffffff"

      expect(getAccessibleForeground(darkBg)).toBe("#ffffff")
      expect(getAccessibleForeground(lightBg)).toBe("#171717")

      // Proof that real WCAG contrast corrects old YIQ errors:
      // For medium gray #808080 (rgb 128, 128, 128):
      // YIQ brightness: 128 < 150 -> falsely selected white (ratio 3.95:1)
      // Real WCAG contrast:
      // Contrast with dark (#171717): 4.54:1 (PASSES WCAG AA)
      // Contrast with white (#ffffff): 3.95:1 (FAILS WCAG AA)
      // Therefore real WCAG logic correctly selects #171717!
      const midGrayContrast = getForegroundContrast("#808080")
      expect(midGrayContrast.foreground).toBe("#171717")
      expect(midGrayContrast.ratio).toBeGreaterThanOrEqual(4.5)
      expect(getAccessibleForeground("#808080")).toBe("#171717")
    })
  })

  // D. Primary foreground >= 4.5:1 for all six presets
  describe("D. Primary Foreground Contrast on Presets", () => {
    it("ensures primary foreground achieves >= 4.5:1 for all six presets", () => {
      const ratios: Record<string, number> = {}

      for (const [name, preset] of Object.entries(BRANDING_PRESETS)) {
        const tokens = computeVelaTheme(preset)
        const ratio = getContrastRatio(tokens.primary, tokens.primaryForeground)
        ratios[name] = Number(ratio.toFixed(2))

        // All six presets must exceed the 4.5:1 WCAG AA threshold for normal text
        expect(ratio).toBeGreaterThanOrEqual(4.5)
      }

      // Explicit verification of verified ratios
      expect(ratios.Essential).toBeCloseTo(17.93, 1)
      expect(ratios.Bold).toBeCloseTo(18.88, 1)
      expect(ratios.Soft).toBeCloseTo(4.69, 1)
      expect(ratios.Elegant).toBeCloseTo(12.81, 1)
      expect(ratios.Fresh).toBeCloseTo(4.85, 1)
      expect(ratios.Urban).toBeCloseTo(15.52, 1)
    })
  })

  // E. Secondary foreground >= 4.5:1 for all six presets where achievable
  describe("E. Secondary Foreground Contrast on Presets", () => {
    it("ensures secondary foreground achieves >= 4.5:1 where achievable and optimal otherwise", () => {
      const results: Record<string, { fg: string; ratio: number }> = {}

      for (const [name, preset] of Object.entries(BRANDING_PRESETS)) {
        const tokens = computeVelaTheme(preset)
        const ratio = getContrastRatio(tokens.secondary, tokens.secondaryForeground)
        results[name] = { fg: tokens.secondaryForeground, ratio: Number(ratio.toFixed(2)) }
      }

      // Presets where >= 4.5:1 is achieved:
      expect(results.Essential.ratio).toBeGreaterThanOrEqual(4.5) // 4.74:1 with white
      expect(results.Bold.ratio).toBeGreaterThanOrEqual(4.5)      // 10.37:1 with white
      expect(results.Soft.ratio).toBeGreaterThanOrEqual(4.5)      // 8.63:1 with dark
      expect(results.Elegant.ratio).toBeGreaterThanOrEqual(4.5)   // 5.80:1 with dark
      expect(results.Fresh.ratio).toBeGreaterThanOrEqual(4.5)     // 8.39:1 with dark

      // Urban preset uses #7A7A7A (mid gray) where maximum mathematically achievable
      // contrast against any monochrome candidate is 4.29:1 with #ffffff (vs 4.17:1 with #171717).
      // Verify #ffffff is chosen and ratio is documented without false claims:
      expect(results.Urban.fg).toBe("#ffffff")
      expect(results.Urban.ratio).toBeCloseTo(4.29, 1)
      const urbanDarkRatio = getContrastRatio(BRANDING_PRESETS.Urban.secondaryColor, "#171717")
      expect(results.Urban.ratio).toBeGreaterThan(urbanDarkRatio)
    })
  })

  // F. Main foreground/background contrast
  describe("F. Main Foreground / Background and Surface Contrast", () => {
    it("ensures main foreground exceeds 7:1 (WCAG AAA) across background and surface for all presets", () => {
      for (const [name, preset] of Object.entries(BRANDING_PRESETS)) {
        const tokens = computeVelaTheme(preset)
        const ratioOnBg = getContrastRatio(tokens.foreground, tokens.background)
        const ratioOnSurface = getContrastRatio(tokens.foreground, tokens.surface)

        // All six presets must exceed 12:1, far exceeding WCAG AAA (7:1)
        expect(ratioOnBg).toBeGreaterThanOrEqual(12.0)
        expect(ratioOnSurface).toBeGreaterThanOrEqual(12.0)
      }
    })
  })

  // G. Muted foreground contrast explicitly measured
  describe("G. Muted Foreground Contrast Derivation", () => {
    it("ensures muted foreground satisfies >= 4.5:1 on surface and background while remaining secondary", () => {
      for (const [name, preset] of Object.entries(BRANDING_PRESETS)) {
        const tokens = computeVelaTheme(preset)
        const ratioOnSurface = getContrastRatio(tokens.mutedForeground, tokens.surface)
        const ratioOnBg = getContrastRatio(tokens.mutedForeground, tokens.background)
        const mainTextRatio = getContrastRatio(tokens.foreground, tokens.surface)

        // Must meet WCAG AA threshold on surfaces
        expect(ratioOnSurface).toBeGreaterThanOrEqual(4.5)
        expect(ratioOnBg).toBeGreaterThanOrEqual(4.5)

        // Must remain noticeably softer/muted compared to main text (ratio strictly lower than main text)
        expect(ratioOnSurface).toBeLessThan(mainTextRatio * 0.75)
      }
    })
  })

  // H & I & J. Custom Color Safety
  describe("H-J. Custom Brand Color Safety", () => {
    it("H. light custom primary chooses dark text with high contrast", () => {
      const veryLight = "#F3F4F6"
      const fg = getAccessibleForeground(veryLight)
      const ratio = getContrastRatio(veryLight, fg)
      expect(fg).toBe("#171717")
      expect(ratio).toBeGreaterThanOrEqual(15.0)
    })

    it("I. dark custom primary chooses light text with high contrast", () => {
      const veryDark = "#0A0A0A"
      const fg = getAccessibleForeground(veryDark)
      const ratio = getContrastRatio(veryDark, fg)
      expect(fg).toBe("#ffffff")
      expect(ratio).toBeGreaterThanOrEqual(18.0)
    })

    it("J. saturated yellow primary chooses dark text and remains readable", () => {
      const yellow = "#FACC15"
      const fg = getAccessibleForeground(yellow)
      const ratio = getContrastRatio(yellow, fg)
      expect(fg).toBe("#171717")
      expect(ratio).toBeGreaterThanOrEqual(10.0) // ~11.71:1

      const pureYellow = "#FFFF00"
      expect(getAccessibleForeground(pureYellow)).toBe("#171717")
      expect(getContrastRatio(pureYellow, "#171717")).toBeGreaterThanOrEqual(15.0)
    })

    it("bright cyan chooses dark text with WCAG AA compliance", () => {
      const cyan = "#06B6D4"
      const fg = getAccessibleForeground(cyan)
      const ratio = getContrastRatio(cyan, fg)
      expect(fg).toBe("#171717")
      expect(ratio).toBeGreaterThanOrEqual(4.5) // ~7.38:1
    })

    it("light secondary chooses dark text with high contrast", () => {
      const lightSec = "#E5E7EB"
      const fg = getAccessibleForeground(lightSec)
      const ratio = getContrastRatio(lightSec, fg)
      expect(fg).toBe("#171717")
      expect(ratio).toBeGreaterThanOrEqual(14.0)
    })
  })

  // Theme generation and scope
  describe("Theme Generation and VelaThemeScope", () => {
    it("participates all 4 branding inputs and produces valid CSS variables", () => {
      const customBranding: TenantBranding = {
        primaryColor: "#507A6A",
        secondaryColor: "#9BB8AA",
        bgColor: "#F5FAF7",
        textColor: "#23352E"
      }

      const tokens = computeVelaTheme(customBranding)
      expect(tokens.primary).toBe("#507A6A")
      expect(tokens.secondary).toBe("#9BB8AA")
      expect(tokens.background).toBe("#F5FAF7")
      expect(tokens.foreground).toBe("#23352E")
      expect(tokens.surface).toBe("#ffffff")
      expect(tokens.mutedForeground).toBeDefined()

      const styles = getVelaThemeStyles(customBranding) as Record<string, string>
      expect(styles["--vela-primary"]).toBe(tokens.primary)
      expect(styles["--vela-primary-foreground"]).toBe(tokens.primaryForeground)
      expect(styles["--vela-secondary"]).toBe(tokens.secondary)
      expect(styles["--vela-secondary-foreground"]).toBe(tokens.secondaryForeground)
      expect(styles["--vela-background"]).toBe(tokens.background)
      expect(styles["--vela-foreground"]).toBe(tokens.foreground)
      expect(styles["--vela-muted-foreground"]).toBe(tokens.mutedForeground)
    })

    it("VelaThemeScope wraps children and renders semantic CSS properties", () => {
      const html = renderToStaticMarkup(
        React.createElement(
          VelaThemeScope,
          { branding: BRANDING_PRESETS.Fresh, className: "test-scope" },
          React.createElement("div", null, "Scoped Content")
        )
      )

      expect(html).toContain("test-scope")
      expect(html).toContain("--vela-primary:#507A6A")
      expect(html).toContain("--vela-background:#F5FAF7")
      expect(html).toContain("--vela-foreground:#23352E")
      expect(html).toContain("Scoped Content")
    })
  })
})
