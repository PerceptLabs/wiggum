# A1.5 — Durable Theme Application

**Phase:** A1.5 (patch between A1 and A2)
**Goal:** Make theme application mechanically reliable so broken/flat themes can't ship.

---

## Problem Statement

A1 built a working theme generator. In testing, Ralph used it correctly — ran `theme list presets`, picked `retro-arcade`, called `theme preset retro-arcade`. The generator produced correct OKLCH values. But the **output was plain black-and-white** with gray borders and no visible color personality.

Three failures stacked:

1. **Transcription corruption.** Ralph had to manually copy 50+ CSS variables from the command output into a `cat > src/index.css` heredoc. It dropped `--chart-*` vars, renamed `--sidebar-background` to `--sidebar`, and overwrote the preset's curated fonts with generic ones.

2. **Invisible surface colors.** The preset's background, card, muted, and border colors all had OKLCH chroma below 0.03 — perceptually achromatic. The pink (C=0.203) and teal (C=0.102) existed only in `--primary` and `--secondary`, which appear on small elements like buttons. 90% of page surface area was clinical white/gray.

3. **Tailwind v3 + OKLCH opacity incompatibility.** When Ralph was asked for a "bolder" revision, it wrote `bg-primary/30`, `border-secondary/40`, `shadow-accent/25` — all opacity modifiers. Tailwind v3 generates `rgb(var(--primary) / 0.3)`, but `--primary` contains `oklch(0.5924 0.2025 355.8943)` (a complete color value, not bare channels). The browser sees `rgb(oklch(...) / 0.3)` — **invalid CSS, silently dropped**. Every opacity modifier was invisible. This is the root cause of the "bold revision looked worse" problem.

---

## Solution: 6 Commits

### Commit 0: Swap CDN to Tailwind v4 via esm.sh

**Files:** `apps/ide/src/lib/ralph/state.ts` (scaffold section)

**What:** Replace the Tailwind v3 CDN script tag and inline JS config with Tailwind v4's `@tailwindcss/browser` package loaded from esm.sh, plus a `<style type="text/tailwindcss">` block containing `@theme` mappings.

**Current (broken):**
```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          background: 'var(--background)',
          primary: 'var(--primary)',
          // ... all mapped via var()
        }
      }
    }
  }
</script>
```

**After:**
```html
<script src="https://esm.sh/@tailwindcss/browser@4"></script>
<style type="text/tailwindcss">
  @theme {
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
    --radius-sm: calc(var(--radius) - 4px);
    --radius-md: calc(var(--radius) - 2px);
    --radius-lg: var(--radius);
    --radius-xl: calc(var(--radius) + 4px);
  }
</style>
```

**Why esm.sh instead of unpkg/CDN:**
- When Layer 2 of the powerup plan ships (Workbox `CacheFirst` for `esm.sh/*`), Tailwind gets cached automatically — offline Tailwind for free, no C4 oxide-wasm needed.
- Consistent with all other npm dependency resolution in Wiggum (everything goes through esm.sh).
- Positions cleanly for C4: when build-time compilation arrives, the CDN script tag simply gets removed. No URL migration needed — esm.sh is already the source.

**Why this fixes the root cause:**
Tailwind v4 handles complete OKLCH color values natively. `bg-primary/30` with `--primary: oklch(0.59 0.20 355)` generates valid `oklch(0.59 0.20 355 / 0.3)` — not the broken `rgb(oklch(...) / 0.3)` that v3 produced. Every opacity modifier Ralph writes starts working immediately.

**Also update:** The `usePreview.ts` fallback HTML template if it has a separate Tailwind script reference — check and align with the same esm.sh URL and `@theme` block.

### Commit 1: `--apply` flag on theme command

**Files:** `apps/ide/src/lib/shell/commands/theme.ts`

**What:** Add `--apply` flag to `theme preset` and `theme generate` subcommands. When present, the command writes the complete theme directly to `src/index.css` instead of printing to stdout.

**Behavior:**
- `theme preset retro-arcade --apply` → writes complete `src/index.css` with all vars, `:root {}`, `.dark {}`, body base styles
- `theme preset retro-arcade` (no flag) → prints to stdout as before (for inspection)
- The written file includes a marker comment: `/* Generated by theme command — do not overwrite, use cat >> to append */`
- Uses `validateFileWrite()` before writing (respects write guards)
- Returns structured output confirming what was written: variable count, preset name, file path

**Append convention:** The skill (Commit 5) will teach Ralph to use `cat >> src/index.css` for adding custom CSS after the theme block. The marker comment reinforces this. The `--apply` flag writes the theme foundation; Ralph appends custom styles below it.

