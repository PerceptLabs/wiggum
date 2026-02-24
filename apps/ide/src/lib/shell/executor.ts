import * as path from 'path-browserify'
import picomatch from 'picomatch'
import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'
import { parseCommandLineWithChaining, normalizePath } from './parser'
import type { ParsedChain } from './parser'
import type { ParsedCommand, ShellCommand, ShellOptions, ShellResult } from './types'
import { resolvePath, dirname } from './commands/utils'
import { validateFileWrite, validateFileContent, formatValidationError } from './write-guard'
import { structuredError } from './structured-errors'
import { fsEvents } from '../fs/fs-events'

/**
 * Callback for gap tracking - called when a command is not found
 */
export interface GapCallback {
  command: string
  args: string[]
  error: string
}

// ============================================================================
// GLOB EXPANSION
// ============================================================================

/**
 * Recursively walk a directory and return all file paths (relative to startDir)
 */
async function walkDir(
  fs: JSRuntimeFS,
  dir: string,
  startDir: string,
  maxDepth = 10
): Promise<string[]> {
  if (maxDepth <= 0) return []

  const results: string[] = []
  try {
    const entries = await fs.readdir(dir)
    for (const entry of entries) {
      // Skip hidden files and common non-source directories
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') {
        continue
      }

      const fullPath = `${dir}/${entry}`
      try {
        const stat = await fs.stat(fullPath)
        // Get path relative to startDir
        const relativePath = fullPath.startsWith(startDir + '/')
          ? fullPath.slice(startDir.length + 1)
          : fullPath.startsWith(startDir)
            ? fullPath.slice(startDir.length)
            : fullPath

        if (stat.isDirectory()) {
          const subResults = await walkDir(fs, fullPath, startDir, maxDepth - 1)
          results.push(...subResults)
        } else {
          results.push(relativePath)
        }
      } catch {
        // Skip entries we can't stat
      }
    }
  } catch {
    // Can't read directory
  }
  return results
}

/**
 * Expand glob patterns in arguments
 * Returns expanded args array with globs replaced by matching files
 */
async function expandGlobs(
  args: string[],
  cwd: string,
  fs: JSRuntimeFS
): Promise<string[]> {
  const expanded: string[] = []

  for (const arg of args) {
    // Check if this looks like a glob pattern
    const scanResult = picomatch.scan(arg)
    if (!scanResult.isGlob) {
      expanded.push(arg)
      continue
    }

    // Get the base directory for the glob
    // For "src/*.tsx", base would be "src"
    // For "*.tsx", base would be "."
    const baseDir = scanResult.base || '.'
    const searchDir = resolvePath(cwd, baseDir)

    try {
      // Get all files in the search directory
      const allFiles = await walkDir(fs, searchDir, searchDir)

      // Create a matcher for the glob pattern
      // Adjust pattern to be relative to the base
      const pattern = scanResult.glob || arg
      const matcher = picomatch(pattern, { dot: false })

      // Filter files that match the pattern
      const matches = allFiles.filter((file) => matcher(file))

      if (matches.length > 0) {
        // Add matched files with their base directory prefix
        for (const match of matches) {
          if (baseDir && baseDir !== '.') {
            expanded.push(`${baseDir}/${match}`)
          } else {
            expanded.push(match)
          }
        }
      } else {
        // No matches - keep original pattern (will fail with file not found)
        expanded.push(arg)
      }
    } catch {
      // On error, keep the original argument
      expanded.push(arg)
    }
  }

  return expanded
}

/**
 * Redirect map for common commands that don't exist in Wiggum
 * Provides helpful alternatives when users try unavailable commands
 */
const COMMAND_REDIRECTS: Record<string, { alt: string; example?: string }> = {
  awk: { alt: '`grep` + `replace`' },
  npm: { alt: 'esm.sh imports in your code', example: 'import x from "https://esm.sh/pkg"' },
  yarn: { alt: 'esm.sh imports in your code', example: 'import x from "https://esm.sh/pkg"' },
  pnpm: { alt: 'esm.sh imports in your code', example: 'import x from "https://esm.sh/pkg"' },
  node: { alt: 'Write React components instead' },
  python: { alt: 'Not supported in this environment' },
  python3: { alt: 'Not supported in this environment' },
  pip: { alt: 'Not supported in this environment' },
  curl: { alt: 'Static data or fetch in your React code' },
  wget: { alt: 'Static data or fetch in your React code' },
  bash: { alt: 'Run commands directly (no shell wrapper needed)' },
  sh: { alt: 'Run commands directly (no shell wrapper needed)' },
  cd: { alt: 'Not needed — all paths are relative to project root', example: 'cat src/App.tsx' },
  sudo: { alt: 'Not needed — you have full access to the project filesystem' },
  vim: { alt: '`replace` for surgical edits', example: 'replace src/file.tsx "old" "new"' },
  nano: { alt: '`replace` for surgical edits', example: 'replace src/file.tsx "old" "new"' },
  apt: { alt: 'Not available — browser-based virtual shell' },
}

