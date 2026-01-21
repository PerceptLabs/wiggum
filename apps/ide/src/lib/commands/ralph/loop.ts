import path from 'path-browserify'
import type { RalphState, RalphConfig } from './types'
import { RALPH_DIR, RALPH_FILES, DEFAULT_RALPH_CONFIG } from './types'
import type { JSRuntimeFS } from '../../fs'

/**
 * Safely read a file, returning fallback if it doesn't exist
 */
async function safeReadFile(
  fs: JSRuntimeFS,
  filePath: string,
  fallback: string
): Promise<string> {
  try {
    const content = await fs.readFile(filePath, { encoding: 'utf8' })
    return (content as string).trim()
  } catch {
    return fallback
  }
}

/**
 * Initialize the loop state with a task
 * Creates .ralph/ directory and files
 */
export async function initLoopState(
  fs: JSRuntimeFS,
  cwd: string,
  task: string
): Promise<void> {
  const ralphDir = path.join(cwd, RALPH_DIR)

  // Create .ralph directory
  await fs.mkdir(ralphDir, { recursive: true })

  // Create task.md with the user's message
  const taskContent = `# Task

${task}

## Instructions

Complete this task. When finished, write "complete" to .ralph/status.txt.
If you need clarification, write "waiting" to .ralph/status.txt.
`
  await fs.writeFile(path.join(cwd, RALPH_FILES.task), taskContent)

  // Create progress.md
  const progressContent = `# Progress

## Iterations

`
  await fs.writeFile(path.join(cwd, RALPH_FILES.progress), progressContent)

  // Create feedback.md (empty initially)
  await fs.writeFile(path.join(cwd, RALPH_FILES.feedback), '')

  // Create iteration.txt
  await fs.writeFile(path.join(cwd, RALPH_FILES.iteration), '0')

  // Create status.txt
  await fs.writeFile(path.join(cwd, RALPH_FILES.status), 'running')

  // Create config.json
  await fs.writeFile(
    path.join(cwd, RALPH_FILES.config),
    JSON.stringify(DEFAULT_RALPH_CONFIG, null, 2)
  )
}

/**
 * Read ralph config from .ralph/config.json
 */
export async function readConfig(
  fs: JSRuntimeFS,
  cwd: string
): Promise<RalphConfig> {
  try {
    const configPath = path.join(cwd, RALPH_FILES.config)
    const content = await fs.readFile(configPath, { encoding: 'utf8' })
    return { ...DEFAULT_RALPH_CONFIG, ...JSON.parse(content as string) }
  } catch {
    return DEFAULT_RALPH_CONFIG
  }
}

/**
 * Read the current ralph state from .ralph/ files
 */
export async function readLoopState(
  fs: JSRuntimeFS,
  cwd: string
): Promise<RalphState> {
  return {
    task: await safeReadFile(fs, path.join(cwd, RALPH_FILES.task), ''),
    progress: await safeReadFile(fs, path.join(cwd, RALPH_FILES.progress), ''),
    feedback: await safeReadFile(fs, path.join(cwd, RALPH_FILES.feedback), ''),
    iteration: parseInt(await safeReadFile(fs, path.join(cwd, RALPH_FILES.iteration), '0'), 10),
    status: (await safeReadFile(fs, path.join(cwd, RALPH_FILES.status), 'idle')) as RalphState['status'],
  }
}

/**
 * Build the context prompt for the current iteration
 * This is what gets sent to the AI each iteration
 */
