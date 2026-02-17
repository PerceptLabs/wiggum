/**
 * DTCG (Design Token Community Group) format output for theme tokens.
 * Converts GeneratedTheme + ThemeConfig into a DTCG-compliant JSON object.
 * Serializes what the generator already computed — does NOT compute anything new.
 */

import type { GeneratedTheme, ThemeConfig, ThemePresetMeta } from './types'
import type { MoodName, PersonalityBrief } from './personalities'
import { PERSONALITIES } from './personalities'
import { parseOklch, contrastRatio } from './oklch'
import { FONT_REGISTRY, RADIUS_STOPS } from './personality'

// ============================================================================
// Helpers
// ============================================================================

/** Strip leading `--` from CSS variable keys (generator adds it, presets don't) */
function stripPrefix(key: string): string {
  return key.startsWith('--') ? key.slice(2) : key
}

/** Read a theme var trying both bare and `--` prefixed keys */
function themeVar(vars: Record<string, string>, name: string): string | undefined {
  return vars[name] ?? vars[`--${name}`]
}

// ============================================================================
// Types
// ============================================================================

interface DtcgColorValue {
  colorSpace: 'oklch'
  components: [number, number, number]
}

interface DtcgContrastPair {
  against: string
  ratio: number
  wcag: 'AAA' | 'AA' | 'AA-large' | 'FAIL'
}

interface DtcgColorToken {
  $value: DtcgColorValue
  $type: 'color'
  $description: string
  $extensions: {
    wiggum: {
      role: 'brand' | 'surface' | 'text' | 'semantic'
      cssVar: string
      contrastPairs?: DtcgContrastPair[]
    }
  }
}

interface DtcgDimensionToken {
  $value: string
  $type: 'dimension'
  $description: string
}

interface DtcgFontToken {
  $value: string
  $type: 'fontFamily'
  $description: string
  $extensions?: {
    wiggum: {
      registryCategory: string
      weights: number[]
      googleFontsName: string
    }
  }
}

interface DtcgOtherToken {
  $value: string
  $type: 'other'
  $description: string
}

interface DtcgPersonality {
  mood: string
  philosophy: string
  animation: Array<{ type: string; duration: string; easing: string }>
  typography: Array<{ element: string; size: string; weight: string; color: string; tracking: string }>
  spacing: { base: string; section: string; cardPadding: string; rhythm: string }
}

interface DtcgMetadata {
  generator: 'wiggum-theme'
  source: 'preset' | 'generated'
  seed: number
  pattern: string
  hues: number[]
  modes: ['light']
  mood?: string
  preset?: string
  font?: string
  shadowProfile?: string
  radius?: string
  generatedAt: string
  chroma?: 'low' | 'medium' | 'high' | number
  personality?: DtcgPersonality
}

export interface DtcgOutput {
  $schema: string
  $metadata: DtcgMetadata
  color: Record<string, DtcgColorToken>
  colorDark: Record<string, DtcgColorToken>
  dimension: Record<string, DtcgDimensionToken>
  fontFamily: Record<string, DtcgFontToken>
  shadow: Record<string, DtcgOtherToken>
  shadowScale: Record<string, DtcgOtherToken>
  shadowPrimitives: Record<string, DtcgOtherToken | DtcgDimensionToken>
}

// ============================================================================
// Role classification — static map from token name to role
// ============================================================================

const ROLE_MAP: Record<string, 'brand' | 'surface' | 'text' | 'semantic'> = {
  'primary': 'brand', 'secondary': 'brand', 'accent': 'brand', 'ring': 'brand',
  'chart-1': 'brand', 'chart-2': 'brand', 'chart-3': 'brand', 'chart-4': 'brand', 'chart-5': 'brand',
  'sidebar-primary': 'brand', 'sidebar-accent': 'brand', 'sidebar-ring': 'brand',
  'background': 'surface', 'card': 'surface', 'popover': 'surface', 'muted': 'surface',
  'border': 'surface', 'input': 'surface', 'sidebar-background': 'surface', 'sidebar-border': 'surface',
  'foreground': 'text', 'card-foreground': 'text', 'popover-foreground': 'text',
  'primary-foreground': 'text', 'secondary-foreground': 'text', 'muted-foreground': 'text',
  'accent-foreground': 'text', 'sidebar-foreground': 'text',
  'sidebar-primary-foreground': 'text', 'sidebar-accent-foreground': 'text',
  'destructive': 'semantic', 'destructive-foreground': 'semantic',
}

// ============================================================================
// Role descriptions — static prose per token name
// ============================================================================

