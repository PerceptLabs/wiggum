# CC Prompt: Sacred Geometry Theme Generator

> **FIRST:** The 12 curated theme JSON files are in `tmp/` at the repo root. Copy them to `apps/ide/src/lib/theme-generator/themes/` as step 1 (create the directories).

> **Goal:** Add a `theme` shell command that generates mathematically harmonious CSS variable themes using sacred geometry patterns and OKLCH color science. Output is **native OKLCH** — no HSL conversion. Each theme produces **50+ CSS variables** covering colors, fonts, shadows, tracking, spacing, sidebar, and chart palette. Non-color tokens (fonts, shadows, radius) are validated against a curated registry — Ralph picks from approved options, the command validates and rejects bad inputs. Ralph calls `theme preset cyberpunk` or `theme generate --seed 152 --pattern golden-ratio --font "Oxanium" --shadow-profile harsh --radius none` and gets back guaranteed-contrast, personality-complete CSS variables. No more freestyling bad palettes or inventing fonts.

---

## WHY THIS EXISTS

Ralph currently freestyles CSS values when building apps. When told to build a "forest green organic app," Ralph SAW the Forest Green preset (perfect match) and **invented his own values instead** — producing light text on light backgrounds with terrible contrast. Ralph also invents font stacks that don't exist, applies random shadow values, and mixes radius sizes inconsistently.

Presets are suggestions Ralph can ignore. A generator command with validated inputs makes it impossible to produce bad contrast, unknown fonts, or out-of-range shadows — Ralph calls the tool, gets math-guaranteed good values.

**Design principle:** Colors = deterministic math (sacred geometry). Fonts/shadows/radius = constrained choice from curated options (validated registry). Ralph calls a tool for ALL design tokens, doesn't freestyle any of them. Same as how Ralph calls `preview` instead of guessing if builds work.

---

## THE VARIABLE SYSTEM (50+ per mode)

This is NOT just colors. Each theme defines the full design personality:

### Shared (`:root` — mode-independent)
```
--font-sans          Font stack (e.g., "Plus Jakarta Sans, sans-serif")
--font-mono          Monospace font (e.g., "JetBrains Mono, monospace")
--font-serif         Serif font (e.g., "Source Serif 4, serif")
--radius             Border radius base (e.g., "0.5rem")
--tracking-tighter   calc(var(--tracking-normal) - 0.05em)
--tracking-tight     calc(var(--tracking-normal) - 0.025em)
--tracking-wide      calc(var(--tracking-normal) + 0.025em)
--tracking-wider     calc(var(--tracking-normal) + 0.05em)
--tracking-widest    calc(var(--tracking-normal) + 0.1em)
```

### Per-mode (light AND dark — 53 vars each)

**Colors (OKLCH):**
```
--background, --foreground
--card, --card-foreground
--popover, --popover-foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--chart-1 through --chart-5
--sidebar, --sidebar-foreground
--sidebar-primary, --sidebar-primary-foreground
--sidebar-accent, --sidebar-accent-foreground
--sidebar-border, --sidebar-ring
```

**Typography:**
```
--font-sans, --font-serif, --font-mono    (repeated per-mode for override capability)
--letter-spacing                           (base, e.g., "0em")
--tracking-normal                          (base tracking value)
```

**Shadows (the design personality system):**
```
--shadow-color       OKLCH base color for shadows
--shadow-opacity     0-1 (Doom-64: 0.4 harsh, Soft-pop: 0.05 gentle, Mono: 0 none)
--shadow-blur        px (Elegant-luxury: 16px diffused, Bubblegum: 0px hard)
--shadow-spread      px (Cyberpunk: -2px tight, most: 0px)
--shadow-offset-x    px
--shadow-offset-y    px
--shadow-2xs         Composite shadow value
--shadow-xs          Composite shadow value
--shadow-sm          Composite shadow value
--shadow             Composite shadow value (default)
--shadow-md          Composite shadow value
--shadow-lg          Composite shadow value
--shadow-xl          Composite shadow value
--shadow-2xl         Composite shadow value
```

**Layout:**
```
--spacing            Base spacing unit (e.g., "0.25rem")
--radius             Border radius (repeated per-mode)
```

### Why this matters

With 20 variables (old system), Ralph invents shadows, fonts, spacing, and tracking on every app — producing inconsistent, generic results. With 50+ variables **and validated non-color tokens**, the theme controls the **entire design personality**:
- Doom-64 gets Oxanium font, harsh 0.4-opacity shadows, 0px radius (sharp industrial)
- Soft-pop gets DM Sans, 0.05-opacity shadows, 1rem radius (bubbly friendly)
- Mono gets Geist Mono, zero shadows, 0rem radius (typographic minimalist)

Ralph stops making design decisions and starts making layout decisions. Fonts come from a 32-font curated registry (never invented). Shadows come from 5 named profiles (never guessed). Radius comes from 5 named stops (never arbitrary).

---

## ARCHITECTURE OVERVIEW

```
theme preset <n>
  → load curated JSON from themes/ directory → output CSS block

theme generate --seed <hue> --pattern <n> [--font <n>] [--shadow-profile <n>] [--radius <stop>] [--mode light|dark|both]
  → 1. SEED → base hue (0-360°)
    2. PATTERN → sacred geometry angles → related hues
    3. ROLES → map hues to CSS variable roles
    4. GENERATE → OKLCH lightness/chroma per role
    5. CONTRAST → enforce WCAG AA (4.5:1 text, 3:1 UI)
    6. PERSONALITY → validate font (registry), shadow (profiles), radius (stops)
    7. OUTPUT → ready-to-paste OKLCH CSS variable block (50+ vars)

theme modify --shift-hue <±deg> [--scope brand|surface|all]
  → 1. READ current src/index.css CSS variables
    2. PARSE oklch() values for scoped tokens
    3. SHIFT → apply hue/lightness adjustment
    4. CONTRAST → re-enforce on affected pairs only
    5. OUTPUT → updated CSS variable block
```

