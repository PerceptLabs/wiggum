# Ralph Color Defense System — Four Layers

> Prevents Ralph from inventing colors. Makes bad colors physically impossible.
> Gives Ralph a sanctioned path to content-specific harmonious colors.

---

## THE PROBLEM (Energy Drink Log Evidence)

Ralph generated a theme correctly, then:
1. Overwrote it with hand-authored OKLCH values (`cat > src/index.css`)
2. Used hardcoded Tailwind colors (`text-lime-400`, `bg-cyan-500/20`)
3. Used HSL syntax in shadows (`hsl(145 100% 50% / 0.4)`)

All three compiled and rendered because Tailwind's default color palette was available.
Gates passed because they don't check for color discipline.

---

## THE FOUR LAYERS

| Layer | When | What |
|-------|------|------|
| **1. The Wall** | Compile time | `@theme inline` — only defined colors exist |
| **2. The Immutables** | System prompt | 7 non-negotiable rules about color |
| **3. theme extend** | During coding | Sanctioned path to content-specific colors |
| **4. The Gate** | At completion | Source scan catches violations |

Each layer catches what the previous one missed. Together they're airtight.

---

## LAYER 1: THE WALL (`@theme inline`)

### What Changes

**File:** `apps/ide/src/lib/build/tailwind-compiler.ts`

One word change:

```typescript
// BEFORE:
export const TAILWIND_THEME_CSS = `@theme {
  --color-background: var(--background);
  ...
}`

// AFTER:
export const TAILWIND_THEME_CSS = `@theme inline {
  --color-background: var(--background);
  ...
}`
```

### What `inline` Does

In Tailwind v4, `@theme inline` means:
- **ONLY** explicitly defined `--color-*` tokens generate utility classes
- ALL default Tailwind colors (red-50→950, blue-50→950, etc.) are **wiped**
- `bg-red-500` in source → scanned → no `--color-red-500` defined → **zero CSS generated**
- The class exists in DOM but does absolutely nothing. Visually broken.

### Why This Is The Most Powerful Layer

- **Compile-time enforcement.** Not a suggestion. Not a rule. Physics.
- **Impossible to bypass.** Even if Ralph ignores the system prompt AND the gate, the color literally doesn't exist.
- **Self-correcting.** Ralph sees broken preview → reads feedback → fixes. No gate failure needed.
- **Zero performance cost.** Actually produces LESS CSS (no unused color utilities).
- **Already proven in this codebase.** The IDE's own `apps/ide/src/index.css` already uses `@theme inline` for its Vite build. This pattern is tested and working.

### What Still Works After `inline`

| Class | Works? | Why |
|-------|--------|-----|
| `bg-primary` | ✅ | Defined: `--color-primary: var(--primary)` |
| `text-foreground` | ✅ | Defined: `--color-foreground: var(--foreground)` |
| `border-muted/50` | ✅ | Defined + opacity modifier works on defined colors |
| `bg-chart-1` | ✅ | Defined: `--color-chart-1: var(--chart-1)` |
| `text-white` | ❌ | NOT defined. Need to add explicitly (see below) |
| `bg-black` | ❌ | NOT defined. Need to add explicitly (see below) |
| `bg-transparent` | ❌ | NOT defined. Need to add explicitly (see below) |
| `bg-red-500` | ❌ | NOT defined. Produces nothing. |
| `text-lime-400` | ❌ | NOT defined. Produces nothing. |

### Required Additions to `@theme inline`

Some non-semantic colors that components legitimately need:

```typescript
export const TAILWIND_THEME_CSS = `@theme inline {
  /* === Semantic tokens (from theme generator) === */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);

  /* === Neutral extremes (always needed) === */
  --color-white: #ffffff;
  --color-black: #000000;
  --color-transparent: transparent;
  --color-current: currentColor;

  /* === Radius (unchanged) === */
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}`
```

### Dynamic Extension for `theme extend`

When Ralph runs `theme extend --name grape --hue 300`, the build system needs to include `--color-grape: var(--grape)` in the theme block.

**Approach: Build-time scan**
Before compiling Tailwind, scan `src/index.css` for `/* theme-extended: <n> */` markers and dynamically append `--color-<n>: var(--<n>)` entries to `TAILWIND_THEME_CSS`.

