import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * pwd - Print working directory
 */
export class PwdCommand implements ShellCommand {
  name = 'pwd'
  description = 'Print name of current/working directory'

  async execute(_args: string[], options: ShellOptions): Promise<ShellResult> {
    return {
      exitCode: 0,
      stdout: options.cwd + '\n',
      stderr: '',
    }
  }
}
