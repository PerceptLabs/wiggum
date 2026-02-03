# Skills Consolidation & Grep-Based Lookup

> Transform Ralph's skills from a context dump into a searchable knowledge base.

## Problem Statement

Current approach dumps ~800+ lines of rules into every prompt:
- `react-best-practices`: 57 rules (~200 lines)
- `web-design-guidelines`: 100+ rules (~300 lines)
- `theming`: ~300 lines
- `wiggum-stack`: ~200 lines
- `wiggum-stack-quickref`: ~150 lines (redundant)

**Result**: Ralph drowns in context, ignores critical rules (like dark mode form contrast), and produces cookie-cutter designs.

## Solution

1. **Consolidate** react-best-practices + web-design-guidelines → `code-quality`
2. **Create** new `creativity` skill for layout patterns and design variety
3. **Add** `skill` subcommand to grep for on-demand lookup
4. **Reduce** context to skill summaries + grep instructions

---

## Task List

### Phase 1: Skill Consolidation

- [ ] Create `apps/ide/src/skills/code-quality/SKILL.md`
  - Merge React + Web Design into ~100 focused lines
  - Prioritize CRITICAL rules first
  - Add "Before Marking Complete" checklist
  - Wiggum-specific (not generic web advice)

- [ ] Create `apps/ide/src/skills/creativity/SKILL.md`
  - Layout patterns (bento, split-screen, overlapping, diagonal)
  - Design variety guidelines
  - Project-type matching
  - Motion ideas (CSS-only)

- [ ] Update `apps/ide/src/skills/theming/SKILL.md`
  - Add overlay/z-index guidance (CRITICAL section)
  - Add native form element contrast fix
  - Add contrast verification checklist

- [ ] Delete redundant files
  - `apps/ide/src/skills/react-best-practices/` (merged into code-quality)
  - `apps/ide/src/skills/web-design-guidelines/` (merged into code-quality)
  - `apps/ide/src/skills/wiggum-stack/SKILL.md` (redundant with packages/stack/SKILL.md)

### Phase 2: Grep Skill Command

- [ ] Add skill search to `apps/ide/src/lib/shell/commands/grep.ts`
  - Support `grep skill "<query>"` syntax
  - Search all skill content for matching lines
  - Return 3-5 lines of context around matches
  - Highlight the query terms

- [ ] Create skill search index in `apps/ide/src/lib/ralph/skills.ts`
  - Export `searchSkills(query: string): SkillSearchResult[]`
  - Return skill name, matched section, surrounding context
  - Support fuzzy matching for typos

- [ ] Update shell command registry
  - Pass skills content to grep command context
  - Or create separate `skills` command if cleaner

### Phase 3: Update Skills Loader

- [ ] Modify `apps/ide/src/lib/ralph/skills.ts`
  - Only inject skill SUMMARIES into system prompt
  - Each skill gets 2-3 line description + key topics
  - Full content available via grep

- [ ] Update system prompt in `apps/ide/src/lib/ralph/loop.ts`
  - Add grep skill examples
  - Emphasize "look up before implementing"
  - Remove full skill content injection

### Phase 4: Testing & Validation

- [ ] Test grep skill functionality
  - `grep skill "dark mode"` → returns contrast rules
  - `grep skill "bento grid"` → returns layout pattern
  - `grep skill "form accessibility"` → returns label rules

- [ ] Test Ralph with new system
  - Build landing page → uses creativity skill
  - Build app with forms → greps for accessibility
  - Build dark theme → greps for contrast rules

---

## Deliverables

### 1. code-quality Skill (~100 lines)

