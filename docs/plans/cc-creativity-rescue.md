# CC Prompt: Creativity Rescue — Chroma Dial + Open Personality + Skills Fixes

> **Scope:** Fix the architectural gap between the Feb 6 design vision and what actually got built. Restore the missing chroma dimension, open the closed personality system into a remixable schema, upgrade pattern aliases to carry chroma intent, stop mood from silently defaulting to "minimal," and fix every skill/prompt that contradicts or omits these capabilities.

> **NOT in scope:** Stack SKILL.md component gaps (17 missing), accessibility expansion, React patterns, gumdrop updates, anti-slop gates in gates.ts, preview CSS-priority flip. Those are separate prompts.

---

## THE PROBLEM IN ONE SENTENCE

Ralph cannot express creative intent through the theme system because: the chroma dimension was designed but never built, pattern aliases only carry hue information not saturation, mood silently defaults to "minimal" contradicting Ralph's plan, the personality system is a closed 12-item lookup table instead of the remixable open schema that was designed — and the skills actively reinforce all of these problems with wrong examples, missing documentation, and contradictory instructions.

---

## ARCHAEOLOGY — WHAT WAS DESIGNED VS WHAT GOT BUILT

### Feb 6 Original Vision (4 operations Ralph could perform)
1. Use a theme as-is ✅
2. **Hue-shift** the entire palette ✅ (built — `theme modify --shift-hue`)
3. **Adjust chroma** to make it more muted or vibrant ❌ (never built)
4. **Swap the geometry** — same base hue, different pattern ✅ (built — `--pattern`)

### Feb 11 Personality System Design
- Colors = deterministic math ✅
- Everything else = **constrained schema with validated ranges** ❌ (got a closed enum instead)
- 5-6 moods = "starting points" — examples of what the schema could express ❌ (became the boundaries)

### What Actually Got Built
| Designed | Built | Impact |
|----------|-------|--------|
| Chroma dial (continuous) | Nothing — `LIGHT_ROLES` has fixed chroma values | Every theme has identical saturation regardless of intent |
| Pattern aliases = pattern + chroma | `vibrant → triadic` (pattern only) | Ralph asks for vivid colors, gets hue rearrangement but same saturation |
| Constrained open schema | `Record<MoodName, PersonalityBrief>` (closed lookup) | Ralph's creative vision dies at the command boundary |
| Mood inferred from context | `?? 'minimal'` silent default | "Electric maximalism" gets "Let content breathe" brief |
| "Muted" = low chroma | Not addressable at all | No way to express desaturation |

---

## THE EXISTING PIPELINE (what we're extending, not replacing)

```
theme command
  → generateTheme() produces CSS vars (colors, fonts, shadows, radius)
  → generateDesignBrief(personality) renders markdown (typography, animation, spacing rules)
  → toDtcg() packages everything into tokens.json (personality embedded as metadata)
  → ui-report.md reads tokens.json and shows L/C/H values per token

Ralph already SEES chroma in the UI report (the C column: 0.290, 0.020, 0.174).
Ralph already READS personality from design-brief.md.
Ralph already HAS tokens.json with personality embedded.
```

**We are adding two inputs to this existing pipeline:**
1. A `--chroma` flag that scales the C values before gamut clamping
2. A `--personality <file>` flag that reads a `PersonalityBrief` from a file instead of a lookup table

Everything downstream (brief generation, tokens, ui-report) works unchanged because it already consumes these interfaces.

---

## SKILLS CONTRADICTIONS & GAPS (13 items)

These must be fixed or the code changes are useless — Ralph will follow the wrong docs.

### Theming SKILL.md

