# Harness Applies Plan Context — Theme + Recipes at PLAN→BUILD Transition

*Created: 2026-02-25 · Depends on: phase-gated loop (just shipped)*

---

## The Problem

Ralph can't see colors and can't reliably discover recipes. Evidence from task-1772008577742:

1. `grep "gumdrop" .skill` → "No such file or directory" (wrong path)
2. `grep "gumdrop" .skills` → repeated failures with path variations  
3. `search: query="gumdrop hero recipe"` → returns generic results, not the actual recipe
4. Gives up → "manually built sections without gumdrop templates"
5. `theme preset cyberpunk --apply` → `theme generate ... --apply` → `replace` on index.css → `cat > index.css` — three theme applications, hand-editing CSS

Ralph declared the right things in plan.tsx (gumdrop names, theme mood). The plan was validated. But then during BUILD, Ralph had to re-discover everything through unreliable grep/search calls and second-guessed the theme because it can't see colors.

## The Fix

The harness applies the theme and pre-loads recipes during the PLAN→BUILD transition. Ralph enters BUILD with everything it needs in feedback.md. Zero discovery required during implementation.

```
Current transition (just shipped):
  1. Parse plan.tsx           ✅
  2. Validate structure       ✅
  3. Write "Plan Validated"   ✅
  4. Set phase to BUILD       ✅

New transition:
  1. Parse plan.tsx           ✅ (existing)
  2. Validate structure       ✅ (existing)
  3. Apply theme from <Theme> ← NEW (harness executes theme command)
  4. Load recipe for each <Section> gumdrop ← NEW (exact skill ID lookup)
  5. Write feedback.md with theme confirmation + all recipes
  6. Set phase to BUILD       ✅ (existing)
```

### Why This Is the Right Abstraction

This introduces a resolution layer between plan declaration and implementation:

```typescript
interface PlanContext {
  theme: { applied: boolean; command: string; output: string; error?: string }
  sections: Array<{
    gumdrop: string
    variant?: string
    recipe: string | null       // full recipe markdown
    components: string[]        // from recipe frontmatter
    suggestedFile: string       // e.g. "src/sections/HeroSection.tsx"
  }>
}
```

**Today:** `resolvePlanContext()` does direct skill ID lookup + shell.execute for theme.
**With registry (Stage 4):** Same interface, backed by typed registry queries. Component dependencies, prop schemas, accessibility notes all included.
**With skill graph (later):** Same interface, registry + WikiLink traversal bundles related skills (animation patterns for hero, contrast rules for pricing cards).

The caller (loop.ts transition block) never changes. Only the resolution implementation evolves.

---

## Implementation

### File 1: NEW — `plan-context.ts`

Location: `apps/ide/src/lib/ralph/plan-context.ts`