### Commit 2: `css-theme-complete` quality gate

**Files:** `apps/ide/src/lib/ralph/gates.ts`

**What:** Add a new gate that validates theme completeness in `src/index.css`.

**Required CSS variables (27 total):**

Base (14): `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`

Utility (4): `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`

Sidebar (8): `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`

Chart (5): `--chart-1`, `--chart-2`, `--chart-3`, `--chart-4`, `--chart-5`

**Gate logic:**
1. Read `src/index.css`
2. Parse for CSS custom property declarations (regex: `/--[\w-]+\s*:/`)
3. Check all 27+ required vars are present in `:root {}` block
4. Check `.dark {}` block also exists with the same vars
5. If marker comment (`/* Generated by theme command */`) is missing but vars exist, suggest: `"Theme appears hand-written. Run 'theme preset <name> --apply' to ensure completeness."`
6. On failure, list specifically which variables are missing: `"Missing: --chart-1, --chart-2, --sidebar-background"`

**Positioning:** Add after the existing `css-has-variables` gate. Consider replacing `css-has-variables` since this is a strict superset of that check.

**Also update:** The `CSS_VARIABLES_BASELINE` constant (line 35 in gates.ts) still references HSL triplets — update to reflect that vars now contain complete OKLCH color values.

### Commit 3: Fix sidebar var naming in preset JSONs

**Files:** All 12 files in `apps/ide/src/lib/theme-generator/themes/*.json`

**What:** In every JSON file, rename these keys in BOTH `light` and `dark` sections:

| Old key | New key |
|---------|---------|
| `"sidebar"` | `"sidebar-background"` |

This is a find-and-replace across 12 files. The Tailwind config expects `var(--sidebar-background)`, and `formatThemeOutput()` in `generator.ts` writes `--sidebar-background` for generated themes. Only the hand-authored preset JSONs use the short form.

**Verification:**
- `grep '"sidebar":' themes/*.json` → 0 results
- `grep '"sidebar-background":' themes/*.json` → 24 results (12 files × light + dark)
- Also check `generator.ts` — confirm it already writes `sidebar-background` for generated themes. If it writes `sidebar`, fix it there too.

### Commit 4: Preset surface color tuning

**Files:** 8 of 12 JSON files (skip mono, elegant-luxury, caffeine, mocha-mousse — these are intentionally neutral/warm)

**The problem:**

Current surface colors (retro-arcade example):

| Variable | L | C | Perception |
|----------|---|---|-----------|
| `--background` | 0.97 | 0.026 | White |
| `--card` | 0.93 | 0.026 | Slightly off-white |
| `--muted` | 0.70 | 0.016 | Plain gray |
| `--border` | 0.65 | 0.020 | Gray |

Chroma below 0.03 is perceptually achromatic. These surfaces have zero personality.

**Target ranges for personality presets:**

| Variable | Lightness | Chroma (light) | Notes |
|----------|-----------|----------------|-------|
| `--background` | 0.95-0.97 | 0.04-0.08 | Visible tint, still light |
| `--card` | 0.93-0.96 | 0.03-0.06 | Distinct from background |
| `--muted` | 0.88-0.92 | 0.03-0.05 | Visible tinted gray |
| `--muted-foreground` | 0.40-0.50 | 0.03-0.05 | Tinted, not plain gray |
| `--border` | 0.80-0.85 | 0.03-0.05 | Tinted border, not gray |
| `--input` | 0.80-0.85 | 0.03-0.05 | Match border |

The hue should match the preset's dominant color family. For retro-arcade (pink/teal), surfaces should have a warm hue (around 60-90, the warm cream range), not the cold 196-219 hue currently there.

**Presets to tune (8):**
- retro-arcade — warm cream surfaces (H ~60-80)
- cyberpunk — cool dark-tinted surfaces (H ~280-300)
- bubblegum — soft pink-tinted surfaces (H ~340-360)
- doom-64 — dark warm surfaces (H ~20-40)
- aurora-borealis — cool green-tinted surfaces (H ~160-180)
- sunset-boulevard — warm golden surfaces (H ~50-70)
- ocean-depths — blue-tinted surfaces (H ~230-250)
- neon-tokyo — cool purple-tinted surfaces (H ~290-310)

**Skip (4):** mono (intentionally achromatic), elegant-luxury (intentionally neutral), caffeine (warm enough already), mocha-mousse (warm enough already). Verify these four actually have adequate chroma before skipping.

