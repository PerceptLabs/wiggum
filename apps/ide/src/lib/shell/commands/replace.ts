import { z } from 'zod'
import { createPatch } from 'diff'
import { distance } from 'fastest-levenshtein'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'
import { validateFileWrite } from '../write-guard'

// ============================================================================
// SCHEMA (Toolkit 2.0 dual-mode)
// ============================================================================

const ReplaceArgsSchema = z.object({
  file: z.string().min(1).describe('File path'),
  old: z.string().min(1).optional().describe('String to find (not needed with --line)'),
  new: z.string().describe('Replacement string'),
  line: z.number().int().positive().optional().describe('Replace entire line N (1-indexed)'),
  whitespaceTolerant: z.boolean().optional().describe('Collapse whitespace during matching'),
})

type ReplaceArgs = z.infer<typeof ReplaceArgsSchema>

// ============================================================================
// COMMAND
// ============================================================================

export class ReplaceCommand implements ShellCommand<ReplaceArgs> {
  name = 'replace'
  description = 'Replace all occurrences of a string in a file'

  argsSchema = ReplaceArgsSchema

  examples = [
    'replace src/App.tsx "oldText" "newText"',
    'replace src/App.tsx --line 42 "new line content"',
    'replace -w src/App.tsx "spaced  text" "clean text"',
  ]

