import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult } from './ShellCommand'

/**
 * pwd - print working directory
 */
export class PwdCommand implements ShellCommand {
  name = 'pwd'
  description = 'Print the current working directory'
  usage = 'pwd'

  async execute(_args: string[], cwd: string): Promise<ShellCommandResult> {
    return createSuccessResult(cwd)
  }
}