// File validation functions imported from ./write-guard

/** Shell executor that manages command registration and execution with piping support */
export class ShellExecutor {
  private commands: Map<string, ShellCommand> = new Map()
  private fs: JSRuntimeFS
  private git?: Git
  private onGap?: (gap: GapCallback) => void
  previewContext?: ShellOptions['preview']

  constructor(fs: JSRuntimeFS, git?: Git) {
    this.fs = fs
    this.git = git
  }

  /**
   * Set callback for gap tracking (command not found events)
   * Used by observability system to record missing commands
   */
  setOnGap(callback: ((gap: GapCallback) => void) | undefined): void {
    this.onGap = callback
  }

  /**
   * Set preview context for on-demand build + DOM capture
   * Wired from GateContext in runRalphLoop
   */
  setPreviewContext(ctx: ShellOptions['preview']): void {
    this.previewContext = ctx
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

  /** Execute a command line string. Supports piping, redirects, heredocs, &&, and || */
  async execute(commandLine: string, cwd: string): Promise<ShellResult> {
    if (!commandLine || typeof commandLine !== 'string' || commandLine.trim() === '') {
      return { exitCode: 1, stdout: '', stderr: 'Error: empty or invalid command' }
    }

    const chains = parseCommandLineWithChaining(commandLine)
    if (chains.length === 0) {
      return { exitCode: 0, stdout: '', stderr: '' }
    }

    let lastResult: ShellResult = { exitCode: 0, stdout: '', stderr: '' }
    const allStdout: string[] = []
    const allStderr: string[] = []

    for (let i = 0; i < chains.length; i++) {
      const chain = chains[i]

      // Check if we should skip based on previous chain's operator
      if (i > 0) {
        const prevOp = chains[i - 1].nextOp
        if (prevOp === '&&' && lastResult.exitCode !== 0) continue // skip on prior failure
        if (prevOp === '||' && lastResult.exitCode === 0) continue // skip on prior success
      }

      // Execute this chain's pipeline (handles pipes internally)
      lastResult = await this.executePipeline(chain.commands, cwd)

      // Accumulate output from each chain segment
      if (lastResult.stdout) allStdout.push(lastResult.stdout)
      if (lastResult.stderr) allStderr.push(lastResult.stderr)
    }

    return {
      exitCode: lastResult.exitCode,
      stdout: allStdout.join(''),
      stderr: allStderr.join(''),
    }
  }

  /**
   * Execute a pipeline of piped commands
   * stdin flows between commands: cmd1.stdout → cmd2.stdin → cmd3.stdin
   */
  private async executePipeline(commands: ParsedCommand[], cwd: string): Promise<ShellResult> {
    let stdin: string | undefined
    let lastResult: ShellResult = { exitCode: 0, stdout: '', stderr: '' }

    for (const cmd of commands) {
      lastResult = await this.executeCommand(cmd, cwd, stdin)
      if (lastResult.exitCode !== 0) return lastResult // Stop pipeline on failure
      stdin = lastResult.stdout
    }

    return lastResult
  }

  /**
   * Execute a single command (handles heredoc, normalize, lookup, redirect)
   */
  private async executeCommand(
    cmd: ParsedCommand,
    cwd: string,
    stdin?: string
  ): Promise<ShellResult> {
    // Handle internal __write__ command (from heredoc parsing)
    if (cmd.name === '__write__') {
      return this.handleInternalWrite(cmd.args, cwd)
    }

    // Expand glob patterns in arguments (e.g., *.tsx, src/**/*.ts)
    const expandedArgs = await expandGlobs(cmd.args, cwd, this.fs)

    // Normalize paths in arguments
    const normalizedArgs = expandedArgs.map((arg) => {
      // Only normalize if it looks like a path (not a regex pattern like /foo/d or s|old|new|)
      if (arg.startsWith('/') || arg.includes('/')) {
        // Skip regex-like patterns: /pattern/flags, /start/,/end/p, /pat/s/old/new/
        const slashCount = (arg.match(/\//g) || []).length
        if (arg.startsWith('/') && slashCount >= 2) return arg
        // Skip sed-style expressions with alternate delimiters: s|old|new|
        if (arg.length > 1 && arg[0] === 's' && !/[a-zA-Z0-9]/.test(arg[1])) return arg
        return normalizePath(arg, cwd)
      }
      return arg
    })

    const command = this.commands.get(cmd.name)
    if (!command) {
      // Fallback: bare file path → cat
      // Matches: starts with . or /, contains path separators, or ends with common extensions
      const isLikelyPath = /^[.\/]|[/\\]|\.(tsx?|css|json|md|html)$/i.test(cmd.name)
      if (isLikelyPath) {
        const catCmd = this.commands.get('cat')
        if (catCmd) {
          const pathArgs = [cmd.name, ...normalizedArgs]
          try {
            return await catCmd.execute(pathArgs, { cwd, stdin, fs: this.fs, git: this.git })
          } catch {
            // Fall through to "command not found"
          }
        }
      }

      let error = `${cmd.name}: command not found`

      // Add helpful redirect if available
      const redirect = COMMAND_REDIRECTS[cmd.name]
      if (redirect) {
        error += `\n\n💡 Wiggum alternative: Use ${redirect.alt}`
        if (redirect.example) {
          error += `\n   Example: ${redirect.example}`
        }
      } else {
        // Show available commands for unknown commands without redirects
        const availableCommands = Array.from(this.commands.keys()).sort().join(', ')
        error += `\n\nAvailable commands: ${availableCommands}`
        error += `\n\nTips:`
        error += `\n  • Create files: cat > src/file.tsx << 'EOF'`
        error += `\n  • Edit files: replace src/file.tsx "old" "new"`
        error += `\n  • Search: grep "pattern" src/file.tsx`
      }

      // Notify gap tracking callback if set
      if (this.onGap) {
        this.onGap({ command: cmd.name, args: normalizedArgs, error })
      }
      return { exitCode: 127, stdout: '', stderr: error }
    }

    const options: ShellOptions = {
      cwd, stdin, fs: this.fs, git: this.git,
      exec: (cmdLine, execCwd) => this.execute(cmdLine, execCwd),
      preview: this.previewContext,
    }

    // Typed args: parseCliArgs converts string[] → typed shape, argsSchema validates
    let execArgs: any = normalizedArgs
    if (command.parseCliArgs) {
      execArgs = command.parseCliArgs(normalizedArgs)
    }
    if (command.argsSchema) {
      const parseResult = command.argsSchema.safeParse(execArgs)
      if (!parseResult.success) {
        return structuredError(command, parseResult)
      }
      execArgs = parseResult.data
    }

    try {
      let result = await command.execute(execArgs, options)

      // Emit FS events for commands that report changed files
      if (result.filesChanged) {
        for (const changedPath of result.filesChanged) {
          fsEvents.fileChanged(changedPath)
        }
      }

      // Handle redirect on the command
      if (cmd.redirect && result.stdout) {
        const redirectResult = await this.handleRedirect(cmd, result.stdout, cwd)
        if (redirectResult.exitCode !== 0) return redirectResult
        // After redirect, output goes to file, so clear stdout
        result = { ...result, stdout: '' }
      }

      return result
    } catch (error) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /** Handle internal __write__ command (generated from heredoc parsing) */
  private async handleInternalWrite(args: string[], cwd: string): Promise<ShellResult> {
    if (args.length < 2) {
      return { exitCode: 1, stdout: '', stderr: '__write__: missing filename or content' }
    }

    const [rawFilename, content, mode] = args
    const isAppend = mode === '>>'
    const normalizedFilename = normalizePath(rawFilename, cwd)
    const filePath = resolvePath(cwd, normalizedFilename)

    // HARNESS ENFORCEMENT: Validate path before write
    const validation = validateFileWrite(filePath, cwd)
    if (!validation.allowed) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: formatValidationError(validation, normalizedFilename),
      }
    }

    // HARNESS ENFORCEMENT: Validate content before write
    const contentValidation = validateFileContent(filePath, content)
    if (!contentValidation.allowed) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: formatValidationError(contentValidation, normalizedFilename),
      }
    }

    // Smart merge for src/index.css — preserve generated theme, validate overrides
    if (!isAppend && (filePath.endsWith('/src/index.css') || filePath.endsWith('\\src\\index.css'))) {
      try {
        const existingData = await this.fs.readFile(filePath, { encoding: 'utf8' })
        const existing = typeof existingData === 'string' ? existingData : new TextDecoder().decode(existingData as Uint8Array)
        if (existing.includes('/* Generated by theme command')) {
          const { smartMergeIndexCss } = await import('./css-smart-merge')
          const result = smartMergeIndexCss(existing, content)

          await this.fs.writeFile(filePath, result.content, { encoding: 'utf8' })
          fsEvents.fileChanged(filePath, 'modify')

          // Sync tokens.json if colors changed
          if (Object.keys(result.colorUpdates).length > 0) {
            try {
              const tokensPath = filePath.replace(/src[/\\]index\.css$/, '.ralph/tokens.json')
              const tokensRaw = await this.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
              const { patchDtcgColors } = await import('../theme-generator')
              const tokens = JSON.parse(tokensRaw)
              patchDtcgColors(tokens, result.colorUpdates)
              await this.fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2))
            } catch { /* tokens.json doesn't exist — skip */ }
          }

          return { exitCode: 0, stdout: result.report + '\n', stderr: '', filesChanged: [filePath] }
        }
      } catch { /* file doesn't exist yet — fall through to normal write */ }
    }

    try {
      // Ensure directory exists
      const dir = dirname(filePath)
      if (dir && dir !== filePath) {
        await this.fs.mkdir(dir, { recursive: true }).catch(() => {
          // Directory might already exist
        })
      }

      if (isAppend) {
        let existing = ''
        try {
          const data = await this.fs.readFile(filePath, { encoding: 'utf8' })
          existing = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
        } catch { /* file may not exist yet */ }
        await this.fs.writeFile(filePath, existing + content, { encoding: 'utf8' })
        fsEvents.fileChanged(filePath, 'modify')
      } else {
        await this.fs.writeFile(filePath, content, { encoding: 'utf8' })
        fsEvents.fileChanged(filePath, 'create')
      }
      return {
        exitCode: 0,
        stdout: `${isAppend ? 'Appended' : 'Wrote'} ${content.length} bytes to ${normalizedFilename}\n`,
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

    // HARNESS ENFORCEMENT: Validate path before write
    const validation = validateFileWrite(filePath, cwd)
    if (!validation.allowed) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: formatValidationError(validation, normalizedTarget),
      }
    }

    // HARNESS ENFORCEMENT: Validate content before write
    const contentValidation = validateFileContent(filePath, content)
    if (!contentValidation.allowed) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: formatValidationError(contentValidation, normalizedTarget),
      }
    }

    // Smart merge for src/index.css — preserve generated theme, validate overrides
    if (cmd.redirect.type !== '>>' && (filePath.endsWith('/src/index.css') || filePath.endsWith('\\src\\index.css'))) {
      try {
        const existingData = await this.fs.readFile(filePath, { encoding: 'utf8' })
        const existing = typeof existingData === 'string' ? existingData : new TextDecoder().decode(existingData as Uint8Array)
        if (existing.includes('/* Generated by theme command')) {
          const { smartMergeIndexCss } = await import('./css-smart-merge')
          const result = smartMergeIndexCss(existing, content)

          await this.fs.writeFile(filePath, result.content, { encoding: 'utf8' })
          fsEvents.fileChanged(filePath, 'modify')

          // Sync tokens.json if colors changed
          if (Object.keys(result.colorUpdates).length > 0) {
            try {
              const tokensPath = filePath.replace(/src[/\\]index\.css$/, '.ralph/tokens.json')
              const tokensRaw = await this.fs.readFile(tokensPath, { encoding: 'utf8' }) as string
              const { patchDtcgColors } = await import('../theme-generator')
              const tokens = JSON.parse(tokensRaw)
              patchDtcgColors(tokens, result.colorUpdates)
              await this.fs.writeFile(tokensPath, JSON.stringify(tokens, null, 2))
            } catch { /* tokens.json doesn't exist — skip */ }
          }

          return { exitCode: 0, stdout: result.report + '\n', stderr: '', filesChanged: [filePath] }
        }
      } catch { /* file doesn't exist yet — fall through to normal write */ }
    }

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
        fsEvents.fileChanged(filePath, 'modify')
      } else {
        // Write mode (overwrite)
        await this.fs.writeFile(filePath, content, { encoding: 'utf8' })
        fsEvents.fileChanged(filePath, 'create')
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
