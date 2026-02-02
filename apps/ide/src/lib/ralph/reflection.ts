/**
 * Reflection Capture - Post-task LLM survey about harness experience
 *
 * After Ralph completes a task, optionally prompts for reflection on:
 * - Difficulty ratings
 * - Friction points (commands that didn't work as expected)
 * - Wished-for capabilities
 * - Workarounds used
 *
 * Stored in .ralph/reflections.jsonl for analysis.
 */
import type { JSRuntimeFS } from '../fs/types'
import type { HarnessReflection, CommandAttempt, RuntimeError, LogEntry } from '../types/observability'

const REFLECTIONS_FILE = '.ralph/reflections.jsonl'

/**
 * Build the reflection prompt with full context
 */
export function buildReflectionPrompt(
  taskDescription: string,
  attempts: CommandAttempt[],
  runtimeErrors: RuntimeError[],
  contextLogs: LogEntry[],
  taskId: string
): string {
  const failedCommands = attempts
    .filter((a) => !a.success)
    .map((a) => `- ${a.command} ${a.args.join(' ')}: ${a.error}`)
    .join('\n')

  const successfulCommands = attempts
    .filter((a) => a.success)
    .map((a) => `- ${a.command} ${a.args.join(' ')}`)
    .join('\n')

  const runtimeErrorsSection =
    runtimeErrors.length > 0
      ? `\n**Runtime errors encountered:**\n${runtimeErrors.map((e) => `- ${e.message} at ${e.filename}:${e.line}`).join('\n')}`
      : ''

  const contextSection =
    contextLogs.length > 0
      ? `\n**Recent context (last ${Math.min(contextLogs.length, 20)} log entries):**\n${contextLogs
          .slice(-20)
          .map((l) => `[${l.level}] ${l.message}`)
          .join('\n')}`
      : ''

  return `
## Harness Reflection Survey

You just completed a task in the Ralph harness. Please reflect on your experience.

**Task:** ${taskDescription}
**Task ID:** ${taskId}

**Commands you used successfully:**
${successfulCommands || '(none)'}

**Commands that failed:**
${failedCommands || '(none)'}
${runtimeErrorsSection}
${contextSection}

Please respond with a JSON object (no markdown, just raw JSON) with this structure:

{
  "difficulty": {
    "overall": <1-5>,
    "findingCommands": <1-5>,
    "fileOperations": <1-5>,
    "debugging": <1-5>
  },
  "friction": [
    {
      "command": "<command that caused friction>",
      "expected": "<what you expected>",
      "actual": "<what happened>",
      "suggestion": "<how to improve>"
    }
  ],
  "wishedFor": ["<command or feature you wished existed>"],
  "confusingParts": ["<what was unclear>"],
  "workarounds": ["<hacks you had to use>"],
  "wouldRecommend": <true/false>,
  "oneSentenceSummary": "<your experience in one sentence>",
  "freeformComments": "<anything else you want to share — observations, suggestions, frustrations, or ideas that don't fit the above categories>"
}

Be honest and specific. This feedback improves the harness for future tasks.
`.trim()
}

/**
 * Parse the LLM's reflection response
 */
export function parseReflectionResponse(
  response: string,
  taskId: string,
  runtimeErrors: RuntimeError[]
): HarnessReflection | null {
  try {
    let clean = response.trim()
    // Remove markdown code fences if present
    if (clean.startsWith('```json')) clean = clean.slice(7)
    if (clean.startsWith('```')) clean = clean.slice(3)
    if (clean.endsWith('```')) clean = clean.slice(0, -3)
    clean = clean.trim()

    const parsed = JSON.parse(clean)

    return {
      taskId,
      timestamp: Date.now(),
      difficulty: parsed.difficulty || {
        overall: 3,
        findingCommands: 3,
        fileOperations: 3,
        debugging: 3,
      },
      friction: parsed.friction || [],
      wishedFor: parsed.wishedFor || [],
      confusingParts: parsed.confusingParts || [],
      workarounds: parsed.workarounds || [],
      runtimeErrors: runtimeErrors,
      wouldRecommend: parsed.wouldRecommend ?? true,
      oneSentenceSummary: parsed.oneSentenceSummary || '',
      freeformComments: parsed.freeformComments || undefined,
    }
  } catch (e) {
    console.error('[Reflection] Failed to parse response:', e)
    return null
  }
}

/**
 * Save a reflection to the JSONL file
 */
export async function saveReflection(
  fs: JSRuntimeFS,
  cwd: string,
  reflection: HarnessReflection
): Promise<void> {
  const filepath = `${cwd}/${REFLECTIONS_FILE}`

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

  // Append new reflection
  const newContent = existing + JSON.stringify(reflection) + '\n'
  await fs.writeFile(filepath, newContent, { encoding: 'utf8' })
}

/**
 * Load all reflections
 */
export async function loadReflections(fs: JSRuntimeFS, cwd: string): Promise<HarnessReflection[]> {
  const filepath = `${cwd}/${REFLECTIONS_FILE}`

  try {
    const content = await fs.readFile(filepath, { encoding: 'utf8' })
    const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as HarnessReflection)
  } catch {
    return []
  }
}

/**
 * Summarize reflections for reporting
 */
export async function summarizeReflections(
  fs: JSRuntimeFS,
  cwd: string
): Promise<{
  totalTasks: number
  avgDifficulty: number
  topWishedFor: string[]
  topFriction: string[]
  totalRuntimeErrors: number
  recommendRate: number
}> {
  const reflections = await loadReflections(fs, cwd)

  if (reflections.length === 0) {
    return {
      totalTasks: 0,
      avgDifficulty: 0,
      topWishedFor: [],
      topFriction: [],
      totalRuntimeErrors: 0,
      recommendRate: 0,
    }
  }

  const avgDifficulty =
    reflections.reduce((sum, r) => sum + r.difficulty.overall, 0) / reflections.length

  // Count wished-for items
  const wishedForCounts = new Map<string, number>()
  for (const r of reflections) {
    for (const wish of r.wishedFor) {
      wishedForCounts.set(wish, (wishedForCounts.get(wish) || 0) + 1)
    }
  }
  const topWishedFor = Array.from(wishedForCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([wish]) => wish)

  // Count friction commands
  const frictionCounts = new Map<string, number>()
  for (const r of reflections) {
    for (const f of r.friction) {
      frictionCounts.set(f.command, (frictionCounts.get(f.command) || 0) + 1)
    }
  }
  const topFriction = Array.from(frictionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cmd]) => cmd)

  const totalRuntimeErrors = reflections.reduce((sum, r) => sum + r.runtimeErrors.length, 0)

  const recommendRate = reflections.filter((r) => r.wouldRecommend).length / reflections.length

  return {
    totalTasks: reflections.length,
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    topWishedFor,
    topFriction,
    totalRuntimeErrors,
    recommendRate: Math.round(recommendRate * 100),
  }
}

/**
 * Clear all reflections (useful for testing)
 */
export async function clearReflections(fs: JSRuntimeFS, cwd: string): Promise<void> {
  const filepath = `${cwd}/${REFLECTIONS_FILE}`
  try {
    await fs.unlink(filepath)
  } catch {
    // File may not exist
  }
}
