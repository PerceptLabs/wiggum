/**
 * Non-color token validation: fonts, shadows, radius
 * Curated registry — Ralph picks from approved options, command validates.
 */

import type { FontEntry, FontCategory, RadiusStop, ShadowProfile, ShadowRange } from './types'

// ============================================================================
// FONT REGISTRY — 32 curated Google Fonts
// ============================================================================

export const FONT_REGISTRY: FontEntry[] = [
  // Geometric Sans
  { name: 'Inter',              fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700], vibe: 'clean' },
  { name: 'Plus Jakarta Sans',  fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700, 800], vibe: 'friendly' },
  { name: 'Outfit',             fallback: 'sans-serif', category: 'geometric-sans',     weights: [300, 400, 500, 600, 700], vibe: 'modern' },
  { name: 'Poppins',            fallback: 'sans-serif', category: 'geometric-sans',     weights: [300, 400, 500, 600, 700], vibe: 'rounded' },
  { name: 'Manrope',            fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700, 800], vibe: 'balanced' },
  { name: 'Sora',               fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700], vibe: 'sharp' },
  { name: 'Space Grotesk',      fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700], vibe: 'techy' },

  // Humanist Sans
  { name: 'DM Sans',            fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 500, 600, 700], vibe: 'warm' },
  { name: 'Nunito',             fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 600, 700, 800], vibe: 'soft' },
  { name: 'Rubik',              fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 500, 600, 700], vibe: 'playful' },
  { name: 'Lexend',             fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 500, 600, 700], vibe: 'readable' },

  // Neo-Grotesque
  { name: 'Geist',              fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700], vibe: 'neutral' },
  { name: 'IBM Plex Sans',      fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700], vibe: 'corporate' },
  { name: 'Work Sans',          fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700], vibe: 'utilitarian' },
  { name: 'Montserrat',         fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700, 800], vibe: 'bold' },

  // Transitional Serif
  { name: 'Source Serif 4',     fallback: 'serif',      category: 'transitional-serif', weights: [400, 600, 700], vibe: 'classic' },
  { name: 'Merriweather',       fallback: 'serif',      category: 'transitional-serif', weights: [400, 700], vibe: 'literary' },
  { name: 'Lora',               fallback: 'serif',      category: 'transitional-serif', weights: [400, 500, 600, 700], vibe: 'elegant' },
  { name: 'Libre Baskerville',  fallback: 'serif',      category: 'transitional-serif', weights: [400, 700], vibe: 'traditional' },
  { name: 'Crimson Pro',        fallback: 'serif',      category: 'transitional-serif', weights: [400, 500, 600, 700], vibe: 'refined' },

  // Slab Serif
  { name: 'Roboto Slab',        fallback: 'serif',      category: 'slab-serif',         weights: [400, 500, 700], vibe: 'solid' },
  { name: 'Zilla Slab',         fallback: 'serif',      category: 'slab-serif',         weights: [400, 500, 600, 700], vibe: 'sturdy' },

  // Display
  { name: 'Oxanium',            fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'futuristic' },
  { name: 'Orbitron',           fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'sci-fi' },
  { name: 'Righteous',          fallback: 'sans-serif', category: 'display',            weights: [400],               vibe: 'retro' },
  { name: 'Comfortaa',          fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'bubbly' },
  { name: 'Josefin Sans',       fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'art-deco' },

  // Monospace
  { name: 'JetBrains Mono',     fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'code' },
  { name: 'Geist Mono',         fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'minimal' },
  { name: 'Fira Code',          fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'ligatures' },
  { name: 'IBM Plex Mono',      fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'technical' },
  { name: 'Source Code Pro',    fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'readable' },
]

// ============================================================================
// RADIUS STOPS
// ============================================================================

export const RADIUS_STOPS: Record<RadiusStop, string> = {
  none:     '0rem',
  subtle:   '0.25rem',
  moderate: '0.5rem',
  rounded:  '0.75rem',
  pill:     '1rem',
}

// ============================================================================
// SHADOW PROFILES
// ============================================================================

export const SHADOW_PROFILES: Record<ShadowProfile, Record<string, string>> = {
  none:     { 'shadow-opacity': '0',    'shadow-blur': '0px',  'shadow-spread': '0px',  'shadow-offset-y': '0' },
  subtle:   { 'shadow-opacity': '0.05', 'shadow-blur': '3px',  'shadow-spread': '0px',  'shadow-offset-y': '1px' },
  moderate: { 'shadow-opacity': '0.1',  'shadow-blur': '6px',  'shadow-spread': '0px',  'shadow-offset-y': '2px' },
  dramatic: { 'shadow-opacity': '0.2',  'shadow-blur': '16px', 'shadow-spread': '-2px', 'shadow-offset-y': '4px' },
  harsh:    { 'shadow-opacity': '0.4',  'shadow-blur': '4px',  'shadow-spread': '0px',  'shadow-offset-y': '2px' },
}

// ============================================================================
// VALIDATION
// ============================================================================

export const SHADOW_RANGES: ShadowRange = {
  opacity:  [0, 0.5],
  blur:     [0, 40],
  spread:   [-5, 10],
  offsetX:  [0, 8],
  offsetY:  [0, 8],
}

export function clampRange(value: number, [min, max]: [number, number]): number {
  return Math.min(Math.max(value, min), max)
}

export function validateShadow(values: Record<string, string>): Record<string, string> {
  const clamped = { ...values }
  if (clamped['shadow-opacity'])  clamped['shadow-opacity']  = String(clampRange(parseFloat(clamped['shadow-opacity']), SHADOW_RANGES.opacity))
  if (clamped['shadow-blur'])     clamped['shadow-blur']     = clampRange(parseInt(clamped['shadow-blur']), SHADOW_RANGES.blur) + 'px'
  if (clamped['shadow-spread'])   clamped['shadow-spread']   = clampRange(parseInt(clamped['shadow-spread']), SHADOW_RANGES.spread) + 'px'
  if (clamped['shadow-offset-y']) clamped['shadow-offset-y'] = clampRange(parseInt(clamped['shadow-offset-y']), SHADOW_RANGES.offsetY) + 'px'
  return clamped
}

export function validateFont(name: string): FontEntry | null {
  const fontName = name.split(':')[0].trim()
  return FONT_REGISTRY.find(f => f.name.toLowerCase() === fontName.toLowerCase()) ?? null
}

export function buildFontStack(entry: FontEntry): string {
  return `${entry.name}, ${entry.fallback}`
}

export function findFonts(filter: { category?: FontCategory, vibe?: string }): FontEntry[] {
  return FONT_REGISTRY.filter(f =>
    (!filter.category || f.category === filter.category) &&
    (!filter.vibe || f.vibe === filter.vibe)
  )
}
