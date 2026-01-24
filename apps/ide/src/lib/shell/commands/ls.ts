import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * ls - List directory contents
 * Supports -l (long format), -a (show hidden)
 */
export class LsCommand implements ShellCommand {
  name = 'ls'
  description = 'List directory contents'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse flags
    let longFormat = false
    let showHidden = false
    const paths: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('l')) longFormat = true
        if (arg.includes('a')) showHidden = true
      } else {
        paths.push(arg)
      }
    }

    // Default to current directory
    if (paths.length === 0) {
      paths.push('.')
    }

    const outputs: string[] = []
    const errors: string[] = []

    for (const path of paths) {
      const targetPath = resolvePath(cwd, path)

      try {
        const stat = await fs.stat(targetPath)

        if (stat.isFile()) {
          // Single file
          if (longFormat) {
            outputs.push(formatLongEntry(path, stat))
          } else {
            outputs.push(path)
          }
        } else if (stat.isDirectory()) {
          // Directory
          const entries = await fs.readdir(targetPath, { withFileTypes: true })

          if (paths.length > 1) {
            outputs.push(`${path}:`)
          }

          const entryLines: string[] = []
          for (const entry of entries as { name: string; type: string }[]) {
            // Skip hidden files unless -a
            if (!showHidden && entry.name.startsWith('.')) continue

            if (longFormat) {
              try {
                const entryStat = await fs.stat(resolvePath(targetPath, entry.name))
                entryLines.push(formatLongEntry(entry.name, entryStat))
              } catch {
                entryLines.push(formatLongEntry(entry.name, null, entry.type === 'dir'))
              }
            } else {
              entryLines.push(entry.name)
            }
          }

          if (longFormat) {
            outputs.push(entryLines.join('\n'))
          } else {
            outputs.push(entryLines.join('  '))
          }
        }
      } catch (err) {
        errors.push(`ls: cannot access '${path}': No such file or directory`)
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: outputs.join('\n'),
      stderr: errors.join('\n'),
    }
  }
}

function formatLongEntry(
  name: string,
  stat: { type: string; mode: number; size: number; mtimeMs: number } | null,
  isDir = false
): string {
  if (!stat) {
    const typeChar = isDir ? 'd' : '-'
    return `${typeChar}rwxr-xr-x  1 user  user     0 Jan  1 00:00 ${name}`
  }

  const typeChar = stat.type === 'dir' ? 'd' : '-'
  const perms = formatPermissions(stat.mode)
  const size = stat.size.toString().padStart(8)
  const date = formatDate(stat.mtimeMs)

  return `${typeChar}${perms}  1 user  user  ${size} ${date} ${name}`
}

function formatPermissions(mode: number): string {
  const perms = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  const owner = perms[(mode >> 6) & 7] || 'rwx'
  const group = perms[(mode >> 3) & 7] || 'r-x'
  const other = perms[mode & 7] || 'r-x'
  return owner + group + other
}

function formatDate(mtimeMs: number): string {
  const date = new Date(mtimeMs)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[date.getMonth()]
  const day = date.getDate().toString().padStart(2)
  const hours = date.getHours().toString().padStart(2, '0')
  const mins = date.getMinutes().toString().padStart(2, '0')
  return `${month} ${day} ${hours}:${mins}`
}
