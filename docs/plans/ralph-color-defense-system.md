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
- **Already how it works.** Your `TAILWIND_THEME_CSS` already defines only 36 tokens. Adding `inline` just tells Tailwind "these are ALL that exist."

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

When Ralph runs `theme extend --name grape --hue 300`, the theme command needs to:
1. Generate `--grape` and `--grape-foreground` CSS custom properties → writes to `src/index.css`
2. **Register with Tailwind** → the build system needs to include `--color-grape: var(--grape)` in the theme block

Two approaches for registration:

**Approach A: Build-time scan (simpler)**
Before compiling Tailwind, scan `src/index.css` for `/* theme-extended: <name> */` markers and dynamically append `--color-<name>: var(--<name>)` entries to `TAILWIND_THEME_CSS`.

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

**Approach B: Static registry in theme command (more explicit)**
`theme extend` writes a `.ralph/extended-colors.json` file listing all extended color names. The build reads it.

Approach A is better — the markers already exist in CSS for smart merge, so one source of truth.

### Impact on @wiggum/stack

The stack components use semantic tokens (`bg-primary`, `text-foreground`, etc.) so they're unaffected. But verify:

```bash
# Quick check: any hardcoded Tailwind colors in stack?
grep -rn "text-\(red\|blue\|green\|lime\|cyan\)" packages/stack/src/
```

If any exist, they need to be migrated before flipping the `inline` switch.

### Risk: Neobrutalism Safelist

The `tailwind.config.ts` safelist includes `rgba()` and `hsl()` in shadow values:
```
'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
'dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]'
```

These are **arbitrary values** (`shadow-[...]`), not color utilities. They'll still work with `@theme inline` because they don't go through the `--color-*` system. However, they ARE hardcoded colors — we should plan to migrate them to `--shadow-*` theme variables eventually. Not a blocker for `@theme inline`.

Note: The safelist is in `tailwind.config.ts` which is for the IDE's own UI (Vite build), NOT for Ralph's project builds. Ralph's projects use `tailwindcss-iso` with `TAILWIND_THEME_CSS`. The safelist doesn't affect Ralph at all.

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
   It defines typography, animation, spacing, extended colors, and what's allowed/forbidden.
```

### Why "DO NOT EXIST" Framing

Rule 2 isn't just policy — it's literal truth with `@theme inline`. Telling Ralph "these are forbidden" invites workarounds. Telling Ralph "these don't exist" matches reality. The model can't produce what doesn't exist.

### Character Count

~1,200 characters. Compact. Each rule is 2-3 lines.

### Mapping Table for Rule 1

Gemini's mapping suggestion is good. Include it in the theming SKILL.md (searchable), not in the immutables (always present). The immutables point to it:

In theming SKILL.md, add:

```markdown
## Semantic Color Mapping

When your design intent maps to a color, use the semantic token:

| Intent | Token | When to Use |
|--------|-------|-------------|
| Brand / primary action | `primary` | CTA buttons, key highlights, brand identity |
| Secondary emphasis | `secondary` | Supporting elements, secondary buttons |
| Soft highlight | `accent` | Hover states, active states, badges |
| Subdued / disabled | `muted` | Placeholder text, disabled states, subtle borders |
| Error / danger / removal | `destructive` | Delete buttons, error states, warnings |
| Data series 1 | `chart-1` | First category in charts, tags, avatars |
| Data series 2 | `chart-2` | Second category |
| Data series 3 | `chart-3` | Third category |
| Data series 4 | `chart-4` | Fourth category |
| Data series 5 | `chart-5` | Fifth category |

### When You Need More Than 5 Categories

If your UI needs more than 5 distinct colors (e.g., 8 product flavors, 12 tags):
1. Use chart-1 through chart-5 for the first 5
2. Use `theme extend` for additional content-specific colors:
   ```bash
   theme extend --name grape --hue 300
   theme extend --name ocean --hue 200
   theme extend --name sunset --hue 25
   ```
3. Extended colors are harmonious with the theme — same chroma, checked contrast

### Opacity Modifiers

Use opacity modifiers on semantic tokens for subtle effects:
- `bg-primary/10` — very light primary wash
- `border-chart-2/30` — subtle category border
- `text-muted-foreground/70` — slightly faded text

