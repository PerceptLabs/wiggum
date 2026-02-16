/**
 * Typed preset registry wrapping curated JSON theme files
 */

import type { ThemePresetMeta } from './types'
import northernLights from './themes/northern-lights.json'
import cyberpunk from './themes/cyberpunk.json'
import doom64 from './themes/doom-64.json'
import retroArcade from './themes/retro-arcade.json'
import softPop from './themes/soft-pop.json'
import tangerine from './themes/tangerine.json'
import mono from './themes/mono.json'
import elegantLuxury from './themes/elegant-luxury.json'
import bubblegum from './themes/bubblegum.json'
import mochaMousse from './themes/mocha-mousse.json'
import caffeine from './themes/caffeine.json'
import catppuccin from './themes/catppuccin.json'

export interface CuratedPreset {
  name: string
  description: string
  cssVars: {
    theme: Record<string, string>
    light: Record<string, string>
    dark: Record<string, string>
  }
  meta?: ThemePresetMeta
}

export const PRESETS: Record<string, CuratedPreset> = {
  'northern-lights': {
    ...northernLights, description: 'Aurora greens, celestial purples',
    meta: { name: 'northern-lights', description: 'Aurora greens, celestial purples', font: 'Plus Jakarta Sans', radius: 'moderate', shadowStyle: 'subtle' },
  },
  'cyberpunk': {
    ...cyberpunk, description: 'Neon pink, electric glow',
    meta: { name: 'cyberpunk', description: 'Neon pink, electric glow', font: 'Outfit', radius: 'moderate', shadowStyle: 'moderate' },
  },
  'doom-64': {
    ...doom64, description: 'Blood red, sharp industrial',
    meta: { name: 'doom-64', description: 'Blood red, sharp industrial', font: 'Oxanium', radius: 'none', shadowStyle: 'harsh' },
  },
  'retro-arcade': {
    ...retroArcade, description: 'Retro pink, pixel-tight',
    meta: { name: 'retro-arcade', description: 'Retro pink, pixel-tight', font: 'Outfit', radius: 'subtle', shadowStyle: 'moderate' },
  },
  'soft-pop': {
    ...softPop, description: 'Gentle purple, bubbly',
    meta: { name: 'soft-pop', description: 'Gentle purple, bubbly', font: 'DM Sans', radius: 'pill', shadowStyle: 'none' },
  },
  'tangerine': {
    ...tangerine, description: 'Warm orange, friendly',
    meta: { name: 'tangerine', description: 'Warm orange, friendly', font: 'Inter', radius: 'rounded', shadowStyle: 'subtle' },
  },
  'mono': {
    ...mono, description: 'Pure grayscale, typographic',
    meta: { name: 'mono', description: 'Pure grayscale, typographic', font: 'Geist Mono', radius: 'none', shadowStyle: 'none' },
  },
  'elegant-luxury': {
    ...elegantLuxury, description: 'Rich bronze, diffused shadows',
    meta: { name: 'elegant-luxury', description: 'Rich bronze, diffused shadows', font: 'Poppins', radius: 'subtle', shadowStyle: 'moderate' },
  },
  'bubblegum': {
    ...bubblegum, description: 'Hot pink, hard shadows',
    meta: { name: 'bubblegum', description: 'Hot pink, hard shadows', font: 'Poppins', radius: 'moderate', shadowStyle: 'dramatic' },
  },
  'mocha-mousse': {
    ...mochaMousse, description: 'Warm brown, earthy',
    meta: { name: 'mocha-mousse', description: 'Warm brown, earthy', font: 'DM Sans', radius: 'moderate', shadowStyle: 'subtle' },
  },
  'caffeine': {
    ...caffeine, description: 'Coffee brown, utilitarian',
    meta: { name: 'caffeine', description: 'Coffee brown, utilitarian', font: 'ui-sans-serif', radius: 'moderate', shadowStyle: 'subtle' },
  },
  'catppuccin': {
    ...catppuccin, description: 'Mauve pastels, cozy',
    meta: { name: 'catppuccin', description: 'Mauve pastels, cozy', font: 'Montserrat', radius: 'subtle', shadowStyle: 'moderate' },
  },
}
