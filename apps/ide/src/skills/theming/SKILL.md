---
name: theming
description: OKLCH theme generator with sacred geometry, validated fonts, and design tokens
---

## Theme Generator

You have a `theme` command. Use it. Never freestyle CSS color values.

**Quick start — always use `--apply`:**
```bash
# Pick a curated preset and apply directly (12 available)
theme preset retro-arcade --apply

# Generate from sacred geometry and apply
theme generate --seed 210 --pattern goldenRatio --mood organic --apply

# Full control
theme generate --seed 150 --pattern triadic --mood playful --chroma high --font "Space Grotesk" --shadow-profile moderate --radius rounded --apply

# Tweak an existing theme
theme modify --shift-hue 30 --scope brand --apply

# Browse options
theme list presets
theme list patterns
theme list fonts
theme list shadows
theme list radii
```

`--apply` writes directly to `src/index.css` with complete `:root` + `.dark` blocks. **Always use `--apply`** — never copy theme output manually.

After applying a theme, use `cat >> src/index.css` (not `cat >`) to append custom CSS like keyframes or utility classes.

---

## Preset Picker

12 curated presets. Pick based on project feel:

| Preset | Vibe | Best For |
|--------|------|----------|
| `northern-lights` | Ethereal, aurora greens/teals | Nature, wellness, creative |
| `cyberpunk` | Neon magenta + cyan on dark | Gaming, dev tools, dark-first |
| `doom-64` | Aggressive red/orange, high contrast | Gaming, bold statements |
| `retro-arcade` | Warm pixel-art nostalgia | Retro, indie, playful |
| `soft-pop` | Pastel, friendly, approachable | Kids, lifestyle, social |
| `tangerine` | Warm citrus orange, energetic | Food, hospitality, startups |
| `mono` | Pure grayscale, zero chroma | Minimalist, editorial, dev tools |
| `elegant-luxury` | Deep navy + gold accents | Fashion, luxury, premium |
| `bubblegum` | Bright pink, playful | Youth, creative, social |
| `mocha-mousse` | Warm brown, cozy | Coffee, artisan, organic |
| `caffeine` | Rich espresso tones | Productivity, focused, warm |
| `catppuccin` | Soft pastels on warm dark | Dev tools, cozy dark mode |

**Usage:** `theme preset <name> --apply` writes directly to src/index.css.

**NEVER default to violet/purple.** If none of these fit, generate a custom theme.

---

## Custom Themes

### Sacred Geometry Patterns

11 mathematical patterns for hue generation:

| Pattern | Hues | Character |
|---------|------|-----------|
| `monochromatic` | 1 | Single hue, varying lightness |
| `analogous` | 3 | Adjacent hues, harmonious |
| `complementary` | 2 | Opposite hues, high contrast |
| `splitComplementary` | 3 | Base + two near-opposites |
| `triadic` | 3 | Evenly spaced thirds |
| `tetradic` | 4 | Two complementary pairs |
| `goldenRatio` | 5 | Phi-based spacing (137.508 degrees) |
| `flowerOfLife` | 6 | Six petals at 60-degree intervals |
| `fibonacci` | 5 | Fibonacci angular sequence |
| `vesicaPiscis` | 3 | Sacred 52.3-degree overlap |
| `seedOfLife` | 7 | Seven circles at 360/7 intervals |

**Seed** is the base hue (0-360). Pattern generates additional hues from it.

### Pattern Aliases

Semantic shortcuts that resolve to a pattern + auto-chroma hint:

| Alias | Pattern | Auto-Chroma | Use When |
|-------|---------|-------------|----------|
| `elegant` | analogous | low | Refined, harmonious palettes |
| `bold` | complementary | high | High-contrast, energetic |
| `minimal` | monochromatic | low | Single-hue, content-first |
| `vibrant` | triadic | high | Vivid, saturated, playful |
| `natural` | goldenRatio | medium | Balanced, organic feel |

Auto-chroma is applied unless you explicitly pass `--chroma`. Example: `--pattern vibrant` gives triadic + high chroma. `--pattern vibrant --chroma low` overrides to low.

### Font Registry (32 validated fonts)

Only use fonts from this registry. All have Google Fonts CDN availability.

| Category | Fonts | Vibe |
|----------|-------|------|
| Geometric Sans | Inter, Outfit, Nunito, Quicksand, Comfortaa | Clean, modern, friendly |
| Humanist Sans | Open Sans, Lato, Source Sans 3, Noto Sans, Cabin | Readable, warm, professional |
| Neo-Grotesque | Roboto, Work Sans, DM Sans, Plus Jakarta Sans, Albert Sans | Neutral, tech, polished |
| Transitional Serif | Merriweather, Lora, Libre Baskerville, Playfair Display | Editorial, elegant, literary |
| Slab Serif | Roboto Slab, Zilla Slab, Bitter | Bold, grounded, industrial |
| Display | Poppins, Raleway, Josefin Sans, Space Grotesk | Personality, headlines, branding |
| Monospace | JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono | Dev tools, code, technical |