```markdown
---
name: code-quality
description: Essential React and UI quality rules for Wiggum projects
when_to_use: Every project - non-negotiable quality standards
---

# Code Quality

Rules you MUST follow. Use `grep skill "<topic>"` for details.

## React Essentials

### State Management
- Compute derived values during render, not in useEffect
- Use functional setState: `setCount(prev => prev + 1)`
- useRef for values that change but don't need re-render

### Performance
- Parallelize: `Promise.all([fetchA(), fetchB()])`
- Ternary over &&: `{items.length > 0 ? <List /> : null}`
- Stable keys: `key={item.id}` never `key={index}`

### Imports
- Import from @wiggum/stack, not raw HTML
- One component per file, max 200 lines

## Accessibility (Non-Negotiable)

- Form inputs MUST have `<Label htmlFor="id">`
- Icon buttons MUST have `aria-label`
- Interactive elements: `focus-visible:ring-2 ring-ring`
- Animations: include `@media (prefers-reduced-motion)`

## Dark Mode / Theming (CRITICAL)

Native form elements ignore CSS variables. Always add to src/index.css:

```css
select, input, textarea {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

select option {
  background-color: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
}
```

## Overlays & Modals (CRITICAL)

- Use Dialog/Sheet from @wiggum/stack (handles z-index automatically)
- Custom overlays: backdrop `fixed inset-0 bg-black/50 z-40`, content `z-50`
- Never manually stack multiple overlays
- Always include close mechanism (X button, click outside, Escape key)

## Anti-Patterns

| Never Do | Do Instead |
|----------|------------|
| `<button>`, `<input>` raw | Import from @wiggum/stack |
| `outline-none` alone | Add `focus-visible:ring-2` |
| `transition: all` | List properties explicitly |
| `<div onClick>` for nav | Use `<a>` or `<Link>` |
| Images without dimensions | Add `width` and `height` |
| Form inputs without labels | Add `<Label htmlFor>` |

## Before Marking Complete

Verify each item:

- [ ] All form inputs have visible labels
- [ ] Text readable in ALL inputs (test dark themes!)
- [ ] Interactive elements have focus states
- [ ] No overlapping/broken modals
- [ ] Animations respect reduced-motion preference
- [ ] No console errors or warnings
```

### 2. creativity Skill (~80 lines)

```markdown
---
name: creativity
description: Layout patterns and design variety for unique projects
when_to_use: Landing pages, marketing sites, portfolios - anything user-facing
---

# Design Creativity

Every project deserves a unique layout. Don't default to cookie-cutter.

## Avoid This Pattern

```
Hero Section
    ↓
3-Card Feature Grid
    ↓
CTA Section
```

This is AI slop. Be better.

## Layout Patterns

### Bento Grid
Asymmetric boxes of different sizes. Great for features, portfolios.
```
┌──────────┬─────┐
│   Big    │ Sm  │
│          ├─────┤
├────┬─────┤ Sm  │
│ Sm │ Med │     │
└────┴─────┴─────┘
```
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-2 row-span-2">Big</div>
  <div>Small</div>
  <div>Small</div>
  <div>Small</div>
  <div className="col-span-2">Medium</div>
</div>
```

### Split Screen
50/50 or 60/40 divisions. Image + text, demo + description.
```tsx
<div className="grid grid-cols-2 min-h-screen">
  <div className="bg-primary" />
  <div className="flex items-center p-12">Content</div>
</div>
```

### Overlapping Sections
Cards that bleed into the next section. Creates depth.
```tsx
<section className="bg-primary pb-32" />
<section className="relative -mt-24">
  <Card className="mx-auto max-w-4xl" />
</section>
```

### Diagonal Dividers
Angled section breaks instead of straight lines.
```css
.diagonal-top {
  clip-path: polygon(0 10%, 100% 0, 100% 100%, 0 100%);
}
```

### Floating Elements
Images or cards that break container boundaries.
```tsx
<div className="relative">
  <img className="absolute -right-12 -top-8 w-64" />
</div>
```

## Match Layout to Project

| Project Type | Layout Direction |
|--------------|------------------|
| SaaS/Product | Clean grid, clear hierarchy, prominent CTA |
| Portfolio | Asymmetric, full-bleed images, personality |
| App/Dashboard | Dense, functional, minimal decoration |
| E-commerce | Product-focused, scannable, trust signals |
| Creative/Agency | Bold, unexpected, memorable |

## Color Personality

| Palette | Vibe |
|---------|------|
| Warm (orange, coral) | Friendly, energetic |
| Cool (blue, teal) | Trustworthy, calm |
| Dark + neon accents | Techy, futuristic |
| Pastels | Soft, approachable |
| Monochrome + one accent | Sophisticated |

## Motion Ideas (CSS-only)

```css
/* Staggered entrance */
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: 0.1s; }
.stagger > *:nth-child(3) { animation-delay: 0.2s; }

/* Floating decoration */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Parallax-lite on scroll */
.parallax { transform: translateY(calc(var(--scroll) * 0.5)); }
```

## The Golden Rule

Before starting, ask: "What makes THIS project different?"

Then design for that difference.
```

### 3. Updated theming Skill Additions

Add to existing theming skill:

```markdown
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
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}

select option {
  background-color: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
}

/* For autofill */
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px hsl(var(--background)) inset;
  -webkit-text-fill-color: hsl(var(--foreground));
}
```

**Test before marking complete**: Switch to dark mode and verify ALL inputs are readable.
```

### 4. System Prompt Changes

**Before** (in loop.ts):
```typescript
const systemPrompt = `...
${getSkillsContent()} // Dumps 800+ lines
`
```

**After**:
```typescript
const systemPrompt = `...

# Skills

Available knowledge bases you can search:

| Skill | Topics |
|-------|--------|
| wiggum-stack | Components, imports, project structure |
| code-quality | React patterns, accessibility, form contrast, overlays |
| theming | CSS variables, colors, animations, dark mode |
| creativity | Layout patterns, design variety, motion |

## How to Use

Search skills with grep before implementing unfamiliar patterns:

