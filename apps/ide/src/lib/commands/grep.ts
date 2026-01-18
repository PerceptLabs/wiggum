import path from 'path-browserify'
import type { JSRuntimeFS, DirectoryEntry } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface GrepOptions {
  ignoreCase: boolean
  lineNumbers: boolean
  recursive: boolean
  invert: boolean
}

function parseOptions(args: string[]): { options: GrepOptions; pattern: string | null; paths: string[] } {
  const options: GrepOptions = { ignoreCase: false, lineNumbers: false, recursive: false, invert: false }
  let pattern: string | null = null
  const paths: string[] = []

  for (const arg of args) {
    if (arg.startsWith('-') && arg !== '-') {
      for (const char of arg.slice(1)) {
        if (char === 'i') options.ignoreCase = true
        else if (char === 'n') options.lineNumbers = true
        else if (char === 'r' || char === 'R') options.recursive = true
        else if (char === 'v') options.invert = true
      }
    } else if (pattern === null) {
      pattern = arg
    } else {
      paths.push(arg)
    }
  }

  return { options, pattern, paths }
}

/**
 * grep - search for patterns in files
 */
export class GrepCommand implements ShellCommand {
  name = 'grep'
  description = 'Search for patterns in files'
  usage = 'grep [-inrv] <pattern> [file...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, pattern, paths } = parseOptions(args)

    if (!pattern) {
      return createErrorResult('grep: missing pattern')
    }

    let regex: RegExp
    try {
      regex = new RegExp(pattern, options.ignoreCase ? 'i' : '')
    } catch {
      return createErrorResult(`grep: Invalid regular expression: ${pattern}`)
    }

    const matches: string[] = []
    const multipleFiles = paths.length > 1 || options.recursive

    // If no paths and have input, search the input
    if (paths.length === 0) {
      if (input !== undefined) {
        const lines = input.split('\n')
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          const isMatch = regex.test(line)
          if (isMatch !== options.invert) {
            if (options.lineNumbers) {
              matches.push(`${i + 1}:${line}`)
            } else {
              matches.push(line)
            }
          }
        }
      } else {
        return createErrorResult('grep: missing file operand')
      }
    } else {
      for (const filePath of paths) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)
        try {
          await this.searchPath(fullPath, filePath, regex, options, matches, multipleFiles)
        } catch {
          return createErrorResult(`grep: ${filePath}: No such file or directory`)
        }
      }
    }

    return createSuccessResult(matches.join('\n'))
  }

  private async searchPath(
    fullPath: string,
    displayPath: string,
    regex: RegExp,
    options: GrepOptions,
    matches: string[],
    showFilename: boolean
  ): Promise<void> {
    const stat = await this.fs.stat(fullPath)

    if (stat.isDirectory()) {
      if (options.recursive) {
        const entries = (await this.fs.readdir(fullPath, { withFileTypes: true })) as DirectoryEntry[]
        for (const entry of entries) {
          const entryPath = path.join(fullPath, entry.name)
          const entryDisplayPath = path.join(displayPath, entry.name)
          await this.searchPath(entryPath, entryDisplayPath, regex, options, matches, true)
        }
      }
    } else {
      const content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
      const lines = content.split('\n')

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const isMatch = regex.test(line)
        if (isMatch !== options.invert) {
          let result = ''
          if (showFilename) result += `${displayPath}:`
          if (options.lineNumbers) result += `${i + 1}:`
          result += line
          matches.push(result)
        }
      }
    }
  }
}