**Usage:** `--font "Space Grotesk"` — the generator builds the full font stack with fallbacks.

### Shadow Profiles

| Profile | Character |
|---------|-----------|
| `none` | Zero shadows — flat design |
| `subtle` | Barely visible, adds depth without drama |
| `moderate` | Clear layering, balanced |
| `dramatic` | Strong depth, floating elements |
| `harsh` | Hard-edge shadows, brutalist |

**Usage:** `--shadow-profile moderate`

### Radius Stops

| Stop | Value | Character |
|------|-------|-----------|
| `none` | 0rem | Sharp corners, brutalist |
| `subtle` | 0.25rem | Slight softening |
| `moderate` | 0.5rem | Balanced (default) |
| `rounded` | 0.75rem | Friendly, approachable |
| `pill` | 1rem | Maximum roundness |

**Usage:** `--radius rounded`

---

## Mood / Personality Briefs

The `--mood` flag generates a design personality brief (`.ralph/design-brief.md`) alongside the theme. The brief defines typography hierarchy, animation timing, spacing rhythm, and strict rules.

| Mood | Chroma | Character |
|------|--------|-----------|
| `minimal` | low | Content-first. Subtle easing, generous whitespace, no decoration. |
| `premium` | medium | Polished luxury. Light weights at large sizes, spring animations, rich layering. |
| `playful` | high | Bouncy and bright. Rounded shapes, animated micro-interactions, surprise. |
| `industrial` | low | Raw structure. Mono fonts, no rounded corners, linear easing, sharp contrast. |
| `organic` | medium | Flowing and warm. Rounded everything, slow easing, natural spacing. |
| `editorial` | low | Typography-led. Serif body, tight tracking, print-inspired, minimal color. |
| `fashion-editorial` | low | Runway on screen. Extreme scale, light weights, dramatic restraint. |
| `brutalist` | low | Raw structure. Monospace, zero shadows, zero radius, instant transitions. |
| `zen` | low | Emptiness is form. Maximum whitespace, slow transitions, earth tones. |
| `corporate` | medium | Clarity serves confidence. Systematic, professional, blue-gray palettes. |
| `retro` | high | Warmth with intention. Nostalgic but refined, amber/ochre, tactile shadows. |
| `luxury` | low | Whisper, don't shout. Thin weights, wide tracking, opulent spacing. |

**Usage:**
```bash
theme generate --seed 210 --pattern goldenRatio --mood premium --apply
theme preset elegant-luxury --mood premium --apply
theme list moods
```

**Presets auto-infer mood** from the preset name (e.g., cyberpunk → industrial, bubblegum → playful). **`generate --apply` requires `--mood`** — you must choose a design direction.

---

## Chroma — The Saturation Dial

Chroma controls how vivid or muted colors are, independent of hue/pattern:

| Level | Multiplier | Effect |
|-------|-----------|--------|
| `low` | 0.4x | Muted, desaturated — whisper palette |
| `medium` | 1.0x | Default — unchanged output |
| `high` | 1.6x | Vivid, saturated — punchy palette |

You can also pass a numeric value (0.0-2.0) for fine control.

**Usage:**
```bash
theme generate --seed 150 --pattern triadic --chroma high --mood playful --apply
theme preset cyberpunk --chroma low --apply
```

**Chroma cascade priority:** explicit `--chroma` > alias auto-chroma > mood's chromaHint > default (1.0x).

### OKLCH Color Model

Theme colors use OKLCH: `oklch(L C H)` where:
- **L** (Lightness): 0 = black, 1 = white
- **C** (Chroma): 0 = gray, higher = more saturated. The `--chroma` flag scales this channel.
- **H** (Hue): 0-360 degrees. The `--pattern` flag controls hue harmony.

Pattern controls WHICH colors. Chroma controls HOW VIVID they are. Independent knobs.

---

## Custom Personalities — Remix the Presets

12 personality templates are available in `.skills/personalities/`. Use them as starting points:

```bash
# Browse available personalities
ls .skills/personalities/

# Read one
cat .skills/personalities/industrial.json

# Copy, remix, and use
cp .skills/personalities/industrial.json .ralph/my-personality.json
replace .ralph/my-personality.json "Raw structure." "Futuristic minimalism."
theme generate --seed 200 --pattern triadic --personality .ralph/my-personality.json --apply
```

When `--personality` is provided, it replaces `--mood` for the design brief. You can remix any field: philosophy, typography, animation timing, spacing rhythm, allowed/notAllowed rules, and checklist.

