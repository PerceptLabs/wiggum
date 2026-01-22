/**
 * ShellExecutor - Parses and routes shell commands to command classes
 * This replaces ShellTool's execution logic for use with AI SDK native tools
 */

import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommandResult } from '../commands'
import {
  CommandRegistry,
  CatCommand,
  LsCommand,
  CdCommand,
  PwdCommand,
  MkdirCommand,
  TouchCommand,
  RmCommand,
  CpCommand,
  MvCommand,
  EchoCommand,
  GrepCommand,
  HeadCommand,
  TailCommand,
  WcCommand,
  SortCommand,
  UniqCommand,
  CutCommand,
  SedCommand,
  TrCommand,
  FindCommand,
  GitCommand,
} from '../commands'
import { Git } from '../git'

/**
 * Parsed command with its arguments
 */
interface ParsedCommand {
  name: string
  args: string[]
  redirect?: {
    type: '>' | '>>'
    path: string
  }
}

/**
 * Compound command with operator
 */
interface CompoundCommand {
  command: ParsedCommand
  operator: '&&' | '||' | '|' | ';' | null
}

export interface ShellExecutorOptions {
  fs: JSRuntimeFS
  cwd: string
  gitFactory?: (dir: string) => Git
}

/**
 * ShellExecutor handles command parsing and execution
 */
export class ShellExecutor {
  private registry: CommandRegistry
  private cwd: string
  private fs: JSRuntimeFS

  constructor(options: ShellExecutorOptions) {
    this.fs = options.fs
    this.cwd = options.cwd
    this.registry = new CommandRegistry()

    const gitFactory =
      options.gitFactory ?? ((dir: string) => new Git({ fs: options.fs as any, dir }))

    // Register all commands
    this.registry.registerAll([
      // File commands
      new CatCommand(options.fs),
      new LsCommand(options.fs),
      new CdCommand(options.fs),
      new PwdCommand(),
      new MkdirCommand(options.fs),
      new TouchCommand(options.fs),
      new RmCommand(options.fs),
      new CpCommand(options.fs),
      new MvCommand(options.fs),
      // Text processing commands
      new EchoCommand(),
      new GrepCommand(options.fs),
      new HeadCommand(options.fs),
      new TailCommand(options.fs),
      new WcCommand(options.fs),
      new SortCommand(options.fs),
      new UniqCommand(options.fs),
      new CutCommand(options.fs),
      new SedCommand(options.fs),
      new TrCommand(),
      new FindCommand(options.fs),
      // Git command
      new GitCommand(options.fs, gitFactory),
    ])
  }

  /**
   * Run a shell command string
   * Returns { exitCode, stdout, stderr }
   */
  async run(commandStr: string): Promise<ShellCommandResult> {
    console.log('[ShellExecutor.run] Input:', commandStr)

    if (!commandStr || typeof commandStr !== 'string') {
      console.error('[ShellExecutor.run] Invalid command:', commandStr)
      return { exitCode: 1, stdout: '', stderr: 'Invalid command' }
    }

    if (commandStr.trim() === '') {
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    try {
      const compoundCommands = this.parseCompoundCommand(commandStr)
      console.log('[ShellExecutor.run] Parsed commands:', compoundCommands.length)
      const result = await this.executeCompoundCommands(compoundCommands)
      console.log('[ShellExecutor.run] Result:', { exitCode: result.exitCode, stdoutLen: result.stdout?.length || 0 })
      return result
    } catch (err) {
      console.error('[ShellExecutor.run] Error:', err)
      return {
        exitCode: 1,
        stdout: '',
        stderr: `Error: ${(err as Error).message}`,
      }
    }
  }

  /**
   * Parse a simple command string into command name and arguments
   */
  parseCommand(commandStr: string): ParsedCommand {
    const tokens: string[] = []
    let current = ''
    let inSingleQuote = false
    let inDoubleQuote = false
    let escaped = false

    for (let i = 0; i < commandStr.length; i++) {
      const char = commandStr[i]

      if (escaped) {
        current += char
        escaped = false
        continue
      }

      if (char === '\\' && !inSingleQuote) {
        escaped = true
        continue
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote
        continue
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote
        continue
      }

      if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
        if (current) {
          tokens.push(current)
          current = ''
        }
        continue
      }

      current += char
    }

    if (current) {
      tokens.push(current)
    }

    // Handle redirects
    let redirect: ParsedCommand['redirect'] | undefined
    const redirectIndex = tokens.findIndex((t) => t === '>' || t === '>>')

    if (redirectIndex !== -1 && redirectIndex < tokens.length - 1) {
      const type = tokens[redirectIndex] as '>' | '>>'
      const filePath = tokens[redirectIndex + 1]
      redirect = { type, path: filePath }
      tokens.splice(redirectIndex, 2)
    }

    const [name = '', ...args] = tokens

    return { name, args, redirect }
  }

