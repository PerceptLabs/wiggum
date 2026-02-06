/**
 * Skills loader for Ralph
 *
 * Imports skills directly at build time using Vite's ?raw import.
 * This ensures skills are always available in the browser bundle.
 *
 * Context reduction: Skills are now searchable via `grep skill "<query>"`
 * instead of being dumped into every prompt (~800 lines → ~30 lines).
 */

// Stack's authoritative skill (source of truth)
import stackSkill from '../../../../../packages/stack/SKILL.md?raw'

// Master design skill (read first)
import frontendDesignSkill from '../../skills/frontend-design/SKILL.md?raw'

// Consolidated skills
import codeQualitySkill from '../../skills/code-quality/SKILL.md?raw'
import creativitySkill from '../../skills/creativity/SKILL.md?raw'
import themingSkill from '../../skills/theming/SKILL.md?raw'

// Heartbeat skill (injected periodically)
import heartbeatSkill from '../../skills/ralph/HEARTBEAT.md?raw'

import { parseSkillFile } from '../skills/parser'

/**
 * Skills in priority order:
 * 0. Frontend design - Design thinking, aesthetic direction, anti-slop philosophy
 * 1. Stack skill - authoritative rules and component documentation
 * 2. Code quality - React patterns, accessibility, dark mode, overlays
 * 3. Theming skill - CSS variables, animations, design philosophy
 * 4. Creativity - Layout patterns, design variety, motion
 */
const SKILLS = [
  { id: 'frontend-design', content: frontendDesignSkill, priority: 0 },
  { id: 'stack', content: stackSkill, priority: 1 },
  { id: 'code-quality', content: codeQualitySkill, priority: 2 },
  { id: 'theming', content: themingSkill, priority: 3 },
  { id: 'creativity', content: creativitySkill, priority: 4 },
]

/**
 * Get raw skill content for search indexing
 */
export function getSkillsRaw(): Array<{ id: string; content: string }> {
  return SKILLS.map(({ id, content }) => ({ id, content }))
}

/**
 * Get skill summaries + grep instructions for Ralph's system prompt
 * (Replaces the old getSkillsContent that dumped ~800 lines)
 */
export function getSkillsContent(): string {
  return `

---

# Skills

Available knowledge bases you can search:

| Skill | Topics |
|-------|--------|
| frontend-design | Design thinking, aesthetic direction, anti-slop philosophy |
| stack | Components, imports, project structure |
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
}

/**
 * Get heartbeat skill content for periodic injection
 * Injected every 5 iterations to trigger quality/creativity reflection
 */
export function getHeartbeatContent(): string {
  return `

---

# HEARTBEAT CHECK (Iteration %ITERATION%)

${heartbeatSkill}

---

`
}

/**
 * Get skill metadata for display/debugging
 */
export function getSkillsMeta(): Array<{ id: string; name: string; description: string }> {
  const meta: Array<{ id: string; name: string; description: string }> = []

  for (const { id, content } of SKILLS) {
    try {
      const { metadata } = parseSkillFile(content)
      meta.push({
        id,
        name: metadata.name,
        description: metadata.description,
      })
    } catch {
      // Skip invalid skills
    }
  }

  return meta
}