| # | Problem | Fix |
|---|---------|-----|
| S1 | **Lists 6 moods, code has 12.** Table shows minimal, premium, playful, industrial, organic, editorial. Missing: fashion-editorial, brutalist, zen, corporate, retro, luxury. Ralph can't access half the presets. | Expand mood table to all 12 with chromaHint column |
| S2 | **"The brief is auto-generated — don't hand-write design-brief.md."** Directly contradicts the open personality schema. Tells Ralph NOT to be creative with personality. | Remove this line. Replace with personality remix workflow documentation. |
| S3 | **No `--mood` in any quick-start example.** Every example: `theme generate --seed 210 --pattern goldenRatio --apply`. Ralph follows examples, gets silent default to minimal. | Add `--mood` to all generate examples. |
| S4 | **Zero mention of OKLCH channels.** Word "chroma" doesn't appear anywhere. Ralph has no mental model for what the C column in ui-report means. | Add OKLCH explainer section (L/C/H channels, independence of pattern vs chroma). |
| S5 | **Alias table is one-dimensional.** Shows `vibrant → triadic` with no chroma context. | Update to two-column table showing pattern + auto-chroma per alias. |
| S6 | **"Auto-inference" section is misleading.** Says mood is inferred from preset name. True for presets, but for `generate` it silently defaults to minimal with no inference. | Clarify: presets auto-infer mood via PRESET_MOOD_MAP. Generate requires explicit `--mood` or `--personality`. |

### Frontend Design SKILL.md

| # | Problem | Fix |
|---|---------|-----|
| S7 | **HSL examples in an OKLCH system.** "Cookie-Cutter vs Distinctive" section has `--primary: 262 83% 58%` and `--primary: 38 92% 50%`. These are HSL. System produces OKLCH. Ralph might freestyle HSL. | Replace with OKLCH examples or (better) replace raw values with theme command examples: `theme generate --seed 38 --pattern analogous --chroma high --mood premium --apply`. |
| S8 | **"Define your palette as CSS variables in src/index.css"** implies freestyling is okay. | Change to: "Use the `theme` command to generate your palette. Never freestyle color values." |

### Creativity SKILL.md

| # | Problem | Fix |
|---|---------|-----|
| S9 | **640 bytes of dead redirect.** Still loaded, indexed, takes a grep slot. | Delete file entirely. Remove import from skills.ts. Remove from SKILLS array. |

### skills.ts getSkillsContent()

| # | Problem | Fix |
|---|---------|-----|
| S10 | **Skills table still lists creativity.** Shows `creativity \| → See gumdrops for layout patterns and design variety`. Wastes a row. | Remove creativity row from the table when the file is deleted. |

### loop.ts BASE_SYSTEM_PROMPT

| # | Problem | Fix |
|---|---------|-----|
| S11 | **Workflow step 4 has no --mood.** `theme preset <n> --apply` or `theme generate --seed <n> --pattern <n> --apply`. The example Ralph follows most closely. | Add `--mood` to generate example. Add personality remix mention. |
| S12 | **Theming section says nothing about chroma or personality.** Just "Use the `theme` command" with mood-less examples. | Add chroma flag mention, mood requirement, personality remix option. |
| S13 | **Shell tool description is minimal.** Just `theme = OKLCH theme generator (preset/generate/modify/list). Use --apply to write directly to src/index.css`. | Add: `--mood required with --apply. --chroma controls saturation. --personality for custom design briefs.` |

---

## FILES TO EDIT

### Code Changes (theme-generator + shell)

| # | File | What Changes |
|---|------|-------------|
| 1 | `apps/ide/src/lib/theme-generator/types.ts` | Add `chroma` to `ThemeConfig` |
| 2 | `apps/ide/src/lib/theme-generator/generator.ts` | Add chroma multiplier that scales `LIGHT_ROLES` spec.c before color generation |
| 3 | `apps/ide/src/lib/theme-generator/personalities.ts` | Add `chromaHint` to `PersonalityBrief` + all 12 presets; add `validatePersonality()`; export presets as JSON-serializable |
| 4 | `apps/ide/src/lib/shell/commands/theme.ts` | Upgrade `PATTERN_ALIASES` to two-dimensional; add `--chroma` + `--personality` flags; require `--mood` for `--apply` unless `--personality`; wire chroma cascade |
| 5 | `apps/ide/src/lib/theme-generator/dtcg.ts` | Accept optional `PersonalityBrief` param (use instead of mood lookup); add `chroma` to `DtcgMetadata`; update `toDtcg()` signature |
| 6 | `apps/ide/src/lib/theme-generator/index.ts` | Export new types and validation |

