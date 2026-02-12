import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * env - Display environment variables
 */
export class EnvCommand implements ShellCommand {
  name = 'env'
  description = 'Display environment variables'

  async execute(_args: string[], options: ShellOptions): Promise<ShellResult> {
    const { cwd } = options
    const env = [
      'USER=ralph',
      'HOME=/projects',
      'SHELL=wiggum',
      `PWD=${cwd}`,
      'LANG=en_US.UTF-8',
      'TERM=xterm-256color',
    ]
    return { exitCode: 0, stdout: env.join('\n') + '\n', stderr: '' }
  }
}
