/**
 * Skills loader for Ralph
 *
 * Imports skills directly at build time using Vite's ?raw import.
 * This ensures skills are always available in the browser bundle.
 *
 * Context reduction: Skills are now searchable via `grep skill "<query>"`
 * instead of being dumped into every prompt (~800 lines → ~30 lines).
 */

// Component library skill
import stackSkill from '../../skills/stack/SKILL.md?raw'

// Master design skill (read first)
import frontendDesignSkill from '../../skills/frontend-design/SKILL.md?raw'

// Consolidated skills
import codeQualitySkill from '../../skills/code-quality/SKILL.md?raw'
import themingSkill from '../../skills/theming/SKILL.md?raw'
import gumdropsSkill from '../../skills/gumdrops/SKILL.md?raw'
import extendedLibrariesSkill from '../../skills/extended-libraries/SKILL.md?raw'

// Glob import for individual gumdrop recipe files (populated in B2/B3)
const gumdropRecipes = import.meta.glob<string>(
  '../../skills/gumdrops/{marketing,app,content,interactive,api}/*.md',
  { query: '?raw', import: 'default', eager: true }
)

// Glob import for personality template JSON files
const personalityTemplates = import.meta.glob<string>(
  '../../skills/theming/personalities/*.json',
  { query: '?raw', import: 'default', eager: true }
)

import { parseSkillFile } from '../skills/parser'

/**
 * Skills in priority order:
 * 0. Frontend design - Design thinking, aesthetic direction, anti-slop philosophy
 * 1. Stack skill - authoritative rules and component documentation
 * 2. Code quality - React patterns, accessibility, OKLCH theming, overlays
 * 3. Theming skill - Theme command, presets, OKLCH, animations, tokens, smart merge
 * 4. Gumdrops - Compositional recipes for sections, pages, data flows
 * 5. Extended libraries - npm packages beyond stack, with when-to-use guidance
 */
const SKILLS = [
  { id: 'frontend-design', content: frontendDesignSkill, priority: 0 },
  { id: 'stack', content: stackSkill, priority: 1 },
  { id: 'code-quality', content: codeQualitySkill, priority: 2 },
  { id: 'theming', content: themingSkill, priority: 3 },
  { id: 'gumdrops', content: gumdropsSkill, priority: 4 },
  { id: 'extended-libraries', content: extendedLibrariesSkill, priority: 5 },
]

/**
 * Get raw skill content for search indexing
 */
export function getSkillsRaw(): Array<{ id: string; content: string }> {
  const base = SKILLS.map(({ id, content }) => ({ id, content }))
  // Add individual gumdrop recipes for search indexing
  for (const [filePath, content] of Object.entries(gumdropRecipes)) {
    const match = filePath.match(/\/([^/]+)\.md$/)
    if (match) {
      base.push({ id: `gumdrop-${match[1]}`, content })
    }
  }
  // Add personality templates for .skills/ directory
  for (const [filePath, content] of Object.entries(personalityTemplates)) {
    const match = filePath.match(/\/([^/]+)\.json$/)
    if (match) {
      base.push({ id: `personalities/${match[1]}`, content })
    }
  }
  return base
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
| frontend-design | Design thinking, aesthetic direction, anti-slop philosophy, design briefs |
| stack | 60+ components, imports, project structure |
| code-quality | React patterns, accessibility, OKLCH theming, form contrast, overlays |
| theming | Theme command, 12 presets, sacred geometry, OKLCH colors, animations, dark mode, tokens, smart merge |
| gumdrops | Compositional recipes: marketing, app, content, interactive patterns |
| extended-libraries | Available npm packages, when-to-use, import patterns, cache management |

## How to Use

Search skills with grep before implementing unfamiliar patterns:

\`\`\`bash
grep skill "pricing section"    # → pricing gumdrop recipe
grep skill "file upload"        # → upload gumdrop recipe
grep skill "dark mode form"     # → contrast rules for inputs
grep skill "dialog z-index"     # → overlay stacking rules
grep package "drag and drop"   # → @dnd-kit/core with imports + guidance
grep package "form validation" # → react-hook-form + zod
\`\`\`

**Always grep when unsure.** Skills contain critical rules that prevent bugs.
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