**Also update:** `generator.ts` base ranges — the generator's `deriveRole()` function should produce surface chroma in the 0.04-0.08 range for personality presets, not the current near-zero values. This ensures `theme generate` produces colorful surfaces too, not just `theme preset`.

### Commit 5: Skill + loop.ts update

**Files:**
- `apps/ide/src/skills/theming/SKILL.md`
- `apps/ide/src/lib/ralph/loop.ts` (SHELL_TOOL description only)

**Skill changes:**
- `--apply` becomes the ONLY documented path for theme application. Remove any guidance about manually copying theme output.
- Add append convention: "After applying a theme, use `cat >> src/index.css` (not `cat >`) to add custom CSS. Never overwrite the theme block."
- Add v4 `@theme` context: Ralph should know that Tailwind v4 is in use, opacity modifiers (`bg-primary/30`) work natively, and `color-mix()` is available for custom CSS opacity.
- Add color coverage guidance: "For expressive presets (retro-arcade, cyberpunk, bubblegum), use `bg-primary` or `bg-accent` on at least one major section (hero, feature cards, sidebar), not just buttons. Surface tinting comes from the preset — trust it."
- Update any remaining HSL references to OKLCH.

**loop.ts changes:**
- In the SHELL_TOOL description, update the `theme` command entry to mention `--apply`:
  `theme = OKLCH theme generator (preset/generate/modify/list). Use --apply to write directly to src/index.css`

---

## Durability Analysis

| Fix | What it prevents | Durability |
|-----|-----------------|------------|
| Tailwind v4 CDN swap | Opacity modifiers silently failing | Eliminates the problem at protocol level |
| `--apply` flag | Transcription errors on initial theme write | Eliminates manual copying entirely |
| Marker comment + append convention | Subsequent overwrites destroying theme | Caught by gate if violated |
| `css-theme-complete` gate | Incomplete/corrupted vars passing validation | Catches at build time, gives actionable feedback |
| Preset surface tuning | Correct vars but invisible colors | Fixes the data, not the code |
| Skill update | Ralph using overwrites instead of appends | Guidance-level, reinforced by gate |

The first four are **mechanical guarantees**. Ralph can't ship a broken theme because the system won't let it through. The fifth fixes the data so correct themes actually look good. The sixth is guidance that the gate enforces.

---

## Relationship to Other Plans

**Power-up Plan Layer 4 (C4):** A1.5 Commit 0 takes only the CDN swap. C4's scope narrows to moving Tailwind compilation from runtime to build-time (oxide-wasm, FOUC elimination, JIT at build time). The v4 API surface (`@theme`, OKLCH support, opacity modifiers) arrives here in A1.5. C4 becomes a performance upgrade, not a correctness fix.

**Power-up Plan Layer 2 (C2):** By using esm.sh for the Tailwind CDN URL, `@tailwindcss/browser` gets Workbox `CacheFirst` caching automatically when L2 ships. This gives offline Tailwind with zero additional work in C4's scope.

**A2 Mega Plan:** Unaffected. A1.5 is self-contained within the theme system. A2's dead code cleanup, stale descriptions, and new commands are all orthogonal.

---

## Verification

After all 6 commits:

1. `theme preset retro-arcade --apply` writes complete `src/index.css` with all 27+ vars
2. Preview shows visible color personality on surfaces (not just buttons)
3. `bg-primary/30` renders as translucent primary color (not invisible)
4. Quality gates catch incomplete themes with specific missing-var feedback
5. `grep '"sidebar":' themes/*.json` returns 0 results
6. Ralph log shows `--apply` usage, no manual heredoc transcription of theme vars

---

## Files Changed (Summary)

| File | Action | Commit |
|------|--------|--------|
| `src/lib/ralph/state.ts` | Edit scaffold HTML — swap CDN, add `@theme` block | 0 |
| `src/hooks/usePreview.ts` | Check/align fallback HTML with same v4 pattern | 0 |
| `src/lib/shell/commands/theme.ts` | Add `--apply` flag logic | 1 |
| `src/lib/ralph/gates.ts` | Add `css-theme-complete` gate | 2 |
| `src/lib/theme-generator/themes/*.json` (×12) | Rename sidebar keys | 3 |
| `src/lib/theme-generator/themes/*.json` (×8) | Tune surface chroma | 4 |
| `src/lib/theme-generator/generator.ts` | Update surface chroma base ranges | 4 |
| `src/skills/theming/SKILL.md` | Update for --apply, v4, color coverage | 5 |
| `src/lib/ralph/loop.ts` | Update SHELL_TOOL description for --apply | 5 |
