import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

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
      } else if (!arg.startsWith('-')) {
        searchPath = arg
      }
    }

    const startPath = resolvePath(cwd, searchPath)
    const matches: string[] = []
    const errors: string[] = []

    try {
      await findRecursive(fs, startPath, searchPath, namePattern, typeFilter, matches)
    } catch (err) {
      errors.push(`find: '${searchPath}': No such file or directory`)
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
  const basename = getBasename(absPath)
  const isMatch = !namePattern || matchGlob(basename, namePattern)
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

function getBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || parts[parts.length - 2] || path
}

/**
 * Simple glob pattern matching (supports * and ?)
 */
function matchGlob(str: string, pattern: string): boolean {
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*') // * matches any characters
    .replace(/\?/g, '.') // ? matches single character

  const regex = new RegExp(`^${regexPattern}$`, 'i')
  return regex.test(str)
}
