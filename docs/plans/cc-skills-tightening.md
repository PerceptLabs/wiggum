# CC Prompt: Skills Tightening

Comprehensive update to all skill files based on observations from Ralph's reflections, system evolution, and audit of stale/wrong content. Skills are Ralph's knowledge base — searched via `grep skill` during builds. Stale skills = stale output.

> **Last audited against codebase:** 2026-02-17. Every claim verified by reading source files.

---

## Audit Summary

| Skill | Status | Issues |
|-------|--------|--------|
| ralph | ⚠️ REWRITE | Commands exist (`ralph init/run/status/resume`) but skill describes wrong paths (`.wiggum/ralph/` → actual `.ralph/`), wrong file list (missing origin.md, intent.md, plan.md, summary.md; lists nonexistent progress.md) |
| creativity | ❌ DELETE | Redirect stub that wastes token budget. Paths work (`.skills/` is valid — `state.ts` copies skills there at init) but content adds zero value — everything already in gumdrops + frontend-design |
| frontend-design | ⚠️ FIX | HSL examples (should be OKLCH), missing personality/mood workflow. NOTE: `cat .skills/...` paths are VALID — `initSkillsFiles()` in state.ts copies all skills to `.skills/` at init |
| code-quality | ⚠️ FIX | Uses `hsl(var(--...))` (wrong for OKLCH). No dead skill refs found (previously reported issue is now invalid) |
| theming | 🔴 REWRITE | Only lists 6 moods (have 12 — missing fashion-editorial, brutalist, zen, corporate, retro, luxury). Missing chroma docs, personality file workflow, tokens/smart merge docs. Font guidance inconsistent with index.html being locked. Presets framed as limits, not starting points |
| gumdrops | ⚠️ FIX | Says "53 components" — actual count is 52 component families with 150+ exported parts |
| stack (packages/) | ⚠️ FIX | Says "53 components" (same fix needed), references nonexistent skills (`react-best-practices`, `web-design-guidelines`), font guidance says edit index.html but index.html is LOCKED |
| extended-libraries | ✅ OK | Minor: mention `modules` command |

---

## Changes

### 1. REWRITE ralph/SKILL.md

**File:** `apps/ide/src/skills/ralph/SKILL.md` — REWRITE (not delete)

The ralph commands are real — `ralph init`, `ralph run`, `ralph status`, `ralph resume` all exist in `src/lib/commands/ralph/`. But the skill content is wrong:

**What's wrong:**
- Says `.wiggum/ralph/` — actual path is `.ralph/`
- Lists `progress.md` — doesn't exist
- Missing real state files: `origin.md`, `intent.md`, `plan.md`, `summary.md`
- Describes a workflow that doesn't match the actual Ralph loop

**Rewrite to document actual state files:**
```markdown
---
name: ralph
description: Ralph's autonomous iteration loop — state management and workflow
when_to_use: Understanding how Ralph operates, debugging state issues
---

# Ralph Loop

Ralph is Wiggum's autonomous AI agent. Each iteration starts with fresh context — state lives in files, not memory.

## State Directory (.ralph/)

| File | Purpose | Persistence |
|------|---------|-------------|
| `task.md` | Current user request | Reset each run |
| `origin.md` | Original prompt + refinements history | Preserved across runs |
| `intent.md` | Design intent and approach | Preserved (continuation) |
| `plan.md` | Current implementation plan | Preserved (continuation) |
| `summary.md` | What was accomplished | Preserved (continuation) |
| `feedback.md` | Gate failures and user feedback | Reset each iteration |
| `iteration.txt` | Current iteration number | Reset each run |
| `status.txt` | `running` / `complete` / `waiting` | Reset each run |

## Commands

```bash
ralph init "Build a landing page"   # Initialize .ralph/ + scaffold project
ralph run                            # Start/continue the iteration loop
ralph status                         # Show current state
ralph resume                         # Resume after waiting status
```

## Skills Access

Skills are copied to `.skills/` at init. Ralph can read them:
```bash
cat .skills/theming.md              # Read full skill
cat .skills/gumdrops.md             # Read full skill
grep skill "pricing section"        # Search all skills by keyword
```
```

Also update the import in `skills.ts` — keep it in the SKILLS array but with corrected content.

### 2. DELETE creativity/SKILL.md

**File:** `apps/ide/src/skills/creativity/SKILL.md` — DELETE THIS FILE

