import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * false - Do nothing, unsuccessfully (exit code 1)
 */
export class FalseCommand implements ShellCommand {
  name = 'false'
  description = 'Do nothing, unsuccessfully'

  async execute(_args: string[], _options: ShellOptions): Promise<ShellResult> {
    return { exitCode: 1, stdout: '', stderr: '' }
  }
}
