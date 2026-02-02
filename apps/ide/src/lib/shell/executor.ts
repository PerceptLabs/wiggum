import * as path from 'path-browserify'
import type { JSRuntimeFS } from '../fs/types'
import type { Git } from '../git'
import { parseCommandLine, normalizePath } from './parser'
import type { ParsedCommand, ShellCommand, ShellOptions, ShellResult } from './types'
import { resolvePath, dirname } from './commands/utils'

/**
 * Callback for gap tracking - called when a command is not found
 */
export interface GapCallback {
  command: string
  args: string[]
  error: string
}

/**
 * Redirect map for common commands that don't exist in Wiggum
 * Provides helpful alternatives when users try unavailable commands
 */
const COMMAND_REDIRECTS: Record<string, { alt: string; example?: string }> = {
  sed: { alt: '`replace` for surgical string replacement', example: 'replace src/App.tsx "old" "new"' },
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
}

// ============================================================================
// FILE VALIDATION - HARNESS ENFORCEMENT
// ============================================================================

interface WriteValidation {
  allowed: boolean
  reason?: string
  suggestion?: string
}

/**
 * Validate file writes - HARNESS ENFORCEMENT
 * This is not a suggestion to the LLM, it's a hard block.
 */
function validateFileWrite(filePath: string, cwd: string): WriteValidation {
  const ext = path.extname(filePath).toLowerCase()
  const relativePath = filePath.startsWith(cwd)
    ? filePath.slice(cwd.length).replace(/^[/\\]/, '')
    : filePath

  // Allow .ralph/ directory (state files)
  if (relativePath.startsWith('.ralph/') || relativePath.startsWith('.ralph\\')) {
    return { allowed: true }
  }

  // Allow package.json at root
  if (relativePath === 'package.json') {
    return { allowed: true }
  }

  // Block modifications to index.html (contains required Tailwind config)
  if (relativePath === 'index.html') {
    return {
      allowed: false,
      reason: 'Cannot modify index.html - it contains required Tailwind configuration.',
      suggestion: 'Customize theme colors in src/index.css instead. See theming skill.',
    }
  }

  // Block HTML files - key enforcement
  if (ext === '.html' || ext === '.htm') {
    const suggestedPath = relativePath
      .replace(/\.html?$/, '.tsx')
      .replace(/^(?!src[/\\])/, 'src/sections/')
    return {
      allowed: false,
      reason: 'HTML files not supported. This is a React project.',
      suggestion: `Write a React component instead: ${suggestedPath}\n\nNote: Use the Export button to download as a single HTML file when done.`,
    }
  }

  // Block CSS files outside src/
  if (ext === '.css' && !relativePath.startsWith('src/') && !relativePath.startsWith('src\\')) {
    return {
      allowed: false,
      reason: 'CSS files must be in src/',
      suggestion: 'Use: src/index.css or Tailwind classes directly',
    }
  }

  // Block writes outside src/ (except .ralph/ and package.json handled above)
  const isInSrc = relativePath.startsWith('src/') || relativePath.startsWith('src\\')
  if (!isInSrc) {
    return {
      allowed: false,
      reason: 'Files must be in src/ directory',
      suggestion: `Try: src/${path.basename(relativePath)}`,
    }
  }

  // Only allow specific extensions in src/
  const allowedExtensions = ['.tsx', '.ts', '.css', '.json']
  if (!allowedExtensions.includes(ext)) {
    return {
      allowed: false,
      reason: `Only ${allowedExtensions.join(', ')} files allowed in src/`,
      suggestion:
        ext === '.js' || ext === '.jsx'
          ? `Use TypeScript: ${relativePath.replace(/\.jsx?$/, '.tsx')}`
          : undefined,
    }
  }

  return { allowed: true }
}

/**
 * Validate file content before write - HARNESS ENFORCEMENT
 * Blocks patterns that will fail at runtime (e.g., @tailwind directives)
 */
function validateFileContent(filePath: string, content: string): WriteValidation {
  const ext = path.extname(filePath).toLowerCase()

  // Block @tailwind directives in CSS files - browsers cannot process them
  if (ext === '.css' && content.includes('@tailwind')) {
    return {
      allowed: false,
      reason: 'Cannot use @tailwind directives - browsers cannot process them.',
      suggestion: `Define CSS variables instead:\n\n:root {\n  --background: 0 0% 100%;\n  --primary: 210 100% 50%;\n  /* See theming skill for all variables */\n}`,
    }
  }

  return { allowed: true }
}

function formatValidationError(validation: WriteValidation, filePath: string): string {
  let msg = `❌ Cannot write to ${filePath}\n   ${validation.reason}`
  if (validation.suggestion) {
    msg += `\n\n   ${validation.suggestion}`
  }
  return msg
}

/** Shell executor that manages command registration and execution with piping support */
export class ShellExecutor {
  private commands: Map<string, ShellCommand> = new Map()
  private fs: JSRuntimeFS
  private git?: Git
  private onGap?: (gap: GapCallback) => void

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
        let error = `${cmd.name}: command not found`

        // Add helpful redirect if available
        const redirect = COMMAND_REDIRECTS[cmd.name]
        if (redirect) {
          error += `\n\n💡 Wiggum alternative: Use ${redirect.alt}`
          if (redirect.example) {
            error += `\n   Example: ${redirect.example}`
          }
        }

        // Detect unexpanded globs and hint to use find
        if (normalizedArgs.some(arg => arg.includes('*'))) {
          error += `\n\n💡 Hint: Globs like *.tsx don't expand automatically. Use: find . -name "*.tsx"`
        }

        // Notify gap tracking callback if set
        if (this.onGap) {
          this.onGap({ command: cmd.name, args: normalizedArgs, error })
        }
        return { exitCode: 127, stdout: '', stderr: error }
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