```typescript
/**
 * Plan Context Resolution — bridge between plan declaration and implementation.
 *
 * Resolves a validated plan tree into concrete resources:
 * - Theme configuration → executed theme command
 * - Section gumdrops → loaded recipe content
 *
 * This is the abstraction layer that the registry and skill graph will replace.
 * Today: direct skill ID lookup + shell.execute.
 * Tomorrow: typed registry queries + graph traversal.
 */

import type { PlanNode } from '@wiggum/planning/validate'
import { collectNodes } from '@wiggum/planning/validate'
import { getSkillsRaw } from './skills'
import type { ShellExecutor } from '../shell/executor'
import type { JSRuntimeFS } from '../fs/types'

// ============================================================================
// TYPES
// ============================================================================

export interface ThemeContext {
  applied: boolean
  command: string       // The theme command that was executed
  output: string        // stdout from theme command
  error?: string        // stderr if theme application failed
  mood?: string         // Resolved mood name
  font?: string         // Font from <Theme> block
}

export interface SectionContext {
  gumdrop: string
  variant?: string
  recipe: string | null         // Full recipe markdown content
  components: string[]          // Components from recipe frontmatter
  suggestedFile: string         // e.g. "src/sections/HeroSection.tsx"
}

export interface PlanContext {
  theme: ThemeContext
  sections: SectionContext[]
}

// ============================================================================
// RESOLUTION
// ============================================================================

/**
 * Resolve a validated plan tree into concrete build context.
 *
 * 1. Extract <Theme> props → build and execute theme command
 * 2. Extract each <Section> gumdrop → look up recipe by skill ID
 *
 * This function is the seam where the registry replaces direct lookups.
 */
export async function resolvePlanContext(
  root: PlanNode,
  fs: JSRuntimeFS,
  cwd: string,
  shell: ShellExecutor,
): Promise<PlanContext> {
  const theme = await resolveTheme(root, shell, cwd)
  const sections = resolveSections(root)
  return { theme, sections }
}

// ============================================================================
// THEME RESOLUTION
// ============================================================================

/**
 * Extract <Theme> props and execute the appropriate theme command.
 * Uses shell.execute() — same code path Ralph would use, but deterministic.
 */
async function resolveTheme(
  root: PlanNode,
  shell: ShellExecutor,
  cwd: string,
): Promise<ThemeContext> {
  const themes = root.children.filter(c => c.component === 'Theme')
  if (themes.length === 0) {
    return { applied: false, command: '', output: '', error: 'No <Theme> block in plan' }
  }

  const theme = themes[0]
  const { mood, font, shadowProfile, radius, seed, pattern, chroma } = theme.props

  // Build the theme command from props
  let command: string

  if (typeof seed === 'number' && typeof pattern === 'string') {
    // Generate mode: <Theme seed={180} pattern="triadic" mood="playful" ... />
    const parts = [`theme generate --seed ${seed} --pattern ${pattern}`]
    if (mood) parts.push(`--mood ${mood}`)
    if (chroma) parts.push(`--chroma ${chroma}`)
    if (font) parts.push(`--font "${font}"`)
    if (shadowProfile) parts.push(`--shadow-profile ${shadowProfile}`)
    if (radius) parts.push(`--radius ${radius}`)
    parts.push('--apply')
    command = parts.join(' ')
  } else if (mood) {
    // Preset mode: <Theme mood="cyberpunk" ... /> where mood is a preset name
    // (plan validation already confirmed mood is valid as mood OR preset)
    const parts = [`theme preset ${mood} --apply`]
    command = parts.join(' ')
  } else {
    return { applied: false, command: '', output: '', error: 'Cannot determine theme command from <Theme> props' }
  }

  // Execute theme command
  const result = await shell.execute(command, cwd)

  if (result.exitCode !== 0) {
    return {
      applied: false,
      command,
      output: result.stdout,
      error: result.stderr || 'Theme command failed',
      mood: typeof mood === 'string' ? mood : undefined,
      font: typeof font === 'string' ? font : undefined,
    }
  }

  return {
    applied: true,
    command,
    output: result.stdout,
    mood: typeof mood === 'string' ? mood : undefined,
    font: typeof font === 'string' ? font : undefined,
  }
}

// ============================================================================
// SECTION RESOLUTION
// ============================================================================

/**
 * For each <Section> in the plan, look up its gumdrop recipe.
 * Uses direct skill ID matching — deterministic, no search noise.
 *
 * This is the function the registry replaces in Stage 4.
 */
function resolveSections(root: PlanNode): SectionContext[] {
  const sectionNodes = collectNodes(root, 'Section')
  const skills = getSkillsRaw()

  // Build a lookup map: gumdrop name → skill content
  const recipeMap = new Map<string, string>()
  for (const skill of skills) {
    if (skill.id.startsWith('gumdrop-')) {
      const name = skill.id.replace('gumdrop-', '')
      recipeMap.set(name, skill.content)
    }
  }

  return sectionNodes.map((node, index) => {
    const gumdrop = String(node.props.gumdrop ?? '')
    const variant = node.props.variant ? String(node.props.variant) : undefined
    const recipe = recipeMap.get(gumdrop) ?? null

    // Extract components from recipe frontmatter
    const components = recipe ? extractComponentsFromFrontmatter(recipe) : []

    // Generate suggested filename from gumdrop name
    const pascalName = gumdrop
      .split('-')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')
    const suggestedFile = `src/sections/${pascalName}Section.tsx`

    return { gumdrop, variant, recipe, components, suggestedFile }
  })
}

/**
 * Extract components list from recipe YAML frontmatter.
 * Frontmatter format: `components: Badge, Button, Input, AspectRatio`
 */
function extractComponentsFromFrontmatter(content: string): string[] {
  const match = content.match(/^components:\s*(.+)$/m)
  if (!match) return []
  return match[1].split(',').map(s => s.trim()).filter(Boolean)
}

// ============================================================================
// FEEDBACK FORMATTING
// ============================================================================

/**
 * Format plan context into feedback.md content for Ralph.
 * This is what Ralph reads at the start of the BUILD phase.
 */
export function formatBuildInstructions(context: PlanContext, warnings?: string): string {
  const lines: string[] = []

  lines.push('# Plan Validated — Build Instructions\n')

  // Theme section
  if (context.theme.applied) {
    lines.push('## Theme Applied ✓\n')
    lines.push(`Command: \`${context.theme.command}\``)
    lines.push(context.theme.output.trim())
    lines.push('')
    lines.push('Theme is set. Use `theme modify --shift-hue <deg> --apply` for adjustments.')
    lines.push('Do NOT run `theme preset` or `theme generate` again — the theme is locked.\n')
  } else if (context.theme.error) {
    lines.push('## Theme ⚠️\n')
    lines.push(`Could not apply theme automatically: ${context.theme.error}`)
    lines.push('Apply a theme manually with `theme preset <n> --apply` or `theme generate ...`.\n')
  }

  // Warnings from plan validation
  if (warnings) {
    lines.push(warnings)
    lines.push('')
  }

  // Section recipes
  if (context.sections.length > 0) {
    lines.push('## Section Recipes\n')
    lines.push('Implement each section in order. One file per section.\n')

    for (const section of context.sections) {
      const variantNote = section.variant ? ` (variant: ${section.variant})` : ''
      lines.push(`### ${section.gumdrop}${variantNote} → \`${section.suggestedFile}\`\n`)

      if (section.components.length > 0) {
        lines.push(`**Components:** ${section.components.join(', ')}\n`)
      }

      if (section.recipe) {
        // Include full recipe (skip frontmatter)
        const recipeBody = stripFrontmatter(section.recipe)
        lines.push(recipeBody.trim())
      } else {
        lines.push(`_No recipe found for "${section.gumdrop}". Build using @wiggum/stack components._`)
      }
      lines.push('')
    }
  }

  // Final instructions
  lines.push('---\n')
  lines.push('Write .ralph/summary.md when done, then `echo "complete" > .ralph/status.txt`.')

  return lines.join('\n')
}

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\n[\s\S]*?\n---\n(.*)$/s)
  return match ? match[1] : content
}
```

### File 2: loop.ts — Integrate plan context into PLAN→BUILD transition

In the plan validation block (section 2c from the phase-gated loop), replace the hardcoded feedback message with context resolution.

**New import:**
```typescript
import { resolvePlanContext, formatBuildInstructions } from './plan-context'
```

**In the `else` branch (plan is valid — transition to BUILD):**

Current code writes a hardcoded feedback string. Replace with:

```typescript
// Plan is valid — resolve context and transition to BUILD
const context = await resolvePlanContext(root, fs, cwd, shell)
await setPhase(fs, cwd, 'build')