NEVER use arbitrary values like `bg-[#123456]` or `bg-[rgba(255,0,0,0.3)]`.
```

---

## LAYER 3: THEME EXTEND COMMAND

### Problem

Ralph needs grape to be purple, orange to be orange. Chart variables are math-derived, not semantically tied to content. Hardcoding colors produces clashing output (and with `@theme inline`, produces **nothing**).

### Solution

`theme extend` generates content-specific CSS custom properties matched to the active theme's chroma/lightness profile, writes them to `src/index.css` with smart merge markers, and they auto-register as first-class Tailwind utilities via the build-time scan.

### Usage

```bash
# Generate a content color at a specific hue
theme extend --name grape --hue 300
theme extend --name orange --hue 55
theme extend --name blueberry --hue 260
theme extend --name strawberry --hue 350

# List extended colors
theme extend --list

# Remove an extended color
theme extend --remove grape
```

### What It Does (Step by Step)

1. **Reads tokens.json** → gets active theme's chroma level, lightness curve, primary's C value

2. **Generates OKLCH color** at the requested hue, matched to theme personality:
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
   Written in BOTH `:root` and `.dark` blocks.

4. **Updates tokens.json** with extended color metadata:
   ```json
   {
     "extended": {
       "grape": {
         "hue": 300,
         "light": { "l": 0.55, "c": 0.20, "h": 300 },
         "dark": { "l": 0.65, "c": 0.18, "h": 300 },
         "contrast": { "light": 8.2, "dark": 7.1 }
       }
     }
   }
   ```

5. **Reports** contrast ratio and usage:
   ```
   Extended "grape" (hue 300):
     --grape: oklch(0.55 0.20 300)
     --grape-foreground: oklch(0.98 0.01 300)
     Contrast: 8.2:1 (AAA) ✓
   
   Usage: bg-grape, text-grape, border-grape/30, text-grape-foreground
   Written to src/index.css + tokens.json
   ```

6. **Appends to `.ralph/design-brief.md`** so Ralph sees extended colors on every iteration:
   ```
   ## Extended Colors
   - grape (hue 300) → bg-grape, text-grape, border-grape/30
   ```
   This solves the fresh-context problem — Ralph's loop is stateless per iteration, but rule 7 says "read design-brief.md before coding." By writing extended colors into that file, Ralph discovers them automatically without needing dynamic prompt injection.

   On `--remove`, the corresponding line is removed from design-brief.md.

### Auto-Registration with Tailwind

When `buildProject()` runs, it:
1. Reads `src/index.css` from the virtual filesystem
2. Passes it to `compileTailwind(scanContent, indexCss)`
3. `compileTailwind` parses `/* theme-extended: <name> */` markers
4. Dynamically adds `--color-grape: var(--grape)` to the `@theme inline` block
5. Tailwind now generates utilities for `bg-grape`, `text-grape`, etc.

Result: Ralph writes `bg-grape` naturally, just like `bg-primary`. First-class utility. Not `bg-[var(--grape)]`.

### How Ralph Uses It

```tsx
// FlavorCard.tsx — clean, natural, harmonious
const flavors = [
  { name: 'Grape Crush', color: 'grape' },
  { name: 'Orange Blast', color: 'orange' },
  { name: 'Blueberry Wave', color: 'blueberry' },
]

function FlavorCard({ name, color }: { name: string; color: string }) {
  return (
    <Card className={`border-${color}/30 bg-${color}/10`}>
      <h3 className={`text-${color}`}>{name}</h3>
    </Card>
  )
}
```

Wait — dynamic class names won't be picked up by Tailwind's scanner. Two solutions:

**Solution A: Explicit classes (recommended for most cases)**
```tsx
// Ralph writes explicit classes — Tailwind scanner finds them
<Card className="border-grape/30 bg-grape/10">
  <h3 className="text-grape">Grape Crush</h3>
</Card>
<Card className="border-orange/30 bg-orange/10">
  <h3 className="text-orange">Orange Blast</h3>
