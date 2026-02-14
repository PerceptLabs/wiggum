// Color generation algorithm adapted from RLabs-Inc/shadcn-themes (MIT License)
// https://github.com/RLabs-Inc/shadcn-themes
// Copyright (c) RLabs Inc.

import type { OklchColor, ThemeConfig, GeneratedTheme, ShadowProfile, RadiusStop } from './types'
import { formatOklch, contrastRatio, clampToGamut } from './oklch'
import { PATTERNS } from './patterns'
import { RADIUS_STOPS, SHADOW_PROFILES, validateFont, buildFontStack, validateShadow } from './personality'

// ============================================================================
// OKLCH RANGES PER ROLE (light mode — midpoint values)
// ============================================================================

interface RoleSpec {
  l: number
  c: number
  hueSource: 'base' | 'primary' | 'accent' | 'destructive' | 'shifted'
}

const LIGHT_ROLES: Record<string, RoleSpec> = {
  'background':           { l: 0.98,  c: 0.004,  hueSource: 'base' },
  'foreground':           { l: 0.21,  c: 0.015,  hueSource: 'base' },
  'card':                 { l: 0.99,  c: 0.002,  hueSource: 'base' },
  'card-foreground':      { l: 0.21,  c: 0.015,  hueSource: 'base' },
  'popover':              { l: 0.99,  c: 0.002,  hueSource: 'base' },
  'popover-foreground':   { l: 0.21,  c: 0.015,  hueSource: 'base' },
  'primary':              { l: 0.56,  c: 0.195,  hueSource: 'primary' },
  'primary-foreground':   { l: 0.985, c: 0.002,  hueSource: 'base' },
  'secondary':            { l: 0.61,  c: 0.115,  hueSource: 'accent' },
  'secondary-foreground': { l: 0.985, c: 0.002,  hueSource: 'base' },
  'muted':                { l: 0.90,  c: 0.02,   hueSource: 'base' },
  'muted-foreground':     { l: 0.475, c: 0.02,   hueSource: 'base' },
  'accent':               { l: 0.815, c: 0.095,  hueSource: 'accent' },
  'accent-foreground':    { l: 0.21,  c: 0.015,  hueSource: 'base' },
  'destructive':          { l: 0.60,  c: 0.215,  hueSource: 'destructive' },
  'destructive-foreground': { l: 0.985, c: 0.002, hueSource: 'base' },
  'border':               { l: 0.885, c: 0.007,  hueSource: 'base' },
  'input':                { l: 0.885, c: 0.007,  hueSource: 'base' },
  'ring':                 { l: 0.56,  c: 0.195,  hueSource: 'primary' },
}

// ============================================================================
// CONTRAST PAIRS
// ============================================================================