const warnings = result.warnings.length > 0
  ? 'Warnings:\n' + result.warnings.map(w => `WARN [${w.id}]: ${w.message}`).join('\n')
  : undefined

await fs.writeFile(`${cwd}/.ralph/feedback.md`, formatBuildInstructions(context, warnings))
await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running')
callbacks?.onStatus?.(
  context.theme.applied
    ? `Plan validated, theme applied — transitioning to build phase`
    : `Plan validated — transitioning to build phase`
)
```

**Note:** `shell` is already available in `runRalphLoop`'s scope but not inside the iteration block directly. The current transition code uses `fs`, `cwd`, `callbacks` which are all params of `runRalphLoop`. `shell` is the same — it's a param of `runRalphLoop`, in scope for the transition block. No plumbing changes needed.

### File 3: loop.ts — System prompt update (BUILD-phase theme restriction)

In BASE_SYSTEM_PROMPT, update the "IMMUTABLE COLOR LAWS" section. Add after the existing rules:

```
8. **Theme is set by the harness** — The harness applies your <Theme> block from plan.tsx automatically when the plan validates. During build, use `theme modify` for refinements. Do NOT run `theme preset --apply` or `theme generate --apply` again — the theme is already set.
```

And update step 4 in the workflow:

Current:
```
4. **Theme**: Run `theme preset <n> --apply` or `theme generate --seed <n> --pattern <n> --mood <mood> --apply`. Use `--chroma` for saturation control. For custom aesthetics, remix a personality template with `--personality`.
```

New:
```
4. **Theme**: The harness applies your theme automatically from plan.tsx. Read feedback.md for confirmation. Use `theme modify --shift-hue <deg> --apply` for refinements only.
```

### File 4: Tests — plan-context.test.ts

```typescript
// NEW: apps/ide/src/lib/ralph/__tests__/plan-context.test.ts

import { describe, it, expect, vi } from 'vitest'
import { resolvePlanContext, formatBuildInstructions } from '../plan-context'
import type { PlanNode } from '@wiggum/planning/validate'