const ROLE_DESCRIPTIONS: Record<string, string> = {
  'primary': 'brand accent, CTA buttons, links',
  'primary-foreground': 'text on primary surfaces',
  'background': 'main page surface',
  'foreground': 'primary text color',
  'card': 'card surface',
  'card-foreground': 'text on cards',
  'muted': 'subtle backgrounds, disabled states',
  'muted-foreground': 'secondary text, labels',
  'accent': 'hover states, highlights',
  'accent-foreground': 'text on accent surfaces',
  'secondary': 'secondary buttons, tags',
  'secondary-foreground': 'text on secondary surfaces',
  'destructive': 'delete actions, error states',
  'destructive-foreground': 'text on destructive surfaces',
  'border': 'all borders and dividers',
  'input': 'input field borders',
  'ring': 'focus ring indicator',
  'popover': 'dropdown and popover surface',
  'popover-foreground': 'text in popovers',
  'sidebar-background': 'sidebar surface',
  'sidebar-foreground': 'sidebar text',
  'sidebar-primary': 'sidebar active item',
  'sidebar-primary-foreground': 'text on sidebar active item',
  'sidebar-accent': 'sidebar hover state',
  'sidebar-accent-foreground': 'text on sidebar hover',
  'sidebar-border': 'sidebar dividers',
  'sidebar-ring': 'sidebar focus ring',
  'chart-1': 'chart primary series',
  'chart-2': 'chart secondary series',
  'chart-3': 'chart tertiary series',
  'chart-4': 'chart quaternary series',
  'chart-5': 'chart quinary series',
}

// ============================================================================
// Contrast pairs — known foreground/background pairs for WCAG checking
// ============================================================================

export const CONTRAST_PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['primary-foreground', 'primary'],
  ['secondary-foreground', 'secondary'],
  ['muted-foreground', 'muted'],
  ['accent-foreground', 'accent'],
  ['destructive-foreground', 'destructive'],
  ['sidebar-foreground', 'sidebar-background'],
  ['sidebar-primary-foreground', 'sidebar-primary'],
  ['sidebar-accent-foreground', 'sidebar-accent'],
]

// ============================================================================
// Description generation from OKLCH components
// ============================================================================

function describeColor(l: number, c: number, h: number): string {
  const lightness = l < 0.3 ? 'dark' : l < 0.5 ? 'mid-dark' : l < 0.7 ? 'mid-tone' : l < 0.9 ? 'light' : 'near-white'
  const chroma = c < 0.01 ? 'achromatic' : c < 0.05 ? 'muted' : c < 0.12 ? 'moderate' : c < 0.2 ? 'vivid' : 'saturated'
  const hue = h < 30 ? 'red' : h < 60 ? 'orange' : h < 90 ? 'yellow' : h < 150 ? 'green'
    : h < 210 ? 'cyan' : h < 270 ? 'blue' : h < 330 ? 'purple' : 'red'

  if (chroma === 'achromatic') return `${lightness} achromatic`
  return `${lightness} ${chroma} ${hue}`
}

function buildDescription(tokenName: string, l: number, c: number, h: number): string {
  const colorDesc = describeColor(l, c, h)
  const roleDesc = ROLE_DESCRIPTIONS[tokenName]
  return roleDesc ? `${colorDesc} — ${roleDesc}` : colorDesc
}

// ============================================================================
// WCAG level from contrast ratio
// ============================================================================

function wcagLevel(ratio: number): 'AAA' | 'AA' | 'AA-large' | 'FAIL' {
  if (ratio >= 7.0) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3.0) return 'AA-large'
  return 'FAIL'
}

// ============================================================================
// Shadow profile descriptions
// ============================================================================

const SHADOW_DESCRIPTIONS: Record<string, string> = {
  'none': 'No shadows — flat design',
  'subtle': 'Gentle depth — barely there, clean',
  'moderate': 'Balanced depth — visible but not heavy',
  'dramatic': 'Strong depth, floating elements — diffused, never hard-edge',
  'harsh': 'Hard shadows — brutalist, industrial feel',
}

// ============================================================================
// Radius stop descriptions
// ============================================================================

const RADIUS_DESCRIPTIONS: Record<string, string> = {
  'none': 'Sharp corners — industrial, technical',
  'subtle': 'Barely rounded — professional, subtle',
  'moderate': 'Moderately rounded — balanced, friendly',
  'rounded': 'Rounded — friendly, approachable',
  'pill': 'Fully rounded — playful, bubbly',
}

// ============================================================================
// Shadow scale level descriptions
// ============================================================================

