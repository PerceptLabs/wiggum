import { z } from 'zod'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'
import { getSearchDb, semanticSearch } from '../../search'
import { validateFileWrite } from '../write-guard'

// ============================================================================
// SCHEMAS (flat — no discriminated unions, models can't fill them)
// ============================================================================

/** Flat schema for discrete sed tool (regex substitution) */
export const SedSubstituteSchema = z.object({
  file: z.string().min(1).describe('File path'),
  pattern: z.string().min(1).describe('Regex pattern to match'),
  replacement: z.string().describe('Replacement string (use $1, $2 for groups)'),
  flags: z.string().optional().describe('Regex flags: g=global, i=case-insensitive'),
  inPlace: z.boolean().optional().default(true).describe('Modify file in place'),
})

/** Flat schema for discrete sed_line tool (line-number operations) */
export const SedLineSchema = z.object({
  file: z.string().min(1).describe('File path'),
  lineNumber: z.number().int().positive().describe('Line number (1-indexed)'),
  action: z.enum(['delete', 'replace', 'insert-before', 'insert-after']).describe('Line operation'),
  content: z.string().optional().describe('New content (for replace/insert)'),
})

type SedSubstituteArgs = z.infer<typeof SedSubstituteSchema>
type SedLineArgs = z.infer<typeof SedLineSchema>
type SedArgs = string[] | SedSubstituteArgs | SedLineArgs

/**
 * sed - Stream editor with three layers:
 * 1. Standard sed: regex substitution, line ops, deletion
 * 2. Orama discovery: `sed code 's/old/new/g' "query"` — semantic file search + transform
 * 3. Whitespace tolerance: `-w` flag collapses whitespace before matching
 *
 * Usage: sed [-i] [-n] [-w] [-e EXPR] 'EXPRESSION' [file...]
 *        sed code [-w] 'EXPRESSION' "query"
 */
export class SedCommand implements ShellCommand<SedArgs> {
  name = 'sed'
  description = 'Stream editor for filtering and transforming text'

  examples = [
    "sed -i 's/old/new/g' src/App.tsx",
    "sed -n '5,10p' src/App.tsx",
  ]

  additionalTools = [
    {
      name: 'sed',
      description: 'Regex substitution in a file (typed — no escaping needed)',
      argsSchema: SedSubstituteSchema,
      examples: ['sed({ file: "src/App.tsx", pattern: "oldFunc", replacement: "newFunc", flags: "g" })'],
    },
    {
      name: 'sed_line',
      description: 'Line-number operations: delete, replace, or insert lines',
      argsSchema: SedLineSchema,
      examples: ['sed_line({ file: "src/App.tsx", lineNumber: 42, action: "delete" })'],
    },
  ]

  async execute(args: SedArgs, options: ShellOptions): Promise<ShellResult> {
    // Discrete tool: substitute mode
    if (!Array.isArray(args) && 'pattern' in args && 'replacement' in args) {
      return this.executeSubstitute(args as SedSubstituteArgs, options)
    }
    // Discrete tool: line mode
    if (!Array.isArray(args) && 'lineNumber' in args) {
      return this.executeLine(args as SedLineArgs, options)
    }

    // CLI path: string[]
    const cliArgs = args as string[]
    const { fs, cwd, stdin } = options

    // Parse flags and arguments
    let inPlace = false
    let suppress = false
    let whitespaceTolerant = false
    let codeMode = false
    const expressions: string[] = []
    const positional: string[] = []

    for (let i = 0; i < cliArgs.length; i++) {
      const arg = cliArgs[i]
      if (arg === 'code' && i === 0) {
        codeMode = true
      } else if (arg === '-i') {
        inPlace = true
      } else if (arg === '-n') {
        suppress = true
      } else if (arg === '-w') {
        whitespaceTolerant = true
      } else if (arg === '-e' && i + 1 < cliArgs.length) {
        expressions.push(cliArgs[++i])
      } else if (arg === '-iw' || arg === '-wi') {
        inPlace = true
        whitespaceTolerant = true
      } else if (arg === '-in' || arg === '-ni') {
        inPlace = true
        suppress = true
      } else if (arg === '-nw' || arg === '-wn') {
        suppress = true
        whitespaceTolerant = true
      } else if (arg.startsWith('-') && arg.length > 1 && !arg.startsWith('-e')) {
        // Combined short flags
        for (const c of arg.slice(1)) {
          if (c === 'i') inPlace = true
          else if (c === 'n') suppress = true
          else if (c === 'w') whitespaceTolerant = true
        }
      } else {
        positional.push(arg)
      }
    }

    // If no -e expressions, first positional is the expression
    if (expressions.length === 0 && positional.length > 0) {
      expressions.push(positional.shift()!)
    }

    if (expressions.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'sed: no expression provided' }
    }

