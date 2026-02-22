/**
 * @wiggum/planning — Type definitions
 *
 * Constrained unions auto-generated from codebase registries.
 * Run `pnpm --filter @wiggum/planning generate-types` to regenerate.
 *
 * This file adds composite and hand-maintained types.
 */

// Re-export all generated constrained unions
export type {
  MoodName,
  PresetName,
  PatternName,
  FontName,
  ShadowProfile,
  RadiusStop,
  GumDropName,
  StackComponent,
} from './generated-types'

import type { MoodName, PresetName } from './generated-types'

/** Accepts both personality moods AND preset names */
export type ThemeIdentifier = MoodName | PresetName

// ============================================================================
// HAND-MAINTAINED (not from any registry)
// ============================================================================

/** Layout strategies — common patterns with freeform fallback */
export type Layout =
  | 'single' | 'sidebar' | 'split' | 'grid'
  | 'dashboard' | 'tabs' | 'wizard' | 'modal'
  | (string & {})

/** Form field types — HTML input types + custom */
export type FieldType =
  | 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  | 'date' | 'time' | 'datetime-local' | 'color' | 'file'
  | 'textarea' | 'select' | 'checkbox' | 'radio'
  | 'toggle' | 'slider' | 'repeater'
