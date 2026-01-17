import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult } from './ShellCommand'

/**
 * echo - display arguments
 */
export class EchoCommand implements ShellCommand {
  name = 'echo'
  description = 'Display arguments'
  usage = 'echo [text...]'

  async execute(args: string[]): Promise<ShellCommandResult> {
    // Handle -n flag (no trailing newline) - we just return the string
    // Handle -e flag (interpret escape sequences)
    let noNewline = false
    let interpretEscapes = false
    const textArgs: string[] = []

    for (const arg of args) {
      if (arg === '-n') {
        noNewline = true
      } else if (arg === '-e') {
        interpretEscapes = true
      } else if (arg === '-E') {
        interpretEscapes = false
      } else {
        textArgs.push(arg)
      }
    }

    let output = textArgs.join(' ')

    if (interpretEscapes) {
      output = output
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\')
    }

    if (!noNewline) {
      output += '\n'
    }

    return createSuccessResult(output.trimEnd())
  }
}
