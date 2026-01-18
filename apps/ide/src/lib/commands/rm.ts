import path from 'path-browserify'
import type { JSRuntimeFS, DirectoryEntry } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface RmOptions {
  recursive: boolean
  force: boolean
}

function parseOptions(args: string[]): { options: RmOptions; paths: string[] } {
  const options: RmOptions = { recursive: false, force: false }
  const paths: string[] = []

  for (const arg of args) {
    if (arg.startsWith('-') && arg !== '-') {
      for (const char of arg.slice(1)) {
        if (char === 'r' || char === 'R') options.recursive = true
        else if (char === 'f') options.force = true
      }
    } else {
      paths.push(arg)
    }
  }

  return { options, paths }
}

/**
 * rm - remove files or directories
 */
export class RmCommand implements ShellCommand {
  name = 'rm'
  description = 'Remove files or directories'
  usage = 'rm [-rf] <file> [file2...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)

    if (paths.length === 0) {
      if (options.force) return createSuccessResult('')
      return createErrorResult('rm: missing operand')
    }

    for (const targetPath of paths) {
      const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(cwd, targetPath)

      try {
        const stat = await this.fs.stat(fullPath)

        if (stat.isDirectory()) {
          if (!options.recursive) {
            return createErrorResult(`rm: cannot remove '${targetPath}': Is a directory`)
          }
          await this.removeRecursive(fullPath)
        } else {
          await this.fs.unlink(fullPath)
        }
      } catch {
        if (!options.force) {
          return createErrorResult(`rm: cannot remove '${targetPath}': No such file or directory`)
        }
      }
    }

    return createSuccessResult('')
  }

  private async removeRecursive(dirPath: string): Promise<void> {
    const entries = (await this.fs.readdir(dirPath, { withFileTypes: true })) as DirectoryEntry[]

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.type === 'dir') {
        await this.removeRecursive(fullPath)
      } else {
        await this.fs.unlink(fullPath)
      }
    }

    await this.fs.rmdir(dirPath)
  }
}
