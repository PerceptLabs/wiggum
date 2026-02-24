import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'
import type { IframeProbeResult } from '../preview/snapshot'

// ============================================================================
// ARGUMENT SCHEMA TYPES (structural — satisfied by Zod schemas)
// ============================================================================

/** Structural type for argument schema (satisfied by Zod schemas) */
export interface ArgsSchema<T> {
  parse(data: unknown): T
  safeParse(data: unknown): SafeParseResult<T>
  toJSONSchema(): Record<string, unknown>
}

export type SafeParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: { readonly issues: ReadonlyArray<{ path: PropertyKey[]; code: string; message: string }> } }

// ============================================================================
// SHELL COMMAND INTERFACE
// ============================================================================

export interface ShellCommand<T = string[]> {
  name: string
  description: string
  /** Zod schema for typed arguments. Enables dual-mode dispatch. */
  argsSchema?: ArgsSchema<T>
  /** Examples for LLM guidance (shown in tool descriptions) */
  examples?: string[]
  /** Convert raw CLI args to typed shape for schema validation */
  parseCliArgs?(args: string[]): unknown
  /** Extra tool registrations backed by this command (different name + schema) */
  additionalTools?: Array<{
    name: string
    description: string
    argsSchema: ArgsSchema<any>
    examples?: string[]
  }>
  execute(args: T, options: ShellOptions): Promise<ShellResult>
}

export interface ShellOptions {
  cwd: string
  stdin?: string // For piped input
  fs: JSRuntimeFS
  git?: Git
  /** Execute a command string via the shell executor (for -exec in find, etc.) */
  exec?: (commandLine: string, cwd: string) => Promise<ShellResult>
  /** Preview context for on-demand build + error capture */
  preview?: {
    build: () => Promise<{ success: boolean; errors?: Array<{ message: string; file?: string; line?: number }>; warnings?: Array<{ message: string; file?: string; line?: number }>; metafile?: Record<string, unknown> }>
    getErrors: () => Array<{ message: string; source?: string; lineno?: number }>
    probeIframe?: () => Promise<IframeProbeResult>
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
  registerCommand(command: ShellCommand<any>): void
  execute(commandLine: string, options: ShellOptions): Promise<ShellResult>
}