**Output is native OKLCH.** No HSL conversion. Values are self-contained: `--primary: oklch(0.6487 0.1538 150.3071)`. Components use `var(--primary)` directly.

**Zero external dependencies.** All OKLCH math is pure TypeScript. No culori, no chroma.js. Runs in browser.

**License:** Algorithm adapted from [RLabs-Inc/shadcn-themes](https://github.com/RLabs-Inc/shadcn-themes) (MIT License). Include their copyright notice in source files. Browse the repo for reference — key files are in `src/lib/utils/` (theme.ts, colors.ts, color-utils.ts, color-schemes/).

---

## FILES TO CREATE

### File tree

```
apps/ide/src/lib/theme-generator/
├── themes/                          # 12 curated JSON presets (shadcn format, untouched)
│   ├── northern-lights.json
│   ├── cyberpunk.json
│   ├── doom-64.json
│   ├── retro-arcade.json
│   ├── soft-pop.json
│   ├── tangerine.json
│   ├── mono.json
│   ├── elegant-luxury.json
│   ├── bubblegum.json
│   ├── mocha-mousse.json
│   ├── caffeine.json
│   └── catppuccin.json
├── oklch.ts                         # Color math utilities
├── patterns.ts                      # Sacred geometry patterns
├── generator.ts                     # Core engine (generates 50+ var themes)
├── personality.ts                   # Font registry, shadow validators, radius stops
├── presets.ts                       # Typed registry wrapping JSON files
├── types.ts                         # Shared types
└── index.ts                         # Public API
```

### 0. `themes/*.json` — 12 curated preset themes

These JSON files are already in the project at `apps/ide/src/lib/theme-generator/themes/`. They follow the **shadcn registry format** — do NOT modify them. Each contains:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "northern-lights",
  "type": "registry:style",
  "css": { ... },
  "cssVars": {
    "theme": { /* 9 shared vars: fonts, radius, tracking */ },
    "light": { /* 53 vars: colors, shadows, spacing */ },
    "dark":  { /* 52 vars: dark mode equivalents */ }
  }
}
```

The 12 presets and their personalities:

| Preset | Font | Shadow | Radius | Personality |
|--------|------|--------|--------|-------------|
| northern-lights | Plus Jakarta Sans | blur:3px, op:0.1 | 0.5rem | Aurora greens, celestial purples |
| cyberpunk | Outfit | blur:8px, spread:-2px, op:0.1 | 0.5rem | Neon pink, electric glow |
| doom-64 | Oxanium | blur:4px, op:0.4 | 0px | Blood red, sharp industrial |
| retro-arcade | Outfit | blur:4px, op:0.15 | 0.25rem | Retro pink, pixel-tight |
| soft-pop | DM Sans | blur:0px, op:0.05 | 1rem | Gentle purple, bubbly |
| tangerine | Inter | blur:3px, op:0.1 | 0.75rem | Warm orange, friendly |
| mono | Geist Mono | no shadows (op:0) | 0rem | Pure grayscale, typographic |
| elegant-luxury | Poppins | blur:16px, spread:-2px, op:0.12 | 0.375rem | Rich bronze, diffused |
| bubblegum | Poppins | blur:0px, op:1.0 | 0.4rem | Hot pink, hard shadows |
| mocha-mousse | DM Sans | blur:0px, op:0.11 | 0.5rem | Warm brown, earthy |
| caffeine | system-ui | blur:3px, op:0.1 | 0.5rem | Coffee brown, utilitarian |
| catppuccin | Montserrat | blur:6px, op:0.12 | 0.35rem | Mauve, cozy pastel |

Import them as static JSON:
```typescript
import northernLights from './themes/northern-lights.json'
import cyberpunk from './themes/cyberpunk.json'
// ... etc
```

### 1. `apps/ide/src/lib/theme-generator/types.ts` — Shared types

```typescript
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

// Font registry & validation types (from personality.ts)
export type FontCategory = 'geometric-sans' | 'humanist-sans' | 'neo-grotesque' | 'transitional-serif' | 'slab-serif' | 'display' | 'monospace'
export type RadiusStop = 'none' | 'subtle' | 'moderate' | 'rounded' | 'pill'
export type ShadowProfile = 'none' | 'subtle' | 'moderate' | 'dramatic' | 'harsh'

export interface FontEntry {
  name: string             // Google Fonts name (e.g., "Inter")
  fallback: string         // Generic fallback (e.g., "sans-serif")
  category: FontCategory
  weights: number[]        // Available weights (e.g., [400, 500, 600, 700])
  vibe: string             // One-word personality (e.g., "clean", "warm", "technical")
}

export interface ShadowRange {
  opacity: [number, number]    // [0, 0.5]
  blur: [number, number]       // [0, 40] px
  spread: [number, number]     // [-5, 10] px
  offsetX: [number, number]    // [0, 8] px
  offsetY: [number, number]    // [0, 8] px
}
```

### 2. `apps/ide/src/lib/theme-generator/oklch.ts` — Color math utilities

Pure OKLCH math. No external deps.

**Functions to implement:**

```typescript
// OKLCH → OKLab → linear RGB → sRGB → CSS string
function oklchToRgb(color: OklchColor): { r: number; g: number; b: number }

// sRGB → linear RGB → OKLab → OKLCH
function rgbToOklch(r: number, g: number, b: number): OklchColor

// Format for CSS output: "oklch(0.6487 0.1538 150.3071)"
function formatOklch(color: OklchColor): string

// Relative luminance (WCAG) from OKLCH
function relativeLuminance(color: OklchColor): number

// WCAG contrast ratio between two colors
function contrastRatio(fg: OklchColor, bg: OklchColor): number

// Clamp chroma to sRGB gamut (binary search)
function clampToGamut(color: OklchColor): OklchColor