It's a redirect stub. The `.skills/` paths it references actually work (verified: `initSkillsFiles()` in `state.ts` copies all skills to `.skills/` at init), but the content adds zero value. Everything it points to is already discoverable via `grep skill`. Wastes a skill slot and search index space.

Also remove from `skills.ts`:
```typescript
// DELETE this import
import creativitySkill from '../../skills/creativity/SKILL.md?raw'

// DELETE from SKILLS array
{ id: 'creativity', content: creativitySkill, priority: 6 },
```

And remove from the skills summary table in `getSkillsContent()`:
```
| creativity | → See gumdrops for layout patterns and design variety |
```

### 3. Update frontend-design/SKILL.md

**File:** `apps/ide/src/skills/frontend-design/SKILL.md`

**NOTE: `cat .skills/...` paths are VALID.** Previous audit claimed these were wrong — they're not. `initSkillsFiles()` in `state.ts` copies all skills to `.skills/` at init. Both `cat .skills/theming.md` and `grep skill "..."` work. No path changes needed.

**Fix HSL example in Cookie-Cutter section.** Replace:
```css
--primary: 262 83% 58%;  /* violet purple — the universal AI slop signal */
```
With:
```css
--primary: oklch(0.55 0.2 280);  /* violet purple — the universal AI slop signal */
```

And replace:
```css
--primary: 38 92% 50%;   /* amber gold — warm, inviting, specific */
```
With:
```css
--primary: oklch(0.7 0.15 75);  /* amber gold — warm, inviting, specific */
```

**Add personality/mood workflow.** In the "Design Thinking" section, after the 3 questions, add:

```markdown
**Design Briefs:** When the `theme` command runs with `--mood`, it generates `.ralph/design-brief.md` — a personality brief with typography hierarchy, animation timing, spacing rhythm, and strict allowed/notAllowed rules. Read it before writing any code in src/. It's your creative director for this project.

The 12 available moods: minimal, premium, playful, industrial, organic, editorial, fashion-editorial, brutalist, zen, corporate, retro, luxury.

Use `theme list moods` to see descriptions. Pick the mood that matches the project's character, or let the preset auto-infer one.
```

**Update the skill reference table at the bottom.** Replace:
```markdown
| Skill | What It Covers |
|-------|---------------|
| stack | Components, imports, project structure |
| theming | CSS variables, dark mode, animation library |
| gumdrops | Compositional recipes, page templates, anti-slop |
| code-quality | React patterns, accessibility, form contrast |

```bash
grep skill "<topic>"      # Search all skills
cat .skills/theming.md    # Read full skill
cat .skills/gumdrops.md   # Read full skill
```
```

With:
```markdown
| Skill | What It Covers |
|-------|---------------|
| stack | 52 component families (150+ exports), imports, project structure |
| theming | Theme command, 12 presets, 12 moods, OKLCH colors, animations, dark mode, tokens |
| gumdrops | Compositional recipes, page templates, anti-slop |
| code-quality | React patterns, accessibility, form contrast |
| extended-libraries | npm packages beyond stack, when-to-use guidance |

```bash
grep skill "<topic>"           # Search all skills by keyword
grep skill "layout patterns"   # Find layout recipes
grep skill "animation"         # Find animation guidance
cat .skills/theming.md         # Read full skill file
```
```

### 4. Update code-quality/SKILL.md

**File:** `apps/ide/src/skills/code-quality/SKILL.md`

**Fix OKLCH color usage.** The Dark Mode section uses `hsl(var(--background))` which is wrong. Since the theme generator produces full OKLCH values like `oklch(0.978 0.004 56.38)`, CSS variables contain the complete color value. No wrapper needed.

Replace the entire Dark Mode / Theming section:
```markdown
## Dark Mode / Theming (CRITICAL)

CSS variables contain full OKLCH color values. Use `var(--name)` directly — never wrap in `hsl()` or `oklch()`.

```css
/* CORRECT — variables contain complete color values */
background-color: var(--background);
color: var(--foreground);
border-color: var(--border);

/* WRONG — double-wrapping breaks the color */
background-color: hsl(var(--background));    /* ❌ */
background-color: oklch(var(--background));  /* ❌ */
```

Native form elements ignore CSS variables in dark mode. Always add to src/index.css (after the theme zone):

```css
select, input, textarea {
  background-color: var(--background);
  color: var(--foreground);
  border-color: var(--border);
}

