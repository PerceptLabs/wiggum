import path from 'path-browserify'
import type { JSRuntimeFS, DirectoryEntry } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface FindOptions {
  name: string | null
  type: 'f' | 'd' | null
  maxdepth: number
}

function parseOptions(args: string[]): { options: FindOptions; startPath: string } {
  const options: FindOptions = { name: null, type: null, maxdepth: Infinity }
  let startPath = '.'

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-name' && i + 1 < args.length) {
      options.name = args[++i]
    } else if (arg === '-type' && i + 1 < args.length) {
      const t = args[++i]
      if (t === 'f' || t === 'd') {
        options.type = t
      }
    } else if (arg === '-maxdepth' && i + 1 < args.length) {
      options.maxdepth = parseInt(args[++i], 10)
    } else if (!arg.startsWith('-')) {
      startPath = arg
    }
  }

  return { options, startPath }
}

function matchesPattern(name: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${regexPattern}$`).test(name)
}

/**
 * find - search for files
 */
export class FindCommand implements ShellCommand {
  name = 'find'
  description = 'Search for files in a directory hierarchy'
  usage = 'find [path] [-name pattern] [-type f|d]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    const { options, startPath } = parseOptions(args)
    const fullStartPath = path.isAbsolute(startPath) ? startPath : path.join(cwd, startPath)

    try {
      await this.fs.stat(fullStartPath)
    } catch {
      return createErrorResult(`find: '${startPath}': No such file or directory`)
    }

    const results: string[] = []
    await this.search(fullStartPath, startPath, options, results, 0)

    return createSuccessResult(results.join('\n'))
  }

  private async search(
    fullPath: string,
    displayPath: string,
    options: FindOptions,
    results: string[],
    depth: number
  ): Promise<void> {
    if (depth > options.maxdepth) return

    const stat = await this.fs.stat(fullPath)
    const isDir = stat.isDirectory()
    const name = path.basename(fullPath)

    // Check if this entry matches
    let matches = true

    if (options.name && !matchesPattern(name, options.name)) {
      matches = false
    }

    if (options.type === 'f' && isDir) {
      matches = false
    }

    if (options.type === 'd' && !isDir) {
      matches = false
    }

    if (matches) {
      results.push(displayPath)
    }

    // Recurse into directories
    if (isDir && depth < options.maxdepth) {
      const entries = (await this.fs.readdir(fullPath, { withFileTypes: true })) as DirectoryEntry[]

      for (const entry of entries) {
        const entryFullPath = path.join(fullPath, entry.name)
        const entryDisplayPath = path.join(displayPath, entry.name)
        await this.search(entryFullPath, entryDisplayPath, options, results, depth + 1)
      }
    }
  }
}