const SHADOW_SCALE_DESCRIPTIONS: Record<string, string> = {
  'shadow-2xs': 'Barely visible — subtle borders',
  'shadow-xs': 'Extra small — input fields, subtle depth',
  'shadow-sm': 'Small — cards at rest, gentle lift',
  'shadow': 'Default — standard card elevation',
  'shadow-md': 'Medium — popovers, hover states',
  'shadow-lg': 'Large — dropdowns, floating elements',
  'shadow-xl': 'Extra large — modals, dialogs',
  'shadow-2xl': 'Maximum — dramatic overlays',
}

// ============================================================================
// Helper: reverse-map a CSS value to a RADIUS_STOPS key
// ============================================================================

function reverseRadius(cssValue: string): string {
  for (const [name, val] of Object.entries(RADIUS_STOPS)) {
    if (val === cssValue) return name
  }
  // 0px is equivalent to 0rem
  if (cssValue === '0px' || cssValue === '0') return 'none'
  return 'moderate' // safe default
}

// ============================================================================
// Helper: reverse-map shadow CSS vars to a SHADOW_PROFILES key
// ============================================================================

function reverseShadow(vars: Record<string, string>): string {
  const opacity = parseFloat(themeVar(vars, 'shadow-opacity') ?? '0')
  if (opacity === 0) return 'none'
  const blur = parseFloat(themeVar(vars, 'shadow-blur') ?? '0')
  if (opacity >= 0.3) return 'harsh'
  if (blur >= 12) return 'dramatic'
  if (blur >= 4) return 'moderate'
  return 'subtle'
}

// ============================================================================
// Helper: build color token map from a CSS vars object (light or dark)
// ============================================================================

function buildColorTokens(
  cssVars: Record<string, string>
): { tokens: Record<string, DtcgColorToken>; parsed: Record<string, { l: number; c: number; h: number }> } {
  const tokens: Record<string, DtcgColorToken> = {}
  const parsed: Record<string, { l: number; c: number; h: number }> = {}

  for (const [rawKey, value] of Object.entries(cssVars)) {
    if (!value.startsWith('oklch(')) continue
    const varName = stripPrefix(rawKey)

    try {
      const p = parseOklch(value)
      parsed[varName] = p
      const role = ROLE_MAP[varName] ?? 'surface'
      tokens[varName] = {
        $value: { colorSpace: 'oklch', components: [p.l, p.c, p.h] },
        $type: 'color',
        $description: buildDescription(varName, p.l, p.c, p.h),
        $extensions: { wiggum: { role, cssVar: `--${varName}` } },
      }
    } catch {
      // Skip unparseable values
    }
  }

  return { tokens, parsed }
}

// ============================================================================
// Helper: attach contrast pairs to color tokens
// ============================================================================

function attachContrastPairs(
  color: Record<string, DtcgColorToken>,
  parsedColors: Record<string, { l: number; c: number; h: number }>
): void {
  for (const [fgName, bgName] of CONTRAST_PAIRS) {
    const fg = parsedColors[fgName]
    const bg = parsedColors[bgName]
    if (!fg || !bg) continue

    const ratio = Math.round(contrastRatio(fg, bg) * 10) / 10
    const pair: DtcgContrastPair = { against: bgName, ratio, wcag: wcagLevel(ratio) }

    if (color[fgName]) {
      if (!color[fgName].$extensions.wiggum.contrastPairs) {
        color[fgName].$extensions.wiggum.contrastPairs = []
      }
      color[fgName].$extensions.wiggum.contrastPairs.push(pair)
    }
  }
}

// ============================================================================
// Helper: build a font token from a CSS var key
// ============================================================================

function buildFontToken(
  cssVars: Record<string, string>,
  varKey: string,
  fallbackStack: string
): DtcgFontToken {
  const stack = themeVar(cssVars, varKey) ?? fallbackStack
  const name = stack.split(',')[0]?.trim() ?? ''
  const entry = FONT_REGISTRY.find(f => f.name === name)

  const token: DtcgFontToken = {
    $value: stack,
    $type: 'fontFamily',
    $description: entry ? `${entry.category} category, ${entry.vibe} vibe` : name || varKey,
  }

  if (entry) {
    token.$extensions = {
      wiggum: {
        registryCategory: entry.category,
        weights: entry.weights,
        googleFontsName: entry.name,
      },
    }
  }

  return token
}

// ============================================================================
// Main: toDtcg
// ============================================================================