  parseCliArgs(args: string[]): unknown {
    let whitespaceTolerant = false
    let lineNumber: number | undefined
    const positionalArgs: string[] = []

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === '-w' || arg === '--whitespace-tolerant') {
        whitespaceTolerant = true
      } else if (arg === '--line') {
        lineNumber = parseInt(args[++i], 10)
      } else {
        positionalArgs.push(arg)
      }
    }

    if (lineNumber !== undefined) {
      // Line mode: replace <file> --line N "new content"
      return {
        file: positionalArgs[0] ?? '',
        new: positionalArgs[1] ?? '',
        line: lineNumber,
      }
    }

    return {
      file: positionalArgs[0] ?? '',
      old: positionalArgs[1] ?? '',
      new: positionalArgs[2] ?? '',
      whitespaceTolerant: whitespaceTolerant || undefined,
    }
  }

  async execute(args: ReplaceArgs, options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options
    const file = args.file

    // Line-number mode — bypass pattern matching entirely
    if (args.line !== undefined) {
      const lineNum = args.line
      const newStr = args.new

      if (!file) {
        return { exitCode: 2, stdout: '', stderr: 'Usage: replace <file> --line N "new content"' }
      }

      const filePath = resolvePath(cwd, file)
      if (!filePath.startsWith(cwd)) {
        return { exitCode: 1, stdout: '', stderr: 'replace: cannot access paths outside project' }
      }
      const lineValidation = validateFileWrite(filePath, cwd)
      if (!lineValidation.allowed) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `replace: ${lineValidation.reason}${lineValidation.suggestion ? '\n' + lineValidation.suggestion : ''}`,
        }
      }

      try {
        const content = await fs.readFile(filePath, { encoding: 'utf8' })
        const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
        const lines = text.split('\n')

        if (lineNum < 1 || lineNum > lines.length) {
          return { exitCode: 1, stdout: '', stderr: `replace: line ${lineNum} out of range (file has ${lines.length} lines)` }
        }

        lines[lineNum - 1] = newStr
        const newContent = lines.join('\n')
        await fs.writeFile(filePath, newContent)

        const diffOutput = createPatch(file, text, newContent, '', '', { context: 3 })
        const diffLines = diffOutput.split('\n')
        const patchStart = diffLines.findIndex((l) => l.startsWith('---'))
        const cleanDiff = patchStart >= 0 ? diffLines.slice(patchStart).join('\n') : diffOutput

        return {
          exitCode: 0,
          stdout: `Replaced line ${lineNum} in ${file}\n\n${cleanDiff}`,
          stderr: '',
          filesChanged: [filePath],
        }
      } catch {
        return { exitCode: 1, stdout: '', stderr: `replace: ${file}: No such file` }
      }
    }

    // String mode — pattern matching
    const oldStr = args.old ?? ''
    const newStr = args.new
    const whitespaceTolerant = args.whitespaceTolerant ?? false

    if (!file || !args.old) {
      return {
        exitCode: 2,
        stdout: '',
        stderr:
          'Usage: replace [-w] <file> "<old>" "<new>"\n       replace <file> --line N "new content"\n  -w  Whitespace-tolerant matching (collapses whitespace)\nExample: replace src/App.tsx "oldText" "newText"',
      }
    }

    const filePath = resolvePath(cwd, file)

    // Security: must be within cwd
    if (!filePath.startsWith(cwd)) {
      return { exitCode: 1, stdout: '', stderr: 'replace: cannot access paths outside project' }
    }

    // Write guard — block protected files (index.html, etc.)
    const validation = validateFileWrite(filePath, cwd)
    if (!validation.allowed) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `replace: ${validation.reason}${validation.suggestion ? '\n' + validation.suggestion : ''}`,
      }
    }

    try {
      const content = await fs.readFile(filePath, { encoding: 'utf8' })
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content)

      let newContent: string
      let count: number

      if (whitespaceTolerant) {
        const matches = findWhitespaceTolerantMatches(text, oldStr)
        count = matches.length

        if (count === 0) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: formatNoMatchError(text, oldStr, file, true),
          }
        }

        // Replace from end to preserve positions
        newContent = text
        for (let i = matches.length - 1; i >= 0; i--) {
          const { start, end } = matches[i]
          newContent = newContent.slice(0, start) + newStr + newContent.slice(end)
        }
      } else {
        // Exact matching
        const escapedOld = escapeRegex(oldStr)
        const regex = new RegExp(escapedOld, 'g')
        const matchArr = text.match(regex)
        count = matchArr ? matchArr.length : 0

        if (count === 0) {
          return {
            exitCode: 1,
            stdout: '',
            stderr: formatNoMatchError(text, oldStr, file, false),
          }
        }

        newContent = text.split(oldStr).join(newStr)
      }

      await fs.writeFile(filePath, newContent)

      // Generate unified diff for output
      const diffOutput = createPatch(file, text, newContent, '', '', { context: 3 })
      // Strip the first two header lines (diff --git, index) leaving --- and +++ onward
      const diffLines = diffOutput.split('\n')
      const patchStart = diffLines.findIndex((l) => l.startsWith('---'))
      const cleanDiff = patchStart >= 0 ? diffLines.slice(patchStart).join('\n') : diffOutput

      const wsNote = whitespaceTolerant ? ' (whitespace-tolerant)' : ''
      return {
        exitCode: 0,
        stdout: `✓ Replaced ${count} occurrence${count > 1 ? 's' : ''} in ${file}${wsNote}\n\n${cleanDiff}`,
        stderr: '',
        filesChanged: [filePath],
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
 * Format a helpful no-match error with fuzzy suggestions
 */
/** Truncate long strings for error display */
function truncate(str: string, maxLen = 80): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

function formatNoMatchError(
  fileContent: string,
  searchStr: string,
  fileName: string,
  wasWhitespace: boolean
): string {
  const wsNote = wasWhitespace ? ' (even with whitespace tolerance)' : ''
  const display = truncate(searchStr.replace(/\n/g, '\\n'))
  const lines: string[] = [`⚠ No match found for "${display}" in ${fileName}${wsNote}`]

  // Priority: detect multi-line search strings
  if (searchStr.includes('\n')) {
    lines.push('')
    lines.push('Note: The search string contains newlines. `replace` works best with single-line strings.')
    lines.push(`To rewrite a section, use: cat > ${fileName} << 'EOF'`)
    return lines.join('\n')
  }

  // Find fuzzy suggestions
  const suggestions = findFuzzySuggestions(fileContent, searchStr)
  if (suggestions.length > 0) {
    lines.push('')
    lines.push('Did you mean one of these?')
    for (const s of suggestions) {
      lines.push(`  Line ${s.line}: ${s.text}`)
    }
  }

  lines.push('')
  lines.push(`Tip: For multi-line replacements, rewrite the file with: cat > ${fileName} << 'EOF'`)

  return lines.join('\n')
}

/**
 * Find lines in the file that are close to the search string
 * Uses Levenshtein distance and substring matching
 */
function findFuzzySuggestions(
  fileContent: string,
  searchStr: string,
  maxSuggestions = 3
): Array<{ line: number; text: string }> {
  const fileLines = fileContent.split('\n')
  const searchLower = searchStr.toLowerCase()
  const candidates: Array<{ line: number; text: string; score: number }> = []

  for (let i = 0; i < fileLines.length; i++) {
    const lineText = fileLines[i].trim()
    if (!lineText) continue

    // Check substring match first (cheapest)
    if (lineText.toLowerCase().includes(searchLower.slice(0, Math.max(5, searchLower.length / 2)))) {
      candidates.push({ line: i + 1, text: lineText, score: 0 })
      continue
    }

    // Levenshtein on short strings only (expensive for long strings)
    if (searchStr.length <= 60 && lineText.length <= 200) {
      const d = distance(searchStr, lineText)
      if (d <= Math.max(5, searchStr.length * 0.4)) {
        candidates.push({ line: i + 1, text: lineText, score: d })
      }
    }
  }

  // Sort by score (lower is better), take top N
  candidates.sort((a, b) => a.score - b.score)
  return candidates.slice(0, maxSuggestions).map((c) => ({
    line: c.line,
    text: c.text.length > 80 ? c.text.slice(0, 77) + '...' : c.text,
  }))
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
