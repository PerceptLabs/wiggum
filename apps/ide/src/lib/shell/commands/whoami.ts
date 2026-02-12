import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * whoami - Print the current user name
 */
export class WhoamiCommand implements ShellCommand {
  name = 'whoami'
  description = 'Print current user name'

  async execute(_args: string[], _options: ShellOptions): Promise<ShellResult> {
    return { exitCode: 0, stdout: 'ralph\n', stderr: '' }
  }
}
