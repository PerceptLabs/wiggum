import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * which - Show the location of a command
 * Usage: which <command>
 * Reports whether a command is a shell built-in
 */
export class WhichCommand implements ShellCommand {
  name = 'which'
  description = 'Locate a command'

  private availableCommands: string[]

  constructor(availableCommands: string[]) {
    this.availableCommands = availableCommands
  }

  async execute(args: string[], _options: ShellOptions): Promise<ShellResult> {
    if (args.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'which: missing operand' }
    }

    const results: string[] = []
    let exitCode = 0

    for (const cmd of args) {
      if (this.availableCommands.includes(cmd)) {
        results.push(`${cmd}: shell built-in`)
      } else {
        results.push(`${cmd}: not found`)
        exitCode = 1
      }
    }

    return { exitCode, stdout: results.join('\n') + '\n', stderr: '' }
  }
}
