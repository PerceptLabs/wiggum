import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

const EXCLUDE_DIRS = ['.ralph', 'node_modules', 'dist', '.git']
const MAX_DEPTH = 4

/**
 * tree - Display directory structure as a tree
 * Shows box-drawing characters for visual hierarchy
 */
export class TreeCommand implements ShellCommand {
  name = 'tree'
  description = 'Display directory structure as a tree'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options
    const targetPath = args[0] ? resolvePath(cwd, args[0]) : cwd

    // Security: must be within cwd
    if (!targetPath.startsWith(cwd) && targetPath !== cwd) {
      return { exitCode: 1, stdout: '', stderr: 'tree: cannot access paths outside project' }
    }

    try {
      const stat = await fs.stat(targetPath)
      if (!stat.isDirectory()) {
        return { exitCode: 1, stdout: '', stderr: `tree: ${args[0] || '.'}: Not a directory` }
      }

      const counts = { dirs: 0, files: 0 }
      const rootName = targetPath === cwd ? '.' : (args[0] || '.')
      const lines: string[] = [rootName]

      await buildTree(fs, targetPath, '', 0, lines, counts)

      lines.push('')
      lines.push(`${counts.dirs} director${counts.dirs === 1 ? 'y' : 'ies'}, ${counts.files} file${counts.files === 1 ? '' : 's'}`)

      return { exitCode: 0, stdout: lines.join('\n'), stderr: '' }
    } catch {
      return { exitCode: 1, stdout: '', stderr: `tree: ${args[0] || '.'}: No such directory` }
    }
  }
}

async function buildTree(
  fs: ShellOptions['fs'],
  path: string,
  prefix: string,
  depth: number,
  lines: string[],
  counts: { dirs: number; files: number }
): Promise<void> {
  if (depth >= MAX_DEPTH) {
    return
  }

  try {
    const entries = await fs.readdir(path, { withFileTypes: true })
    const filtered = (entries as { name: string; type: string }[])
      .filter(e => !EXCLUDE_DIRS.includes(e.name) && !e.name.startsWith('.'))
      .sort((a, b) => {
        // Directories first, then files
        if (a.type === 'dir' && b.type !== 'dir') return -1
        if (a.type !== 'dir' && b.type === 'dir') return 1
        return a.name.localeCompare(b.name)
      })

    for (let i = 0; i < filtered.length; i++) {
      const entry = filtered[i]
      const isLast = i === filtered.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPrefix = prefix + (isLast ? '    ' : '│   ')

      lines.push(prefix + connector + entry.name)

      if (entry.type === 'dir') {
        counts.dirs++
        await buildTree(fs, `${path}/${entry.name}`, childPrefix, depth + 1, lines, counts)
      } else {
        counts.files++
      }
    }
  } catch {
    // Skip unreadable directories
  }
}
