/**
 * Gap Tracking - Detect when Ralph tries commands that don't exist
 *
 * Records "command not found" errors to .ralph/gaps.jsonl for analysis.
 * Helps identify missing shell capabilities that Ralph expects.
 */
import type { JSRuntimeFS } from '../fs/types'
import type { GapRecord, GapAggregate } from '../types/observability'

const GAPS_FILE = '.ralph/gaps.jsonl'

/**
 * Check if an error indicates a missing command
 */
export function isCommandNotFoundError(error: string): boolean {
  const patterns = [
    /command not found/i,
    /unknown command/i,
    /not recognized as.*command/i,
    /no such command/i,
  ]
  return patterns.some((p) => p.test(error))
}

/**
 * Parse a command string into command + args
 */
export function parseCommandString(cmdString: string): { command: string; args: string[] } {
  const parts = cmdString.trim().split(/\s+/)
  return {
    command: parts[0] || '',
    args: parts.slice(1),
  }
}

/**
 * Record a gap when a command is not found
 */
export async function recordGap(
  fs: JSRuntimeFS,
  cwd: string,
  gap: Omit<GapRecord, 'timestamp'>
): Promise<void> {
  const record: GapRecord = {
    ...gap,
    timestamp: Date.now(),
  }

  const filepath = `${cwd}/${GAPS_FILE}`

  // Ensure .ralph directory exists
  try {
    await fs.mkdir(`${cwd}/.ralph`, { recursive: true })
  } catch {
    // Directory may already exist
  }

  // Read existing content
  let existing = ''
  try {
    const content = await fs.readFile(filepath, { encoding: 'utf8' })
    existing = typeof content === 'string' ? content : new TextDecoder().decode(content)
  } catch {
    // File doesn't exist yet
  }

  // Append new record
  const newContent = existing + JSON.stringify(record) + '\n'
  await fs.writeFile(filepath, newContent, { encoding: 'utf8' })
}

/**
 * Load all recorded gaps
 */
export async function loadGaps(fs: JSRuntimeFS, cwd: string): Promise<GapRecord[]> {
  const filepath = `${cwd}/${GAPS_FILE}`

  try {
    const content = await fs.readFile(filepath, { encoding: 'utf8' })
    const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as GapRecord)
  } catch {
    return []
  }
}

/**
 * Aggregate gaps by command for reporting
 */
export async function aggregateGaps(fs: JSRuntimeFS, cwd: string): Promise<GapAggregate[]> {
  const gaps = await loadGaps(fs, cwd)

  const byCommand = new Map<string, GapAggregate>()

  for (const gap of gaps) {
    const existing = byCommand.get(gap.command)

    if (existing) {
      existing.count++
      if (!existing.contexts.includes(gap.context)) {
        existing.contexts.push(gap.context)
      }
      if (gap.reasoning && !existing.reasoning.includes(gap.reasoning)) {
        existing.reasoning.push(gap.reasoning)
      }
      existing.lastSeen = Math.max(existing.lastSeen, gap.timestamp)
    } else {
      byCommand.set(gap.command, {
        command: gap.command,
        count: 1,
        contexts: [gap.context],
        reasoning: gap.reasoning ? [gap.reasoning] : [],
        lastSeen: gap.timestamp,
      })
    }
  }

  return Array.from(byCommand.values()).sort((a, b) => b.count - a.count)
}

/**
 * Format gaps report for display
 */
export function formatGapsReport(aggregates: GapAggregate[]): string {
  if (aggregates.length === 0) {
    return 'No command gaps recorded.'
  }

  return aggregates
    .map((agg) => {
      const lines = [
        `${agg.command} (${agg.count}x)`,
        `  Contexts: ${agg.contexts.slice(0, 5).join(', ')}`,
      ]

      if (agg.reasoning.length > 0) {
        lines.push(`  Reasoning: ${agg.reasoning.slice(0, 3).join('; ')}`)
      }

      return lines.join('\n')
    })
    .join('\n\n')
}

/**
 * Clear all recorded gaps (useful for testing)
 */
export async function clearGaps(fs: JSRuntimeFS, cwd: string): Promise<void> {
  const filepath = `${cwd}/${GAPS_FILE}`
  try {
    await fs.unlink(filepath)
  } catch {
    // File may not exist
  }
}
