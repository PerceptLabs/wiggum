import picomatch from 'picomatch'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath, basename } from './utils'

/**
 * find - Find files by name pattern
 * Supports -name pattern
 */
export class FindCommand implements ShellCommand {
  name = 'find'
  description = 'Search for files in a directory hierarchy'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse arguments
    let searchPath = '.'
    let namePattern: string | null = null
    let typeFilter: 'f' | 'd' | null = null
    let execTemplate: string[] | null = null
    let execBatch = false // true for +, false for \;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === '-name' && i + 1 < args.length) {
        namePattern = args[i + 1]
        i++
      } else if (arg === '-type' && i + 1 < args.length) {
        const t = args[i + 1]
        if (t === 'f' || t === 'd') {
          typeFilter = t
        }
        i++
      } else if (arg === '-exec' && i + 1 < args.length) {
        // Collect everything until \; or ; or +
        execTemplate = []
        i++
        let foundTerminator = false
        while (i < args.length) {
          const execArg = args[i]
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
