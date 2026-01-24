/**
 * Ralph state management - Files as memory (.ralph/ directory)
 */
import * as path from 'path-browserify'
import type { JSRuntimeFS } from '../fs/types'

export const RALPH_DIR = '.ralph'

export interface RalphState {
  task: string
  progress: string
  feedback: string
  iteration: number
  status: string
}

const FILES = {
  task: `${RALPH_DIR}/task.md`,
  progress: `${RALPH_DIR}/progress.md`,
  feedback: `${RALPH_DIR}/feedback.md`,
  iteration: `${RALPH_DIR}/iteration.txt`,
  status: `${RALPH_DIR}/status.txt`,
}

async function readFile(fs: JSRuntimeFS, filePath: string, fallback: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, { encoding: 'utf8' })
    return (content as string).trim()
  } catch {
    return fallback
  }
}

/**
 * Initialize .ralph/ directory with task
 */
export async function initRalphDir(fs: JSRuntimeFS, cwd: string, task: string): Promise<void> {
  const ralphDir = path.join(cwd, RALPH_DIR)
  await fs.mkdir(ralphDir, { recursive: true })

  await fs.writeFile(path.join(cwd, FILES.task), `# Task\n\n${task}\n`)
  await fs.writeFile(path.join(cwd, FILES.progress), '# Progress\n\n')
  await fs.writeFile(path.join(cwd, FILES.feedback), '')
  await fs.writeFile(path.join(cwd, FILES.iteration), '0')
  await fs.writeFile(path.join(cwd, FILES.status), 'running')
}

/**
 * Read fresh state from .ralph/ files
 */
export async function getRalphState(fs: JSRuntimeFS, cwd: string): Promise<RalphState> {
  return {
    task: await readFile(fs, path.join(cwd, FILES.task), ''),
    progress: await readFile(fs, path.join(cwd, FILES.progress), ''),
    feedback: await readFile(fs, path.join(cwd, FILES.feedback), ''),
    iteration: parseInt(await readFile(fs, path.join(cwd, FILES.iteration), '0'), 10),
    status: await readFile(fs, path.join(cwd, FILES.status), 'running'),
  }
}

/**
 * Check if status.txt is "complete"
 */
export async function isComplete(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  const status = await readFile(fs, path.join(cwd, FILES.status), '')
  return status === 'complete'
}

/**
 * Check if status.txt is "waiting"
 */
export async function isWaiting(fs: JSRuntimeFS, cwd: string): Promise<boolean> {
  const status = await readFile(fs, path.join(cwd, FILES.status), '')
  return status === 'waiting'
}

/**
 * Update iteration count
 */
export async function setIteration(fs: JSRuntimeFS, cwd: string, iteration: number): Promise<void> {
  await fs.writeFile(path.join(cwd, FILES.iteration), String(iteration))
}

/**
 * Append to progress file
 */
export async function appendProgress(fs: JSRuntimeFS, cwd: string, entry: string): Promise<void> {
  const current = await readFile(fs, path.join(cwd, FILES.progress), '')
  await fs.writeFile(path.join(cwd, FILES.progress), current + '\n' + entry)
}
