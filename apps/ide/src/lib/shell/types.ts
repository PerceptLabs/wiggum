import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'

export interface ShellCommand {
  name: string
  description: string
  execute(args: string[], options: ShellOptions): Promise<ShellResult>
}

export interface ShellOptions {
  cwd: string
  stdin?: string // For piped input
  fs: JSRuntimeFS
  git?: Git
  /** Execute a command string via the shell executor (for -exec in find, etc.) */
  exec?: (commandLine: string, cwd: string) => Promise<ShellResult>
  /** Preview context for on-demand build + DOM capture */
  preview?: {
    build: () => Promise<{ success: boolean; errors?: Array<{ message: string; file?: string; line?: number }>; warnings?: Array<{ message: string; file?: string; line?: number }> }>
    renderStatic: () => Promise<{ html: string; errors: string[] }>
    getErrors: () => Array<{ message: string; source?: string; lineno?: number }>
  }
}

export interface ShellResult {
  exitCode: number
  stdout: string
  stderr: string
  /** Paths of files modified by this command (for FS event emission) */
  filesChanged?: string[]
}

export interface ParsedCommand {
  name: string
  args: string[]
  redirect?: {
    type: '>' | '>>'
    target: string
  }
}

export interface ShellExecutor {
  registerCommand(command: ShellCommand): void
  execute(commandLine: string, options: ShellOptions): Promise<ShellResult>
}