// Parse "oklch(L C H)" string back to OklchColor
function parseOklch(css: string): OklchColor
```

**Key implementation notes:**
- OKLCH → OKLab: `a = c * cos(h * π/180)`, `b = c * sin(h * π/180)`
- OKLab → linear RGB uses Björn Ottosson's 3×3 matrix (public domain: https://bottosson.github.io/posts/oklab/)
- Linear → sRGB: `v >= 0.0031308 ? 1.055 * v^(1/2.4) - 0.055 : 12.92 * v`
- Gamut clamping: binary search on chroma [0, original_c], 20 iterations, tolerance 0.001
- WCAG luminance: linearize sRGB channels, L = 0.2126*R + 0.7152*G + 0.0722*B

### 3. `apps/ide/src/lib/theme-generator/patterns.ts` — Sacred geometry

11 patterns. Each takes a base hue and returns harmonious hues:

```typescript
const PATTERNS: Record<string, GeometryPattern> = {
  monochromatic:      { ... generate: (h) => [h] },
  analogous:          { ... generate: (h) => [h, h+30, h-30] },
  complementary:      { ... generate: (h) => [h, h+180] },
  splitComplementary: { ... generate: (h) => [h, h+150, h+210] },
  triadic:            { ... generate: (h) => [h, h+120, h+240] },
  tetradic:           { ... generate: (h) => [h, h+90, h+180, h+270] },
  goldenRatio:        { ... generate: (h) => [h, h+φ, h+2φ, h+3φ, h+4φ] },  // φ=137.508°
  flowerOfLife:       { ... generate: (h) => 6 hues at 60° intervals },
  fibonacci:          { ... generate: (h) => [h, h+137.508] },
  vesicaPiscis:       { ... generate: (h) => [h, h+52.3, h-52.3] },
  seedOfLife:         { ... generate: (h) => 7 hues at 360/7° intervals },
}
```

All hues normalized to [0, 360).

### 4. `apps/ide/src/lib/theme-generator/generator.ts` — The core engine

This is the heart. Generator produces the FULL 50+ variable set in native OKLCH.

```typescript
function generateTheme(config: ThemeConfig): GeneratedTheme
```

**Step 1: Hue → role assignment**
- `hues[0]` → primary, ring, sidebar-primary
- `hues[1]` → accent, sidebar-accent
- `hues[0]` desaturated → secondary
- Override destructive to red range (hue 25) if pattern doesn't land there
- Surfaces (bg, card, popover) → base hue, very low chroma, high lightness
- Muted → base hue, low chroma, mid lightness
- Border/input → base hue, very low chroma, slightly darker than surfaces

**Step 2: OKLCH ranges per role (LIGHT MODE)**

| Role | L range | C range | Hue source |
|------|---------|---------|------------|
| background | 0.97-0.99 | 0.001-0.008 | base |
| foreground | 0.10-0.32 | 0.00-0.03 | base |
| card | 0.98-1.0 | 0.00-0.005 | base |
| primary | 0.45-0.67 | 0.10-0.29 | hues[0] |
| primary-foreground | 0.97-1.0 | 0.00-0.005 | 0 |
| secondary | 0.55-0.67 | 0.08-0.15 | hues[1] |
| muted | 0.85-0.95 | 0.01-0.03 | base |
| muted-foreground | 0.40-0.55 | 0.00-0.04 | base |
| accent | 0.75-0.88 | 0.05-0.14 | hues[1] |
| destructive | 0.55-0.65 | 0.18-0.25 | 25 (red) |
| border/input | 0.85-0.92 | 0.00-0.015 | base |
| ring | = primary | = primary | = primary |
| chart-1 | = primary | = primary | hues[0] |
| chart-2 | = secondary | = secondary | hues[1] |
| chart-3 | = accent | = accent | hues[1] |
| chart-4 | mid L | mid C | hues[2] or shifted |
| chart-5 | mid L | high C | hues[0] shifted |
| sidebar | = background | = background | base |
| sidebar-primary | = primary | = primary | hues[0] |
| sidebar-accent | = accent | = accent | hues[1] |
| sidebar-border | = border | = border | base |

Use MIDPOINT of each range for deterministic output. No randomness.

Reference the 12 curated presets to calibrate these ranges — the presets are ground truth for what good values look like.

**Step 3: Dark mode derivation**

```
darkL = 1.0 - lightL
darkL = clamp(darkL, 0.04, 0.97)
darkC = lightC * 0.85
darkH = lightH

Special cases:
- Primary in dark: bump L by +0.05-0.10 for visibility
- Surfaces: compress into dark range (L = 0.04-0.32)
- Text on dark surfaces: L = 0.90-0.97
```

**Step 4: Contrast enforcement loop**

```
pairs = [
  (foreground, background),
  (card-foreground, card),
  (popover-foreground, popover),
  (primary-foreground, primary),
  (secondary-foreground, secondary),
  (muted-foreground, muted),
  (accent-foreground, accent),
  (destructive-foreground, destructive),
  (sidebar-foreground, sidebar),
  (sidebar-primary-foreground, sidebar-primary),
  (sidebar-accent-foreground, sidebar-accent),
]

for each (fg, bg) pair:
  ratio = contrastRatio(fg, bg)
  if ratio < 4.5:
    direction = fg.l > bg.l ? +1 : -1
    while contrastRatio(fg, bg) < 4.5 and iterations < 100:
      fg.l += direction * 0.005
      fg = clampToGamut(fg)
```

**Step 5: Non-color variables (from personality.ts)**

The generator uses `personality.ts` for all non-color tokens. If flags are passed (`--font`, `--shadow-profile`, `--radius`), validate and use those. Otherwise use defaults:

```typescript
import { FONT_REGISTRY, SHADOW_PROFILES, RADIUS_STOPS, validateFont, validateShadow, buildFontStack } from './personality'

// Default non-color tokens (used when no flags passed)
const DEFAULT_DESIGN_TOKENS = {
  'font-sans': 'ui-sans-serif, system-ui, sans-serif',   // system fonts if no --font
  'font-mono': 'ui-monospace, monospace',
  'font-serif': 'ui-serif, Georgia, serif',
  'radius': RADIUS_STOPS.moderate,                         // 0.5rem
  'spacing': '0.25rem',
  'tracking-normal': '0em',
  'letter-spacing': '0em',
  ...SHADOW_PROFILES.subtle,                               // default shadow profile
  'shadow-color': 'oklch(0 0 0)',
}