---

## Modify Existing Themes

`theme modify` reads your current `src/index.css` and shifts colors:

```bash
# Shift all brand colors by 30 degrees and apply
theme modify --shift-hue 30 --scope brand --apply

# Shift only surface colors
theme modify --shift-hue -15 --scope surface --apply

# Shift everything
theme modify --shift-hue 45 --scope all --apply
```

**Scopes:**
- `brand` — primary, secondary, accent, ring, chart colors
- `surface` — background, card, popover, muted, border, input, sidebar
- `all` — everything

After shifting, contrast is re-enforced automatically. WCAG AA 4.5:1 minimum guaranteed.

---

## Required Variables

All themes must define these. The `theme` command handles this automatically.

| Variable | What It Affects |
|----------|-----------------|
| `--background` | Page background |
| `--foreground` | Main text color |
| `--primary` | Buttons, links, accents |
| `--primary-foreground` | Text on primary |
| `--secondary` | Secondary buttons |
| `--secondary-foreground` | Text on secondary |
| `--muted` | Subtle backgrounds |
| `--muted-foreground` | Subtle text |
| `--accent` | Hover states |
| `--accent-foreground` | Text on accent |
| `--destructive` | Delete, error actions |
| `--destructive-foreground` | Text on destructive |
| `--card` | Card backgrounds |
| `--card-foreground` | Card text |
| `--popover` | Dropdown backgrounds |
| `--popover-foreground` | Dropdown text |
| `--border` | All borders |
| `--input` | Input borders |
| `--ring` | Focus rings |
| `--radius` | Border radius |
| `--sidebar-*` | 8 sidebar variants (background, foreground, primary, etc.) |
| `--success` | Success states, confirmations |
| `--success-foreground` | Text on success |
| `--warning` | Warnings, attention states |
| `--warning-foreground` | Text on warning |
| `--chart-1` through `--chart-5` | Data visualization colors |

**Values are OKLCH:** `oklch(0.6487 0.1538 150.31)` — the theme generator produces these.

**Tailwind v4 is active.** Opacity modifiers like `bg-primary/30` work natively with OKLCH. No `color-mix()` workaround needed for opacity.

**Color coverage:** For expressive presets, use `bg-primary` or `bg-accent` on at least one major section (hero, CTA, footer). Don't leave every section on `bg-background` — the theme has colors, use them.

---

## Semantic Color Mapping

Every color need maps to a semantic token:

| Need | Class | Variable |
|------|-------|----------|
| Primary action, CTA | `bg-primary text-primary-foreground` | `var(--primary)` |
| Secondary action | `bg-secondary text-secondary-foreground` | `var(--secondary)` |
| Accent, hover | `bg-accent text-accent-foreground` | `var(--accent)` |
| Delete, error | `bg-destructive text-destructive-foreground` | `var(--destructive)` |
| Success, confirm | `bg-success text-success-foreground` | `var(--success)` |
| Warning, caution | `bg-warning text-warning-foreground` | `var(--warning)` |
| Subtle background | `bg-muted text-muted-foreground` | `var(--muted)` |
| Data chart | `bg-chart-1`, `text-chart-2`, etc. | `var(--chart-1)` |
| Neutral overlay | `bg-black/80`, `text-white` | — |

**If you need a color that isn't in this table**, use `theme extend`:

```bash
# Add a content-specific color at a specific hue
theme extend --name grape --hue 300
theme extend --name ocean --hue 200

# Then use it like any other token
# bg-grape text-grape-foreground border-grape

# List/remove extended colors
theme extend --list
theme extend --remove grape
```

Extended colors are auto-registered with `@theme inline` at build time. They regenerate automatically when you switch themes, maintaining harmony with the new palette.

---

## Design Philosophy

### Dynamic by Default
Landing pages should have motion, personality, and visual interest. Static pages feel dated.
Only reduce animations when user explicitly requests "minimal", "clean", or "simple".

### Theme Independence
Create themes appropriate to project content and mood, not the IDE.
A crypto landing page should feel different from a bakery website.

### Purposeful Motion
Animations should:
- Guide attention to important elements
- Provide feedback on interactions
- Create a sense of polish and care
- Never distract or annoy

### Match Project Type

| Project Type | Direction |
|-------------|-----------|
| SaaS/Product | Clean with bold CTAs, professional but not boring |
| Creative/Portfolio | Expressive, unique layouts, memorable |
| Developer tools | Dark mode friendly, code-inspired, polished |
| E-commerce | Clear hierarchy, product-focused |
| Personal/Blog | Warm, readable, personality-forward |

## Creative CSS (Use By Default)