const CONTRAST_PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
]

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export function generateTheme(config: ThemeConfig): GeneratedTheme {
  const { seed, pattern: patternName, mode = 'both' } = config

  const pattern = PATTERNS[patternName]
  if (!pattern) throw new Error(`Unknown pattern "${patternName}". Use: theme list patterns`)

  const hues = pattern.generate(seed)
  const baseHue = hues[0]
  const primaryHue = hues[0]
  const accentHue = hues[1] ?? hues[0]

  // Resolve hue for each source type
  const hueMap: Record<string, number> = {
    base: baseHue,
    primary: primaryHue,
    accent: accentHue,
    destructive: 25, // Fixed red
    shifted: hues[2] ?? ((primaryHue + 60) % 360),
  }

  // Generate light mode colors
  const lightColors: Record<string, OklchColor> = {}
  for (const [role, spec] of Object.entries(LIGHT_ROLES)) {
    lightColors[role] = clampToGamut({ l: spec.l, c: spec.c, h: hueMap[spec.hueSource] })
  }

  // Chart colors
  lightColors['chart-1'] = clampToGamut({ l: 0.56, c: 0.195, h: primaryHue })
  lightColors['chart-2'] = clampToGamut({ l: 0.61, c: 0.115, h: accentHue })
  lightColors['chart-3'] = clampToGamut({ l: 0.815, c: 0.095, h: accentHue })
  lightColors['chart-4'] = clampToGamut({ l: 0.55, c: 0.15, h: hues[2] ?? ((primaryHue + 90) % 360) })
  lightColors['chart-5'] = clampToGamut({ l: 0.50, c: 0.20, h: (primaryHue + 180) % 360 })

  // Sidebar colors (mirror main roles)
  lightColors['sidebar-background'] = lightColors['background']
  lightColors['sidebar-foreground'] = lightColors['foreground']
  lightColors['sidebar-primary'] = lightColors['primary']
  lightColors['sidebar-primary-foreground'] = lightColors['primary-foreground']
  lightColors['sidebar-accent'] = lightColors['accent']
  lightColors['sidebar-accent-foreground'] = lightColors['accent-foreground']
  lightColors['sidebar-border'] = lightColors['border']
  lightColors['sidebar-ring'] = lightColors['ring']

  // Enforce contrast on light mode
  enforceContrast(lightColors)

  // Generate dark mode via inversion
  const darkColors: Record<string, OklchColor> = {}
  for (const [role, lightColor] of Object.entries(lightColors)) {
    let darkL = 1.0 - lightColor.l
    darkL = Math.max(0.04, Math.min(0.97, darkL))
    const darkC = lightColor.c * 0.85

    // Primary/accent in dark: bump lightness for visibility
    if (role === 'primary' || role === 'sidebar-primary' || role === 'ring') {
      darkL = Math.min(0.97, darkL + 0.075)
    }

    darkColors[role] = clampToGamut({ l: darkL, c: darkC, h: lightColor.h })
  }

  // Enforce contrast on dark mode
  enforceContrast(darkColors)

  // Sidebar dark contrast
  const sidebarDarkPairs: [string, string][] = [
    ['sidebar-foreground', 'sidebar-background'],
    ['sidebar-primary-foreground', 'sidebar-primary'],
    ['sidebar-accent-foreground', 'sidebar-accent'],
  ]
  for (const [fgKey, bgKey] of sidebarDarkPairs) {
    const fg = darkColors[fgKey]
    const bg = darkColors[bgKey]
    if (fg && bg) adjustContrast(fg, bg)
  }

  // Build CSS vars
  const lightVars: Record<string, string> = {}
  const darkVars: Record<string, string> = {}

  for (const [role, color] of Object.entries(lightColors)) {
    lightVars[`--${role}`] = formatOklch(color)
  }
  for (const [role, color] of Object.entries(darkColors)) {
    darkVars[`--${role}`] = formatOklch(color)
  }

  // Non-color tokens
  const designTokens = resolveDesignTokens(config)
  const sharedVars: Record<string, string> = { ...designTokens.shared }
  Object.assign(lightVars, designTokens.perMode)
  Object.assign(darkVars, designTokens.perMode)

  return {
    cssVars: {
      theme: sharedVars,
      light: lightVars,
      dark: darkVars,
    },
    meta: { seed, pattern: patternName, hues, source: 'generated' },
  }
}

// ============================================================================
// CONTRAST ENFORCEMENT
// ============================================================================

function enforceContrast(colors: Record<string, OklchColor>): void {
  for (const [fgKey, bgKey] of CONTRAST_PAIRS) {
    const fg = colors[fgKey]
    const bg = colors[bgKey]
    if (!fg || !bg) continue
    adjustContrast(fg, bg)
  }
}

function adjustContrast(fg: OklchColor, bg: OklchColor): void {
  let ratio = contrastRatio(fg, bg)
  if (ratio >= 4.5) return

  const direction = fg.l > bg.l ? 1 : -1
  for (let i = 0; i < 100 && ratio < 4.5; i++) {
    fg.l += direction * 0.005
    fg.l = Math.max(0, Math.min(1, fg.l))
    const clamped = clampToGamut(fg)
    fg.c = clamped.c
    ratio = contrastRatio(fg, bg)
  }
}

// ============================================================================
// NON-COLOR TOKEN RESOLUTION
// ============================================================================