select option {
  background-color: var(--popover);
  color: var(--popover-foreground);
}
```

**Opacity with Tailwind v4:** Use native opacity modifiers — they work with OKLCH:
```css
bg-primary/30        /* 30% opacity — Tailwind v4 handles this natively */
text-foreground/70   /* 70% opacity */
```

For CSS (not Tailwind), use `color-mix`:
```css
color-mix(in oklch, var(--primary), transparent 60%)  /* 40% primary */
```
```

**NOTE:** Previous audit claimed dead skill refs (`react-best-practices`, `web-design-guidelines`) exist in this file. Verified: they do NOT appear in code-quality/SKILL.md. Those dead refs are in **stack/SKILL.md** (see change 7). No dead ref changes needed here.

### 5. Update theming/SKILL.md

**File:** `apps/ide/src/skills/theming/SKILL.md`

**Update mood table.** The current skill only lists 6 moods. The actual 12 from `personalities.ts` are:

```markdown
| Mood | Character |
|------|-----------|
| `minimal` | Content-first. Subtle easing, generous whitespace, no decoration. |
| `premium` | Polished luxury. Light weights at large sizes, spring animations, rich layering. |
| `playful` | Bouncy and bright. Rounded shapes, animated micro-interactions, surprise. |
| `industrial` | Raw structure. Mono fonts, no rounded corners, linear easing, sharp contrast. |
| `organic` | Flowing and warm. Rounded everything, slow easing, natural spacing. |
| `editorial` | Typography-led. Serif body, tight tracking, print-inspired, minimal color. |
| `fashion-editorial` | High-fashion editorial. Dramatic type scale, ultra-thin weights, editorial grid. |
| `brutalist` | Raw concrete web. System mono, harsh borders, no radius, no shadows. |
| `zen` | Quiet presence. Maximum whitespace, slow reveals, barely-there borders. |
| `corporate` | Professional trust. System sans-serif, measured spacing, restrained animation. |
| `retro` | Nostalgic computing. Rounded mono, visible borders, chunky spacing, pixelated feel. |
| `luxury` | Whisper, don't shout. Exclusivity through absence. Ultra-thin type, glacial easing. |
```

> **IMPORTANT:** The previous version of this table listed cyberpunk, retrofuture, festive, noir as moods.
> These DO NOT EXIST in `personalities.ts`. The correct 12 are listed above. Do not invent moods.

**Add tokens command documentation.** After the "Modify Existing Themes" section, add a new section:

```markdown
---

## Design Tokens (.ralph/tokens.json)

The `theme` command generates `.ralph/tokens.json` alongside CSS — a structured DTCG-format token file with full color data, contrast ratios, font metadata, shadow primitives, and mood personality.

**Query tokens from the shell:**
```bash
tokens                    # Full token summary (palette, contrast, fonts, shadows, mood)
tokens contrast           # Contrast ratio table — check before choosing color pairings
tokens palette            # Brand, surface, and text color tables
tokens font               # Font families, categories, weights
tokens shadow             # Shadow scale and primitives
tokens mood               # Mood personality: typography hierarchy, animation timing, spacing
```

**Use tokens data to inform design decisions.** Don't guess animation durations — check `tokens mood`. Don't guess contrast — check `tokens contrast`. The data is generated from the same OKLCH math as the theme.
```

**Add smart merge documentation.** After the "Customization Workflow" section, add:

```markdown
---

## Smart Merge Protection

When Ralph writes to `src/index.css` (via heredoc or redirect), the harness runs smart merge if a theme zone exists (marked by `/* Generated by theme command */`).

**What smart merge does:**
- Preserves the generated `:root` and `.dark` variable blocks
- Allows Ralph to ADD new CSS (keyframes, utilities, custom classes) outside the theme zone
- Validates any color overrides against WCAG AA contrast (4.5:1 minimum)
- Rejects invalid overrides with actionable feedback
- Syncs accepted color changes back to `tokens.json`

**What this means for you:**
- `cat > src/index.css` will NOT nuke your theme — smart merge protects it
- You CAN append CSS with `cat >> src/index.css` (appending bypasses merge)
- Individual variable tweaks via `replace` or `sed` work normally
- If you need to completely replace a theme, run `theme preset <n> --apply` again
```

**Update the opacity section.** The theming skill currently shows `color-mix()` for opacity. Add a note about Tailwind v4 native support:

