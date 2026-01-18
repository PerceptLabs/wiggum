/**
 * Shell command infrastructure for Wiggum
 */

/**
 * Result of executing a shell command
 */
export interface ShellCommandResult {
  /** Exit code (0 = success, non-zero = error) */
  exitCode: number
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** New current working directory (if command changes it) */
  newCwd?: string
}

/**
 * Shell command definition
 */
export interface ShellCommand {
  /** Command name (e.g., "ls", "cd", "cat") */
  name: string
  /** Short description of what the command does */
  description: string
  /** Usage string (e.g., "ls [path]") */
  usage: string
  /** If true, command is hidden from help listings */
  isEasterEgg?: boolean
  /**
   * Execute the command
   * @param args - Command arguments (not including command name)
   * @param cwd - Current working directory
   * @param input - Optional stdin input (for piped commands)
   * @returns Command result
   */
  execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult>
}

/**
 * Create a successful command result
 * @param stdout - Output to display
 * @param newCwd - Optional new working directory
 */
export function createSuccessResult(stdout: string, newCwd?: string): ShellCommandResult {
  return {
    exitCode: 0,
    stdout,
    stderr: '',
    newCwd,
  }
}

/**
 * Create an error command result
 * @param stderr - Error message
 * @param exitCode - Exit code (default: 1)
 */
export function createErrorResult(stderr: string, exitCode = 1): ShellCommandResult {
  return {
    exitCode,
    stdout: '',
    stderr,
  }
}
