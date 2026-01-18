import path from 'path-browserify'
import type { JSRuntimeFS, DirectoryEntry } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface LsOptions {
  long: boolean
  all: boolean
}

function parseOptions(args: string[]): { options: LsOptions; paths: string[] } {
  const options: LsOptions = { long: false, all: false }
  const paths: string[] = []

  for (const arg of args) {
    if (arg.startsWith('-')) {
      for (const char of arg.slice(1)) {
        if (char === 'l') options.long = true
        else if (char === 'a') options.all = true
      }
    } else {
      paths.push(arg)
    }
  }

  return { options, paths }
}

function formatSize(size: number): string {
  if (size < 1024) return size.toString().padStart(6)
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}K`.padStart(6)
  return `${Math.round(size / (1024 * 1024))}M`.padStart(6)
}

function formatDate(mtimeMs: number): string {
  const date = new Date(mtimeMs)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

/**
 * ls - list directory contents
 */
export class LsCommand implements ShellCommand {
  name = 'ls'
  description = 'List directory contents'
  usage = 'ls [-la] [path]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)
    const targetPaths = paths.length === 0 ? [cwd] : paths

    const outputs: string[] = []

    for (let i = 0; i < targetPaths.length; i++) {
      const targetPath = path.isAbsolute(targetPaths[i]) ? targetPaths[i] : path.join(cwd, targetPaths[i])

      try {
        const stat = await this.fs.stat(targetPath)

        if (stat.isFile()) {
          // ls on a file just shows the file
          if (options.long) {
            outputs.push(`-rw-r--r-- 1 user user ${formatSize(stat.size)} ${formatDate(stat.mtimeMs)} ${targetPaths[i]}`)
          } else {
            outputs.push(targetPaths[i])
          }
          continue
        }

        // It's a directory
        if (targetPaths.length > 1) {
          if (i > 0) outputs.push('')
          outputs.push(`${targetPaths[i]}:`)
        }

        const entries = await this.fs.readdir(targetPath, { withFileTypes: true }) as DirectoryEntry[]
        let filteredEntries = entries

        if (!options.all) {
          filteredEntries = entries.filter((e) => !e.name.startsWith('.'))
        }

        // Sort entries
        filteredEntries.sort((a, b) => a.name.localeCompare(b.name))

        if (options.long) {
          for (const entry of filteredEntries) {
            const fullPath = path.join(targetPath, entry.name)
            try {
              const entryStat = await this.fs.stat(fullPath)
              const typeChar = entry.type === 'dir' ? 'd' : entry.type === 'symlink' ? 'l' : '-'
              const perms = entry.type === 'dir' ? 'rwxr-xr-x' : 'rw-r--r--'
              outputs.push(`${typeChar}${perms} 1 user user ${formatSize(entryStat.size)} ${formatDate(entryStat.mtimeMs)} ${entry.name}`)
            } catch {
              outputs.push(`?????????? ? ?    ?        ?            ? ${entry.name}`)
            }
          }
        } else {
          outputs.push(filteredEntries.map((e) => e.name).join('  '))
        }
      } catch {
        return createErrorResult(`ls: cannot access '${targetPaths[i]}': No such file or directory`)
      }
    }

    return createSuccessResult(outputs.join('\n'))
  }
}