### Entrance Animations
Add to sections and cards:
```css
.fade-in {
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Staggered Delays
For lists and grids, delay each item:
```css
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: 0.1s; }
.stagger > *:nth-child(3) { animation-delay: 0.2s; }
/* Continue pattern */
```

### Micro-interactions
```css
/* Hover lift */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

/* Button press */
.press:active {
  transform: scale(0.98);
}

/* Glow effect for CTAs */
.glow:hover {
  box-shadow: 0 0 20px color-mix(in oklch, var(--primary), transparent 60%);
}
```

### Background Effects
```css
/* Gradient background */
.gradient-bg {
  background: linear-gradient(135deg, var(--primary), var(--accent));
}

/* Glassmorphism */
.glass {
  background: color-mix(in oklch, var(--background), transparent 20%);
  backdrop-filter: blur(10px);
  border: 1px solid color-mix(in oklch, var(--border), transparent 50%);
}
```

### Opacity with color-mix()
Since variables contain full color values (oklch or hsl), use `color-mix` for opacity:
```css
/* 40% opacity of primary */
color-mix(in oklch, var(--primary), transparent 60%)

/* 70% opacity of background */
color-mix(in oklch, var(--background), transparent 30%)

/* 50% opacity of border */
color-mix(in oklch, var(--border), transparent 50%)
```

### Timing Guidelines
- Micro-interactions: 150-200ms
- Hover states: 200-300ms
- Entrance animations: 400-600ms
- Stagger delays: 50-100ms between items
- Easing: `ease-out` for entrances, `ease-in-out` for hovers

## Keyframes Library

Include these in src/index.css as needed:

```css
/* Entrances */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* Decorative */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* Backgrounds */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 5px color-mix(in oklch, var(--primary), transparent 50%); }
  50% { box-shadow: 0 0 20px color-mix(in oklch, var(--primary), transparent 20%); }
}
```

## Accessibility

**Always include this in src/index.css:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This respects users who have motion sensitivity while keeping your design intact for others.

## Respecting User Preferences

### Default (no specific request)
Go rich: animations, expressive colors, dynamic backgrounds, micro-interactions.
Make it memorable.

### When user says "minimal", "clean", or "simple"
- Reduce to subtle fades only (no bounces, floats, or complex animations)
- Monochromatic or limited palette
- More whitespace
- Fewer decorative elements

### When user says "professional" or "corporate"
- Subdued animations (fades only, shorter durations)
- Conservative color palette (blues, grays)
- Structured grid layouts
- No playful elements

**Always honor explicit requests.** If user says "no animations", remove them entirely.

## Overlays & Z-Index (CRITICAL)

Stack components handle this automatically. If you must go custom:

```css
/* Backdrop */
.overlay-backdrop {
  @apply fixed inset-0 bg-black/50 z-40;
}

/* Content */
.overlay-content {
  @apply fixed z-50;
  /* center it */
  @apply top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2;
}
```

Z-index scale:
- `z-10`: Sticky headers
- `z-20`: Dropdowns, tooltips
- `z-30`: Fixed sidebars
- `z-40`: Modal backdrops
- `z-50`: Modal content
- `z-[100]`: Dev tools only

**Never** manually layer multiple modals. Use one at a time.

## Native Form Element Fix (CRITICAL)

Radix Select, native `<select>`, and other form elements ignore CSS variables in dark mode. Always include:

```css
/* In src/index.css, after :root variables */
select,
input,
textarea {
  background-color: var(--background);
  color: var(--foreground);
  border-color: var(--border);
}

select option {
  background-color: var(--popover);
  color: var(--popover-foreground);
}

/* For autofill */
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px var(--background) inset;
  -webkit-text-fill-color: var(--foreground);
}
```

**Test before marking complete**: Switch to dark mode and verify ALL inputs are readable.

---

## Anti-Slop Rules

- **NEVER** freestyle CSS color values. Always use `theme preset` or `theme generate`.
- **NEVER** default to violet/purple as primary unless explicitly requested for gaming/immersive.
- **NEVER** use the same palette for consecutive projects.
- **ALWAYS** define both `:root` AND `.dark` — no exceptions.
- **ALWAYS** use `theme modify` to adjust existing themes, not manual edits.
- **ALWAYS** test destructive buttons are visible on both light and dark backgrounds.
- **Contrast is non-negotiable.** The generator enforces WCAG AA 4.5:1. Don't override.

---

## Customization Workflow

To customize a preset:
1. `theme preset <name> --apply` — start with a complete, valid theme
2. `theme modify --shift-hue <deg> --scope brand --apply` — shift colors if needed
3. `replace src/index.css "old-value" "new-value"` — tweak individual vars

NEVER heredoc-overwrite a complete preset. NEVER write theme CSS vars by hand.
The preset gives you 32+ correct, contrast-checked vars. Modify from there.