    // Parse all expressions into operations
    const operations: SedOperation[] = []
    for (const expr of expressions) {
      const parsed = parseSedExpression(expr)
      if (!parsed) {
        return { exitCode: 1, stdout: '', stderr: `sed: invalid expression: ${expr}` }
      }
      operations.push(parsed)
    }

    // Layer 2: Orama file discovery mode
    if (codeMode) {
      const query = positional.join(' ')
      if (!query) {
        return { exitCode: 1, stdout: '', stderr: 'sed code: missing search query' }
      }
      return this.executeCodeMode(operations, query, whitespaceTolerant, fs, cwd)
    }

    // Get files or stdin
    const files = positional
    if (files.length === 0 && stdin === undefined) {
      return { exitCode: 1, stdout: '', stderr: 'sed: no input files' }
    }

    if (files.length === 0 && stdin !== undefined) {
      // Process stdin
      const result = applySedOperations(stdin, operations, suppress, whitespaceTolerant)
      return { exitCode: 0, stdout: result, stderr: '' }
    }

    // Process files
    const outputs: string[] = []
    const changedPaths: string[] = []
    for (const file of files) {
      const filePath = resolvePath(cwd, file)
      try {
        const data = await fs.readFile(filePath, { encoding: 'utf8' })
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
        const result = applySedOperations(text, operations, suppress, whitespaceTolerant)

        if (inPlace) {
          const validation = validateFileWrite(filePath, cwd)
          if (!validation.allowed) {
            return {
              exitCode: 1,
              stdout: '',
              stderr: `sed: ${validation.reason}${validation.suggestion ? '\n' + validation.suggestion : ''}`,
            }
          }
          await fs.writeFile(filePath, result, { encoding: 'utf8' })
          changedPaths.push(filePath)
        } else {
          outputs.push(result)
        }
      } catch {
        return { exitCode: 1, stdout: '', stderr: `sed: ${file}: No such file or directory` }
      }
    }

    if (inPlace) {
      return { exitCode: 0, stdout: '', stderr: '', filesChanged: changedPaths.length > 0 ? changedPaths : undefined }
    }

