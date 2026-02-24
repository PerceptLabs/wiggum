import { z } from 'zod'
import picomatch from 'picomatch'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath, basename } from './utils'

// ============================================================================
// SCHEMA (flat — skip -exec, models fall back to shell for that)
// ============================================================================

/** Flat schema for discrete find tool */
export const FindSchema = z.object({
  path: z.string().optional().default('.').describe('Search directory'),
  name: z.string().optional().describe('Glob pattern for file names'),
  type: z.enum(['f', 'd']).optional().describe('f=files only, d=directories only'),
})

type FindArgs = z.infer<typeof FindSchema>
type FindExecArgs = string[] | FindArgs

/**
 * find - Find files by name pattern
 * Supports -name pattern, -type f/d, -exec
 */
export class FindCommand implements ShellCommand<FindExecArgs> {
  name = 'find'
  description = 'Search for files in a directory hierarchy'

  examples = [
    'find src -name "*.tsx" -type f',
    'find . -name "*.css"',
  ]

  additionalTools = [
    {
      name: 'find',
      description: 'Find files by name pattern and type (typed — no escaping needed)',
      argsSchema: FindSchema,
      examples: ['find({ path: "src", name: "*.tsx", type: "f" })'],
    },
  ]

  async execute(args: FindExecArgs, options: ShellOptions): Promise<ShellResult> {
    // Discrete find tool: typed args
    if (!Array.isArray(args)) {
      return this.executeTyped(args as FindArgs, options)
    }

    // CLI path: string[]
    const cliArgs = args as string[]
    const { fs, cwd } = options

    // Parse arguments
    let searchPath = '.'
    let namePattern: string | null = null
    let typeFilter: 'f' | 'd' | null = null
    let execTemplate: string[] | null = null
    let execBatch = false // true for +, false for \;

    for (let i = 0; i < cliArgs.length; i++) {
      const arg = cliArgs[i]
      if (arg === '-name' && i + 1 < cliArgs.length) {
        namePattern = cliArgs[i + 1]
        i++
      } else if (arg === '-type' && i + 1 < cliArgs.length) {
        const t = cliArgs[i + 1]
        if (t === 'f' || t === 'd') {
          typeFilter = t
        }
        i++
      } else if (arg === '-exec' && i + 1 < cliArgs.length) {
        // Collect everything until \; or ; or +
        execTemplate = []
        i++
        let foundTerminator = false
        while (i < cliArgs.length) {
          const execArg = cliArgs[i]
          if (execArg === ';' || execArg === '\\;') {
            execBatch = false
            foundTerminator = true
            break
          }
          if (execArg === '+') {
            execBatch = true
            foundTerminator = true
            break
          }
          execTemplate.push(execArg)
          i++
        }
        // If no terminator found, treat as per-file mode (shell-quote may eat ;)
        if (!foundTerminator) {
          execBatch = false
        }
      } else if (!arg.startsWith('-')) {
        searchPath = arg
      }
    }

    // Validate -exec template
    if (execTemplate !== null && execTemplate.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'find: -exec requires a command' }
    }

    const startPath = resolvePath(cwd, searchPath)
    const matches: string[] = []
    const errors: string[] = []

    try {
      await findRecursive(fs, startPath, searchPath, namePattern, typeFilter, matches)
    } catch {
      errors.push(`find: '${searchPath}': No such file or directory`)
    }

    // Execute -exec if specified
    if (execTemplate && matches.length > 0 && options.exec) {
      if (execBatch) {
        // + mode: single invocation with all files
        const fileList = matches.map(quoteIfNeeded).join(' ')
        const cmdStr = execTemplate.map(part => part === '{}' ? fileList : part).join(' ')
        const result = await options.exec(cmdStr, cwd)
        return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr }
      } else {
        // \; mode: one invocation per file
        const outputs: string[] = []
        const errs: string[] = []
        let lastExit = 0
        for (const file of matches) {
          const quoted = quoteIfNeeded(file)
          const cmdStr = execTemplate.map(part => part === '{}' ? quoted : part).join(' ')
          const result = await options.exec(cmdStr, cwd)
          if (result.stdout) outputs.push(result.stdout)
          if (result.stderr) errs.push(result.stderr)
          lastExit = result.exitCode
        }
        return { exitCode: lastExit, stdout: outputs.join(''), stderr: errs.join('') }
      }
    }

    if (execTemplate && matches.length > 0 && !options.exec) {
      return { exitCode: 1, stdout: '', stderr: 'find: -exec not available in this context' }
    }

    return {
      exitCode: errors.length > 0 && matches.length === 0 ? 1 : 0,
      stdout: matches.join('\n') + (matches.length > 0 ? '\n' : ''),
      stderr: errors.join('\n'),
    }
  }

  /**
   * Discrete find tool: typed args (no -exec support — use shell for that)
   */
  private async executeTyped(args: FindArgs, options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options
    const searchPath = args.path ?? '.'
    const startPath = resolvePath(cwd, searchPath)
    const matches: string[] = []

    try {
      await findRecursive(fs, startPath, searchPath, args.name ?? null, args.type ?? null, matches)
    } catch {
      return { exitCode: 1, stdout: '', stderr: `find: '${searchPath}': No such file or directory` }
    }

    return {
      exitCode: 0,
      stdout: matches.join('\n') + (matches.length > 0 ? '\n' : ''),
      stderr: '',
    }
  }
}

async function findRecursive(
  fs: ShellOptions['fs'],
  absPath: string,
  relPath: string,
  namePattern: string | null,
  typeFilter: 'f' | 'd' | null,
  matches: string[]
): Promise<void> {
  const stat = await fs.stat(absPath)

  // Check if current path matches
  const name = basename(absPath)
  const isMatch = !namePattern || picomatch.isMatch(name, namePattern, { nocase: true })
  const typeMatches =
    !typeFilter ||
    (typeFilter === 'f' && stat.isFile()) ||
    (typeFilter === 'd' && stat.isDirectory())

  if (isMatch && typeMatches) {
    matches.push(relPath)
  }

  // Recurse into directories
  if (stat.isDirectory()) {
    const entries = await fs.readdir(absPath, { withFileTypes: true })

    for (const entry of entries as { name: string; type: string }[]) {
      const entryAbsPath = `${absPath}/${entry.name}`
      const entryRelPath = `${relPath}/${entry.name}`
      await findRecursive(fs, entryAbsPath, entryRelPath, namePattern, typeFilter, matches)
    }
  }
}

/**
 * Quote a file path if it contains spaces (for -exec command construction)
 */
function quoteIfNeeded(filePath: string): string {
  if (filePath.includes(' ')) {
    return `"${filePath}"`
  }
  return filePath
}
