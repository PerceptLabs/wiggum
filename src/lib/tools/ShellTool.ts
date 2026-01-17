import { z } from 'zod'
import path from 'path-browserify'
import type { Tool, ToolResult, ShellToolParams, ParsedCommand, CompoundCommand } from './types'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from '../commands'
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
  RalphCommand,
} from '../commands'
import { Git } from '../git'

/**
 * Shell tool that exposes shell commands to the AI
 * Supports command parsing, compound commands, piping, and redirects
 */
export class ShellTool implements Tool<ShellToolParams> {
  name = 'shell'
  description = 'Execute shell commands in the virtual filesystem'

  inputSchema = z.object({
    command: z.string().describe('The shell command to execute'),
  })

  private registry: CommandRegistry
  private cwd: string
  private fs: JSRuntimeFS
  private sendMessage?: (prompt: string) => Promise<string>

  constructor(options: {
    fs: JSRuntimeFS
    cwd: string
    gitFactory?: (dir: string) => Git
    sendMessage?: (prompt: string) => Promise<string>
  }) {
    this.fs = options.fs
    this.cwd = options.cwd
    this.sendMessage = options.sendMessage
    this.registry = new CommandRegistry()

    // Create default git factory if not provided
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

    // Register ralph command if sendMessage callback is provided
    if (options.sendMessage) {
      this.registry.register(new RalphCommand(options.fs, gitFactory, options.sendMessage))
    }
  }

  /**
   * Execute a shell command string
   */
  async execute(params: ShellToolParams): Promise<ToolResult> {
    const { command } = params

    try {
      const compoundCommands = this.parseCompoundCommand(command)
      const result = await this.executeCompoundCommands(compoundCommands)

      return {
        content: result.stdout + (result.stderr ? `\n${result.stderr}` : ''),
        cost: 1,
      }
    } catch (err) {
      return {
        content: `Error: ${(err as Error).message}`,
        cost: 1,
      }
    }
  }

  /**
   * Parse a simple command string into command name and arguments
   * Handles quotes and escape sequences
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
      const path = tokens[redirectIndex + 1]
      redirect = { type, path }
      tokens.splice(redirectIndex, 2)
    }

    const [name = '', ...args] = tokens

    return { name, args, redirect }
  }

  /**
   * Parse a compound command string into individual commands with operators
   * Handles &&, ||, |, and ;
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
          i++ // Skip next &
          continue
        }

        if (char === '|' && nextChar === '|') {
          commands.push({
            command: this.parseCommand(current.trim()),
            operator: '||',
          })
          current = ''
          i++ // Skip next |
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
    const { name, args, redirect } = parsed

    if (!name) {
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    const command = this.registry.get(name)
    if (!command) {
      return {
        exitCode: 127,
        stdout: '',
        stderr: `${name}: command not found`,
      }
    }

    // Execute the command
    const result = await command.execute(args, this.cwd, pipeInput)

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
          // Append
          let existing = ''
          try {
            existing = (await this.fs.readFile(filePath, { encoding: 'utf8' })) as string
          } catch {
            // File doesn't exist, that's fine
          }
          await this.fs.writeFile(filePath, existing + result.stdout)
        } else {
          // Overwrite
          await this.fs.writeFile(filePath, result.stdout)
        }
        // Clear stdout since it was redirected
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
   * Execute compound commands in sequence, respecting operators
   */
  async executeCompoundCommands(commands: CompoundCommand[]): Promise<ShellCommandResult> {
    let lastResult: ShellCommandResult = { exitCode: 0, stdout: '', stderr: '' }
    let pipeInput: string | undefined

    for (let i = 0; i < commands.length; i++) {
      const { command, operator } = commands[i]
      const prevOperator = i > 0 ? commands[i - 1].operator : null

      // Check if we should skip this command based on previous result
      if (prevOperator === '&&' && lastResult.exitCode !== 0) {
        continue
      }
      if (prevOperator === '||' && lastResult.exitCode === 0) {
        continue
      }

      // Execute command
      const result = await this.executeSingleCommand(command, pipeInput)

      // Handle piping
      if (operator === '|') {
        pipeInput = result.stdout
        lastResult = { ...result, stdout: '' }
      } else {
        pipeInput = undefined
        // Combine output for ; operator, replace otherwise
        if (prevOperator === ';') {
          lastResult = {
            exitCode: result.exitCode,
            stdout: lastResult.stdout + (lastResult.stdout && result.stdout ? '\n' : '') + result.stdout,
            stderr: lastResult.stderr + (lastResult.stderr && result.stderr ? '\n' : '') + result.stderr,
          }
        } else if (prevOperator === '|') {
          // Pipe result replaces the output
          lastResult = result
        } else {
          lastResult = result
        }
      }
    }

    return lastResult
  }

  /**
   * Get the current working directory
   */
  getCurrentWorkingDirectory(): string {
    return this.cwd
  }

  /**
   * Set the current working directory
   */
  setCurrentWorkingDirectory(cwd: string): void {
    this.cwd = cwd
  }

  /**
   * Get list of available commands
   */
  getAvailableCommands(): ShellCommand[] {
    return this.registry.list()
  }

  /**
   * Get the command registry for direct access
   */
  getRegistry(): CommandRegistry {
    return this.registry
  }

  /**
   * Send a message via the ralph callback (for autonomous iteration)
   * Returns the AI's response
   */
  async sendRalphMessage(prompt: string): Promise<string> {
    if (this.sendMessage) {
      return this.sendMessage(prompt)
    }
    return ''
  }

  /**
   * Check if ralph command is available
   */
  hasRalph(): boolean {
    return this.registry.has('ralph')
  }
}