// TODO: 6 positional params (4 optional) — candidate for options-object refactor
export function toDtcg(
  theme: GeneratedTheme,
  config: ThemeConfig,
  mood?: MoodName,
  presetMeta?: ThemePresetMeta,
  personality?: PersonalityBrief,
  chroma?: 'low' | 'medium' | 'high' | number
): DtcgOutput {
  const { cssVars, meta } = theme

  // Resolve font/radius/shadow from presetMeta (primary) or config (fallback)
  const fontName = presetMeta?.font
    ?? config.font
    ?? themeVar(cssVars.theme, 'font-sans')?.split(',')[0]?.trim()
    ?? 'system-ui'

  const radiusStopName = presetMeta?.radius
    ?? config.radius
    ?? reverseRadius(themeVar(cssVars.theme, 'radius') ?? '0.5rem')

  const shadowProfileName = presetMeta?.shadowStyle
    ?? config.shadowProfile
    ?? reverseShadow(cssVars.theme)

  // ---- $metadata ----
  const $metadata: DtcgMetadata = {
    generator: 'wiggum-theme',
    source: meta.source,
    seed: meta.seed,
    pattern: meta.pattern,
    hues: meta.hues,
    modes: ['light'],
    mood,
    font: fontName,
    shadowProfile: shadowProfileName,
    radius: radiusStopName,
    generatedAt: new Date().toISOString(),
  }

  if (chroma !== undefined) $metadata.chroma = chroma

  if (meta.source === 'preset' && presetMeta?.name) {
    $metadata.preset = presetMeta.name
  }

  // D5-D7: Personality in metadata (custom personality overrides mood-based lookup)
  const p = personality ?? (mood ? PERSONALITIES[mood] : undefined)
  if (p) {
    $metadata.personality = {
      mood: mood ?? 'custom',
      philosophy: p.philosophy,
      animation: p.animation,
      typography: p.typography,
      spacing: p.spacing,
    }
  }

  // ---- Color tokens (light mode) ----
  const { tokens: color, parsed: parsedColors } = buildColorTokens(cssVars.light)
  attachContrastPairs(color, parsedColors)

  // ---- D8: Color tokens (dark mode) ----
  const colorDark: Record<string, DtcgColorToken> = {}
  if (cssVars.dark) {
    const { tokens: darkTokens, parsed: darkParsed } = buildColorTokens(cssVars.dark)
    Object.assign(colorDark, darkTokens)
    attachContrastPairs(colorDark, darkParsed)
  }

  // ---- Dimension tokens ----
  const dimension: Record<string, DtcgDimensionToken> = {}
  const radiusValue = themeVar(cssVars.theme, 'radius') ?? RADIUS_STOPS[radiusStopName as keyof typeof RADIUS_STOPS] ?? '0.5rem'
  dimension['radius'] = {
    $value: radiusValue,
    $type: 'dimension',
    $description: `${radiusStopName} — ${RADIUS_DESCRIPTIONS[radiusStopName] ?? 'custom radius'}`,
  }

  // D4: spacing
  const spacingValue = themeVar(cssVars.light, 'spacing') ?? themeVar(cssVars.theme, 'spacing') ?? '0.25rem'
  dimension['spacing'] = {
    $value: spacingValue,
    $type: 'dimension',
    $description: 'Base spacing unit',
  }

  // D1: letterSpacing
  const letterSpacingValue = themeVar(cssVars.light, 'letter-spacing') ?? themeVar(cssVars.theme, 'letter-spacing') ?? '0em'
  dimension['letterSpacing'] = {
    $value: letterSpacingValue,
    $type: 'dimension',
    $description: 'Base letter spacing',
  }

  // ---- Font tokens ----
  const fontFamily: Record<string, DtcgFontToken> = {}

  // Sans (primary)
  const fullFontStack = themeVar(cssVars.theme, 'font-sans') ?? `${fontName}, ui-sans-serif, system-ui, sans-serif`
  const registryEntry = FONT_REGISTRY.find(f => f.name === fontName)
  const fontToken: DtcgFontToken = {
    $value: fullFontStack,
    $type: 'fontFamily',
    $description: registryEntry
      ? `${registryEntry.category} category, ${registryEntry.vibe} vibe`
      : fontName,
  }
  if (registryEntry) {
    fontToken.$extensions = {
      wiggum: {
        registryCategory: registryEntry.category,
        weights: registryEntry.weights,
        googleFontsName: registryEntry.name,
      },
    }
  }
  fontFamily['sans'] = fontToken

  // D2: mono + serif
  fontFamily['mono'] = buildFontToken(cssVars.theme, 'font-mono', 'ui-monospace, monospace')
  fontFamily['serif'] = buildFontToken(cssVars.theme, 'font-serif', 'ui-serif, Georgia, serif')

  // ---- Shadow token ----
  const shadow: Record<string, DtcgOtherToken> = {}
  shadow['profile'] = {
    $value: shadowProfileName,
    $type: 'other',
    $description: SHADOW_DESCRIPTIONS[shadowProfileName] ?? `${shadowProfileName} shadow profile`,
  }

  // ---- D3: Shadow scale ----
  const shadowScale: Record<string, DtcgOtherToken> = {}
  const SHADOW_SCALE_LEVELS = ['shadow-2xs', 'shadow-xs', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl']
  for (const level of SHADOW_SCALE_LEVELS) {
    const val = themeVar(cssVars.light, level)
    if (val) {
      shadowScale[level] = {
        $value: val,
        $type: 'other',
        $description: SHADOW_SCALE_DESCRIPTIONS[level] ?? level,
      }
    }
  }

  // ---- D9: Shadow primitives ----
  const shadowPrimitives: Record<string, DtcgOtherToken | DtcgDimensionToken> = {}
  // Merge light + theme vars for shadow primitive lookup (perMode vars land in light)
  const allVars = { ...cssVars.theme, ...cssVars.light }

  const opVal = themeVar(allVars, 'shadow-opacity')
  if (opVal) shadowPrimitives['opacity'] = { $value: opVal, $type: 'other', $description: 'Shadow opacity multiplier' }

  const blurVal = themeVar(allVars, 'shadow-blur')
  if (blurVal) shadowPrimitives['blur'] = { $value: blurVal, $type: 'dimension', $description: 'Shadow blur radius' }

  const spreadVal = themeVar(allVars, 'shadow-spread')
  if (spreadVal) shadowPrimitives['spread'] = { $value: spreadVal, $type: 'dimension', $description: 'Shadow spread radius' }

  const offsetYVal = themeVar(allVars, 'shadow-offset-y')
  if (offsetYVal) shadowPrimitives['offsetY'] = { $value: offsetYVal, $type: 'dimension', $description: 'Shadow vertical offset' }

  // shadow-offset-x: presets have it, generator doesn't — optional
  const offsetXVal = themeVar(allVars, 'shadow-offset-x')
  if (offsetXVal) shadowPrimitives['offsetX'] = { $value: offsetXVal, $type: 'dimension', $description: 'Shadow horizontal offset' }

  const shadowColorVal = themeVar(allVars, 'shadow-color')
  if (shadowColorVal) shadowPrimitives['color'] = { $value: shadowColorVal, $type: 'other', $description: 'Shadow base color' }

  return {
    $schema: 'https://design-tokens.github.io/community-group/format/',
    $metadata,
    color,
    colorDark,
    dimension,
    fontFamily,
    shadow,
    shadowScale,
    shadowPrimitives,
  }
}

// ============================================================================
// Patch: update color tokens in an existing DTCG output
// ============================================================================

export function patchDtcgColors(
  tokens: DtcgOutput,
  updates: Record<string, { l: number; c: number; h: number }>
): void {
  // Strip prefix from update keys (theme modify passes bare names from regex match)
  for (const [rawKey, color] of Object.entries(updates)) {
    const varName = stripPrefix(rawKey)
    if (tokens.color[varName]) {
      tokens.color[varName].$value.components = [color.l, color.c, color.h]
      tokens.color[varName].$description = buildDescription(varName, color.l, color.c, color.h)
    }
  }

  // Rebuild parsedColors from current token state for contrast recomputation
  const parsedColors: Record<string, { l: number; c: number; h: number }> = {}
  for (const [name, token] of Object.entries(tokens.color)) {
    const [l, c, h] = token.$value.components
    parsedColors[name] = { l, c, h }
  }

  // Recompute all contrast pairs (light only — dark is not patched)
  for (const [fgName, bgName] of CONTRAST_PAIRS) {
    const fg = parsedColors[fgName]
    const bg = parsedColors[bgName]
    const fgToken = tokens.color[fgName]
    if (!fgToken) continue

    fgToken.$extensions.wiggum.contrastPairs = []
    if (!fg || !bg) continue
    const ratio = Math.round(contrastRatio(fg, bg) * 10) / 10
    fgToken.$extensions.wiggum.contrastPairs.push({
      against: bgName,
      ratio,
      wcag: wcagLevel(ratio),
    })
  }

  tokens.$metadata.generatedAt = new Date().toISOString()
}