</Card>
```

**Solution B: Safelist via markers (for truly dynamic mapping)**
If Ralph needs to map programmatically, `theme extend` could also write a safelist comment:
```css
/* theme-safelist: bg-grape text-grape border-grape bg-grape/10 border-grape/30 */
```
The Tailwind compiler scan content includes this → classes get generated.

Practically, Solution A is what Ralph should do 95% of the time. Solution B is a future enhancement if needed.

### Implementation Location

- **theme.ts:** Add `handleExtend()` method
- **tailwind-compiler.ts:** Add `parseExtendedColors()` and pass `indexCss` to `compileTailwind()`
- **build/index.ts:** Read `src/index.css` and pass to `compileTailwind()` 
- **css-smart-merge.ts:** Recognize `/* theme-extended: name */` markers as protected zones

### Smart Merge Integration

Extended colors use marker comments. Smart merge already preserves the theme zone. Extended color blocks get their own markers:

```css
:root {
  /* Generated by theme command ... */
  --background: oklch(0.98 0.00 0);
  --primary: oklch(0.55 0.22 270);
  /* ... 50+ generated vars ... */

  /* theme-extended: grape */
  --grape: oklch(0.55 0.20 300);
  --grape-foreground: oklch(0.98 0.01 300);
  /* /theme-extended: grape */

  /* theme-extended: orange */
  --orange: oklch(0.65 0.20 55);
  --orange-foreground: oklch(0.15 0.01 55);
  /* /theme-extended: orange */
}
```

If Ralph tries `cat > src/index.css`, smart merge preserves extended blocks alongside the theme zone.

If `theme generate` or `theme preset` runs again, extended colors survive (different marker namespace).

---

## LAYER 4: THE GATE (`no-hardcoded-colors`)

### What It Does

Scans `.tsx` and `.ts` files in `src/` for:
1. Tailwind color-shade utilities: `text-red-500`, `bg-lime-400`, `border-cyan-300`
2. Raw color functions: `oklch()`, `hsl()`, `rgb()`, `rgba()`, `#hex` in component files

### Gate Definition

Add to `QUALITY_GATES` array in `gates.ts`, after `css-theme-complete`:

```typescript
{
  name: 'no-hardcoded-colors',
  description: 'Source files must use theme tokens, not hardcoded colors',
  check: async (fs, cwd) => {
    const violations: string[] = []
    
    // Tailwind color-shade pattern: text-red-500, bg-blue-200, etc.
    // Matches: {prefix}-{colorName}-{shade}
    // Shade is 2-3 digits (50, 100, 200, ..., 950)
    const TW_COLOR_RE = /\b(?:text|bg|border|ring|shadow|from|to|via|divide|outline|decoration|placeholder|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g
    
    // Raw color functions in component code (not CSS files)
    const RAW_COLOR_RE = /(?:oklch|hsl|hsla|rgb|rgba)\s*\([^)]+\)/g
    
    // Hex color literals (#fff, #ff0000, #1a2b3c4d)
    const HEX_RE = /(?:['"`]|:\s*)#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
    
    const scanDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir)
        for (const entry of entries) {
          const fullPath = `${dir}/${entry}`
          const stat = await fs.stat(fullPath)
          if (stat.isDirectory()) {
            await scanDir(fullPath)
          } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
            const content = await fs.readFile(fullPath, { encoding: 'utf8' }) as string
            const fileName = fullPath.replace(`${cwd}/src/`, '')
            
            const twMatches = [...new Set(content.match(TW_COLOR_RE) || [])]
            if (twMatches.length > 0) {
              violations.push(`${fileName}: Tailwind colors — ${twMatches.slice(0, 4).join(', ')}${twMatches.length > 4 ? ` (+${twMatches.length - 4})` : ''}`)
            }
            
            const rawMatches = [...new Set(content.match(RAW_COLOR_RE) || [])]
            if (rawMatches.length > 0) {
              violations.push(`${fileName}: Raw color values — ${rawMatches.slice(0, 3).join(', ')}${rawMatches.length > 3 ? ` (+${rawMatches.length - 3})` : ''}`)
            }
            
            const hexMatches = [...new Set(content.match(HEX_RE) || [])]
            if (hexMatches.length > 0) {
              violations.push(`${fileName}: Hex colors — ${hexMatches.slice(0, 3).join(', ')}${hexMatches.length > 3 ? ` (+${hexMatches.length - 3})` : ''}`)
            }
          }
        }
      } catch { /* dir doesn't exist */ }
    }
    
    await scanDir(`${cwd}/src`)
    
    if (violations.length > 0) {
      return {
        pass: false,
        feedback: [
          'Hardcoded colors detected:',
          ...violations,
          '',
          'Fix: Use semantic tokens (text-primary, bg-accent, border-muted)',
          'For content-specific colors: theme extend --name <n> --hue <deg>',
          'For data categories: chart-1 through chart-5',
          'These are the ONLY colors that exist in your build.',
        ].join('\n'),
      }
    }
    return { pass: true }
  },
}
```

### What It Catches vs. Allows

| Pattern | Caught? | Why |
|---------|---------|-----|
| `text-lime-400` | ✅ | Tailwind color-shade |
| `bg-cyan-500/20` | ✅ | Tailwind color-shade (pattern matches before /20) |
| `border-red-500` | ✅ | Tailwind color-shade |
| `hsl(145 100% 50% / 0.4)` | ✅ | Raw color function |
| `oklch(0.85 0.22 145)` | ✅ | Raw color function |
| `#ff0000` | ✅ | Hex literal |
| `text-primary` | ❌ | Semantic token ✓ |
| `bg-accent/20` | ❌ | Semantic token ✓ |
| `bg-grape` | ❌ | Extended color ✓ |
| `text-chart-1` | ❌ | Chart token ✓ |
| `text-white` | ❌ | Not in the color-shade pattern |
| `text-black` | ❌ | Not in the color-shade pattern |
| `bg-transparent` | ❌ | Not in the color-shade pattern |

