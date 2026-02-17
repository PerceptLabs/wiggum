/**
 * Theme Generator — Public API
 */

export { generateTheme, formatThemeOutput, formatThemeCss, resolveChromaMultiplier, CHROMA_LEVELS } from './generator'
export { PATTERNS } from './patterns'
export { PRESETS } from './presets'
export type { CuratedPreset } from './presets'
export {
  FONT_REGISTRY,
  RADIUS_STOPS,
  SHADOW_PROFILES,
  SHADOW_RANGES,
  validateShadow,
  validateFont,
  buildFontStack,
  findFonts,
} from './personality'
export { PERSONALITIES, MOOD_NAMES, generateDesignBrief } from './personalities'
export type { MoodName, PersonalityBrief } from './personalities'
export { toDtcg, patchDtcgColors, CONTRAST_PAIRS } from './dtcg'
export type { DtcgOutput } from './dtcg'
export type {
  ThemeConfig,
  GeneratedTheme,
  ThemeCssVars,
  ThemePresetMeta,
  OklchColor,
  GeometryPattern,
  FontEntry,
  FontCategory,
  RadiusStop,
  ShadowProfile,
  ShadowRange,
} from './types'

import type { GeneratedTheme, ThemePresetMeta, FontCategory } from './types'
import { PRESETS } from './presets'
import { PATTERNS } from './patterns'
import { FONT_REGISTRY } from './personality'
import { formatThemeOutput } from './generator'

export function getPreset(name: string): { theme: GeneratedTheme, output: string, meta?: ThemePresetMeta } | null {
  const preset = PRESETS[name]
  if (!preset) return null

  const theme: GeneratedTheme = {
    cssVars: preset.cssVars,
    meta: { seed: 0, pattern: 'preset', hues: [], source: 'preset' },
  }
  return { theme, output: formatThemeOutput(theme, name, preset.description), meta: preset.meta }
}

export function listPatterns(): Array<{ name: string, description: string }> {
  return Object.values(PATTERNS).map(p => ({ name: p.name, description: p.description }))
}

export function listPresets(): Array<{ name: string, description: string }> {
  return Object.entries(PRESETS).map(([name, p]) => ({ name, description: p.description }))
}

export function listFonts(category?: FontCategory) {
  if (category) return FONT_REGISTRY.filter(f => f.category === category)
  return [...FONT_REGISTRY]
}