// Helper to build a minimal plan tree
function makePlan(themeProps: Record<string, any>, sections: Array<{ gumdrop: string; variant?: string }>): PlanNode {
  return {
    component: 'App',
    props: { name: 'Test', description: 'Test app' },
    line: 1,
    children: [
      { component: 'Theme', props: themeProps, children: [], line: 2 },
      {
        component: 'Screen', props: { name: 'main', layout: 'scroll' }, line: 3,
        children: sections.map((s, i) => ({
          component: 'Section',
          props: { gumdrop: s.gumdrop, ...(s.variant ? { variant: s.variant } : {}) },
          children: [],
          line: 4 + i,
        })),
      },
    ],
  }
}

describe('resolvePlanContext', () => {
  it('resolves preset theme from mood prop', async () => {
    const mockShell = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Applied preset "cyberpunk"', stderr: '' }),
      listCommands: vi.fn().mockReturnValue([]),
      getCommand: vi.fn(),
    }
    const mockFs = {} as any

    const plan = makePlan({ mood: 'cyberpunk' }, [{ gumdrop: 'hero' }])
    const ctx = await resolvePlanContext(plan, mockFs, '/project', mockShell as any)

    expect(ctx.theme.applied).toBe(true)
    expect(ctx.theme.command).toBe('theme preset cyberpunk --apply')
    expect(mockShell.execute).toHaveBeenCalledWith('theme preset cyberpunk --apply', '/project')
  })

  it('resolves generate theme from seed + pattern props', async () => {
    const mockShell = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Applied generated theme', stderr: '' }),
      listCommands: vi.fn().mockReturnValue([]),
      getCommand: vi.fn(),
    }
    const mockFs = {} as any

    const plan = makePlan(
      { seed: 180, pattern: 'triadic', mood: 'playful', font: 'Orbitron', shadowProfile: 'dramatic', radius: 'rounded' },
      [],
    )
    const ctx = await resolvePlanContext(plan, mockFs, '/project', mockShell as any)

    expect(ctx.theme.applied).toBe(true)
    expect(ctx.theme.command).toContain('theme generate --seed 180 --pattern triadic')
    expect(ctx.theme.command).toContain('--mood playful')
    expect(ctx.theme.command).toContain('--font "Orbitron"')
    expect(ctx.theme.command).toContain('--shadow-profile dramatic')
    expect(ctx.theme.command).toContain('--apply')
  })

  it('handles theme command failure gracefully', async () => {
    const mockShell = {
      execute: vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Unknown preset' }),
      listCommands: vi.fn().mockReturnValue([]),
      getCommand: vi.fn(),
    }
    const mockFs = {} as any

    const plan = makePlan({ mood: 'nonexistent' }, [])
    const ctx = await resolvePlanContext(plan, mockFs, '/project', mockShell as any)

    expect(ctx.theme.applied).toBe(false)
    expect(ctx.theme.error).toBeTruthy()
  })

  it('resolves section recipes by exact gumdrop ID', async () => {
    const mockShell = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Applied', stderr: '' }),
      listCommands: vi.fn().mockReturnValue([]),
      getCommand: vi.fn(),
    }
    const mockFs = {} as any

    const plan = makePlan({ mood: 'cyberpunk' }, [
      { gumdrop: 'hero', variant: 'split-image' },
      { gumdrop: 'pricing' },
    ])
    const ctx = await resolvePlanContext(plan, mockFs, '/project', mockShell as any)

    expect(ctx.sections).toHaveLength(2)
    expect(ctx.sections[0].gumdrop).toBe('hero')
    expect(ctx.sections[0].variant).toBe('split-image')
    expect(ctx.sections[0].recipe).toContain('Hero') // hero.md recipe content
    expect(ctx.sections[0].suggestedFile).toBe('src/sections/HeroSection.tsx')
    expect(ctx.sections[0].components).toContain('Button')
    expect(ctx.sections[1].gumdrop).toBe('pricing')
    expect(ctx.sections[1].suggestedFile).toBe('src/sections/PricingSection.tsx')
  })

  it('returns null recipe for unknown gumdrops', async () => {
    const mockShell = {
      execute: vi.fn().mockResolvedValue({ exitCode: 0, stdout: 'Applied', stderr: '' }),
      listCommands: vi.fn().mockReturnValue([]),
      getCommand: vi.fn(),
    }
    const mockFs = {} as any

    const plan = makePlan({ mood: 'cyberpunk' }, [{ gumdrop: 'nonexistent-thing' }])
    const ctx = await resolvePlanContext(plan, mockFs, '/project', mockShell as any)

    expect(ctx.sections[0].recipe).toBeNull()
    expect(ctx.sections[0].components).toEqual([])
  })
})

