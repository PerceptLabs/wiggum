import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface WcOptions {
  lines: boolean
  words: boolean
  chars: boolean
}

function parseOptions(args: string[]): { options: WcOptions; paths: string[] } {
  const options: WcOptions = { lines: false, words: false, chars: false }
  const paths: string[] = []
  let hasOption = false

  for (const arg of args) {
    if (arg.startsWith('-') && arg !== '-') {
      for (const char of arg.slice(1)) {
        if (char === 'l') { options.lines = true; hasOption = true }
        else if (char === 'w') { options.words = true; hasOption = true }
        else if (char === 'c' || char === 'm') { options.chars = true; hasOption = true }
      }
    } else {
      paths.push(arg)
    }
  }

  // If no options specified, show all
  if (!hasOption) {
    options.lines = true
    options.words = true
    options.chars = true
  }

  return { options, paths }
}

function countContent(content: string): { lines: number; words: number; chars: number } {
  const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0)
  const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length
  const chars = content.length
  return { lines, words, chars }
}

function formatCounts(counts: { lines: number; words: number; chars: number }, options: WcOptions): string {
  const parts: string[] = []
  if (options.lines) parts.push(counts.lines.toString().padStart(8))
  if (options.words) parts.push(counts.words.toString().padStart(8))
  if (options.chars) parts.push(counts.chars.toString().padStart(8))
  return parts.join('')
}

/**
 * wc - word, line, and character count
 */
export class WcCommand implements ShellCommand {
  name = 'wc'
  description = 'Print line, word, and byte counts'
  usage = 'wc [-lwc] [file...]'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)
    const outputs: string[] = []
    let totalLines = 0
    let totalWords = 0
    let totalChars = 0

    if (paths.length === 0) {
      if (input !== undefined) {
        const counts = countContent(input)
        outputs.push(formatCounts(counts, options))
      } else {
        return createErrorResult('wc: missing file operand')
      }
    } else {
      for (const filePath of paths) {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

        try {
          const content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
          const counts = countContent(content)
          totalLines += counts.lines
          totalWords += counts.words
          totalChars += counts.chars
          outputs.push(`${formatCounts(counts, options)} ${filePath}`)
        } catch {
          return createErrorResult(`wc: ${filePath}: No such file or directory`)
        }
      }

      if (paths.length > 1) {
        outputs.push(`${formatCounts({ lines: totalLines, words: totalWords, chars: totalChars }, options)} total`)
      }
    }

    return createSuccessResult(outputs.join('\n'))
  }
}
