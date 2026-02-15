# A1.5 Plan Corrections

**Context:** These corrections apply to CC's A1.5 implementation plan. The plan structure, commit sequence, and file targeting are approved. Apply these adjustments during execution.

---

## Correction 1: Commit 0 — Fallback vars are OKLCH, not HSL

**In the plan:** "Lines 232-257: Keep inline :root CSS vars but update to use hsl() wrapped format"

**Correction:** The fallback vars must be bare OKLCH values (e.g., `--background: oklch(0.98 0.005 240);`), not hsl() wrapped. The whole point of A1.5 is moving away from HSL. Your own verification step says `grep "hsl(var" usePreview.ts → 0 results` — that contradicts "update to use hsl() wrapped format."

---

## Correction 2: Commit 1 — Enhance parseFlags for bare boolean flags

**In the plan:** "Either update parseFlags to handle bare flags, or check args.includes('--apply') separately."

**Correction:** Do NOT use `args.includes('--apply')` — it matches `--apply` anywhere in the args array without positional awareness. Instead, enhance `parseFlags` to handle bare boolean flags: if a `--key` is followed by another `--key` or end-of-args, treat it as `true`. This is a small change to parseFlags and benefits all future commands.

---

## Correction 3: Commit 1 — Add --apply to theme modify too

**In the plan:** `--apply` is added to `preset` and `generate` but not `modify`.

**Correction:** `modify` also produces theme output. Add `--apply` to `theme modify` using the same write logic. If there's a reason to exclude it, document that explicitly in the Commit 5 skill update (state that modify is stdout-only and why).

---

## Correction 4: Commit 2 — Verify no stale gate name references

**In the plan:** "Replace css-has-variables gate with css-theme-complete" + update getExplicitFix.

**Correction:** Also grep the entire codebase for the old name string. Add this verification step:

```
grep -r "css-has-variables" apps/ide/src → 0 results
```

Catch any references in tests, logging, comments, or error messages beyond getExplicitFix.

---

## Correction 5: Commit 4 — Generator LIGHT_ROLES chroma bumps are too conservative

**In the plan:**

| Role | Current C | Proposed C |
|------|-----------|-----------|
| background | 0.004 | 0.010 |
| card | 0.002 | 0.008 |

**Correction:** 0.010 and 0.008 are still perceptually achromatic — clinical white. The entire purpose of A1.5 is making surfaces visibly tinted. Revised minimums:

| Role | Current C | Corrected C | Why |
|------|-----------|-------------|-----|
| background | 0.004 | 0.015–0.020 | Must produce visible tint |
| card | 0.002 | 0.012–0.015 | Must be distinct from background |
| popover | 0.002 | 0.012–0.015 | Match card |

The generator doesn't need to match preset expressiveness, but `theme generate` should not produce clinical white surfaces. Keep muted (0.035), border (0.018), and input (0.018) as proposed — those are fine.

---

## Correction 6: Commit 4 — Dark mode preset tuning must be explicit

**In the plan:** "Dark mode surfaces: apply proportional adjustment (dark surfaces should maintain hue tint but at lower lightness/chroma per existing dark mode derivation)."

**Correction:** This is too vague. These are preset JSONs with explicit light AND dark values — both sides must be hand-edited for all 10 presets. Specific guidance:

- Dark surface chroma: roughly 60–70% of the corresponding light surface chroma
- Dark surface hue: same as light (preserve the tint family)
- Dark surface lightness: per existing dark derivation patterns in each preset (don't change lightness, just ensure chroma is nonzero)
- This is manual work across 10 files × 2 modes. Acknowledge the scope.

---

## Correction 7: Commit 5 — Verify skill file path

**In the plan:** `apps/ide/src/skills/theming/SKILL.md`

**Correction:** Skills in the codebase live under `src/skills/ralph/` subdirectories (see the import convention in skills.ts using `@/skills/ralph/...`). Verify the actual path before editing. If the file is at `skills/ralph/theming/SKILL.md`, use that. If it's at `skills/theming/SKILL.md`, note this diverges from convention.

---

## Updated Verification Checklist

Add these to the existing verification steps:

```
# Correction 1: No stale hsl in fallback
grep "hsl(" apps/ide/src/hooks/usePreview.ts → 0 results

# Correction 4: No stale gate name anywhere
grep -r "css-has-variables" apps/ide/src → 0 results

# Correction 5: Generator chroma minimums
# Verify background C >= 0.015 in LIGHT_ROLES

# Correction 7: Skill path is correct
ls apps/ide/src/skills/ralph/theming/SKILL.md OR apps/ide/src/skills/theming/SKILL.md
```
