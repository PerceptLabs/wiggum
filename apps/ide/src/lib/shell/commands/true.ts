import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * true - Do nothing, successfully (exit code 0)
 * Enables patterns like: cmd || true
 */
export class TrueCommand implements ShellCommand {
  name = 'true'
  description = 'Do nothing, successfully'

  async execute(_args: string[], _options: ShellOptions): Promise<ShellResult> {
    return { exitCode: 0, stdout: '', stderr: '' }
  }
}
