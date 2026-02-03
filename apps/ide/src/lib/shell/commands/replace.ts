import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * replace - Replace all occurrences of a string in a file
 * Usage: replace [-w] <file> "<old>" "<new>"
 * -w: Whitespace-tolerant matching (collapses whitespace)
 */
export class ReplaceCommand implements ShellCommand {
  name = 'replace'
  description = 'Replace all occurrences of a string in a file'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse flags
    let whitespaceTolerant = false
    const positionalArgs: string[] = []

    for (const arg of args) {
      if (arg === '-w' || arg === '--whitespace-tolerant') {
        whitespaceTolerant = true
      } else {
        positionalArgs.push(arg)
      }
    }

    if (positionalArgs.length < 3) {
      return {
        exitCode: 2,
        stdout: '',
        stderr:
          'Usage: replace [-w] <file> "<old>" "<new>"\n  -w  Whitespace-tolerant matching (collapses whitespace)\nExample: replace src/App.tsx "oldText" "newText"',
      }
    }

    const [file, oldStr, newStr] = positionalArgs
    const filePath = resolvePath(cwd, file)

    // Security: must be within cwd
    if (!filePath.startsWith(cwd)) {
      return { exitCode: 1, stdout: '', stderr: 'replace: cannot access paths outside project' }
    }

    try {
      const content = await fs.readFile(filePath, { encoding: 'utf8' })
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content)

      let newContent: string
      let count: number

      if (whitespaceTolerant) {
        // Find all positions where whitespace-tolerant match occurs
        const matches = findWhitespaceTolerantMatches(text, oldStr)
        count = matches.length

        if (count === 0) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: `replace: "${oldStr}" not found in ${file} (even with whitespace tolerance)`,
          }
        }

        // Replace from end to preserve positions
        newContent = text
        for (let i = matches.length - 1; i >= 0; i--) {
          const { start, end } = matches[i]
          newContent = newContent.slice(0, start) + newStr + newContent.slice(end)
        }
      } else {
        // Exact matching (original behavior)
        const escapedOld = escapeRegex(oldStr)
        const regex = new RegExp(escapedOld, 'g')
        const matchArr = text.match(regex)
        count = matchArr ? matchArr.length : 0

        if (count === 0) {
          return { exitCode: 1, stdout: '', stderr: `replace: "${oldStr}" not found in ${file}` }
        }

        newContent = text.split(oldStr).join(newStr)
      }

      await fs.writeFile(filePath, newContent)

      return {
        exitCode: 0,
        stdout: `Replaced ${count} occurrence${count > 1 ? 's' : ''} in ${file}${whitespaceTolerant ? ' (whitespace-tolerant)' : ''}`,
        stderr: '',
      }
    } catch {
      return { exitCode: 1, stdout: '', stderr: `replace: ${file}: No such file` }
    }
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Find matches allowing flexible whitespace
 * Returns array of {start, end} positions in original text
 */
function findWhitespaceTolerantMatches(
  text: string,
  pattern: string
): Array<{ start: number; end: number }> {
  const matches: Array<{ start: number; end: number }> = []

  // Split pattern by whitespace, escape each part, join with \s+
  // "foo  bar" becomes /foo\s+bar/g
  const parts = pattern.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return matches

  const regexPattern = parts.map(escapeRegex).join('\\s+')
  const regex = new RegExp(regexPattern, 'g')

  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length })
  }

  return matches
}
