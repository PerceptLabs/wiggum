# Creativity Rescue: Chroma Dial + Open Personality + Skills Fixes

> **Start by reading the full plan:** `cat docs/plans/cc-creativity-rescue.md`
> It contains the architecture context, every file path, all 13 skill contradictions, implementation details, and verification checklist.

---

## What You're Building

Two new inputs to the existing theme pipeline (everything downstream already works):

1. **`--chroma low|medium|high|<number>`** — Multiplier that scales OKLCH chroma values in `LIGHT_ROLES` before `clampToGamut()`. Named levels: low=0.4×, medium=1.0×, high=1.6×. Default 1.0 = no change to existing output.

2. **`--personality <file>`** — Ralph copies a personality template, remixes it, passes the file. `generateDesignBrief()` already accepts `PersonalityBrief`. No new pipeline — just a new input.

Plus: smart two-dimensional pattern aliases (pattern + chroma hint), mood required for `--apply`, and 13 skill/prompt fixes that remove contradictions.

---

## Execution Order

1. `types.ts` — Add `chroma` to ThemeConfig
2. `generator.ts` — Chroma multiplier resolution + apply to spec.c in LIGHT_ROLES loop AND chart colors (they bypass the loop)
3. `personalities.ts` — Add `chromaHint` to interface + 12 presets; add `validatePersonality()`
4. `theme.ts` — Two-dimensional PATTERN_ALIASES; `--chroma` + `--personality` flags; mood-required-for-apply; chroma cascade (explicit > alias > mood > default); update toDtcg call site to pass personality object + chroma
5. `dtcg.ts` — Accept optional `PersonalityBrief` param (replaces mood-based PERSONALITIES lookup); add `chroma` to `DtcgMetadata`
6. `index.ts` — Export new types + validation
7. Generate 12 personality JSON templates into `skills/theming/personalities/` FROM the existing PERSONALITIES Record
8. `skills.ts` — Delete creativity import/entry/table-row; add personality template glob import
9. `state.ts` — Nested directory + .json extension support in `initSkillsFiles()`
10. Delete `skills/creativity/SKILL.md`
11. Overhaul `skills/theming/SKILL.md` — fixes S1-S6 from plan (6→12 moods, OKLCH explainer, chroma section, alias table upgrade, personality remix workflow, remove "don't hand-write" line)
12. Fix `skills/frontend-design/SKILL.md` — S7-S8 (HSL→theme command examples, "define palette"→"use theme command")
13. Update `loop.ts` BASE_SYSTEM_PROMPT — S11-S13 (add --mood to examples, mention chroma + personality, update shell tool description)
14. Tests — chroma math, personality validation, alias resolution, mood requirement, dtcg personality passthrough

---

## Key Constraints

- **Backward compat is sacred.** Default chroma = 1.0×. No existing command changes output.
- **Personality templates are generated from code.** Iterate PERSONALITIES Record, JSON.stringify each. Don't hand-write.
- **Alias resolution:** `--pattern vibrant` → triadic + auto chroma high. `--pattern vibrant --chroma low` → explicit wins. `--pattern triadic` → no auto chroma.
- **Mood required only for `--apply` on `generate`.** Presets keep PRESET_MOOD_MAP defaults. Preview (no --apply) keeps `?? 'minimal'` fallback.
- **`--personality` replaces `--mood`.** If both provided, personality wins with a note.

---

## Verify When Done

Run the verification checklist in the plan. Key smoke tests:

```bash
# Chroma works
theme generate --seed 150 --pattern triadic --chroma high --mood playful --apply

# Alias carries chroma
theme generate --seed 150 --pattern vibrant --mood playful --apply

# Mood required
theme generate --seed 150 --pattern triadic --apply  # should ERROR

# Personality remix
cat .skills/personalities/industrial.json  # should exist

# Skills fixed
cat apps/ide/src/skills/theming/SKILL.md | grep "chroma"  # should find it
cat apps/ide/src/skills/theming/SKILL.md | grep -c "brutalist\|zen\|luxury\|retro\|corporate\|fashion"  # 6+ hits (was 0)
```