### Why This Gate Matters Even With The Wall

The wall (`@theme inline`) makes bad colors produce zero CSS. But:
- Ralph might not notice the visual regression
- The code is still "dirty" — future theme changes won't help
- Source scan is explicit feedback: "you used text-lime-400, use text-primary instead"

The gate turns a silent visual failure into an **actionable error message**.

---

## HOW THE FOUR LAYERS WORK TOGETHER

### Scenario: Energy Drink Landing Page (the bug that started this)

**Without defense system:**
1. Ralph generates theme ✓
2. Ralph overwrites theme with hand-authored CSS ✗ (smart merge partially blocks)
3. Ralph uses text-lime-400, bg-cyan-500/20 ✗ (compiles fine, renders clashing colors)
4. Gates pass ✗ (no color check)
5. Result: Broken, ugly output

**With all four layers:**
1. Ralph generates theme ✓
2. Ralph tries `cat > src/index.css` → smart merge blocks theme zone ✓
3. Ralph writes `text-lime-400` → **Wall**: zero CSS generated, text invisible ✓
4. Ralph runs `preview` → sees broken text → reads feedback ✓
5. Ralph tries `theme extend --name original --hue 145` → gets `bg-original`, `text-original` ✓
6. Ralph rewrites with `text-original` → **Wall**: CSS generated, renders correctly ✓
7. Ralph marks complete → **Gate**: no violations found ✓
8. Result: Harmonious, distinctive, accessible output

### Scenario: What if Ralph ignores preview and marks complete anyway?

1. `text-lime-400` in source
2. **Gate** catches: "Hardcoded colors: FlavorCard.tsx: Tailwind colors — text-lime-400"
3. Feedback written to `.ralph/feedback.md`
4. Next iteration: Ralph reads feedback, fixes with `theme extend` or semantic tokens
5. Gate passes on retry

### Scenario: What if Ralph uses arbitrary values to bypass?

1. Ralph writes `text-[oklch(0.85_0.22_145)]` to avoid both Tailwind colors AND theme tokens
2. **Wall**: arbitrary values DO compile (they inline the value). This bypasses `@theme inline`.
3. **Gate**: catches `oklch()` in source file → feedback
4. **Immutables**: rule 4 says "no raw color values in .tsx files"
5. Two out of four layers catch it. Ralph fixes.

### Scenario: What about `currentColor` and `inherit`?

