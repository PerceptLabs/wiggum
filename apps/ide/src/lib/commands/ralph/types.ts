import type { JSRuntimeFS } from '../../fs'
import type { Git } from '../../git'

// ==================================
// Shell Command Types (local to ralph)
// ==================================

/**
 * Result of a shell command execution
 */
export interface ShellCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

/**
 * Shell command interface
 */
export interface ShellCommand {
  name: string
  description: string
  usage: string
  execute(args: string[], cwd: string): Promise<ShellCommandResult>
}

/**
 * Create a success result
 */
export function createSuccessResult(stdout: string): ShellCommandResult {
  return { exitCode: 0, stdout, stderr: '' }
}

/**
 * Create an error result
 */
export function createErrorResult(stderr: string): ShellCommandResult {
  return { exitCode: 1, stdout: '', stderr }
}

// ==================================
// Ralph Types
// ==================================

/**
 * Ralph state stored in .ralph/ directory
 */
export interface RalphState {
  task: string
  progress: string
  feedback: string
  iteration: number
  status: RalphStatus
}

/**
 * Ralph status values
 */
export type RalphStatus = 'idle' | 'running' | 'waiting' | 'complete' | 'error'

/**
 * Ralph configuration options
 */
export interface RalphConfig {
  maxIterations: number
  checkpointInterval: number
}

/**
 * Options passed to ralph subcommands
 */
export interface RalphSubcommandOptions {
  fs: JSRuntimeFS
  git: Git
  cwd: string
  sendMessage: (prompt: string) => Promise<string>
}

/**
 * Ralph subcommand interface (same pattern as git)
 */
export interface RalphSubcommand {
  name: string
  description: string
  usage: string
  execute(args: string[], cwd: string, options: RalphSubcommandOptions): Promise<ShellCommandResult>
}

/**
 * Default ralph configuration
 */
export const DEFAULT_RALPH_CONFIG: RalphConfig = {
  maxIterations: 50,
  checkpointInterval: 1,
}

/**
 * Ralph directory and file paths
 */
export const RALPH_DIR = '.ralph'
export const RALPH_FILES = {
  task: `${RALPH_DIR}/task.md`,
  progress: `${RALPH_DIR}/progress.md`,
  feedback: `${RALPH_DIR}/feedback.md`,
  iteration: `${RALPH_DIR}/iteration.txt`,
  status: `${RALPH_DIR}/status.txt`,
  config: `${RALPH_DIR}/config.json`,
} as const
