/**
 * Task Lifecycle — automatic boundary snapshots
 *
 * Pure functions for task counter, history, and pre/post snapshots.
 * Called from useAIChat (pre-task) and loop.ts (post-task).
 * No React dependencies.
 */
import * as path from 'path-browserify'
import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'
import { RALPH_DIR } from './state'

const COUNTER_FILE = `${RALPH_DIR}/task-counter.txt`
const HISTORY_FILE = `${RALPH_DIR}/task-history.md`

const SNAPSHOT_AUTHOR = { name: 'Wiggum Snapshot', email: 'snapshot@wiggum.local' }

// ============================================================================
// COUNTER
// ============================================================================

export async function readTaskCounter(fs: JSRuntimeFS, cwd: string): Promise<number> {
  try {
    const raw = await fs.readFile(path.join(cwd, COUNTER_FILE), { encoding: 'utf8' }) as string
    const n = parseInt(raw.trim(), 10)
    return Number.isNaN(n) ? 0 : n
  } catch {
    return 0
  }
}

export async function writeTaskCounter(fs: JSRuntimeFS, cwd: string, value: number): Promise<void> {
  await fs.writeFile(path.join(cwd, COUNTER_FILE), String(value))
}

// ============================================================================
// PREVIOUS SUMMARY
// ============================================================================

export async function readPreviousSummary(fs: JSRuntimeFS, cwd: string): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(cwd, `${RALPH_DIR}/summary.md`), { encoding: 'utf8' }) as string
    const trimmed = raw.trim()
    if (!trimmed) return '(no summary)'
    const firstLine = trimmed.split('\n')[0]
    return firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine
  } catch {
    return '(no summary)'
  }
}

// ============================================================================
// TASK HISTORY
// ============================================================================

export async function appendTaskHistory(
  fs: JSRuntimeFS,
  cwd: string,
  taskNumber: number,
  summaryLine: string
): Promise<void> {
  const filePath = path.join(cwd, HISTORY_FILE)
  let existing = ''
  try {
    existing = await fs.readFile(filePath, { encoding: 'utf8' }) as string
  } catch {
    // File doesn't exist yet — will be created with header
  }

  if (!existing) {
    existing = '# Task History\n\n'
  }

  const entry = `- **Task ${taskNumber}**: ${summaryLine}\n`
  await fs.writeFile(filePath, existing + entry)
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

async function createSnapshot(
  git: Git,
  tagName: string,
  commitMessage: string
): Promise<string | null> {
  try {
    // Stage all changes (additions, modifications, deletions)
    await git.addAll()

    // Check for actual staged changes
    const matrix = await git.statusMatrix()
    const hasChanges = matrix.some(([, head, , stage]) => head !== stage)

    if (hasChanges) {
      await git.commit({
        message: commitMessage,
        author: SNAPSHOT_AUTHOR,
      })
    }

    // Always tag — even if no commit needed (creates consistent pre/post pair)
    await git.tag(tagName)
    return tagName
  } catch (err) {
    console.error(`[task-lifecycle] Snapshot failed (${tagName}):`, err)
    return null
  }
}

export async function createPreSnapshot(git: Git, taskNumber: number): Promise<string | null> {
  return createSnapshot(git, `task-${taskNumber}-pre`, `snapshot: pre-task ${taskNumber}`)
}

export async function createPostSnapshot(git: Git, taskNumber: number): Promise<string | null> {
  return createSnapshot(git, `task-${taskNumber}-post`, `snapshot: post-task ${taskNumber}`)
}
