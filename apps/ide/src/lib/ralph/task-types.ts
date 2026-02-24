/**
 * Structured task types for the task parser.
 *
 * A StructuredTask represents a decomposed user message with
 * typed requirements ([ADD]/[MODIFY]/[FIX]/[REMOVE]) and scope constraints.
 */

// ============================================================================
// TYPES
// ============================================================================

export type TaskType = 'mutation' | 'fresh' | 'bugfix'
export type ScopeMarker = 'ADD' | 'MODIFY' | 'FIX' | 'REMOVE'

export interface TaskRequirement {
  marker: ScopeMarker
  description: string
}

export interface TaskScope {
  preserve: string[]
  affectedFiles: string[]
}

export interface StructuredTask {
  type: TaskType
  title: string
  taskNumber: number
  previousTag?: string
  requirements: TaskRequirement[]
  scope: TaskScope
  rawMessage: string
}

// ============================================================================
// FORMATTER
// ============================================================================

/**
 * Format a StructuredTask into markdown for Ralph's task.md file.
 */
export function formatStructuredTask(task: StructuredTask): string {
  const lines: string[] = []

  lines.push(`# Task: ${task.title}`)
  lines.push(`Type: ${task.type}`)
  lines.push(`Counter: ${task.taskNumber}`)
  if (task.previousTag) {
    lines.push(`Previous snapshot: ${task.previousTag}`)
  }
  lines.push('')

  if (task.requirements.length > 0) {
    lines.push('## Requirements')
    for (const req of task.requirements) {
      lines.push(`- [${req.marker}] ${req.description}`)
    }
    lines.push('')
  }

  if (task.scope.preserve.length > 0 || task.scope.affectedFiles.length > 0) {
    lines.push('## Scope')
    for (const p of task.scope.preserve) {
      lines.push(`- PRESERVE: ${p}`)
    }
    for (const f of task.scope.affectedFiles) {
      lines.push(`- AFFECTED: ${f}`)
    }
    lines.push('')
  }

  lines.push('## Original Message')
  lines.push('')
  lines.push(`> ${task.rawMessage.replace(/\n/g, '\n> ')}`)
  lines.push('')

  return lines.join('\n')
}