  /**
   * Parse a compound command string
   */
  parseCompoundCommand(commandStr: string): CompoundCommand[] {
    const commands: CompoundCommand[] = []
    let current = ''
    let inSingleQuote = false
    let inDoubleQuote = false
    let escaped = false

    for (let i = 0; i < commandStr.length; i++) {
      const char = commandStr[i]
      const nextChar = commandStr[i + 1]

      if (escaped) {
        current += char
        escaped = false
        continue
      }

      if (char === '\\') {
        escaped = true
        current += char
        continue
      }

      if (char === "'" && !inDoubleQuote) {
        inSingleQuote = !inSingleQuote
        current += char
        continue
      }

      if (char === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote
        current += char
        continue
      }

      // Check for operators outside of quotes
      if (!inSingleQuote && !inDoubleQuote) {
        if (char === '&' && nextChar === '&') {
          commands.push({
            command: this.parseCommand(current.trim()),
            operator: '&&',
          })
          current = ''
          i++
          continue
        }

        if (char === '|' && nextChar === '|') {
          commands.push({
            command: this.parseCommand(current.trim()),
            operator: '||',
          })
          current = ''
          i++
          continue
        }

        if (char === '|') {
          commands.push({
            command: this.parseCommand(current.trim()),
            operator: '|',
          })
          current = ''
          continue
        }

        if (char === ';') {
          commands.push({
            command: this.parseCommand(current.trim()),
            operator: ';',
          })
          current = ''
          continue
        }
      }

      current += char
    }

    // Add final command
    if (current.trim()) {
      commands.push({
        command: this.parseCommand(current.trim()),
        operator: null,
      })
    }

    return commands
  }

  /**
   * Execute a single parsed command
   */
  async executeSingleCommand(
    parsed: ParsedCommand,
    pipeInput?: string
  ): Promise<ShellCommandResult> {
    const { name, args = [], redirect } = parsed

    if (!name) {
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    console.log('[ShellExecutor.executeSingleCommand] Command:', name, 'args:', args)

    const command = this.registry.get(name)
    if (!command) {
      return {
        exitCode: 127,
        stdout: '',
        stderr: `${name}: command not found`,
      }
    }

    // Execute the command with defensive args
    const safeArgs = Array.isArray(args) ? args : []
    let result: ShellCommandResult
    try {
      result = await command.execute(safeArgs, this.cwd, pipeInput)
    } catch (err) {
      console.error('[ShellExecutor.executeSingleCommand] Error executing:', name, err)
      return {
        exitCode: 1,
        stdout: '',
        stderr: `Error executing ${name}: ${(err as Error).message}`,
      }
    }

    // Ensure result has expected shape
    if (!result || typeof result !== 'object') {
      return { exitCode: 1, stdout: '', stderr: 'Invalid command result' }
    }
    result = {
      exitCode: result.exitCode ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      newCwd: result.newCwd,
    }

    // Handle cd command - update cwd
    if (name === 'cd' && result.newCwd) {
      this.cwd = result.newCwd
    }

    // Handle redirect
    if (redirect && result.exitCode === 0) {
      const filePath = path.isAbsolute(redirect.path)
        ? redirect.path
        : path.join(this.cwd, redirect.path)

      try {
        if (redirect.type === '>>') {
          let existing = ''
          try {
            existing = (await this.fs.readFile(filePath, { encoding: 'utf8' })) as string
          } catch {
            // File doesn't exist
          }
          await this.fs.writeFile(filePath, existing + result.stdout)
        } else {
          await this.fs.writeFile(filePath, result.stdout)
        }
        return { ...result, stdout: '' }
      } catch (err) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `Cannot redirect to ${redirect.path}: ${(err as Error).message}`,
        }
      }
    }

    return result
  }

  /**
   * Execute compound commands in sequence
   */
  async executeCompoundCommands(commands: CompoundCommand[]): Promise<ShellCommandResult> {
    let lastResult: ShellCommandResult = { exitCode: 0, stdout: '', stderr: '' }
    let pipeInput: string | undefined

    for (let i = 0; i < commands.length; i++) {
      const { command, operator } = commands[i]
      const prevOperator = i > 0 ? commands[i - 1].operator : null

      // Check if we should skip based on previous result
      if (prevOperator === '&&' && lastResult.exitCode !== 0) {
        continue
      }
      if (prevOperator === '||' && lastResult.exitCode === 0) {
        continue
      }

      const result = await this.executeSingleCommand(command, pipeInput)

      if (operator === '|') {
        pipeInput = result.stdout
        lastResult = { ...result, stdout: '' }
      } else {
        pipeInput = undefined
        if (prevOperator === ';') {
          lastResult = {
            exitCode: result.exitCode,
            stdout: lastResult.stdout + (lastResult.stdout && result.stdout ? '\n' : '') + result.stdout,
            stderr: lastResult.stderr + (lastResult.stderr && result.stderr ? '\n' : '') + result.stderr,
          }
        } else if (prevOperator === '|') {
          lastResult = result
        } else {
          lastResult = result
        }
      }
    }

    return lastResult
  }

  /**
   * Get current working directory
   */
  getCwd(): string {
    return this.cwd
  }

  /**
   * Set current working directory
   */
  setCwd(cwd: string): void {
    this.cwd = cwd
  }

  /**
   * Get list of available commands
   */
  getAvailableCommands(): string[] {
    return this.registry.list().map((cmd) => cmd.name)
  }
}