// When --font "Merriweather" is passed:
function resolveFont(fontName: string): Record<string, string> {
  const entry = validateFont(fontName)
  if (!entry) throw new Error(`Unknown font "${fontName}". Try: theme list fonts`)
  return {
    'font-sans': buildFontStack(entry),  // "Merriweather, serif"
    // mono stays default unless explicitly overridden
  }
}

// When --shadow-profile dramatic is passed:
function resolveShadowProfile(profile: string): Record<string, string> {
  const values = SHADOW_PROFILES[profile as ShadowProfile]
  if (!values) throw new Error(`Unknown shadow profile "${profile}". Options: none, subtle, moderate, dramatic, harsh`)
  return validateShadow(values)  // clamped for safety
}

// When --radius rounded is passed:
function resolveRadius(stop: string): Record<string, string> {
  const value = RADIUS_STOPS[stop as RadiusStop]
  if (!value) throw new Error(`Unknown radius "${stop}". Options: none, subtle, moderate, rounded, pill`)
  return { 'radius': value }
}
```

Shadow composite values derived from atomic properties:
```typescript
function buildShadowScale(opacity: string, blur: string, spread: string): Record<string, string> {
  const op = parseFloat(opacity)
  return {
    'shadow-2xs': `0 1px ${blur} ${spread} hsl(0 0% 0% / ${(op * 0.5).toFixed(2)})`,
    'shadow-xs':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${(op * 0.5).toFixed(2)})`,
    'shadow-sm':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${op.toFixed(2)}), 0 1px 2px -1px hsl(0 0% 0% / ${op.toFixed(2)})`,
    'shadow':     `0 1px ${blur} ${spread} hsl(0 0% 0% / ${op.toFixed(2)}), 0 1px 2px -1px hsl(0 0% 0% / ${op.toFixed(2)})`,
    'shadow-md':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${op.toFixed(2)}), 0 2px 4px -1px hsl(0 0% 0% / ${op.toFixed(2)})`,
    'shadow-lg':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${op.toFixed(2)}), 0 4px 6px -1px hsl(0 0% 0% / ${op.toFixed(2)})`,
    'shadow-xl':  `0 1px ${blur} ${spread} hsl(0 0% 0% / ${op.toFixed(2)}), 0 8px 10px -1px hsl(0 0% 0% / ${op.toFixed(2)})`,
    'shadow-2xl': `0 1px ${blur} ${spread} hsl(0 0% 0% / ${(op * 2.5).toFixed(2)})`,
  }
}
```

Tracking scale always derived from `--tracking-normal`:
```
--tracking-tighter: calc(var(--tracking-normal) - 0.05em)
--tracking-tight:   calc(var(--tracking-normal) - 0.025em)
--tracking-wide:    calc(var(--tracking-normal) + 0.025em)
--tracking-wider:   calc(var(--tracking-normal) + 0.05em)
--tracking-widest:  calc(var(--tracking-normal) + 0.1em)
```

### 5. `apps/ide/src/lib/theme-generator/personality.ts` — Non-color token validation

> **Design philosophy (from tweakcn analysis):** Colors are solved math — deterministic, contrast-guaranteed. But fonts, shadows, and radius are *aesthetic judgment*. Instead of fully determinizing them (rigid) or fully freestyling them (broken), we constrain them: curated options + validated ranges. Ralph has creative freedom within bounds. This is Wiggum's version of tweakcn's Zod schema enforcement — validation at the generation boundary, not after the fact.

**Font Registry — curated, not the entire Google Fonts catalog:**

```typescript
import type { FontEntry, FontCategory } from './types'