```typescript
// In tailwind-compiler.ts
export async function compileTailwind(content: string, indexCss?: string): Promise<string | null> {
  let themeBlock = TAILWIND_THEME_CSS
  
  // Dynamically register extended colors from index.css markers
  if (indexCss) {
    const extendedColors = parseExtendedColors(indexCss)
    if (extendedColors.length > 0) {
      const extLines = extendedColors.map(name => 
        `  --color-${name}: var(--${name});\n  --color-${name}-foreground: var(--${name}-foreground);`
      ).join('\n')
      // Insert before closing }
      themeBlock = themeBlock.replace(/\}$/, `\n  /* === Extended content colors === */\n${extLines}\n}`)
    }
  }
  
  return await generateFn({ content, css: themeBlock })
}

function parseExtendedColors(css: string): string[] {
  const names: string[] = []
  const re = /\/\* theme-extended: (\w[\w-]*) \*\//g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    names.push(m[1])
  }
  return names
}
```

### Color Space Note

The IDE itself uses HSL (bare triples like `--primary: 0 0% 9%;` wrapped with `hsl()` in the bridge). Ralph's projects use OKLCH (complete values like `--primary: oklch(0.55 0.22 270);` with direct `var()` in the bridge). The `@theme inline` wall works identically for both color spaces because it only controls which `--color-*` names exist, not what values flow through them. The @wiggum/stack components are fully color-space agnostic — they only reference token names (`bg-primary`, `text-foreground`), never color values.

---

## LAYER 2: THE IMMUTABLES

### What They Are

A compact block of non-negotiable rules injected into every Ralph system prompt. Unlike skills (searchable, optional, context-dependent), these are **always-present**. Unlike the existing CRITICAL RULES (build mechanics), these cover **color and theme discipline**.

### Where They Go

In `loop.ts` `BASE_SYSTEM_PROMPT`, new section after `## CRITICAL RULES`:

```
## IMMUTABLE LAWS — COLOR & THEME

These rules are non-negotiable. Violating them produces broken, invisible output.

1. **ALL colors flow through the theme.** Use semantic tokens: text-primary, 
   bg-accent, border-muted, text-chart-1. For content-specific colors 
   (grape=purple, ocean=blue), use `theme extend --name <n> --hue <deg>`.

2. **Standard Tailwind colors DO NOT EXIST.** text-red-500, bg-blue-200, 
   border-lime-400 — these produce ZERO CSS. They are not available. The 
   build system only knows semantic tokens and extended colors.

3. **Never overwrite a generated theme.** After `theme generate` or 
   `theme preset`, NEVER `cat > src/index.css` with hand-written values. 
   Use `theme modify` to adjust, or `replace` for individual variables.

4. **No raw color values in components.** Never write oklch(), hsl(), rgb(), 
   hex (#ff0000), or rgba() in .tsx files. Colors come from CSS variables.

5. **Shadows use theme variables.** Use shadow utility classes or 
   shadow-[var(--shadow-lg)]. Never write hsl() or oklch() in shadows.

6. **Content colors via theme extend.** Need grape=purple? 
   `theme extend --name grape --hue 300` → then use bg-grape, text-grape.
   The command generates contrast-checked, chroma-matched values.

7. **Read design-brief.md before coding.** Run `cat .ralph/design-brief.md`. 
   It defines typography, animation, spacing, and what's allowed/forbidden.
```

### Why "DO NOT EXIST" Framing

Rule 2 isn't just policy — it's literal truth with `@theme inline`. Telling Ralph "these are forbidden" invites workarounds. Telling Ralph "these don't exist" matches reality.

### Semantic Color Mapping (for theming SKILL.md)

