# CC Prompt: Skills Tightening

Comprehensive update to all skill files based on observations from Ralph's reflections, system evolution, and audit of stale/wrong content. Skills are Ralph's knowledge base — searched via `grep skill` during builds. Stale skills = stale output.

---

## Audit Summary

| Skill | Status | Issues |
|-------|--------|--------|
| ralph | ❌ DELETE | 100% fiction — describes `.wiggum/ralph/`, commands that never existed |
| creativity | ❌ DELETE | Empty redirect stub, wrong paths, wastes token budget |
| frontend-design | ⚠️ FIX | Wrong file paths (`cat .skills/...`), HSL examples, missing new capabilities |
| code-quality | ⚠️ FIX | Uses `hsl(var(--...))` (wrong for OKLCH), references nonexistent skills |
| theming | ⚠️ FIX | Only 6 moods (have 12), missing tokens/smart merge/design brief docs |
| gumdrops | ⚠️ FIX | Says 53 components (have 60+), otherwise solid |
| stack (packages/) | ⚠️ FIX | Says 53 components, references nonexistent skills |
| extended-libraries | ✅ OK | Minor: mention `modules` command |

---

## Changes

### 1. DELETE ralph/SKILL.md

**File:** `apps/ide/src/skills/ralph/SKILL.md` — DELETE THIS FILE

The entire content is fiction. It describes:
- `.wiggum/ralph/` (actual path: `.ralph/`)
- `ralph init`, `ralph run`, `ralph status`, `ralph resume` (none exist)
- A completely different workflow than the actual Ralph loop

Ralph's actual behavior is defined by the system prompt in `loop.ts`, not a skill file. There is no value in having a "ralph" skill — Ralph doesn't grep for instructions about itself.

Also remove from `skills.ts`:
```typescript
// DELETE this import
import ralphSkill from '../../skills/ralph/SKILL.md?raw'

// DELETE from SKILLS array
{ id: 'ralph', content: ralphSkill, priority: ... },
```

### 2. DELETE creativity/SKILL.md

**File:** `apps/ide/src/skills/creativity/SKILL.md` — DELETE THIS FILE

It's a redirect stub with wrong paths (`cat .skills/gumdrops.md`). Everything it points to is already in gumdrops and frontend-design. Wastes a skill slot and confuses grep results.

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

**Fix wrong paths.** Find ALL instances of `cat .skills/` and replace with `grep skill` patterns:

Replace:
```
cat .skills/theming.md
cat .skills/gumdrops.md
```
With nothing — remove those lines. The existing `grep skill "..."` examples in the same file are correct.

**Fix the skill reference table at the bottom.** Replace:
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
| stack | 60+ components, imports, project structure |
| theming | Theme command, presets, OKLCH colors, animations, dark mode |
| gumdrops | Compositional recipes, page templates, anti-slop |
| code-quality | React patterns, accessibility, form contrast |
| extended-libraries | npm packages beyond stack, when-to-use guidance |

```bash
grep skill "<topic>"           # Search all skills by keyword
grep skill "layout patterns"   # Find layout recipes
grep skill "animation"         # Find animation guidance
```
```

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

**Add design brief reference.** In the "Design Thinking" section, after the 3 questions, add:

```markdown
**Design Briefs:** When the `theme` command runs with `--mood`, it generates `.ralph/design-brief.md` — a personality brief with typography hierarchy, animation timing, spacing rhythm, and strict rules. Read it before writing any code in src/. It's your creative director for this project.
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

### 5. Update theming/SKILL.md

**File:** `apps/ide/src/skills/theming/SKILL.md`

**Update mood table.** Replace the 6-mood table with the full 12:

```markdown
| Mood | Character |
|------|-----------|
| `minimal` | Content-first. Subtle easing, generous whitespace, no decoration. |
| `premium` | Polished luxury. Light weights at large sizes, spring animations, rich layering. |
| `luxury` | Whisper, don't shout. Exclusivity through absence. Ultra-thin type, glacial easing. |
| `playful` | Bouncy and bright. Rounded shapes, animated micro-interactions, surprise. |
| `industrial` | Raw structure. Mono fonts, no rounded corners, linear easing, sharp contrast. |
| `organic` | Flowing and warm. Rounded everything, slow easing, natural spacing. |
| `editorial` | Typography-led. Serif body, tight tracking, print-inspired, minimal color. |
| `cyberpunk` | Neon rebellion. Glitch effects, sharp angles, high contrast, scanline overlays. |
| `retrofuture` | Tomorrow through yesterday's eyes. CRT glow, warm analog, tech-nostalgic. |
| `zen` | Quiet presence. Maximum whitespace, slow reveals, barely-there borders. |
| `festive` | Celebration energy. Bold colors, confetti motion, playful excess. |
| `noir` | Dark drama. Deep shadows, minimal color, cinematic contrast, moody. |
```

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