Find the "Opacity with color-mix()" section header and add before the examples:
```markdown
**Tailwind v4:** Opacity modifiers work natively with OKLCH — use `bg-primary/30` in className.
**CSS:** Use `color-mix` when writing raw CSS (keyframes, custom properties):
```

### 6. Update gumdrops/SKILL.md

**File:** `apps/ide/src/skills/gumdrops/SKILL.md`

**Update component count.** Find all instances of "53 components" and replace with "52 component families with 150+ exported parts".

Find:
```
| Component | What You Don't Know | Where To Use It |
```
Add `Carousel` to the underused components table:
```
| Carousel | Embla-powered accessible carousel | Testimonials, image gallery, feature showcase |
```

### 7. Update stack SKILL.md (now in skills/stack/)

**File:** `apps/ide/src/skills/stack/SKILL.md` (moved from packages/stack/ in change 9)

**Update component count.** Replace:
```
Theme-agnostic React component library with 53 components built on Radix primitives.
```
With:
```
Theme-agnostic React component library with 52 component families and 150+ exported parts, built on Radix primitives.
```

Also update the "Available Components" header:
```
## Available Components (52 families)
```

**Remove nonexistent skill references.** Find:
```markdown
## Required Skills

Before writing UI code, you MUST also follow:
- `react-best-practices` - Performance patterns (waterfalls, bundle size)
- `web-design-guidelines` - Accessibility & UX rules
```
Replace with:
```markdown
## Related Skills

Search for implementation guidance:
- `grep skill "accessibility"` — a11y rules, focus states, labels
- `grep skill "dark mode"` — theming, form contrast
- `grep skill "layout patterns"` — composition, sequencing rules
```

**Fix font guidance.** The "External Resources" section says to edit index.html `<head>` to add font links. This is WRONG — index.html is generated by the scaffold and Ralph should not be editing it directly for fonts.

Replace the entire External Resources / Fonts section:
```markdown
### Fonts

Do NOT use `@import url()` in CSS — esbuild cannot process external URLs.
Do NOT manually edit index.html to add font links — the theme system handles this.

**Correct approach:** The `theme` command with `--font` or `--mood` automatically adds the right font link to index.html. If you need a custom font, use the `/* @fonts: FontName */` comment in src/index.css — the smart merge system reads this and ensures the font is loaded.

```css
/* @fonts: Space Grotesk, JetBrains Mono */
```

Or use Tailwind's default font stack (no external fonts needed).
```

### 8. Update extended-libraries/SKILL.md

**File:** `apps/ide/src/skills/extended-libraries/SKILL.md`

**Add modules command reference.** After the intro paragraph, add:

```markdown
**Cache management:** Use `modules list` to see cached packages, `modules status` for cache stats, `modules warm <pkg>` to pre-cache, `modules clear` to reset.
```

### 9. Consolidate all skills into one location

**Move:** `packages/stack/SKILL.md` → `apps/ide/src/skills/stack/SKILL.md`

All skills should live under `apps/ide/src/skills/`. The stack SKILL.md currently lives in `packages/stack/` which:
- Requires a fragile 5-level relative import: `../../../../../packages/stack/SKILL.md?raw`
- Splits skill maintenance across two locations
- Isn't needed for package publishing (@wiggum/stack is internal, Ralph is the only consumer)

Steps:
1. Copy `packages/stack/SKILL.md` to `apps/ide/src/skills/stack/SKILL.md`
2. Delete the original from `packages/stack/SKILL.md`
3. Update the import in `skills.ts`:

Replace:
```typescript
import stackSkill from '../../../../../packages/stack/SKILL.md?raw'
```
With:
```typescript
import stackSkill from '../../skills/stack/SKILL.md?raw'
```

All skills now live under `apps/ide/src/skills/`:
```
skills/
├── stack/SKILL.md              # Component library (moved from packages/)
├── ralph/SKILL.md              # Ralph loop state docs (REWRITTEN)
├── frontend-design/SKILL.md    # Design thinking
├── code-quality/SKILL.md       # React patterns, a11y
├── theming/SKILL.md            # Theme command, OKLCH, tokens
├── gumdrops/SKILL.md           # Compositional recipes
│   ├── marketing/              # Recipe subdirectories (14 recipes)
│   ├── app/                    # (21 recipes)
│   ├── content/                # (4 recipes)
│   └── interactive/            # (7 recipes)
└── extended-libraries/SKILL.md # npm packages
```

(creativity/ directory deleted per change 2)

### 10. Update skills.ts — remove creativity, update summary