    return { exitCode: 0, stdout: outputs.join(''), stderr: '' }
  }

  /**
   * Layer 2: Orama semantic file discovery + transform
   */
  private async executeCodeMode(
    operations: SedOperation[],
    query: string,
    whitespaceTolerant: boolean,
    fs: ShellOptions['fs'],
    cwd: string
  ): Promise<ShellResult> {
    try {
      const db = await getSearchDb()
      const results = await semanticSearch(db, 'code', query, 20)

      if (results.count === 0) {
        return { exitCode: 1, stdout: '', stderr: `sed code: no files matched query "${query}"` }
      }

      // Extract unique file paths
      const filePaths = new Set<string>()
      for (const hit of results.hits) {
        if (hit.document.source) {
          filePaths.add(hit.document.source)
        }
      }

      if (filePaths.size === 0) {
        return { exitCode: 1, stdout: '', stderr: `sed code: no files matched query "${query}"` }
      }

      const modified: string[] = []
      for (const file of filePaths) {
        const filePath = resolvePath(cwd, file)
        try {
          const data = await fs.readFile(filePath, { encoding: 'utf8' })
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
          const result = applySedOperations(text, operations, false, whitespaceTolerant)

          if (result !== text) {
            const validation = validateFileWrite(filePath, cwd)
            if (!validation.allowed) continue
            await fs.writeFile(filePath, result, { encoding: 'utf8' })
            modified.push(file)
          }
        } catch {
          // Skip files that can't be read
        }
      }

      if (modified.length === 0) {
        return { exitCode: 0, stdout: 'sed: no changes made\n', stderr: '' }
      }

      const modifiedPaths = modified.map((f) => resolvePath(cwd, f))
      return {
        exitCode: 0,
        stdout: `sed: modified ${modified.length} file(s):\n${modified.map((f) => `  ${f}`).join('\n')}\n`,
        stderr: '',
        filesChanged: modifiedPaths,
      }
    } catch {
      return { exitCode: 1, stdout: '', stderr: 'sed code: search index not available' }
    }
  }

  /**
   * Discrete tool: regex substitution with pre-parsed args (no expression parsing)
   */
  private async executeSubstitute(args: SedSubstituteArgs, options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options
    const filePath = resolvePath(cwd, args.file)

    if (!filePath.startsWith(cwd)) {
      return { exitCode: 1, stdout: '', stderr: 'sed: cannot access paths outside project' }
    }

    const inPlace = args.inPlace !== false // default true

    if (inPlace) {
      const validation = validateFileWrite(filePath, cwd)
      if (!validation.allowed) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `sed: ${validation.reason}${validation.suggestion ? '\n' + validation.suggestion : ''}`,
        }
      }
    }

    try {
      const data = await fs.readFile(filePath, { encoding: 'utf8' })
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data)

      // Build regex — extract 'g' for global, rest are regex flags
      const flagStr = args.flags ?? ''
      const isGlobal = flagStr.includes('g')
      const regexFlags = flagStr.replace(/g/g, '')
      const pattern = new RegExp(args.pattern, regexFlags)

      const op: SedOperation = {
        type: 'substitute',
        pattern,
        replacement: args.replacement,
        global: isGlobal,
      }

      const result = applySedOperations(text, [op], false, false)

      if (result === text) {
        return { exitCode: 0, stdout: 'sed: no changes made\n', stderr: '' }
      }

      if (inPlace) {
        await fs.writeFile(filePath, result, { encoding: 'utf8' })
        return { exitCode: 0, stdout: '', stderr: '', filesChanged: [filePath] }
      }

      return { exitCode: 0, stdout: result, stderr: '' }
    } catch {
      return { exitCode: 1, stdout: '', stderr: `sed: ${args.file}: No such file or directory` }
    }
  }

  /**
   * Discrete tool: line-number operations (delete, replace, insert)
   */
  private async executeLine(args: SedLineArgs, options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options
    const filePath = resolvePath(cwd, args.file)

    if (!filePath.startsWith(cwd)) {
      return { exitCode: 1, stdout: '', stderr: 'sed: cannot access paths outside project' }
    }

    const validation = validateFileWrite(filePath, cwd)
    if (!validation.allowed) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `sed: ${validation.reason}${validation.suggestion ? '\n' + validation.suggestion : ''}`,
      }
    }

    try {
      const data = await fs.readFile(filePath, { encoding: 'utf8' })
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data)
      const lines = text.split('\n')

      if (args.lineNumber < 1 || args.lineNumber > lines.length) {
        return { exitCode: 1, stdout: '', stderr: `sed: line ${args.lineNumber} out of range (file has ${lines.length} lines)` }
      }

      const idx = args.lineNumber - 1

      switch (args.action) {
        case 'delete':
          lines.splice(idx, 1)
          break
        case 'replace':
          lines[idx] = args.content ?? ''
          break
        case 'insert-before':
          lines.splice(idx, 0, args.content ?? '')
          break
        case 'insert-after':
          lines.splice(idx + 1, 0, args.content ?? '')
          break
      }

      const newContent = lines.join('\n')
      await fs.writeFile(filePath, newContent, { encoding: 'utf8' })
      return { exitCode: 0, stdout: '', stderr: '', filesChanged: [filePath] }
    } catch {
      return { exitCode: 1, stdout: '', stderr: `sed: ${args.file}: No such file or directory` }
    }
  }
}

// ============================================================================
// SED EXPRESSION TYPES AND PARSER
// ============================================================================

