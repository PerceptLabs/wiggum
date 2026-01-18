import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface MkdirOptions {
  parents: boolean
}

function parseOptions(args: string[]): { options: MkdirOptions; paths: string[] } {
  const options: MkdirOptions = { parents: false }
  const paths: string[] = []

  for (const arg of args) {
    if (arg === '-p' || arg === '--parents') {
      options.parents = true
    } else if (arg.startsWith('-')) {
      // Ignore unknown options
    } else {
      paths.push(arg)
    }
  }

  return { options, paths }
}

/**
 * mkdir - create directories
 */
export class MkdirCommand implements ShellCommand {
  name = 'mkdir'
  description = 'Create directories'
  usage = 'mkdir [-p] <directory> [directory2...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)

    if (paths.length === 0) {
      return createErrorResult('mkdir: missing operand')
    }

    for (const dirPath of paths) {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(cwd, dirPath)

      try {
        await this.fs.mkdir(fullPath, { recursive: options.parents })
      } catch (err) {
        const error = err as Error & { code?: string }
        if (error.code === 'EEXIST') {
          if (!options.parents) {
            return createErrorResult(`mkdir: cannot create directory '${dirPath}': File exists`)
          }
          // With -p, existing directory is not an error
        } else if (error.code === 'ENOENT') {
          return createErrorResult(`mkdir: cannot create directory '${dirPath}': No such file or directory`)
        } else {
          return createErrorResult(`mkdir: cannot create directory '${dirPath}': ${error.message}`)
        }
      }
    }

    return createSuccessResult('')
  }
}
