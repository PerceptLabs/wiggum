/**
 * Typed preset registry wrapping curated JSON theme files
 */

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
}

export const PRESETS: Record<string, CuratedPreset> = {
  'northern-lights': { ...northernLights, description: 'Aurora greens, celestial purples' },
  'cyberpunk':       { ...cyberpunk, description: 'Neon pink, electric glow' },
  'doom-64':         { ...doom64, description: 'Blood red, sharp industrial' },
  'retro-arcade':    { ...retroArcade, description: 'Retro pink, pixel-tight' },
  'soft-pop':        { ...softPop, description: 'Gentle purple, bubbly' },
  'tangerine':       { ...tangerine, description: 'Warm orange, friendly' },
  'mono':            { ...mono, description: 'Pure grayscale, typographic' },
  'elegant-luxury':  { ...elegantLuxury, description: 'Rich bronze, diffused shadows' },
  'bubblegum':       { ...bubblegum, description: 'Hot pink, hard shadows' },
  'mocha-mousse':    { ...mochaMousse, description: 'Warm brown, earthy' },
  'caffeine':        { ...caffeine, description: 'Coffee brown, utilitarian' },
  'catppuccin':      { ...catppuccin, description: 'Mauve pastels, cozy' },
}