interface SedOperation {
  type: 'substitute' | 'delete' | 'print'
  // Address/scope
  address?: {
    type: 'line' | 'lineRange' | 'pattern' | 'patternRange'
    line?: number
    lineEnd?: number | '$'
    pattern?: RegExp
    patternStart?: RegExp
    patternEnd?: RegExp
  }
  // For substitute
  pattern?: RegExp
  replacement?: string
  global?: boolean
  // For print
  printFlag?: boolean
}

/**
 * Parse a sed expression into a SedOperation
 */
function parseSedExpression(expr: string): SedOperation | null {
  // Try address + operation patterns
  let remaining = expr
  let address: SedOperation['address'] | undefined

  // Check for address prefix
  const addrResult = parseAddress(remaining)
  if (addrResult) {
    address = addrResult.address
    remaining = addrResult.remaining
  }

  // Substitute: s/pattern/replacement/flags
  const subMatch = parseSubstitute(remaining)
  if (subMatch) {
    return { type: 'substitute', address, ...subMatch }
  }

  // Delete: d
  if (remaining.trim() === 'd') {
    return { type: 'delete', address }
  }

  // Print: p
  if (remaining.trim() === 'p') {
    return { type: 'print', address, printFlag: true }
  }

  return null
}

/**
 * Parse address prefix from expression
 * Supports: 5, 5,10, $, /pattern/, /start/,/end/
 */
function parseAddress(expr: string): { address: SedOperation['address']; remaining: string } | null {
  // Line number: 5s/... or 5d
  const lineMatch = expr.match(/^(\d+)(.*)$/)
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1])
    const rest = lineMatch[2]

    // Line range: 5,10s/... or 5,$s/...
    const rangeMatch = rest.match(/^,(\d+|\$)(.*)$/)
    if (rangeMatch) {
      const end = rangeMatch[1] === '$' ? '$' as const : parseInt(rangeMatch[1])
      return {
        address: { type: 'lineRange', line: lineNum, lineEnd: end },
        remaining: rangeMatch[2],
      }
    }

    return {
      address: { type: 'line', line: lineNum },
      remaining: rest,
    }
  }

  // Pattern: /regex/d or /regex/s/.../
  const patternMatch = expr.match(/^\/([^/]+)\/(.*)$/)
  if (patternMatch) {
    const pattern = new RegExp(patternMatch[1])
    const rest = patternMatch[2]

    // Pattern range: /start/,/end/
    const rangeMatch = rest.match(/^,\/([^/]+)\/(.*)$/)
    if (rangeMatch) {
      return {
        address: { type: 'patternRange', patternStart: pattern, patternEnd: new RegExp(rangeMatch[1]) },
        remaining: rangeMatch[2],
      }
    }

    return {
      address: { type: 'pattern', pattern },
      remaining: rest,
    }
  }

  return null
}

/**
 * Parse substitute expression: s/pattern/replacement/flags
 * Supports alternate delimiters: s|pattern|replacement|flags
 */
function parseSubstitute(expr: string): { pattern: RegExp; replacement: string; global: boolean } | null {
  if (!expr.startsWith('s') || expr.length < 4) return null

  const delim = expr[1]
  // Delimiter must not be alphanumeric
  if (/[a-zA-Z0-9]/.test(delim)) return null

  // Split by unescaped delimiter
  const parts = splitByDelimiter(expr.slice(2), delim)
  if (parts.length < 2) return null

  const patternStr = parts[0]
  const replacement = processEscapes(parts[1])
  const flagsStr = parts[2] || ''

  const regexFlags: string[] = []
  let global = false
  for (const f of flagsStr) {
    if (f === 'g') global = true
    else if (f === 'i') regexFlags.push('i')
    else if (f === 'm') regexFlags.push('m')
  }

  try {
    const pattern = new RegExp(patternStr, regexFlags.join(''))
    return { pattern, replacement, global }
  } catch {
    return null
  }
}

/**
 * Process escape sequences in sed replacement strings.
 * Handles: \n (newline), \t (tab), \\ (literal backslash)
 */
function processEscapes(replacement: string): string {
  let result = ''
  let i = 0
  while (i < replacement.length) {
    if (replacement[i] === '\\' && i + 1 < replacement.length) {
      const next = replacement[i + 1]
      switch (next) {
        case 'n':
          result += '\n'
          i += 2
          break
        case 't':
          result += '\t'
          i += 2
          break
        case '\\':
          result += '\\'
          i += 2
          break
        default:
          result += replacement[i]
          i += 1
          break
      }
    } else {
      result += replacement[i]
      i += 1
    }
  }
  return result
}