describe('formatBuildInstructions', () => {
  it('includes theme confirmation when applied', () => {
    const output = formatBuildInstructions({
      theme: { applied: true, command: 'theme preset cyberpunk --apply', output: 'Applied preset "cyberpunk" (66 vars)', mood: 'cyberpunk' },
      sections: [],
    })

    expect(output).toContain('Theme Applied')
    expect(output).toContain('cyberpunk')
    expect(output).toContain('Do NOT run')
  })

  it('includes theme error when not applied', () => {
    const output = formatBuildInstructions({
      theme: { applied: false, command: '', output: '', error: 'No <Theme> block' },
      sections: [],
    })

    expect(output).toContain('Theme ⚠️')
    expect(output).toContain('Could not apply')
  })

  it('includes section recipes with suggested filenames', () => {
    const output = formatBuildInstructions({
      theme: { applied: true, command: 'theme preset mono --apply', output: 'Applied' },
      sections: [
        { gumdrop: 'hero', variant: 'centered', recipe: '---\nname: hero\ncomponents: Button, Badge\n---\n# Hero\n\nRecipe content here.', components: ['Button', 'Badge'], suggestedFile: 'src/sections/HeroSection.tsx' },
        { gumdrop: 'pricing', recipe: null, components: [], suggestedFile: 'src/sections/PricingSection.tsx' },
      ],
    })

    expect(output).toContain('### hero (variant: centered)')
    expect(output).toContain('src/sections/HeroSection.tsx')
    expect(output).toContain('Button, Badge')
    expect(output).toContain('Recipe content here')
    expect(output).toContain('No recipe found for "pricing"')
  })

  it('includes validation warnings when provided', () => {
    const output = formatBuildInstructions({
      theme: { applied: true, command: 'x', output: 'ok' },
      sections: [],
    }, 'Warnings:\nWARN [adjacent-grids]: consider varying layout')

    expect(output).toContain('adjacent-grids')
  })
})
```

---

## What This Enables

### Today (this session)
- Theme applied once, deterministically, from plan.tsx — no thrashing
- Every section recipe pre-loaded in feedback.md — no grep failures
- Ralph enters BUILD with complete context — implementation only

### With Registry (Stage 4)
- `resolveSections()` swaps from `getSkillsRaw().find(id)` to `registry.getGumdrop(name)`
- Registry returns component dependencies, prop constraints, accessibility notes
- `SectionContext.components` becomes typed with prop schemas
- `resolveTheme()` can validate font/shadow against registry instead of runtime errors

### With Skill Graph (post-roadmap)
- `resolveSections()` returns `relatedSkills: string[]` from WikiLink traversal
- Hero recipe → animation patterns, contrast rules, responsive breakpoints
- Context bundles assembled by graph, not hardcoded
- `SectionContext` gains `relatedContext: string` field

### The Contract That Stays Stable
```typescript
resolvePlanContext(root: PlanNode, ...) → PlanContext
formatBuildInstructions(context: PlanContext, ...) → string
```

Callers never change. Resolution implementation evolves.

---

## What This Does NOT Change

- Plan validation logic (validate.ts) — unchanged
- Quality gates — unchanged  
- Phase system — unchanged (this extends the transition, doesn't modify it)
- Shell commands — unchanged (theme.ts, grep.ts work as before)
- Skills system — unchanged (recipes stay as markdown files)
- `theme modify` — still available during BUILD for refinements

## Files Touched

| File | Change |
|------|--------|
| **NEW: plan-context.ts** | PlanContext type, resolvePlanContext(), formatBuildInstructions() |
| **loop.ts** | Import plan-context, call resolvePlanContext in transition block, update system prompt (color law #8, workflow step 4) |
| **NEW: plan-context.test.ts** | 7 tests covering theme resolution, section resolution, formatting |

## Cleanup (Separate Commit)

- Remove `plan.md` from state.ts FILES, initRalphDir, getRalphState — dead file
- Remove `intent.md` from state.ts FILES, initRalphDir, getRalphState — replaced by plan.tsx App description
- Remove `onIntent` callback from loop.ts — or rewire to read plan.tsx App description
- Update system prompt workspace docs section to remove plan.md and intent.md references