\`\`\`bash
grep skill "dark mode form"     # → contrast rules for inputs
grep skill "bento grid"         # → layout pattern code
grep skill "dialog z-index"     # → overlay stacking rules
grep skill "staggered animation" # → CSS keyframe examples
\`\`\`

**Always grep when unsure.** Skills contain critical rules that prevent bugs.
`
```

### 5. Grep Skill Implementation

Add to `grep.ts`:

```typescript
// At top of file
import { getSkillsRaw } from '../../ralph/skills'

// In execute method, before file handling:
if (positionalArgs[0] === 'skill' || positionalArgs[0] === 'skills') {
  const query = positionalArgs.slice(1).join(' ')
  if (!query) {
    return { exitCode: 2, stdout: '', stderr: 'grep skill: missing query' }
  }
  return this.searchSkills(query, ignoreCase)
}

// New method
private searchSkills(query: string, ignoreCase: boolean): ShellResult {
  const skills = getSkillsRaw() // Returns array of { id, content }
  const regex = new RegExp(query, ignoreCase ? 'gi' : 'g')
  const results: string[] = []
  
  for (const skill of skills) {
    const lines = skill.content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        regex.lastIndex = 0
        
        // Get surrounding context (3 lines before, 3 after)
        const start = Math.max(0, i - 3)
        const end = Math.min(lines.length - 1, i + 3)
        const context = lines.slice(start, end + 1).join('\n')
        
        results.push(`--- ${skill.id} (line ${i + 1}) ---\n${context}`)
      }
    }
  }
  
  if (results.length === 0) {
    return { 
      exitCode: 1, 
      stdout: '', 
      stderr: `No matches for "${query}" in skills` 
    }
  }
  
  return {
    exitCode: 0,
    stdout: results.join('\n\n'),
    stderr: ''
  }
}
```

Add to `skills.ts`:

```typescript
/**
 * Get raw skill content for grep searching
 */
export function getSkillsRaw(): Array<{ id: string; content: string }> {
  return SKILLS.map(({ id, content }) => ({ id, content }))
}
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `apps/ide/src/skills/code-quality/SKILL.md` | CREATE |
| `apps/ide/src/skills/creativity/SKILL.md` | CREATE |
| `apps/ide/src/skills/theming/SKILL.md` | UPDATE (add overlay/contrast sections) |
| `apps/ide/src/skills/react-best-practices/` | DELETE |
| `apps/ide/src/skills/web-design-guidelines/` | DELETE |
| `apps/ide/src/skills/wiggum-stack/` | DELETE |
| `apps/ide/src/lib/shell/commands/grep.ts` | UPDATE (add skill search) |
| `apps/ide/src/lib/ralph/skills.ts` | UPDATE (add getSkillsRaw, change getSkillsContent) |
| `apps/ide/src/lib/ralph/loop.ts` | UPDATE (skill summaries, not full content) |

---

## Expected Outcomes

### Context Reduction

| Before | After |
|--------|-------|
| ~800 lines in every prompt | ~30 lines (summaries + grep instructions) |
| Ralph ignores most rules | Ralph looks up what's relevant |
| Same output every time | Targeted knowledge per task |

### Quality Improvement

| Issue | Fix |
|-------|-----|
| Dark mode input contrast | code-quality: "Before Marking Complete" checklist |
| Modal overlay chaos | theming: explicit z-index scale |
| Cookie-cutter layouts | creativity: layout patterns + "what makes THIS different?" |
| Ignored accessibility | code-quality: non-negotiable section |

### Developer Experience

```bash
# Ralph can now do this:
grep skill "form accessibility"
# Returns: Label rules, aria requirements, focus states

grep skill "dark mode"  
# Returns: Native element fix, contrast testing reminder

grep skill "asymmetric layout"
# Returns: Bento grid code, overlapping sections

grep skill "entrance animation"
# Returns: Keyframe examples, stagger patterns
```

---

## Success Criteria

1. **Context size**: System prompt skills section < 50 lines
2. **Grep works**: `grep skill "query"` returns relevant results
3. **Quality gates pass**: Dark mode forms are readable
4. **Design variety**: Two landing pages look meaningfully different
5. **Ralph self-corrects**: Uses grep when encountering unfamiliar patterns

---

## Implementation Order

1. **Create new skills** (code-quality, creativity) - can test grep manually
2. **Update theming** - add critical sections
3. **Implement grep skill** - enables the new workflow
4. **Update skills loader** - switch from dump to summaries
5. **Delete old skills** - cleanup
6. **Test end-to-end** - build real projects with Ralph

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Ralph doesn't grep | Add to "Before you start" in system prompt |
| Grep returns too much | Limit to 5 most relevant matches |
| Grep returns nothing | Fuzzy match, suggest related queries |
| Lost important rules | Keep critical rules in summaries, not just grep |
| Skill content stale | Skills still bundled at build time (no change) |