### Skills / Prompt Documentation

| # | File | What Changes |
|---|------|-------------|
| 7 | `apps/ide/src/skills/theming/SKILL.md` | S1-S6: OKLCH explainer, chroma docs, 12-mood table, alias table upgrade, personality remix workflow, remove "don't hand-write" line, fix examples |
| 8 | `apps/ide/src/skills/frontend-design/SKILL.md` | S7-S8: Replace HSL examples with OKLCH or theme command examples, fix "define your palette" wording |
| 9 | `apps/ide/src/skills/creativity/SKILL.md` | S9: DELETE this file entirely |
| 10 | `apps/ide/src/lib/ralph/skills.ts` | S9-S10: Remove creativity import + SKILLS entry + table row; add personality template glob import |
| 11 | `apps/ide/src/lib/ralph/loop.ts` | S11-S13: Update workflow step 4, theming section, shell tool description |

### Personality Templates (new files)

| # | File | What Changes |
|---|------|-------------|
| 12 | `apps/ide/src/skills/theming/personalities/*.json` | 12 JSON files — one per mood — matching `PersonalityBrief` shape. Generated FROM existing PERSONALITIES object. |

### State / Loader

| # | File | What Changes |
|---|------|-------------|
| 13 | `apps/ide/src/lib/ralph/state.ts` | Update `initSkillsFiles()` to handle nested `personalities/` directory + .json extension |

### Tests

| # | File | What Changes |
|---|------|-------------|
| 14 | `apps/ide/src/lib/theme-generator/__tests__/` | Chroma multiplier math; personality validation; alias chroma resolution; mood-required-for-apply |

---

## IMPLEMENTATION DETAILS

### Change 1: Chroma Multiplier

**File:** `types.ts` — Add to `ThemeConfig`:
```typescript
chroma?: 'low' | 'medium' | 'high' | number  // 0.0-2.0 or named level
```

**File:** `generator.ts` — Named levels: `low = 0.4`, `medium = 1.0`, `high = 1.6`. Numeric values clamped to 0.0-2.0.

In the color generation loop where `LIGHT_ROLES` specs are consumed, multiply `spec.c * chromaMultiplier` before `clampToGamut()`. Gamut clamping already handles out-of-range — no new clamping needed. Multiplier pushes *intent*, gamut clamping enforces *reality*.

**Chart colors bypass LIGHT_ROLES.** After the LIGHT_ROLES loop, chart colors are built with hardcoded inline chroma values:
```typescript
lightColors['chart-1'] = clampToGamut({ l: 0.56, c: 0.195, h: primaryHue })
lightColors['chart-2'] = clampToGamut({ l: 0.61, c: 0.115, h: accentHue })
// ...etc
```
These must ALSO be multiplied by `chromaMultiplier` or charts will have fixed saturation while everything else scales — visual inconsistency.

**Critical:** Default multiplier is 1.0. Existing themes produce identical output unless `--chroma` is explicitly passed.

### Change 2: Smart Pattern Aliases (Two-Dimensional)

**File:** `theme.ts` — Upgrade `PATTERN_ALIASES` to carry chroma hints:

```typescript
interface PatternAlias {
  pattern: string
  chromaHint: 'low' | 'medium' | 'high'
}

const PATTERN_ALIASES: Record<string, PatternAlias> = {
  elegant:  { pattern: 'analogous',      chromaHint: 'low' },
  bold:     { pattern: 'complementary',   chromaHint: 'high' },
  minimal:  { pattern: 'monochromatic',   chromaHint: 'low' },
  vibrant:  { pattern: 'triadic',         chromaHint: 'high' },
  natural:  { pattern: 'goldenRatio',     chromaHint: 'medium' },
}
```

Resolution: alias chromaHint applies UNLESS explicit `--chroma` overrides:
- `--pattern vibrant` → triadic + chroma high (auto from alias)
- `--pattern vibrant --chroma low` → triadic + chroma low (explicit wins)
- `--pattern triadic` → triadic + no auto chroma (raw pattern)

