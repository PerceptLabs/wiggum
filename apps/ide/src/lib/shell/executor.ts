import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'
import { parseCommandLine, normalizePath } from './parser'
import type { ParsedCommand, ShellCommand, ShellOptions, ShellResult } from './types'
import { resolvePath, dirname } from './commands/utils'

/** Shell executor that manages command registration and execution with piping support */
export class ShellExecutor {
  private commands: Map<string, ShellCommand> = new Map()
  private fs: JSRuntimeFS
  private git?: Git

  constructor(fs: JSRuntimeFS, git?: Git) {
    this.fs = fs
    this.git = git
  }

  registerCommand(cmd: ShellCommand): void {
    this.commands.set(cmd.name, cmd)
  }

  unregisterCommand(name: string): boolean {
    return this.commands.delete(name)
  }

  getCommand(name: string): ShellCommand | undefined {
    return this.commands.get(name)
  }

  listCommands(): ShellCommand[] {
    return Array.from(this.commands.values())
  }

  /** Execute a command line string. Supports piping, redirects, heredocs, and command chaining */
  async execute(commandLine: string, cwd: string): Promise<ShellResult> {
    const parsed = parseCommandLine(commandLine)
    if (parsed.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    let stdin: string | undefined
    let lastResult: ShellResult = { exitCode: 0, stdout: '', stderr: '' }

    for (let i = 0; i < parsed.length; i++) {
      const cmd = parsed[i]

      // Handle internal __write__ command (from heredoc parsing)
      if (cmd.name === '__write__') {
        const writeResult = await this.handleInternalWrite(cmd.args, cwd)
        if (writeResult.exitCode !== 0) return writeResult
        lastResult = writeResult
        continue
      }

      // Normalize paths in arguments
      const normalizedArgs = cmd.args.map(arg => {
        // Only normalize if it looks like a path
        if (arg.startsWith('/') || arg.includes('/')) {
          return normalizePath(arg, cwd)
        }
        return arg
      })

      const command = this.commands.get(cmd.name)
      if (!command) {
        return { exitCode: 127, stdout: '', stderr: `${cmd.name}: command not found` }
      }

      const options: ShellOptions = { cwd, stdin, fs: this.fs, git: this.git }

      try {
        lastResult = await command.execute(normalizedArgs, options)
      } catch (error) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
        }
      }

      if (lastResult.exitCode !== 0) return lastResult

      // Handle redirect on the command
      if (cmd.redirect && lastResult.stdout) {
        const redirectResult = await this.handleRedirect(cmd, lastResult.stdout, cwd)
        if (redirectResult.exitCode !== 0) return redirectResult
        // After redirect, output goes to file, so clear stdout
        lastResult = { ...lastResult, stdout: '' }
      }

      stdin = lastResult.stdout
    }

    return lastResult
  }

  /** Handle internal __write__ command (generated from heredoc parsing) */
  private async handleInternalWrite(args: string[], cwd: string): Promise<ShellResult> {
    if (args.length < 2) {
      return { exitCode: 1, stdout: '', stderr: '__write__: missing filename or content' }
    }

    const [rawFilename, content] = args
    const normalizedFilename = normalizePath(rawFilename, cwd)
    const filePath = resolvePath(cwd, normalizedFilename)

    try {
      // Ensure directory exists
      const dir = dirname(filePath)
      if (dir && dir !== filePath) {
        await this.fs.mkdir(dir, { recursive: true }).catch(() => {
          // Directory might already exist
        })
      }

      await this.fs.writeFile(filePath, content, { encoding: 'utf8' })
      return {
        exitCode: 0,
        stdout: `Wrote ${content.length} bytes to ${normalizedFilename}\n`,
        stderr: '',
      }
    } catch (err) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cannot write to '${normalizedFilename}': ${err}`,
      }
    }
  }

  /** Handle output redirection to a file */
  private async handleRedirect(
    cmd: ParsedCommand,
    content: string,
    cwd: string
  ): Promise<ShellResult> {
    if (!cmd.redirect) {
      return { exitCode: 0, stdout: content, stderr: '' }
    }

    const normalizedTarget = normalizePath(cmd.redirect.target, cwd)
    const filePath = resolvePath(cwd, normalizedTarget)

    try {
      // Ensure directory exists
      const dir = dirname(filePath)
      if (dir && dir !== filePath) {
        await this.fs.mkdir(dir, { recursive: true }).catch(() => {
          // Directory might already exist
        })
      }

      if (cmd.redirect.type === '>>') {
        // Append mode
        let existing = ''
        try {
          const data = await this.fs.readFile(filePath, { encoding: 'utf8' })
          existing = typeof data === 'string' ? data : new TextDecoder().decode(data)
        } catch {
          // File doesn't exist, start fresh
        }
        await this.fs.writeFile(filePath, existing + content, { encoding: 'utf8' })
      } else {
        // Write mode (overwrite)
        await this.fs.writeFile(filePath, content, { encoding: 'utf8' })
      }
      return { exitCode: 0, stdout: '', stderr: '' }
    } catch (err) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cannot write to '${normalizedTarget}': ${err}`,
      }
    }
  }
}
