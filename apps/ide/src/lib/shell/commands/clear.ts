import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * clear - Clear the terminal screen
 * Outputs __CLEAR__ marker for UI detection
 */
export class ClearCommand implements ShellCommand {
  name = 'clear'
  description = 'Clear the terminal screen'

  async execute(_args: string[], _options: ShellOptions): Promise<ShellResult> {
    return { exitCode: 0, stdout: '__CLEAR__', stderr: '' }
  }
}