export const FONT_REGISTRY: FontEntry[] = [
  // Geometric Sans — clean, modern, technical
  { name: 'Inter',              fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700], vibe: 'clean' },
  { name: 'Plus Jakarta Sans',  fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700, 800], vibe: 'friendly' },
  { name: 'Outfit',             fallback: 'sans-serif', category: 'geometric-sans',     weights: [300, 400, 500, 600, 700], vibe: 'modern' },
  { name: 'Poppins',            fallback: 'sans-serif', category: 'geometric-sans',     weights: [300, 400, 500, 600, 700], vibe: 'rounded' },
  { name: 'Manrope',            fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700, 800], vibe: 'balanced' },
  { name: 'Sora',               fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700], vibe: 'sharp' },
  { name: 'Space Grotesk',      fallback: 'sans-serif', category: 'geometric-sans',     weights: [400, 500, 600, 700], vibe: 'techy' },

  // Humanist Sans — warm, organic, approachable
  { name: 'DM Sans',            fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 500, 600, 700], vibe: 'warm' },
  { name: 'Nunito',             fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 600, 700, 800], vibe: 'soft' },
  { name: 'Rubik',              fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 500, 600, 700], vibe: 'playful' },
  { name: 'Lexend',             fallback: 'sans-serif', category: 'humanist-sans',      weights: [400, 500, 600, 700], vibe: 'readable' },

  // Neo-Grotesque — neutral, professional, editorial
  { name: 'Geist',              fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700], vibe: 'neutral' },
  { name: 'IBM Plex Sans',      fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700], vibe: 'corporate' },
  { name: 'Work Sans',          fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700], vibe: 'utilitarian' },
  { name: 'Montserrat',         fallback: 'sans-serif', category: 'neo-grotesque',      weights: [400, 500, 600, 700, 800], vibe: 'bold' },

  // Transitional Serif — classic, editorial, literary
  { name: 'Source Serif 4',     fallback: 'serif',      category: 'transitional-serif', weights: [400, 600, 700], vibe: 'classic' },
  { name: 'Merriweather',       fallback: 'serif',      category: 'transitional-serif', weights: [400, 700], vibe: 'literary' },
  { name: 'Lora',               fallback: 'serif',      category: 'transitional-serif', weights: [400, 500, 600, 700], vibe: 'elegant' },
  { name: 'Libre Baskerville',  fallback: 'serif',      category: 'transitional-serif', weights: [400, 700], vibe: 'traditional' },
  { name: 'Crimson Pro',        fallback: 'serif',      category: 'transitional-serif', weights: [400, 500, 600, 700], vibe: 'refined' },

  // Slab Serif — strong, grounded, impactful
  { name: 'Roboto Slab',        fallback: 'serif',      category: 'slab-serif',         weights: [400, 500, 700], vibe: 'solid' },
  { name: 'Zilla Slab',         fallback: 'serif',      category: 'slab-serif',         weights: [400, 500, 600, 700], vibe: 'sturdy' },

  // Display — personality, brand, statement
  { name: 'Oxanium',            fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'futuristic' },
  { name: 'Orbitron',           fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'sci-fi' },
  { name: 'Righteous',          fallback: 'sans-serif', category: 'display',            weights: [400],               vibe: 'retro' },
  { name: 'Comfortaa',          fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'bubbly' },
  { name: 'Josefin Sans',       fallback: 'sans-serif', category: 'display',            weights: [400, 500, 600, 700], vibe: 'art-deco' },

  // Monospace — code, data, technical
  { name: 'JetBrains Mono',     fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'code' },
  { name: 'Geist Mono',         fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'minimal' },
  { name: 'Fira Code',          fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'ligatures' },
  { name: 'IBM Plex Mono',      fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'technical' },
  { name: 'Source Code Pro',    fallback: 'monospace',  category: 'monospace',          weights: [400, 500, 700], vibe: 'readable' },
]
```

**Named Radius Stops:**

```typescript
export const RADIUS_STOPS: Record<RadiusStop, string> = {
  none:     '0rem',
  subtle:   '0.25rem',
  moderate: '0.5rem',
  rounded:  '0.75rem',
  pill:     '1rem',
}
```

**Shadow Profiles (predefined personalities derived from the 12 presets):**

```typescript
export const SHADOW_PROFILES: Record<ShadowProfile, Record<string, string>> = {
  none:     { 'shadow-opacity': '0',    'shadow-blur': '0px',  'shadow-spread': '0px',  'shadow-offset-y': '0' },
  subtle:   { 'shadow-opacity': '0.05', 'shadow-blur': '3px',  'shadow-spread': '0px',  'shadow-offset-y': '1px' },
  moderate: { 'shadow-opacity': '0.1',  'shadow-blur': '6px',  'shadow-spread': '0px',  'shadow-offset-y': '2px' },
  dramatic: { 'shadow-opacity': '0.2',  'shadow-blur': '16px', 'shadow-spread': '-2px', 'shadow-offset-y': '4px' },
  harsh:    { 'shadow-opacity': '0.4',  'shadow-blur': '4px',  'shadow-spread': '0px',  'shadow-offset-y': '2px' },
}
```

**Validation ranges (clamping bounds for any custom values):**

```typescript
export const SHADOW_RANGES: ShadowRange = {
  opacity:  [0, 0.5],
  blur:     [0, 40],
  spread:   [-5, 10],
  offsetX:  [0, 8],
  offsetY:  [0, 8],
}

// Clamp a value to a range
export function clampRange(value: number, [min, max]: [number, number]): number {
  return Math.min(Math.max(value, min), max)
}

// Validate and clamp all shadow values
export function validateShadow(values: Record<string, string>): Record<string, string> {
  const clamped = { ...values }
  if (clamped['shadow-opacity'])  clamped['shadow-opacity']  = String(clampRange(parseFloat(clamped['shadow-opacity']), SHADOW_RANGES.opacity))
  if (clamped['shadow-blur'])     clamped['shadow-blur']     = clampRange(parseInt(clamped['shadow-blur']), SHADOW_RANGES.blur) + 'px'
  if (clamped['shadow-spread'])   clamped['shadow-spread']   = clampRange(parseInt(clamped['shadow-spread']), SHADOW_RANGES.spread) + 'px'
  if (clamped['shadow-offset-y']) clamped['shadow-offset-y'] = clampRange(parseInt(clamped['shadow-offset-y']), SHADOW_RANGES.offsetY) + 'px'
  return clamped
}

// Validate font name exists in registry
export function validateFont(name: string): FontEntry | null {
  return FONT_REGISTRY.find(f => f.name.toLowerCase() === name.toLowerCase()) ?? null
}

// Build --font-sans value with fallback
export function buildFontStack(entry: FontEntry): string {
  return `${entry.name}, ${entry.fallback}`
}

// Lookup fonts by category or vibe
export function findFonts(filter: { category?: FontCategory; vibe?: string }): FontEntry[] {
  return FONT_REGISTRY.filter(f =>
    (!filter.category || f.category === filter.category) &&
    (!filter.vibe || f.vibe === filter.vibe)
  )
}
```

### 6. `apps/ide/src/lib/theme-generator/presets.ts` — Typed preset registry

```typescript
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
```

### 7. `apps/ide/src/lib/theme-generator/index.ts` — Public API

```typescript
export { generateTheme } from './generator'
export { PATTERNS } from './patterns'
export { PRESETS } from './presets'
export { FONT_REGISTRY, RADIUS_STOPS, SHADOW_PROFILES, SHADOW_RANGES, validateShadow, validateFont, buildFontStack, findFonts } from './personality'
export type { ThemeConfig, GeneratedTheme, ThemeCssVars, OklchColor, GeometryPattern, FontEntry, FontCategory, RadiusStop, ShadowProfile } from './types'

export function getPreset(name: string): GeneratedTheme | null
export function listPatterns(): Array<{ name: string; description: string }>
export function listPresets(): Array<{ name: string; description: string }>
export function listFonts(category?: FontCategory): FontEntry[]
```

### 8. `apps/ide/src/lib/shell/commands/theme.ts` — The shell command

```
Usage:
  theme generate --seed <0-360> --pattern <n> [--mode light|dark|both] [--font <name>] [--shadow-profile <n>] [--radius <stop>]
  theme preset <n>
  theme modify --shift-hue <±degrees> [--scope brand|surface|all]
  theme list patterns
  theme list presets
  theme list fonts [--category <n>]
  theme list shadows
  theme list radii
