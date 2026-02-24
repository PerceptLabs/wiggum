/**
 * Plan mutation context — formats section mapping + scope constraints
 * for Ralph's system prompt during mutation tasks.
 *
 * These are context helpers, NOT auto-modifiers.
 * Ralph does the actual plan.tsx editing.
 */

import type { StructuredTask, TaskRequirement } from './task-types'
import type { PlanNode } from '@wiggum/planning/validate'
import { parsePlanTsx } from '../build/plan-parser'

// ============================================================================
// TYPES
// ============================================================================

export interface PlanSection {
  component: string
  name?: string
  gumdrop?: string
  line: number
}

// ============================================================================
// SECTION EXTRACTION
// ============================================================================

/**
 * Extract Screen/Section names from a parsed PlanNode tree.
 * Walks the tree recursively, collecting named sections.
 */
export function extractPlanSections(root: PlanNode): PlanSection[] {
  const sections: PlanSection[] = []
  walkNode(root, sections)
  return sections
}

function walkNode(node: PlanNode, sections: PlanSection[]): void {
  if (node.component === 'Screen' || node.component === 'Section') {
    sections.push({
      component: node.component,
      name: typeof node.props.name === 'string' ? node.props.name : undefined,
      gumdrop: typeof node.props.gumdrop === 'string' ? node.props.gumdrop : undefined,
      line: node.line,
    })
  }
  for (const child of node.children) {
    walkNode(child, sections)
  }
}

// ============================================================================
// SECTION MATCHING
// ============================================================================

/**
 * Map task requirements to plan sections by keyword matching.
 * Returns a map from section identifier to matching requirements.
 */
export function findAffectedSections(
  sections: PlanSection[],
  requirements: TaskRequirement[],
): Map<string, TaskRequirement[]> {
  const result = new Map<string, TaskRequirement[]>()

  for (const section of sections) {
    const sectionId = formatSectionId(section)
    const matching = requirements.filter(req => sectionMatchesRequirement(section, req))
    if (matching.length > 0) {
      result.set(sectionId, matching)
    }
  }

  return result
}

function formatSectionId(section: PlanSection): string {
  const name = section.name ?? section.gumdrop ?? `line:${section.line}`
  return `${section.component} "${name}"`
}

function sectionMatchesRequirement(section: PlanSection, req: TaskRequirement): boolean {
  const descLower = req.description.toLowerCase()
  const nameLower = (section.name ?? '').toLowerCase()
  const gumdropLower = (section.gumdrop ?? '').toLowerCase()

  // Check if requirement mentions the section by name or gumdrop
  if (nameLower && descLower.includes(nameLower)) return true
  if (gumdropLower && descLower.includes(gumdropLower)) return true

  // Check if section name mentions words from the requirement
  const reqWords = descLower.split(/\s+/).filter(w => w.length > 3)
  if (nameLower && reqWords.some(w => nameLower.includes(w))) return true

  return false
}

// ============================================================================
// MUTATION CONTEXT FORMATTER
// ============================================================================

/**
 * Format mutation context for system prompt injection.
 * Internally calls parsePlanTsx() to get the PlanNode tree.
 *
 * Returns markdown describing affected sections and scope constraints.
 */
export async function formatMutationContext(
  task: StructuredTask,
  planContent: string,
): Promise<string> {
  const { root } = await parsePlanTsx(planContent)
  const sections = root ? extractPlanSections(root) : []
  const affected = findAffectedSections(sections, task.requirements)

  const lines: string[] = []
  lines.push(`## Plan Update (Task ${task.taskNumber})`)
  lines.push(`Type: ${task.type}`)
  lines.push('')

  if (affected.size > 0) {
    lines.push('### Affected Sections')
    for (const [sectionId, reqs] of affected) {
      for (const req of reqs) {
        lines.push(`- ${sectionId}: [${req.marker}] ${req.description}`)
      }
    }
    lines.push('')
  }

  if (task.scope.preserve.length > 0 || task.scope.affectedFiles.length > 0) {
    lines.push('### Scope Constraints')
    for (const p of task.scope.preserve) {
      lines.push(`- PRESERVE: ${p}`)
    }
    for (const f of task.scope.affectedFiles) {
      lines.push(`- AFFECTED FILES: ${f}`)
    }
    lines.push('')
  }

  lines.push('### Instructions')
  lines.push('Read .ralph/plan.tsx. Add change markers where needed:')
  lines.push(`  {/* TASK-${task.taskNumber} [ADD|MODIFY|FIX]: description */}`)
  lines.push(`Sections not in requirements: {/* NO CHANGES for task-${task.taskNumber} */}`)
  lines.push('')

  return lines.join('\n')
}
