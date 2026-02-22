/**
 * @wiggum/planning — JSX component type declarations
 *
 * Hierarchy: App > Theme > Screen > Section > Gumdrop
 *
 * All exports are `declare const` — TypeScript validates JSX usage but emits
 * zero runtime code. Plan files (*.plan.tsx) import these, use them as JSX,
 * and type-check via `tsc --noEmit`. They never execute.
 */
import type { FC, PropsWithChildren } from 'react'
import type {
  ThemeIdentifier,
  PatternName,
  FontName,
  ShadowProfile,
  RadiusStop,
  GumDropName,
  Layout,
  FieldType,
} from './types'

// ============================================================================
// APP — root container
// ============================================================================

export interface AppProps {
  name: string
  description?: string
}

export declare const App: FC<PropsWithChildren<AppProps>>

// ============================================================================
// THEME — design system configuration
// ============================================================================

export interface ThemeProps {
  mood?: ThemeIdentifier
  seed?: number
  pattern?: PatternName
  font?: FontName
  monoFont?: FontName
  shadowProfile?: ShadowProfile
  radius?: RadiusStop
  philosophy?: string
}

export declare const Theme: FC<PropsWithChildren<ThemeProps>>

// ============================================================================
// TYPOGRAPHY — font scale descriptions
// ============================================================================

export interface TypographyProps {
  hero?: string
  titles?: string
  labels?: string
  body?: string
  code?: string
}

export declare const Typography: FC<TypographyProps>

// ============================================================================
// ANIMATION — motion descriptions
// ============================================================================

export interface AnimationProps {
  hover?: string
  cards?: string
  pages?: string
  micro?: string
  reveals?: string
}

export declare const Animation: FC<AnimationProps>

// ============================================================================
// RULE — design constraints
// ============================================================================

export interface RuleProps {
  no?: string
  always?: string
  prefer?: string
}

export declare const Rule: FC<RuleProps>

// ============================================================================
// SCREEN — a distinct view/page
// ============================================================================

export interface ScreenProps {
  name: string
  layout?: Layout
  gumdrop?: GumDropName
}

export declare const Screen: FC<PropsWithChildren<ScreenProps>>

// ============================================================================
// NAV — navigation container
// ============================================================================

export interface NavProps {
  gumdrop?: GumDropName
}

export declare const Nav: FC<PropsWithChildren<NavProps>>

// ============================================================================
// NAV ITEM — single navigation entry (Nav.Item → NavItem for zero-runtime)
// ============================================================================

export interface NavItemProps {
  icon?: string
  label: string
  to?: string
}

export declare const NavItem: FC<NavItemProps>

// ============================================================================
// CONTENT — main content area
// ============================================================================

export interface ContentProps {
  className?: string
}

export declare const Content: FC<PropsWithChildren<ContentProps>>

// ============================================================================
// ASIDE — sidebar content area
// ============================================================================

export interface AsideProps {
  className?: string
}

export declare const Aside: FC<PropsWithChildren<AsideProps>>

// ============================================================================
// SECTION — a themed content section using a gumdrop
// ============================================================================

export interface SectionProps {
  gumdrop: GumDropName
  variant?: string
  cols?: number
  span?: number
  source?: string
  className?: string
}

export declare const Section: FC<PropsWithChildren<SectionProps>>

// ============================================================================
// GUMDROP — explicit gumdrop reference (inside Section)
// ============================================================================

export interface GumDropProps {
  use: GumDropName
  variant?: string
  source?: string
  label?: string
  span?: number
}

export declare const Gumdrop: FC<GumDropProps>

// ============================================================================
// COLUMN — table/data column definition
// ============================================================================

export interface ColumnProps {
  field: string
  sortable?: boolean
  filterable?: boolean
  format?: string
  width?: string
}

export declare const Column: FC<ColumnProps>

// ============================================================================
// FIELD — form field definition
// ============================================================================

export interface FieldProps {
  name: string
  type?: FieldType
  required?: boolean
  options?: string[]
  range?: [number, number]
  placeholder?: string
}

export declare const Field: FC<FieldProps>

// ============================================================================
// ACTION — user interaction trigger
// ============================================================================

export interface ActionProps {
  trigger: string
  gumdrop?: GumDropName
  intent?: string
  hotkey?: string
}

export declare const Action: FC<ActionProps>

// ============================================================================
// SLOT — named extension point
// ============================================================================

export interface SlotProps {
  name: string
  description?: string
}

export declare const Slot: FC<SlotProps>

// ============================================================================
// CUSTOM — escape hatch for sections that don't map to a gumdrop
// ============================================================================

export interface CustomProps {
  intent: string
}

export declare const Custom: FC<PropsWithChildren<CustomProps>>

// ============================================================================
// DATA — data model container
// ============================================================================

export declare const Data: FC<PropsWithChildren>

// ============================================================================
// SCHEMA — data model definition
// ============================================================================

export interface SchemaProps {
  name: string
  fields: Record<string, string>
}

export declare const Schema: FC<SchemaProps>

// ============================================================================
// ENDPOINT — API endpoint definition
// ============================================================================

export interface EndpointProps {
  resource: string
  pattern: 'crud' | 'readonly' | 'custom'
  auth?: boolean
}

export declare const Endpoint: FC<EndpointProps>
