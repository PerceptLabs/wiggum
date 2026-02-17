/**
 * Shared types for the theme generator
 */

export interface OklchColor {
  l: number  // 0-1 (perceptual lightness)
  c: number  // 0-0.4 (chroma/colorfulness)
  h: number  // 0-360 (hue angle)
}

export interface GeometryPattern {
  name: string
  description: string
  generate: (baseHue: number) => number[]
}

export interface ThemeConfig {
  seed: number           // Base hue 0-360
  pattern: string        // Pattern name
  mode?: 'light' | 'dark' | 'both'  // Default: 'both'
  font?: string          // Font name from registry
  shadowProfile?: string // Shadow profile name
  radius?: string        // Radius stop name
  chroma?: 'low' | 'medium' | 'high' | number  // Chroma multiplier (0.0-2.0 or named)
}

export interface ThemeCssVars {
  theme: Record<string, string>    // Shared (fonts, radius, tracking)
  light: Record<string, string>    // Light mode (50+ vars)
  dark: Record<string, string>     // Dark mode (50+ vars)
}

export interface GeneratedTheme {
  cssVars: ThemeCssVars
  meta: {
    seed: number
    pattern: string
    hues: number[]
    source: 'preset' | 'generated'
  }
}

export interface ThemePresetMeta {
  name: string
  description: string
  font: string
  radius: string
  shadowStyle: string
}

// Font registry types
export type FontCategory = 'geometric-sans' | 'humanist-sans' | 'neo-grotesque' | 'transitional-serif' | 'slab-serif' | 'display' | 'monospace'
export type RadiusStop = 'none' | 'subtle' | 'moderate' | 'rounded' | 'pill'
export type ShadowProfile = 'none' | 'subtle' | 'moderate' | 'dramatic' | 'harsh'

export interface FontEntry {
  name: string             // Google Fonts name
  fallback: string         // Generic fallback
  category: FontCategory
  weights: number[]        // Available weights
  vibe: string             // One-word personality
}

export interface ShadowRange {
  opacity: [number, number]
  blur: [number, number]
  spread: [number, number]
  offsetX: [number, number]
  offsetY: [number, number]
}
