# Smart Merge Plan Corrections

**Context:** CC's plan was reconstructed from a conversation summary because `cc-smart-merge-and-moods.md` was lost during context compaction. The spec is now at `docs/plans/cc-smart-merge-and-moods.md` — **read it first via `cat docs/plans/cc-smart-merge-and-moods.md`.** These corrections address divergences between CC's plan and the spec.

---

## Correction 1: WCAG contrast failures must REJECT, not warn-and-apply

**In the plan:** "Reconsidered: rejecting silently causes confusion. Instead: warn in stdout but still apply the override."

**Correction:** Revert to spec behavior. When a color override fails WCAG AA (ratio < 4.5:1), **keep the existing generated value** and report the failure with the exact ratio and a suggestion. Do NOT apply the failing override.

**Why:** The entire point of smart merge is that the theme zone stays WCAG-verified. If we apply bad contrast, Ralph ships inaccessible text — the same problem we're trying to fix. The rejection isn't silent — the report shows exactly what failed:

```
Wrote src/index.css — preserved theme (52 vars), applied 2 overrides (font-sans, font-serif), 
skipped 1 (contrast too low), appended custom CSS (247 bytes)
⚠ Skipped: --primary: oklch(0.35 0.04 55) → 3.2:1 against primary-foreground (needs 4.5:1). 
  Use: theme modify --shift-hue to adjust safely.
```

Ralph sees why, sees the ratio, and gets a concrete next step. That's cooperation, not rejection.

---

## Correction 2: Personality definitions — use the spec, not the summary table

**In the plan:** Mood personalities reconstructed from one-line summary table.

**Correction:** The spec at `docs/plans/cc-smart-merge-and-moods.md` has complete prose definitions for all 6 new moods under Part 2. Use those as the source of truth. Specific fixes for what the summary table got wrong:

### luxury
- **Wrong:** "zero shadows"  
- **Right:** Dramatic shadow profiles (diffused, for elevation). Luxury avoids visible borders — shadows are the ONLY separation mechanism. Zero shadows is brutalist territory. See spec: "dramatic shadow profiles (for elevation, not harshness)"

### brutalist  
- **Wrong:** Philosophy "Ugly on purpose. Every flaw is a feature."  
- **Right:** "Raw structure. No pretense. The code is the design." Brutalism isn't ugly on purpose — it's honest about structure. The aesthetic comes from exposing the underlying system, not from intentional ugliness.

### retro
- **Wrong:** "bouncy spring easing" and "chunky shadows"  
- **Right:** Ease-out transitions (200-400ms), NOT spring/bounce. Warm shadows for tactile depth, not chunky. Retro is "warmth with intention, nostalgia refined, not replicated." Spring/bounce belongs to `playful`. See spec: moderate to rounded corners, at least one shadow layer for depth, warm hue range 20-80.

### zen
- **Wrong:** Philosophy is a da Vinci quote ("Stillness is the ultimate sophistication")  
- **Right:** "Emptiness is form. Let space speak." Keep it aligned with actual zen aesthetics, not Western aphorisms.

### corporate
- **Wrong:** "System sans"  
- **Right:** "Neo-grotesque sans throughout (no serif)." System sans means whatever the OS ships. Neo-grotesque is a specific typographic category (Inter, Helvetica Neue, etc.) that communicates professional intent. Different design signal.

### fashion-editorial
- **Wrong:** "no radius >0.25rem" and "mixed serif/sans" (unspecified mix)  
- **Right:** Zero radius throughout. Full stop. Sharp edges are non-negotiable for fashion editorial. Typography mix is specific: body stays sans-serif (clean, modern), hero/display uses serif. Not a free-form mix. See spec: "Hero sizes go BIGGER (6xl-9xl), weight goes LIGHTER (200-300)"

---

## Correction 3: TH-011 is the wrong issue

**In the plan:** TH-011 describes the smart CSS merge problem (theme overwrite + token desync).

**Correction:** TH-011 should be the **pattern alias transparency** issue: when Ralph types `--pattern minimal`, the output says `pattern=monochromatic` with no indication that `minimal` was resolved as an alias. Fix: include alias in output string — `"pattern=monochromatic (alias: minimal)"`. ~3 lines in theme.ts.

The smart merge problem doesn't need an issues log entry — it's being solved by this prompt. Adding it as "open" while simultaneously implementing the fix is contradictory. Use this entry instead:

```markdown
### TH-011: Pattern alias not transparent in theme output
**Source:** Log analysis (fashion magazine test run)
**Severity:** Low — cosmetic, no functional impact
**What happened:** Ralph typed `--pattern minimal`, output said `pattern=monochromatic` with no indication that `minimal` was an alias. Confusing for log readers.
**Where:** `apps/ide/src/lib/shell/commands/theme.ts` — generate/preset stdout messages
**Implementation:** Include alias in output: `"pattern=monochromatic (alias: minimal)"`. Check if the pattern name differs from the resolved pattern name — if so, append `(alias: {original})`.
**Scope:** ~3 lines in two places (preset path + generate path).
**Phase:** Nice-to-have
```

---

## Correction 4: PRESET_MOOD_MAP reassignments

**In the plan:** No specific PRESET_MOOD_MAP changes listed.

**Correction:** The spec has specific reassignments now that new moods exist:

```typescript
'doom-64': 'brutalist',        // was industrial — doom is raw, not factory
'retro-arcade': 'retro',       // was playful — retro fits better  
'elegant-luxury': 'luxury',    // was premium — luxury is now available
'mocha-mousse': 'zen',         // was organic — mocha is calm, contemplative
```

All other existing mappings stay unchanged.

---

## Correction 5: File naming

**In the plan:** `css-merge.ts`

**Correction:** Use `css-smart-merge.ts` as the spec names it. The "smart" prefix distinguishes this from a generic merge utility — it conveys that the merge understands theme zones, validates contrast, and syncs tokens. Test file: `css-smart-merge.test.ts`.

---

## Non-corrections (CC got these right)

- **CONTRAST_PAIRS export** — Good catch. dtcg.ts needs `export const` + re-export from index.ts.
- **Incoming starts with THEME_MARKER → passthrough** — Good defensive check not in original spec. Keep it.
- **Dynamic import vs top-level** — CC chose top-level import. Either works. Spec suggested dynamic for executor leanness, but top-level is simpler and the module is small. CC's choice is fine.
- **Execution order** — Part 1 → 2 → 3 → 4 with commits after each. Correct.
- **fashion-editorial hyphen handling** — Correctly identified as non-breaking. String literal types handle hyphens fine.
