import type { JSRuntimeFS } from '../../fs'
import type { Git } from '../../git'
import type { ShellCommand, ShellCommandResult, RalphSubcommand, RalphSubcommandOptions } from './types'
import { createErrorResult } from './types'

// Import subcommands
import { initSubcommand } from './init'
import { statusSubcommand } from './status'
import { resumeSubcommand } from './resume'
import { runSubcommand } from './run'

// All ralph subcommands
const subcommands: RalphSubcommand[] = [initSubcommand, statusSubcommand, resumeSubcommand, runSubcommand]

/**
 * Ralph command - wiggum's autonomous iteration loop
 *
 * The ralph command enables autonomous AI development loops where:
 * - State lives in files (.ralph/ directory) and git, not LLM memory
 * - Each iteration starts with fresh context
 * - The sendMessage callback invokes the AI for each iteration
 */
export class RalphCommand implements ShellCommand {
  name = 'ralph'
  description = "Wiggum's autonomous iteration loop for AI-driven development"
  usage = 'ralph <subcommand> [options]'

  private subcommandMap = new Map<string, RalphSubcommand>()
  private fs: JSRuntimeFS
  private gitFactory: (dir: string) => Git
  private sendMessage: (prompt: string) => Promise<string>

  constructor(
    fs: JSRuntimeFS,
    gitFactory: (dir: string) => Git,
    sendMessage: (prompt: string) => Promise<string>
  ) {
    this.fs = fs
    this.gitFactory = gitFactory
    this.sendMessage = sendMessage

    // Register subcommands
    for (const sub of subcommands) {
      this.subcommandMap.set(sub.name, sub)
    }
  }

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    const subcommandName = args[0]

    if (!subcommandName || subcommandName === '--help' || subcommandName === '-h') {
      return this.showUsage()
    }

    const subcommand = this.subcommandMap.get(subcommandName)
    if (!subcommand) {
      return createErrorResult(
        `ralph: '${subcommandName}' is not a ralph command. See 'ralph --help'.`
      )
    }

    const git = this.gitFactory(cwd)
    const options: RalphSubcommandOptions = {
      fs: this.fs,
      git,
      cwd,
      sendMessage: this.sendMessage,
    }

    return subcommand.execute(args.slice(1), cwd, options)
  }

  private showUsage(): ShellCommandResult {
    const lines = [
      'ralph - autonomous iteration loop for AI-driven development',
      '',
      'Usage: ralph <subcommand> [options]',
      '',
      'Subcommands:',
      ...Array.from(this.subcommandMap.values()).map(
        (sub) => `  ${sub.name.padEnd(12)} ${sub.description}`
      ),
      '',
      'The ralph loop:',
      '  1. Initialize with: ralph init "your task description"',
      '  2. Start the loop: ralph run',
      '  3. Check status: ralph status',
      '  4. Resume if paused: ralph resume',
      '',
      'State is stored in .ralph/ directory:',
      '  task.md      - The task description',
      '  progress.md  - Progress notes from each iteration',
      '  feedback.md  - Feedback or corrections',
      '  iteration.txt - Current iteration number',
      '  status.txt   - Current status (idle/running/waiting/complete)',
    ]
    return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
  }

  /**
   * Get a subcommand by name
   */
  getSubcommand(name: string): RalphSubcommand | undefined {
    return this.subcommandMap.get(name)
  }

  /**
   * List all subcommands
   */
  listSubcommands(): RalphSubcommand[] {
    return Array.from(this.subcommandMap.values())
  }
}

// Re-export types
export type { RalphSubcommand, RalphSubcommandOptions, RalphState, RalphStatus, RalphConfig } from './types'
export { RALPH_DIR, RALPH_FILES, DEFAULT_RALPH_CONFIG } from './types'

// Re-export loop functions for internal use
export {
  initLoopState,
  readLoopState,
  buildLoopContext,
  updateIteration,
  appendProgress,
  checkComplete,
  checkWaiting,
  getStatus,
  setStatus,
  loopExists,
  cleanupLoopState,
  readConfig,
} from './loop'