These are CSS keywords, not color values. They work fine and are semantically correct (they inherit from the parent's color). No layer blocks them.

---

## IMPLEMENTATION PLAN

### CC Prompt A: The Wall + Immutables (~15 min)

**Edit `tailwind-compiler.ts`:**
- Change `@theme {` to `@theme inline {`
- Add `--color-white`, `--color-black`, `--color-transparent`, `--color-current`
- Add `parseExtendedColors()` function
- Modify `compileTailwind()` to accept optional `indexCss` parameter
- Dynamically append extended color registrations to theme block

**Edit `build/index.ts`:**
- Read `src/index.css` before calling `compileTailwind()`
- Pass it as the `indexCss` parameter

**Edit `loop.ts`:**
- Insert IMMUTABLE LAWS section into `BASE_SYSTEM_PROMPT`
- Update SHELL_TOOL description with `theme extend` reference
- Update Theming section mention

**Edit `gates.ts`:**
- Add `no-hardcoded-colors` gate after `css-theme-complete`

### CC Prompt B: Theme Extend Command (~30 min)

**Edit `theme.ts`:**
- Add `handleExtend()` method to ThemeCommand class
- Reads tokens.json for theme personality
- Generates OKLCH colors at requested hue with theme-matched chroma/lightness
- Writes to src/index.css with `/* theme-extended: <name> */` markers
- Updates tokens.json `extended` section
- Supports `--list` and `--remove` flags

**Edit `css-smart-merge.ts`:**
- Recognize `/* theme-extended: name */` ... `/* /theme-extended: name */` as protected zones
- Preserve extended blocks during merge operations

**Edit theming SKILL.md:**
- Add Semantic Color Mapping table
- Add Content-Specific Colors section documenting `theme extend`
- Add "When You Need More Than 5 Categories" guidance

### CC Prompt C: Stack Audit (~10 min)

**Verify @wiggum/stack compatibility:**
- Grep for any hardcoded Tailwind colors in stack components
- Migrate any found to semantic tokens
- Ensure all 60+ components work with `@theme inline`

---

## TESTING PLAN

### Unit Tests

**tailwind-compiler.test.ts:**
- `@theme inline` generates utilities for defined tokens only
- `bg-red-500` produces no CSS
- `bg-primary` produces CSS
- Extended color markers → dynamic registration → `bg-grape` produces CSS

**gates.test.ts:**
- `no-hardcoded-colors` catches `text-lime-400` in .tsx
- `no-hardcoded-colors` passes `text-primary` in .tsx
- `no-hardcoded-colors` catches `oklch()` in .tsx
- `no-hardcoded-colors` passes `bg-grape` (extended)

**theme.test.ts (extend):**
- `theme extend --name grape --hue 300` generates valid OKLCH
- Extended color contrast ≥ 4.5:1
- Chroma matches active theme personality
- Markers written to index.css
- tokens.json updated with extended section
- `theme extend --remove grape` removes markers
- `theme extend --list` shows extended colors

### Integration Test: Energy Drink Redo

```
1. theme preset cyberpunk --apply
2. theme extend --name original --hue 145
3. theme extend --name arctic --hue 200
4. theme extend --name inferno --hue 25
5. theme extend --name voidberry --hue 300
6. Build project with extended colors
7. Verify: bg-original, text-arctic, etc. all generate CSS
8. Verify: bg-red-500 generates NO CSS
9. Gate: no violations
10. Preview: all colors visible, harmonious, accessible
```

---

## MIGRATION NOTES

### Breaking Change Risk: LOW

The only behavioral change is `@theme` → `@theme inline`. This affects Ralph's projects, not the IDE itself (the IDE uses Vite's own Tailwind compilation via `@tailwindcss/vite`).

For existing user projects:
- If they used semantic tokens → works perfectly (no change)
- If they used hardcoded Tailwind colors → those classes now produce nothing → visual regression
- This is **intentional** — we WANT those to break so Ralph fixes them

### Backward Compatibility

No existing user data is lost. The CSS custom properties are unchanged. Only the Tailwind utility generation changes. Users who manually edit their projects (not through Ralph) and use `text-red-500` would be affected — but that's not the target use case.

### Rollback

If `@theme inline` causes unexpected issues: change one word back to `@theme`. Zero data loss. Instant rollback.