**File:** `apps/ide/src/lib/ralph/skills.ts`

Remove import and array entry for `creativity` (per change 2). Keep `ralph` but it's now rewritten (per change 1).

Update the `getSkillsContent()` summary table. Replace:
```markdown
| Skill | Topics |
|-------|--------|
| frontend-design | Design thinking, aesthetic direction, anti-slop philosophy |
| stack | Components, imports, project structure |
| code-quality | React patterns, accessibility, form contrast, overlays |
| theming | CSS variables, colors, animations, dark mode |
| gumdrops | Compositional recipes: marketing, app, content, interactive patterns |
| extended-libraries | Available npm packages, when-to-use, import patterns |
| creativity | → See gumdrops for layout patterns and design variety |
```

With:
```markdown
| Skill | Topics |
|-------|--------|
| frontend-design | Design thinking, aesthetic direction, anti-slop philosophy, design briefs |
| stack | 52 component families (150+ exports), imports, project structure |
| code-quality | React patterns, accessibility, OKLCH theming, form contrast, overlays |
| theming | Theme command, 12 presets, 12 moods, OKLCH colors, animations, dark mode, tokens, smart merge |
| gumdrops | Compositional recipes: marketing (14), app (21), content (4), interactive (7) |
| ralph | Ralph loop state files, commands, iteration workflow |
| extended-libraries | Available npm packages, when-to-use, import patterns, cache management |
```

Update priority comments:
```typescript
/**
 * Skills in priority order:
 * 0. Frontend design - Design thinking, aesthetic direction, anti-slop philosophy
 * 1. Stack skill - authoritative rules and component documentation
 * 2. Code quality - React patterns, accessibility, OKLCH theming, overlays
 * 3. Theming skill - Theme command, presets, OKLCH, animations, tokens, smart merge
 * 4. Gumdrops - Compositional recipes for sections, pages, data flows
 * 5. Extended libraries - npm packages beyond stack, with when-to-use guidance
 * 6. Ralph - Loop state management, commands, iteration workflow
 */
```

### 11. Update loop.ts system prompt component count

**File:** `apps/ide/src/lib/ralph/loop.ts`

Find all instances of "60+ production UI components" (appears twice in system prompt) and replace with "52 component families with 150+ exported parts".

---

## Future Skills (Post-Hono)

**DO NOT create these yet.** These are placeholders for when the Hono full-stack spike proves out the architecture. Writing them before implementation would repeat the old ralph/SKILL.md mistake — fiction masquerading as guidance.

Three new skills to add under `apps/ide/src/skills/` once Hono lands:

### `fullstack/SKILL.md`
- When to go full-stack vs frontend-only (decision framework)
- Shared Zod schemas as single source of truth between client and server
- Client-server data flow patterns
- API route definition and organization
- The `api` shell command (if built)
- How frontend and backend builds work together in the browser sandbox
- Anti-patterns: don't duplicate types, don't fetch without react-query, don't skip validation

### `security/SKILL.md`
- Input validation (Zod on both sides — never trust the client)
- CORS configuration patterns
- Auth patterns (JWT, session, API keys)
- Secrets handling in browser sandbox context
- XSS prevention (sanitization, CSP)
- CSRF protection
- Rate limiting patterns
- What the service worker boundary means for security
- Anti-patterns: don't store secrets in localStorage, don't trust client-side auth alone

### `hono/SKILL.md`
- Route definition patterns and file organization
- Middleware chain (logging, auth, validation, error handling)
- Hono RPC client for type-safe frontend calls
- Error handling and response patterns
- The service worker API layer
- Data store patterns (IndexedDB, in-memory)
- Anti-patterns: don't build Express in Hono, don't skip middleware, don't mix concerns

**Seed material:** `docs/plans/hono-fullstack-plan.md` already has a skills section sketched out. Use it as starting point but verify against actual implementation.

**When to write:** After Hono spike is merged, tested, and Ralph has completed at least one full-stack task successfully. Skills should document proven patterns, not aspirational ones.

After these ship, the skills directory becomes:
```
skills/
├── stack/SKILL.md
├── ralph/SKILL.md
├── frontend-design/SKILL.md
├── code-quality/SKILL.md
├── theming/SKILL.md
├── gumdrops/SKILL.md
│   ├── marketing/
│   ├── app/
│   ├── content/
│   └── interactive/
├── extended-libraries/SKILL.md
├── fullstack/SKILL.md          ← NEW (post-Hono)
├── security/SKILL.md           ← NEW (post-Hono)
└── hono/SKILL.md               ← NEW (post-Hono)
```