### Change 3: Mood Required for --apply (unless --personality)

**File:** `theme.ts` `handleGenerate()`:

Current: `const resolvedMood = (moodFlag as MoodName) ?? 'minimal'` — kills creative intent.

New:
- `--apply` WITHOUT `--mood` AND WITHOUT `--personality` → helpful error listing available moods
- `--apply` WITH `--mood` → use mood preset (now explicit)
- `--apply` WITH `--personality <file>` → use custom personality (mood not needed)
- preview (no `--apply`) → mood optional, nothing gets written

Presets keep working — `PRESET_MOOD_MAP` provides defaults. Output now shows resolved mood: `Applied preset "cyberpunk" + design brief (mood: industrial)`

### Change 4: Chroma Auto-Resolution Cascade

Priority when resolving chroma:

1. **Explicit `--chroma` flag** → highest priority
2. **Pattern alias chromaHint** → if no explicit `--chroma`
3. **Mood preset's `chromaHint`** → if no alias hint
4. **Default `medium` (1.0×)** → fallback

Examples:
- `--pattern vibrant --mood playful --apply` → alias chroma high (both agree)
- `--pattern triadic --mood playful --apply` → mood chroma high (no alias)
- `--pattern triadic --mood minimal --apply` → mood chroma low
- `--pattern vibrant --chroma low --mood minimal --apply` → explicit low wins

### Change 5: Open Personality Schema (Remixable Templates)

#### 5a: Personality Templates as JSON Files

12 JSON files in `apps/ide/src/skills/theming/personalities/`. Each is the JSON serialization of the existing `PersonalityBrief` for that mood. Generated FROM the `PERSONALITIES` Record — not hand-written.

Loaded by `skills.ts` via Vite glob import (same pattern as gumdrops). Written to `.skills/personalities/` by `initSkillsFiles()` in `state.ts`.

#### 5b: Personality Validation

**File:** `personalities.ts` — Add `validatePersonality()`:

Validates structure (constrained):
- Required: `philosophy`, `typography`, `animation`, `spacing`
- Typography entries: `element`, `size`, `weight`, `color`, `tracking`
- Animation entries: `type`, `duration`, `easing`
- Spacing: `base`, `section`, `cardPadding`, `rhythm`
- `chromaHint` if present: valid value
- Optional arrays: `interactions`, `allowed`, `notAllowed`, `checklist`

