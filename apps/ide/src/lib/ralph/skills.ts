/**
 * Skills loader for Ralph
 *
 * Imports skills directly at build time using Vite's ?raw import.
 * This ensures skills are always available in the browser bundle.
 *
 * Priority order:
 * 1. Stack's authoritative SKILL.md (from @wiggum/stack)
 * 2. IDE skills (react-best-practices, web-design-guidelines)
 * 3. IDE's wiggum-stack quick reference (supplements the stack skill)
 */

// Stack's authoritative skill (source of truth)
// Path: apps/ide/src/lib/ralph -> ../../../../.. (root) -> packages/stack/SKILL.md
import stackSkill from '../../../../../packages/stack/SKILL.md?raw'

// IDE skills - Vercel's best practices
import reactBestPracticesSkill from '../../skills/react-best-practices/SKILL.md?raw'
import webDesignGuidelinesSkill from '../../skills/web-design-guidelines/SKILL.md?raw'

// Theming skill - CSS variables and theme customization
import themingSkill from '../../skills/theming/SKILL.md?raw'

// IDE's quick reference (supplements the stack skill)
import wiggumStackQuickRef from '../../skills/wiggum-stack/SKILL.md?raw'

import { parseSkillFile } from '../skills/parser'

/**
 * Skills in priority order:
 * 1. Stack skill - authoritative rules and component documentation
 * 2. Theming skill - CSS variables and theme customization
 * 3. React best practices - performance patterns
 * 4. Web design guidelines - accessibility and UX
 * 5. Quick reference - component cheat sheet
 */
const SKILLS = [
  { id: 'stack', content: stackSkill, priority: 1 },
  { id: 'theming', content: themingSkill, priority: 2 },
  { id: 'react-best-practices', content: reactBestPracticesSkill, priority: 3 },
  { id: 'web-design-guidelines', content: webDesignGuidelinesSkill, priority: 4 },
  { id: 'wiggum-stack-quickref', content: wiggumStackQuickRef, priority: 5 },
]

/**
 * Get formatted skill content for Ralph's system prompt
 */
export function getSkillsContent(): string {
  const skillContents: string[] = []

  // Sort by priority
  const sortedSkills = [...SKILLS].sort((a, b) => a.priority - b.priority)

  for (const { id, content } of sortedSkills) {
    try {
      const { metadata, body } = parseSkillFile(content)
      skillContents.push(`## ${metadata.name}\n\n${body}`)
      console.log(`[Ralph] Loaded skill: ${id} (${metadata.name})`)
    } catch (e) {
      console.warn(`[Ralph] Failed to parse skill: ${id}`, e)
    }
  }

  if (skillContents.length === 0) return ''
  
  return `

---

# Skills Reference

These skills define how you write code. Follow them strictly.

${skillContents.join('\n\n---\n\n')}`
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
