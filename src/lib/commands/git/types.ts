import type { Git } from '../../git'
import type { JSRuntimeFS } from '../../fs'
import type { ShellCommandResult } from '../ShellCommand'

/**
 * Options passed to git subcommands
 */
export interface GitSubcommandOptions {
  git: Git
  fs: JSRuntimeFS
}

/**
 * Git subcommand interface
 */
export interface GitSubcommand {
  /** Subcommand name (e.g., "status", "add", "commit") */
  name: string
  /** Short description */
  description: string
  /** Usage string */
  usage: string
  /**
   * Execute the subcommand
   * @param args - Arguments after the subcommand name
   * @param cwd - Current working directory
   * @param options - Git and FS instances
   */
  execute(args: string[], cwd: string, options: GitSubcommandOptions): Promise<ShellCommandResult>
}
