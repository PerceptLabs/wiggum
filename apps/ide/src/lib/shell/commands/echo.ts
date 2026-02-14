import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * echo - Output text
 * Redirects (> and >>) are handled by the shell executor
 */
export class EchoCommand implements ShellCommand {
  name = 'echo'
  description = 'Display a line of text'

  /** Output args joined by spaces, followed by a newline */
  async execute(args: string[], _options: ShellOptions): Promise<ShellResult> {
    // Simply join all args with spaces and add newline
    // Redirects are now handled by the executor after parsing
    const output = args.join(' ') + '\n'
    return { exitCode: 0, stdout: output, stderr: '' }
  }
}