```

**New flags on `theme generate`:**

| Flag | Type | Default | What it does |
|------|------|---------|-------------|
| `--font <name>` | string (from registry) | system fonts | Sets `--font-sans`. Validated against `FONT_REGISTRY` — rejects unknown fonts. |
| `--shadow-profile <n>` | `none\|subtle\|moderate\|dramatic\|harsh` | `subtle` | Sets all 6 shadow atomic variables from `SHADOW_PROFILES`. |
| `--radius <stop>` | `none\|subtle\|moderate\|rounded\|pill` | `moderate` | Sets `--radius` from `RADIUS_STOPS`. |

If Ralph passes `--font "Oxanium"`, the command validates it exists in the registry, resolves the fallback, and outputs `--font-sans: Oxanium, sans-serif`. If Ralph passes `--font "Comic Sans"` (not in registry), it errors with the closest matches.

**`theme modify` subcommand (Tokens Change Logic — adapted from tweakcn):**

This handles incremental changes without regenerating everything. Reads current CSS variables from `src/index.css`, applies targeted modifications, outputs updated block.

```
Scope rules (from tweakcn's token change logic):
  "make it bluer"           → --scope brand   → touches primary, secondary, accent, ring, chart colors
  "background darker"       → --scope surface → touches background, card, popover, muted, sidebar surfaces
  "change primary to red"   → specific token  → touches only named token + its foreground pair

  --shift-hue <±degrees>    Rotate hue of scoped tokens by N degrees
  --shift-lightness <±0.1>  Adjust L of scoped tokens (clamped, re-checks contrast)
  --scope brand|surface|all Which token group to modify (default: all)
```

After modification, contrast enforcement re-runs on affected pairs only.

**`theme list fonts` output:**

```
## Font Registry (32 fonts)

geometric-sans:
  Inter (clean) | Plus Jakarta Sans (friendly) | Outfit (modern) | Poppins (rounded) | ...
humanist-sans:
  DM Sans (warm) | Nunito (soft) | Rubik (playful) | Lexend (readable)
neo-grotesque:
  Geist (neutral) | IBM Plex Sans (corporate) | Work Sans (utilitarian) | Montserrat (bold)
transitional-serif:
  Source Serif 4 (classic) | Merriweather (literary) | Lora (elegant) | ...
slab-serif:
  Roboto Slab (solid) | Zilla Slab (sturdy)
display:
  Oxanium (futuristic) | Orbitron (sci-fi) | Righteous (retro) | ...
monospace:
  JetBrains Mono (code) | Geist Mono (minimal) | Fira Code (ligatures) | ...
```

**Output format** for `theme preset northern-lights`:

```
# Theme: northern-lights (preset)
# Aurora greens, celestial purples

## Shared (:root)

--font-sans: Plus Jakarta Sans, sans-serif;
--font-mono: JetBrains Mono, monospace;
--font-serif: Source Serif 4, serif;
--radius: 0.5rem;
--tracking-tighter: calc(var(--tracking-normal) - 0.05em);
... (all shared vars)

## Light Mode (:root)

--background: oklch(0.9824 0.0013 286.3757);
--foreground: oklch(0.3211 0 0);
--primary: oklch(0.6487 0.1538 150.3071);
... (all 53 light vars)

## Dark Mode (.dark)

--background: oklch(0.2303 0.0125 264.2926);
--foreground: oklch(0.9219 0 0);
... (all 52 dark vars)
```

Ralph copies this output into `src/index.css` via echo/cat.

**Implementation pattern:** Follow `PreviewCommand` structure. Implements `ShellCommand`, uses `ShellOptions`, returns `ShellResult`. Pure computation — no fs/git/preview needed.

### 9. Register the command

In `apps/ide/src/lib/shell/commands/index.ts`:
- Import `ThemeCommand` from `./theme`
- Add `executor.registerCommand(new ThemeCommand())`
- Add `'theme'` to the `allCommandNames` array

---

## FILES TO MODIFY

### 10. Tailwind config migration: `packages/stack/tailwind.config.ts`

**Critical:** Strip `hsl()` wrappers from all color definitions.

```typescript
// BEFORE (wraps with hsl())
colors: {
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
}

// AFTER (direct variable reference — OKLCH-compatible)
colors: {
  primary: {
    DEFAULT: 'var(--primary)',
    foreground: 'var(--primary-foreground)',
  },
}
```

Also add sidebar and chart color entries:
```typescript
sidebar: {
  DEFAULT: 'var(--sidebar)',
  foreground: 'var(--sidebar-foreground)',
  primary: 'var(--sidebar-primary)',
  'primary-foreground': 'var(--sidebar-primary-foreground)',
  accent: 'var(--sidebar-accent)',
  'accent-foreground': 'var(--sidebar-accent-foreground)',
  border: 'var(--sidebar-border)',
  ring: 'var(--sidebar-ring)',
},
chart: {
  '1': 'var(--chart-1)',
  '2': 'var(--chart-2)',
  '3': 'var(--chart-3)',
  '4': 'var(--chart-4)',
  '5': 'var(--chart-5)',
},
```

The 60+ components are **UNTOUCHED**. They use Tailwind classes (`bg-primary`, `text-foreground`) — changing the config is the only migration step.

### 11. Update theming skill: `apps/ide/src/skills/theming/SKILL.md`

Replace old preset section at the TOP:

```markdown
## Theme Generator (USE THIS FIRST)

Instead of inventing CSS values, use the `theme` command:

### Quick Start
theme preset northern-lights     # Pick a curated theme
theme generate --seed 210 --pattern analogous  # Custom colors + default personality
theme generate --seed 210 --pattern analogous --font "Merriweather" --shadow-profile dramatic --radius rounded  # Full personality
theme list presets               # See all 12 options
theme list patterns              # See all 11 patterns
theme list fonts                 # See all 32 approved fonts by category
theme list shadows               # See 5 shadow profiles
theme list radii                 # See 5 radius stops

### Which Preset?

| If the task feels like... | Use this preset |
|---------------------------|-----------------|
| Professional / nature-tech | `northern-lights` |
| Bold / futuristic / gaming | `cyberpunk` or `doom-64` |
| Warm / food / lifestyle | `tangerine` or `mocha-mousse` |
| Playful / fun / kids | `bubblegum` or `soft-pop` |
| Minimal / editorial / dev | `mono` or `caffeine` |
| Luxury / fashion | `elegant-luxury` |
| Nostalgic / retro | `retro-arcade` |
| Cozy / pastel | `catppuccin` |

### Custom Themes

If no preset fits, pick a base hue (0-360) and pattern:

| Pattern | Best For |
|---------|----------|
| monochromatic | Minimal, clean, professional |
| analogous | Natural, harmonious, most projects |
| complementary | Bold, high-energy, CTAs |
| triadic | Vibrant, playful, creative |
| goldenRatio | Organic, nature-inspired |

### Fonts (PICK FROM REGISTRY — never invent)

| If the app feels... | Try these fonts |
|---------------------|-----------------|
| Professional / SaaS | Inter, Geist, IBM Plex Sans |
| Warm / friendly / organic | DM Sans, Plus Jakarta Sans, Nunito |
| Editorial / literary | Merriweather, Lora, Source Serif 4 |
| Bold / impactful | Montserrat, Sora, Roboto Slab |
| Futuristic / gaming | Oxanium, Orbitron, Space Grotesk |
| Playful / bubbly | Comfortaa, Rubik, Poppins |
| Code / technical | JetBrains Mono, Fira Code, Geist Mono |

### Shadow Profiles

| Profile | Personality | Example preset |
|---------|-------------|----------------|
| none | No shadows. Flat, typographic. | mono |
| subtle | Gentle depth. Most apps. | northern-lights, tangerine |
| moderate | Noticeable elevation. Dashboards. | catppuccin |
| dramatic | Bold depth. Premium, luxury. | elegant-luxury |
| harsh | Hard, aggressive. Industrial, gaming. | doom-64 |

### Radius Stops

| Stop | Value | Personality |
|------|-------|-------------|
| none | 0rem | Sharp, industrial, aggressive |
| subtle | 0.25rem | Clean, professional |
| moderate | 0.5rem | Balanced (default) |
| rounded | 0.75rem | Friendly, approachable |
| pill | 1rem | Bubbly, playful |

### Modifying Existing Themes

If the user says "make it warmer" or "change the primary to blue":
theme modify --shift-hue +20 --scope brand    # Warmer brand colors only
theme modify --shift-hue -30 --scope surface  # Cooler backgrounds only

**Scope rules:**
- "make it [color]" → --scope brand (primary, secondary, accent, ring, charts)
- "background darker/lighter" → --scope surface (background, card, popover, muted, sidebar)
- "change [specific token]" → modify only that token + its foreground pair

**CRITICAL:** Always use theme command output. NEVER manually invent oklch() values. NEVER write font-family strings without using the registry. NEVER guess shadow values.
```

Remove old 9 HSL presets entirely.

### 12. Update tool descriptions in system prompt

```
theme - Generate OKLCH color themes with 50+ CSS variables. Font/shadow/radius validated against registry.
  theme preset <n>                                                                 Pick a curated theme
  theme generate --seed <0-360> --pattern <n> [--font <n>] [--shadow-profile <n>] [--radius <stop>]   Sacred geometry + personality
  theme modify --shift-hue <±deg> [--scope brand|surface|all]                      Tweak existing theme
  theme list presets                              Show 12 preset options
  theme list patterns                             Show 11 geometry patterns
  theme list fonts [--category <n>]               Show 32 approved fonts by category
  theme list shadows                              Show 5 shadow profiles
  theme list radii                                Show 5 radius stops
```

---

## IMPLEMENTATION ORDER

1. **Copy 12 JSON files** into `apps/ide/src/lib/theme-generator/themes/`
2. **types.ts** — Shared types (including FontEntry, RadiusStop, ShadowProfile, ShadowRange)
3. **oklch.ts** — Color math. Test: `formatOklch({ l: 0.6487, c: 0.1538, h: 150.3071 })` → `"oklch(0.6487 0.1538 150.3071)"`. `contrastRatio(white, black)` ≈ 21.
4. **patterns.ts** — Pattern definitions. Test: `PATTERNS.goldenRatio.generate(0)` → `[0, 137.508, 275.016, 52.524, 190.032]`.
5. **personality.ts** — Font registry (32 fonts), shadow profiles (5), radius stops (5), validators. Test: `validateFont("Inter")` returns entry. `validateFont("Comic Sans")` returns null. `validateShadow({"shadow-opacity": "2.0"})` clamps to `"0.5"`.
6. **presets.ts** — Typed wrapper around JSONs.
7. **generator.ts** — Core engine. Test: `generateTheme({ seed: 210, pattern: 'analogous' })` produces 50+ vars per mode. Every fg/bg pair ≥ 4.5:1. `generateTheme({ seed: 210, pattern: 'analogous', font: 'Merriweather', shadowProfile: 'dramatic', radius: 'rounded' })` uses validated non-color tokens.
8. **index.ts** — Public API exports (including personality exports).
9. **theme.ts** (shell command) — Wire up all subcommands: preset, generate (with --font/--shadow-profile/--radius), modify, list. Test: `theme preset northern-lights` outputs full CSS block. `theme generate --seed 210 --pattern analogous --font "Merriweather"` validates font. `theme list fonts` shows registry.
10. **Register** in `commands/index.ts`.
11. **Tailwind migration** — Strip `hsl()` wrappers, add sidebar/chart colors.
12. **Update** theming skill (include font picker table, shadow profiles, radius stops, modify guidance).
13. **Update** tool descriptions.

---

## VERIFICATION

```bash
# 1. All 12 presets load without error
for p in northern-lights cyberpunk doom-64 retro-arcade soft-pop tangerine mono elegant-luxury bubblegum mocha-mousse caffeine catppuccin; do
  theme preset $p
done

# 2. All 11 patterns generate with arbitrary seed
for pattern in monochromatic analogous complementary splitComplementary triadic tetradic goldenRatio flowerOfLife fibonacci vesicaPiscis seedOfLife; do
  theme generate --seed 180 --pattern $pattern
done

# 3. Contrast: parse output, verify all fg/bg pairs >= 4.5:1

# 4. Determinism: same input → same output
theme generate --seed 152 --pattern goldenRatio > /tmp/a
theme generate --seed 152 --pattern goldenRatio > /tmp/b
diff /tmp/a /tmp/b  # Should be empty

# 5. Variable count: preset output should have 50+ vars per mode
theme preset northern-lights | grep -c "oklch"  # Should be 60+

# 6. Font validation: registry fonts accepted, unknown rejected
theme generate --seed 210 --pattern analogous --font "Inter"         # Should work
theme generate --seed 210 --pattern analogous --font "Comic Sans"    # Should error with suggestions

# 7. Shadow profile validation: named profiles accepted
theme generate --seed 210 --pattern analogous --shadow-profile dramatic   # Should work
theme generate --seed 210 --pattern analogous --shadow-profile extreme    # Should error

# 8. Radius stop validation
theme generate --seed 210 --pattern analogous --radius pill   # Should work
theme generate --seed 210 --pattern analogous --radius huge   # Should error

# 9. Font listing
theme list fonts                    # Should show all 32 by category
theme list fonts --category display # Should show only display fonts

# 10. Theme modify (reads current src/index.css, applies shift)
theme modify --shift-hue +30 --scope brand    # Should only affect brand tokens
theme modify --shift-hue -20 --scope surface  # Should only affect surface tokens

# 11. Tailwind integration: build IDE after migration, verify no style regressions
```

---

## WHAT NOT TO DO

- **No external runtime dependencies.** No culori, no chroma.js. Pure TS. (Reference RLabs MIT source as guide.)
- **No randomness.** Deterministic. `Math.random()` appears nowhere.
- **No HSL in output.** Output is native OKLCH: `oklch(0.6487 0.1538 150.3071)`.
- **No dark mode guessing.** Dark derived from light via inversion formula.
- **Don't modify the 12 JSON theme files.** They are curated, contrast-verified.
- **Don't change component files.** Only migration is `tailwind.config.ts`.
- **Don't allow fonts outside the registry.** Ralph picks from 32 approved Google Fonts — never invents.
- **Don't allow shadow values outside clamping ranges.** opacity [0, 0.5], blur [0, 40px], spread [-5, 10px].
- **Don't allow arbitrary radius values.** Only the 5 named stops (none/subtle/moderate/rounded/pill).
- **DO include MIT license notice** in oklch.ts, patterns.ts, generator.ts:
  ```
  // Color generation algorithm adapted from RLabs-Inc/shadcn-themes (MIT License)
  // https://github.com/RLabs-Inc/shadcn-themes
  // Copyright (c) RLabs Inc.
  ```

---

## REFERENCE: tweakcn patterns adapted

The following design patterns were adapted from [tweakcn](https://github.com/jnsahaj/tweakcn), an open-source shadcn/ui theme customizer. We borrowed conceptual patterns, not code:

**Tokens Change Logic** — tweakcn's system prompt defines how incremental modifications work: "make it [color]" changes brand tokens, "background darker" changes surface tokens, specific requests change only named tokens + foreground pairs. This maps directly to Wiggum's `theme modify` subcommand scope rules.

**Shadow token decomposition** — Individual atomic properties (`shadow-color`, `shadow-opacity`, `shadow-blur`, `shadow-spread`, `shadow-offset-x`, `shadow-offset-y`) rather than composite shorthand. Gives fine-grained control within validated ranges.

**Constrained non-color selection** — tweakcn uses Zod schemas via Vercel AI SDK's `streamObject` to force the LLM to produce valid theme output (correct fonts, valid values, complete tokens). In Wiggum, Ralph *is* the LLM, so validation happens at the `theme` command boundary: font registry + shadow profiles + radius stops are Wiggum's equivalent of tweakcn's Zod schema. Proactive validation, not post-hoc.

**Font rules** — Google Fonts only, `font-sans` as primary font (even for serif/mono styles), always include generic fallback. The font registry enforces this programmatically rather than hoping Ralph remembers.

**What we did NOT borrow:** tweakcn's LLM-based color generation (we use deterministic sacred geometry math instead), streaming/server-side architecture (we're browser-native), and prompt enhancement (that's future Chief territory, not Ralph's).

---

## REFERENCE: RLabs Source (MIT — browse directly)

Key files at https://github.com/RLabs-Inc/shadcn-themes:

- `src/lib/utils/theme.ts` — `generateThemeColors()`: maps hues to CSS variables
- `src/lib/utils/colors.ts` — OKLCH utilities (uses culori — we rewrite pure TS)
- `src/lib/utils/color-schemes/index.ts` — `generateSchemeHues()`
- `src/lib/utils/color-schemes/patterns/` — Geometry implementations
- `src/lib/types/sacred-geometry-schemes.ts` — Pattern types

**Adapt vs. change:**
- **KEEP:** OKLCH math, pattern angles, contrast enforcement, L/C ranges
- **STRIP:** Svelte state, culori dep, randomization, UI
- **ADD:** Shell command, preset JSON loading, 50+ variable output, shadow scale

### OKLCH Math Reference (Public Domain)

From Björn Ottosson (https://bottosson.github.io/posts/oklab/):

```
OKLCH to OKLab:
  a = C * cos(H * π / 180)
  b = C * sin(H * π / 180)

OKLab to linear RGB:
  l_ = L + 0.3963377774 * a + 0.2158037573 * b
  m_ = L - 0.1055613458 * a - 0.0638541728 * b
  s_ = L - 0.0894841775 * a - 1.2914855480 * b

  l = l_³,  m = m_³,  s = s_³

  r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

Linear RGB to sRGB:
  f(x) = x >= 0.0031308 ? 1.055 * x^(1/2.4) - 0.055 : 12.92 * x
```