**Update component count.** Find all instances of "53 components" and replace with "60+ components".

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
Theme-agnostic React component library with 60+ components built on Radix primitives.
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
├── frontend-design/SKILL.md    # Design thinking
├── code-quality/SKILL.md       # React patterns, a11y
├── theming/SKILL.md            # Theme command, OKLCH, tokens
├── gumdrops/SKILL.md           # Compositional recipes
│   ├── marketing/              # Recipe subdirectories
│   ├── app/
│   ├── content/
│   └── interactive/
└── extended-libraries/SKILL.md # npm packages
```

(ralph/ and creativity/ directories deleted per changes 1 and 2)

### 10. Update skills.ts — remove deleted skills, update summary

**File:** `apps/ide/src/lib/ralph/skills.ts`

Remove imports and array entries for `ralph` and `creativity` (per changes 1 and 2).

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
| stack | 60+ components, imports, project structure |
| code-quality | React patterns, accessibility, OKLCH theming, form contrast, overlays |
| theming | Theme command, 12 presets, sacred geometry, OKLCH colors, animations, dark mode, tokens, smart merge |
| gumdrops | Compositional recipes: marketing, app, content, interactive patterns |
| extended-libraries | Available npm packages, when-to-use, import patterns, cache management |
```

Update priority comments to remove ralph and creativity:
```typescript
/**
 * Skills in priority order:
 * 0. Frontend design - Design thinking, aesthetic direction, anti-slop philosophy
 * 1. Stack skill - authoritative rules and component documentation
 * 2. Code quality - React patterns, accessibility, OKLCH theming, overlays
 * 3. Theming skill - Theme command, presets, OKLCH, animations, tokens, smart merge
 * 4. Gumdrops - Compositional recipes for sections, pages, data flows
 * 5. Extended libraries - npm packages beyond stack, with when-to-use guidance
 */
```

---

---

## Future Skills (Post-Hono)

**DO NOT create these yet.** These are placeholders for when the Hono full-stack spike proves out the architecture. Writing them before implementation would repeat the ralph/SKILL.md mistake — fiction masquerading as guidance.

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
| DELETE | `apps/ide/src/skills/ralph/SKILL.md` | 100% fiction, describes nonexistent system |
| DELETE | `apps/ide/src/skills/creativity/SKILL.md` | Empty redirect, wrong paths |
| MOVE | `packages/stack/SKILL.md` → `apps/ide/src/skills/stack/SKILL.md` | Consolidate all skills in one location |
| EDIT | `apps/ide/src/skills/frontend-design/SKILL.md` | Fix paths, HSL→OKLCH examples, add design brief ref |
| EDIT | `apps/ide/src/skills/code-quality/SKILL.md` | Fix `hsl(var())` → `var()`, remove dead skill refs |
| EDIT | `apps/ide/src/skills/theming/SKILL.md` | 6→12 moods, add tokens docs, smart merge docs, Tailwind v4 opacity |
| EDIT | `apps/ide/src/skills/gumdrops/SKILL.md` | 53→60+ components, add Carousel to underused |
| EDIT | `apps/ide/src/skills/stack/SKILL.md` | 53→60+ components, fix dead skill refs |
| EDIT | `apps/ide/src/skills/extended-libraries/SKILL.md` | Add modules command ref |
| EDIT | `apps/ide/src/lib/ralph/skills.ts` | Remove ralph+creativity, move stack import, update summary |

## Files changed
1. `apps/ide/src/skills/ralph/` — DELETE directory
2. `apps/ide/src/skills/creativity/` — DELETE directory
3. `packages/stack/SKILL.md` — DELETE (moved to skills/)
4. `apps/ide/src/skills/stack/SKILL.md` — NEW (moved from packages/stack/)
5. `apps/ide/src/skills/frontend-design/SKILL.md` — path fixes, OKLCH, design brief
6. `apps/ide/src/skills/code-quality/SKILL.md` — OKLCH fix, dead refs removed
7. `apps/ide/src/skills/theming/SKILL.md` — 12 moods, tokens, smart merge, Tailwind v4
8. `apps/ide/src/skills/gumdrops/SKILL.md` — component count
9. `apps/ide/src/skills/extended-libraries/SKILL.md` — modules command
10. `apps/ide/src/lib/ralph/skills.ts` — imports, array, summary