---

## Summary of changes

| Action | File | What |
|--------|------|------|
| REWRITE | `apps/ide/src/skills/ralph/SKILL.md` | Fix paths (`.wiggum/ralph/` → `.ralph/`), fix file list, document actual commands |
| DELETE | `apps/ide/src/skills/creativity/SKILL.md` | Token-wasting redirect, zero value |
| MOVE | `packages/stack/SKILL.md` → `apps/ide/src/skills/stack/SKILL.md` | Consolidate all skills in one location |
| EDIT | `apps/ide/src/skills/frontend-design/SKILL.md` | HSL→OKLCH examples, add personality/mood workflow, update skill reference table |
| EDIT | `apps/ide/src/skills/code-quality/SKILL.md` | Fix `hsl(var())` → `var()` in dark mode section |
| EDIT | `apps/ide/src/skills/theming/SKILL.md` | 6→12 moods (correct names!), add tokens docs, smart merge docs, Tailwind v4 opacity |
| EDIT | `apps/ide/src/skills/gumdrops/SKILL.md` | "53 components"→"52 component families with 150+ exported parts", add Carousel to underused |
| EDIT | `apps/ide/src/skills/stack/SKILL.md` | Same component count fix, remove dead skill refs (`react-best-practices`, `web-design-guidelines`), fix font guidance (remove index.html edit, use @fonts comment) |
| EDIT | `apps/ide/src/skills/extended-libraries/SKILL.md` | Add modules command ref |
| EDIT | `apps/ide/src/lib/ralph/skills.ts` | Remove creativity, update summary table, update priority comments |
| EDIT | `apps/ide/src/lib/ralph/loop.ts` | "60+ production UI components"→"52 component families with 150+ exported parts" |

## Files changed
1. `apps/ide/src/skills/ralph/SKILL.md` — REWRITE with correct state docs
2. `apps/ide/src/skills/creativity/` — DELETE directory
3. `packages/stack/SKILL.md` — DELETE (moved to skills/)
4. `apps/ide/src/skills/stack/SKILL.md` — NEW (moved from packages/stack/), with fixes
5. `apps/ide/src/skills/frontend-design/SKILL.md` — OKLCH examples, personality workflow
6. `apps/ide/src/skills/code-quality/SKILL.md` — OKLCH color fix (no dead refs to remove)
7. `apps/ide/src/skills/theming/SKILL.md` — 12 correct moods, tokens, smart merge, Tailwind v4
8. `apps/ide/src/skills/gumdrops/SKILL.md` — component count
9. `apps/ide/src/skills/extended-libraries/SKILL.md` — modules command
10. `apps/ide/src/lib/ralph/skills.ts` — imports, array, summary
11. `apps/ide/src/lib/ralph/loop.ts` — component count in system prompt

## Corrections from previous version

This document replaces the original cc-skills-tightening.md. Key corrections:

| Previous Claim | Correction |
|----------------|------------|
| ralph skill is "100% fiction" — DELETE | Commands exist (`ralph init/run/status/resume`). Skill just has wrong paths and file list. REWRITE instead. |
| creativity has "wrong paths" | `.skills/` paths are valid — `initSkillsFiles()` copies skills there. Still DELETE for token waste. |
| frontend-design has "wrong file paths (`cat .skills/...`)" | These paths WORK. `state.ts` copies skills to `.skills/` at init. No path fix needed. |
| code-quality "references nonexistent skills" | No dead skill refs found in current file. Those refs (`react-best-practices`, `web-design-guidelines`) are in stack/SKILL.md, not code-quality. |
| theming mood table listed cyberpunk, retrofuture, festive, noir | These moods DO NOT EXIST in `personalities.ts`. Correct 12: minimal, premium, playful, industrial, organic, editorial, fashion-editorial, brutalist, zen, corporate, retro, luxury. |
| "53 components" should be "60+" | Neither is accurate. Actual: 52 component files exporting 150+ named parts. Sidebar alone exports 24. |
| stack/SKILL.md font guidance not flagged | NEW issue: says edit index.html `<head>` for fonts, but index.html is locked/scaffolded. Should use `/* @fonts: ... */` comment in index.css. |
| No mention of loop.ts system prompt | NEW: loop.ts says "60+ production UI components" twice — needs same count fix. |