NOT validated (semi-open — Ralph's creative freedom):
- Specific values within fields
- Number of entries
- Content of strings

#### 5c: --personality Flag

**File:** `theme.ts` — When `--personality <path>` is provided:
1. Read file from virtual filesystem
2. Parse JSON
3. Validate via `validatePersonality()` — clear errors if invalid
4. Pass to `generateDesignBrief()` (already accepts `PersonalityBrief`)
5. Pass the resolved `PersonalityBrief` object to `toDtcg()` (see Change 6 below) — currently theme.ts passes a mood string and toDtcg does a PERSONALITIES lookup. For custom personalities that lookup produces nothing. Update the call site to pass the personality object directly.
6. `--mood` NOT required (personality replaces mood)

#### 5d: Ralph's Remix Workflow

```bash
ls .skills/personalities/                                    # browse templates
cat .skills/personalities/industrial.json > .ralph/personality.json  # copy starting point
cat .ralph/personality.json                                  # understand structure
replace .ralph/personality.json "Raw structure..." "Neon chaos meets corporate order..."
replace .ralph/personality.json '"chromaHint": "low"' '"chromaHint": "high"'
theme generate --seed 280 --pattern triadic --personality .ralph/personality.json --apply
cat .ralph/design-brief.md                                   # verify remix
```

### Change 6: dtcg.ts — Personality + Chroma in Token Metadata

**File:** `dtcg.ts`

The current `toDtcg()` signature accepts `mood?: MoodName` and does a `PERSONALITIES[mood]` lookup to embed personality in `$metadata`. This breaks for custom personalities — they have no entry in the Record, so the lookup silently produces nothing.

**Signature change:** Add an optional `personality?: PersonalityBrief` parameter. When provided, use it directly instead of looking up from PERSONALITIES. When not provided, fall back to the existing mood-based lookup (backward compat).

Current code:
```typescript
if (mood && PERSONALITIES[mood]) {
  const p = PERSONALITIES[mood]
  $metadata.personality = { mood, philosophy: p.philosophy, ... }
}
```

New logic:
```typescript
const p = personality ?? (mood ? PERSONALITIES[mood] : undefined)
if (p) {
  $metadata.personality = { mood: mood ?? 'custom', philosophy: p.philosophy, ... }
}
```

**Add `chroma` to `DtcgMetadata` interface.** Currently the resolved chroma multiplier is not recorded anywhere in tokens.json. Add:
```typescript
chroma?: 'low' | 'medium' | 'high' | number  // resolved chroma level
```
Pass it through from theme.ts alongside the existing mood/config params.

**Update theme.ts call site.** Currently theme.ts calls `toDtcg(theme, config, resolvedMood, presetMeta)`. Update to also pass the resolved personality object and chroma value.

### Change 7: Skills Loader Updates

**File:** `skills.ts`:
- Remove creativity import, SKILLS entry, and table row
- Add glob import for personality templates
- Add templates to `getSkillsRaw()` with `personalities/` prefix IDs

**File:** `state.ts`:
- Update `initSkillsFiles()` to create nested directories for IDs containing `/`
- Preserve `.json` extension for personality templates (don't add `.md`)

### Change 8: Theming SKILL.md Overhaul (S1-S6)

- **S1:** Expand mood table to all 12 with chromaHint column
- **S2:** Replace "don't hand-write design-brief.md" with personality remix workflow
- **S3:** Add `--mood` to all generate examples in quick-start
- **S4:** Add OKLCH Color Science section explaining L/C/H channels and their independence
- **S5:** Update alias table to show pattern + auto-chroma columns
- **S6:** Clarify auto-inference: presets have PRESET_MOOD_MAP, generate requires explicit mood or personality

Add new sections:
- **Chroma — The Saturation Dial:** low/medium/high table, examples, numeric override
- **Custom Personalities — Remix the Presets:** full workflow, JSON structure reference
- **Chroma Resolution Priority:** explicit > alias > mood > default

### Change 9: Frontend Design SKILL.md (S7-S8)

- **S7:** Replace HSL examples in "Cookie-Cutter vs Distinctive":
  - Cookie-cutter: `theme preset <default> --mood minimal --apply` → generic violet
  - Distinctive: `theme generate --seed 38 --pattern analogous --chroma high --mood premium --apply` → warm amber
  - Show the OKLCH output Ralph would actually see, not raw HSL values
- **S8:** Change "Define your palette as CSS variables" to "Use the `theme` command to generate your palette. Never freestyle color values."

### Change 10: Delete Creativity SKILL.md (S9-S10)

- Delete `apps/ide/src/skills/creativity/SKILL.md`
- Remove import and SKILLS array entry from `skills.ts`
- Remove creativity row from `getSkillsContent()` table

### Change 11: Update System Prompt (S11-S13)

**File:** `loop.ts` BASE_SYSTEM_PROMPT:

- **S11:** Workflow step 4: `theme preset <n> --apply` or `theme generate --seed <n> --pattern <n> --mood <mood> --apply`. Add personality remix mention.
- **S12:** Theming section: add chroma, mood requirement, personality mentions
- **S13:** Shell tool description: `theme = OKLCH theme generator. --mood required with --apply. --chroma controls saturation. --personality for custom design briefs.`

---

## VERIFICATION CHECKLIST

### Chroma Dial
- [ ] `--chroma high` → visibly more saturated colors
- [ ] `--chroma low` → desaturated, muted colors
- [ ] `--chroma 0.3` → numeric value works
- [ ] `--chroma 5.0` → clamped to 2.0
- [ ] No `--chroma` → identical to current output (1.0× multiplier)

### Smart Aliases
- [ ] `--pattern vibrant` → triadic + auto chroma high
- [ ] `--pattern vibrant --chroma low` → triadic + explicit low wins
- [ ] `--pattern elegant` → analogous + auto chroma low
- [ ] `--pattern triadic` → triadic + no auto chroma

### Mood Required
- [ ] `theme generate --seed 150 --pattern triadic --apply` → error listing moods
- [ ] `theme generate --seed 150 --pattern triadic` → preview works (no --apply)
- [ ] `--personality .ralph/personality.json --apply` → works without --mood
- [ ] `theme preset cyberpunk --apply` → works (PRESET_MOOD_MAP default shown)

### Chroma Cascade
- [ ] Explicit > alias > mood > default
- [ ] `--pattern vibrant --mood minimal` → alias high wins over mood low
- [ ] `--pattern triadic --mood playful` → mood high (no alias)

### Open Personality
- [ ] `ls .skills/personalities/` → 12 JSON files
- [ ] `cat .skills/personalities/industrial.json` → valid PersonalityBrief
- [ ] Copy + edit + `--personality` → design-brief.md reflects remix
- [ ] Invalid JSON → helpful validation errors
- [ ] `--personality` WITH `--mood` → personality wins, note in output
- [ ] Custom philosophy in tokens.json and design-brief.md

### Skills Fixes
- [ ] Theming SKILL.md shows 12 moods (not 6)
- [ ] "Don't hand-write" line is GONE
- [ ] All generate examples include `--mood`
- [ ] OKLCH explainer section exists with L/C/H descriptions
- [ ] Alias table has pattern + chroma columns
- [ ] Frontend design has OKLCH or theme-command examples (no HSL)
- [ ] "Define your palette" replaced with theme command instruction
- [ ] Creativity SKILL.md is deleted
- [ ] `getSkillsContent()` table has no creativity row
- [ ] `grep skill "chroma"` → finds theming SKILL.md
- [ ] `grep skill "personality remix"` → finds theming SKILL.md
- [ ] loop.ts workflow step 4 shows `--mood`
- [ ] loop.ts theming section mentions chroma + personality
- [ ] Shell tool description mentions mood/chroma/personality

---

## IMPLEMENTATION ORDER

1. **types.ts** — Add `chroma` to ThemeConfig (2 min)
2. **generator.ts** — Chroma multiplier + apply in LIGHT_ROLES loop AND chart colors (5 min)
3. **personalities.ts** — chromaHint on interface + 12 presets + validatePersonality() (10 min)
4. **theme.ts** — Two-dimensional aliases, --chroma, --personality, mood-required, chroma cascade, updated toDtcg call site (20 min)
5. **dtcg.ts** — Accept PersonalityBrief param, add chroma to DtcgMetadata, update toDtcg signature (8 min)
6. **index.ts** — Export new types + validation (2 min)
7. **Personality JSON templates** — Generate 12 files from PERSONALITIES (10 min)
8. **skills.ts** — Delete creativity, add personality glob import, update table (5 min)
9. **state.ts** — Nested directory + .json extension support (5 min)
10. **creativity/SKILL.md** — DELETE (1 min)
11. **theming/SKILL.md** — Full overhaul: S1-S6 + new sections (15 min)
12. **frontend-design/SKILL.md** — S7-S8 fixes (5 min)
13. **loop.ts** — S11-S13: update examples + descriptions (5 min)
14. **Tests** — Chroma math, validation, aliases, mood requirement, dtcg personality passthrough (12 min)

**Total: ~105 minutes of focused CC work**

---

## WHAT THIS DOES NOT FIX (FUTURE PROMPTS)

1. **Stack SKILL.md** — Missing 17 components and 6 hooks
2. **Accessibility expansion** — code-quality SKILL.md has 4 bullet points
3. **Anti-slop gates** — Layout repetition detection in gates.ts
4. **Preview CSS-priority flip** — snapshot.ts ordering
5. **Contrast edge-case tests** — generator.test.ts gaps