/**
 * Split string by delimiter, respecting backslash escapes
 */
function splitByDelimiter(str: string, delim: string): string[] {
  const parts: string[] = []
  let current = ''
  let escaped = false

  for (const ch of str) {
    if (escaped) {
      if (ch === delim) {
        // Escaped delimiter — include the char WITHOUT the backslash.
        // The backslash only prevented splitting, it's not a literal character.
        current += ch
      } else {
        // Other escaped chars — preserve backslash (might be regex: \d, \w, etc.)
        current += '\\' + ch
      }
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      // DON'T add backslash yet — wait to see what follows
      continue
    }
    if (ch === delim) {
      parts.push(current)
      current = ''
      continue
    }
    current += ch
  }
  // Handle trailing backslash
  if (escaped) {
    current += '\\'
  }
  // Last part (flags or trailing)
  parts.push(current)
  return parts
}

// ============================================================================
// SED OPERATION EXECUTOR
// ============================================================================

/**
 * Apply sed operations to text content
 */
function applySedOperations(
  text: string,
  operations: SedOperation[],
  suppress: boolean,
  whitespaceTolerant: boolean
): string {
  const lines = text.split('\n')
  const totalLines = lines.length
  const output: string[] = []

  // Track pattern range state per operation
  const inRange = new Map<number, boolean>()

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1 // 1-indexed
    let line = lines[i]
    let deleted = false
    let printed = false

    for (let opIdx = 0; opIdx < operations.length; opIdx++) {
      const op = operations[opIdx]

      // Check if line is in scope
      if (!isLineInScope(op.address, lineNum, line, totalLines, inRange, opIdx)) {
        continue
      }

      switch (op.type) {
        case 'substitute': {
          if (op.pattern && op.replacement !== undefined) {
            line = performSubstitute(line, op.pattern, op.replacement, op.global ?? false, whitespaceTolerant)
          }
          break
        }
        case 'delete': {
          deleted = true
          break
        }
        case 'print': {
          printed = true
          break
        }
      }

      if (deleted) break
    }

    if (deleted) continue

    if (suppress) {
      if (printed) output.push(line)
    } else {
      output.push(line)
    }
  }

  return output.join('\n')
}

/**
 * Check if a line is within the scope of an address
 */
function isLineInScope(
  address: SedOperation['address'],
  lineNum: number,
  lineContent: string,
  totalLines: number,
  inRange: Map<number, boolean>,
  opIdx: number
): boolean {
  if (!address) return true

  switch (address.type) {
    case 'line':
      return lineNum === address.line

    case 'lineRange': {
      const end = address.lineEnd === '$' ? totalLines : address.lineEnd!
      return lineNum >= address.line! && lineNum <= end
    }

    case 'pattern':
      return address.pattern!.test(lineContent)

    case 'patternRange': {
      const wasInRange = inRange.get(opIdx) ?? false
      if (wasInRange) {
        if (address.patternEnd!.test(lineContent)) {
          inRange.set(opIdx, false)
        }
        return true
      }
      if (address.patternStart!.test(lineContent)) {
        inRange.set(opIdx, true)
        return true
      }
      return false
    }

    default:
      return true
  }
}

/**
 * Perform substitution with optional whitespace tolerance
 */
function performSubstitute(
  line: string,
  pattern: RegExp,
  replacement: string,
  global: boolean,
  whitespaceTolerant: boolean
): string {
  let effectivePattern = pattern

  if (whitespaceTolerant) {
    // Replace whitespace sequences in pattern with \s+
    const flexSource = pattern.source.replace(/(?:\\s[+*])|[ \t]+/g, '\\s+')
    effectivePattern = new RegExp(flexSource, pattern.flags)
  }

  if (global) {
    const gPattern = new RegExp(effectivePattern.source, effectivePattern.flags.includes('g') ? effectivePattern.flags : effectivePattern.flags + 'g')
    return line.replace(gPattern, replacement)
  }

  return line.replace(effectivePattern, replacement)
}