```markdown
## Semantic Color Mapping

| Intent | Token | When to Use |
|--------|-------|-------------|
| Brand / primary action | `primary` | CTA buttons, key highlights, brand identity |
| Secondary emphasis | `secondary` | Supporting elements, secondary buttons |
| Soft highlight | `accent` | Hover states, active states, badges |
| Subdued / disabled | `muted` | Placeholder text, disabled states, subtle borders |
| Error / danger / removal | `destructive` | Delete buttons, error states, warnings |
| Data series 1-5 | `chart-1`→`chart-5` | Charts, tags, avatars, categories |

### When You Need More Than 5 Categories
Use `theme extend` for additional content-specific colors.

### Opacity Modifiers
Use on semantic tokens: `bg-primary/10`, `border-chart-2/30`, `text-muted-foreground/70`.
NEVER use arbitrary values like `bg-[#123456]` or `bg-[rgba(255,0,0,0.3)]`.
```

---

## LAYER 3: THEME EXTEND COMMAND

### Problem

Ralph needs grape to be purple, orange to be orange. Chart variables are math-derived, not semantically tied to content. With `@theme inline`, hardcoding colors produces **nothing** (no CSS generated).

### Usage

```bash
theme extend --name grape --hue 300
theme extend --name orange --hue 55
theme extend --name blueberry --hue 260
theme extend --name strawberry --hue 350
theme extend --list
theme extend --remove grape
```

### What It Does

1. **Reads tokens.json** → gets active theme's chroma level and lightness curve

2. **Generates OKLCH color** at requested hue, matched to theme personality:
   - `extended_C = primary_C * 0.9` (slightly less saturated so content colors support, don't compete)
   - Light mode L: ~0.45 for light themes, ~0.65 for dark themes
   - Dark mode L: inverted from light mode
   - Foreground: minimal chroma, L calculated for 4.5:1+ contrast

3. **Writes to src/index.css** with smart merge markers:
   ```css
   /* theme-extended: grape */
   --grape: oklch(0.55 0.20 300);
   --grape-foreground: oklch(0.98 0.01 300);
   /* /theme-extended: grape */
   ```

4. **Auto-registers with Tailwind** via build-time scan of markers → `bg-grape`, `text-grape`, `border-grape/30` work as first-class utilities

5. **Updates tokens.json** with extended color metadata

6. **Reports** contrast ratio and usage examples

### How Ralph Uses Extended Colors

```tsx
// Explicit classes — Tailwind scanner finds them
<Card className="border-grape/30 bg-grape/10">
  <h3 className="text-grape">Grape Crush</h3>
</Card>
```

### Smart Merge Integration

Extended colors use `/* theme-extended: <n> */` ... `/* /theme-extended: <n> */` markers. These survive theme regeneration and Ralph's `cat >` attempts (different marker namespace from the theme zone).

### Implementation

- **theme.ts:** Add `handleExtend()` method
- **tailwind-compiler.ts:** Add `parseExtendedColors()`, pass `indexCss` to `compileTailwind()`
- **build/index.ts:** Read `src/index.css` and pass to `compileTailwind()`
- **css-smart-merge.ts:** Recognize extended markers as protected zones

---

## LAYER 4: THE GATE (`no-hardcoded-colors`)

### What It Does

Scans `.tsx` and `.ts` files in `src/` for:
1. Tailwind color-shade utilities: `text-red-500`, `bg-lime-400`
2. Raw color functions: `oklch()`, `hsl()`, `rgb()`, `rgba()`
3. Hex literals: `#ff0000`, `#1a2b3c`

### Gate Positioning

After `css-theme-complete`, before `build-succeeds`.

### What It Catches vs. Allows

| Pattern | Caught? | Why |
|---------|---------|-----|
| `text-lime-400` | ✅ | Tailwind color-shade |
| `bg-cyan-500/20` | ✅ | Tailwind color-shade |
| `hsl(145 100% 50% / 0.4)` | ✅ | Raw color function |
| `oklch(0.85 0.22 145)` | ✅ | Raw color function |
| `#ff0000` | ✅ | Hex literal |
| `text-primary` | ❌ | Semantic token ✓ |
| `bg-grape` | ❌ | Extended color ✓ |
| `text-white` | ❌ | Not color-shade pattern |

---

## HOW THE FOUR LAYERS WORK TOGETHER

### Energy Drink Scenario (With Defense)

1. Ralph generates theme ✓
2. Ralph tries `cat > src/index.css` → smart merge blocks theme zone ✓
3. Ralph writes `text-lime-400` → **Wall**: zero CSS, text invisible ✓
4. Ralph runs `preview` → sees broken text → reads feedback ✓
5. Ralph uses `theme extend --name original --hue 145` → gets `bg-original`, `text-original` ✓
6. Ralph rewrites with `text-original` → renders correctly ✓
7. Ralph marks complete → **Gate**: no violations ✓

---

## IMPLEMENTATION ORDER

### CC Prompt A: Wall + Immutables + Gate (~20 min)
1. `tailwind-compiler.ts`: `@theme` → `@theme inline`, add white/black/transparent/current, add `parseExtendedColors()`, modify `compileTailwind()` signature
2. `build/index.ts`: read `src/index.css`, pass to `compileTailwind()`
3. `loop.ts`: insert IMMUTABLE LAWS section into BASE_SYSTEM_PROMPT
4. `gates.ts`: add `no-hardcoded-colors` gate

### CC Prompt B: Theme Extend Command (~30 min)
1. `theme.ts`: add `handleExtend()` — reads tokens.json, generates OKLCH, writes markers
2. `css-smart-merge.ts`: recognize extended markers as protected zones
3. Theming SKILL.md: add semantic mapping table + content colors section