function resolveDesignTokens(config: ThemeConfig): { shared: Record<string, string>, perMode: Record<string, string> } {
  // Font
  let fontSans = 'ui-sans-serif, system-ui, sans-serif'
  let fontMono = 'ui-monospace, monospace'
  const fontSerif = 'ui-serif, Georgia, serif'

  if (config.font) {
    const entry = validateFont(config.font)
    if (!entry) throw new Error(`Unknown font "${config.font}". Run: theme list fonts`)
    fontSans = buildFontStack(entry)
    // If it's a monospace font, also set font-mono
    if (entry.category === 'monospace') {
      fontMono = buildFontStack(entry)
    }
  }

  // Radius
  const radiusStop = (config.radius ?? 'moderate') as RadiusStop
  const radiusValue = RADIUS_STOPS[radiusStop]
  if (!radiusValue) throw new Error(`Unknown radius "${config.radius}". Options: none, subtle, moderate, rounded, pill`)

  // Shadow
  const profileName = (config.shadowProfile ?? 'subtle') as ShadowProfile
  const profile = SHADOW_PROFILES[profileName]
  if (!profile) throw new Error(`Unknown shadow profile "${config.shadowProfile}". Options: none, subtle, moderate, dramatic, harsh`)
  const shadowVars = validateShadow(profile)
  const shadowScale = buildShadowScale(shadowVars)

  return {
    shared: {
      '--font-sans': fontSans,
      '--font-mono': fontMono,
      '--font-serif': fontSerif,
      '--radius': radiusValue,
      '--tracking-normal': '0em',
      '--tracking-tighter': 'calc(var(--tracking-normal) - 0.05em)',
      '--tracking-tight': 'calc(var(--tracking-normal) - 0.025em)',
      '--tracking-wide': 'calc(var(--tracking-normal) + 0.025em)',
      '--tracking-wider': 'calc(var(--tracking-normal) + 0.05em)',
      '--tracking-widest': 'calc(var(--tracking-normal) + 0.1em)',
    },
    perMode: {
      '--spacing': '0.25rem',
      '--letter-spacing': '0em',
      '--shadow-color': 'oklch(0 0 0)',
      ...prefixKeys(shadowVars),
      ...prefixKeys(shadowScale),
    },
  }
}

function prefixKeys(obj: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(obj)) {
    result[k.startsWith('--') ? k : `--${k}`] = v
  }
  return result
}

function buildShadowScale(vars: Record<string, string>): Record<string, string> {
  const op = parseFloat(vars['shadow-opacity'] ?? '0')
  const blur = vars['shadow-blur'] ?? '0px'
  const spread = vars['shadow-spread'] ?? '0px'

  const half = (op * 0.5).toFixed(2)
  const full = op.toFixed(2)
  const big = Math.min(1, op * 2.5).toFixed(2)

  return {
    'shadow-2xs': `0 1px ${blur} ${spread} hsl(0 0% 0% / ${half})`,
    'shadow-xs':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${half})`,
    'shadow-sm':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${full}), 0 1px 2px -1px hsl(0 0% 0% / ${full})`,
    'shadow':     `0 1px ${blur} ${spread} hsl(0 0% 0% / ${full}), 0 1px 2px -1px hsl(0 0% 0% / ${full})`,
    'shadow-md':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${full}), 0 2px 4px -1px hsl(0 0% 0% / ${full})`,
    'shadow-lg':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${full}), 0 4px 6px -1px hsl(0 0% 0% / ${full})`,
    'shadow-xl':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${full}), 0 8px 10px -1px hsl(0 0% 0% / ${full})`,
    'shadow-2xl': `0 1px ${blur} ${spread} hsl(0 0% 0% / ${big})`,
  }
}

// ============================================================================
// OUTPUT FORMATTING
// ============================================================================

export function formatThemeOutput(theme: GeneratedTheme, label: string, description: string): string {
  const lines: string[] = []
  lines.push(`# Theme: ${label} (${theme.meta.source})`)
  lines.push(`# ${description}`)
  lines.push('')

  // Shared vars
  lines.push('## Shared (:root)')
  lines.push('')
  for (const [k, v] of Object.entries(theme.cssVars.theme)) {
    lines.push(`${k}: ${v};`)
  }
  lines.push('')

  // Light mode
  lines.push('## Light Mode (:root)')
  lines.push('')
  for (const [k, v] of Object.entries(theme.cssVars.light)) {
    lines.push(`${k}: ${v};`)
  }
  lines.push('')

  // Dark mode
  lines.push('## Dark Mode (.dark)')
  lines.push('')
  for (const [k, v] of Object.entries(theme.cssVars.dark)) {
    lines.push(`${k}: ${v};`)
  }

  return lines.join('\n')
}