export function buildLoopContext(state: RalphState, iteration: number): string {
  const sections: string[] = []

  // Header
  sections.push(`# Iteration ${iteration}`)
  sections.push('')

  // Task section
  sections.push('## Your Task')
  sections.push('')
  sections.push(state.task || 'No task defined.')
  sections.push('')

  // Progress section (show recent progress)
  if (state.progress && state.progress.includes('###')) {
    sections.push('## Progress So Far')
    sections.push('')
    // Extract recent progress entries (last 3)
    const entries = state.progress.split(/(?=###\s)/g).filter((e) => e.trim())
    const recent = entries.slice(-3)
    sections.push(recent.join('\n'))
    sections.push('')
  }

  // Feedback section
  if (state.feedback && state.feedback.trim()) {
    const feedbackContent = state.feedback
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('#'))
      .join('\n')
      .trim()

    if (feedbackContent) {
      sections.push('## Human Feedback')
      sections.push('')
      sections.push(feedbackContent)
      sections.push('')
    }
  }

  // Instructions
  sections.push('## Instructions')
  sections.push('')
  sections.push('1. Take the next step toward completing the task')
  sections.push('2. Use tools to make changes and verify they work')
  sections.push('3. Update .ralph/progress.md with what you did')
  sections.push('4. When the task is fully complete, write "complete" to .ralph/status.txt')
  sections.push('5. If you need human input, write "waiting" to .ralph/status.txt')
  sections.push('')

  return sections.join('\n')
}

/**
 * Update the iteration count in .ralph/iteration.txt
 */
export async function updateIteration(
  fs: JSRuntimeFS,
  cwd: string,
  iteration: number
): Promise<void> {
  await fs.writeFile(path.join(cwd, RALPH_FILES.iteration), String(iteration))
}

/**
 * Append progress entry for an iteration
 */
export async function appendProgress(
  fs: JSRuntimeFS,
  cwd: string,
  iteration: number,
  summary: string
): Promise<void> {
  const progressPath = path.join(cwd, RALPH_FILES.progress)
  const currentProgress = await safeReadFile(fs, progressPath, '')
  const timestamp = new Date().toISOString()
  const progressEntry = `\n### Iteration ${iteration} (${timestamp})\n\n${summary.slice(0, 500)}${summary.length > 500 ? '...' : ''}\n`
  await fs.writeFile(progressPath, currentProgress + progressEntry)
}

/**
 * Check if the loop is complete
 */
export async function checkComplete(
  fs: JSRuntimeFS,
  cwd: string
): Promise<boolean> {
  const status = await safeReadFile(fs, path.join(cwd, RALPH_FILES.status), 'running')
  return status === 'complete'
}

/**
 * Check if the loop is waiting for human input
 */
export async function checkWaiting(
  fs: JSRuntimeFS,
  cwd: string
): Promise<boolean> {
  const status = await safeReadFile(fs, path.join(cwd, RALPH_FILES.status), 'running')
  return status === 'waiting'
}

/**
 * Get the current status
 */
export async function getStatus(
  fs: JSRuntimeFS,
  cwd: string
): Promise<RalphState['status']> {
  const status = await safeReadFile(fs, path.join(cwd, RALPH_FILES.status), 'idle')
  return status as RalphState['status']
}

/**
 * Set the status
 */
export async function setStatus(
  fs: JSRuntimeFS,
  cwd: string,
  status: RalphState['status']
): Promise<void> {
  await fs.writeFile(path.join(cwd, RALPH_FILES.status), status)
}

/**
 * Check if .ralph/ directory exists
 */
export async function loopExists(
  fs: JSRuntimeFS,
  cwd: string
): Promise<boolean> {
  const ralphDir = path.join(cwd, RALPH_DIR)
  return (await fs.exists?.(ralphDir)) ?? false
}

/**
 * Clean up the loop state (delete .ralph/)
 */
export async function cleanupLoopState(
  fs: JSRuntimeFS,
  cwd: string
): Promise<void> {
  const ralphDir = path.join(cwd, RALPH_DIR)
  try {
    // Remove all files first
    const files = Object.values(RALPH_FILES)
    for (const file of files) {
      try {
        await fs.unlink(path.join(cwd, file))
      } catch {
        // File might not exist
      }
    }
    // Remove directory
    await fs.rmdir(ralphDir)
  } catch {
    // Directory might not exist
  }
}
