import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'
import { getSearchDb, semanticSearch } from '../../search'

/**
 * grep - Search for patterns in files
 * Supports -i (ignore case), -r (recursive), -n (line numbers),
 * -E (extended regex), -l (files only), -A/-B/-C (context lines)
 */
export class GrepCommand implements ShellCommand {
  name = 'grep'
  description = `Search files or skills. Modes:
  grep skill "<query>" - Semantic search of skills (typo-tolerant)
  grep code "<query>"  - Semantic search of project (coming soon)
  grep "<pattern>" <file> - Exact regex match in file`

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // Parse flags and arguments
    let ignoreCase = false
    let recursive = false
    let showLineNumbers = false
    let extendedRegex = false
    let filesOnly = false
    let afterContext = 0
    let beforeContext = 0
    const positionalArgs: string[] = []

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      // Context flags that consume a numeric argument: -A <n>, -B <n>, -C <n>
      if (arg === '-A' || arg === '-B' || arg === '-C') {
        const numArg = args[++i]
        const num = parseInt(numArg, 10)
        if (isNaN(num) || num < 0) {
          return { exitCode: 2, stdout: '', stderr: `grep: invalid context length argument: ${numArg}` }
        }
        if (arg === '-A') afterContext = num
        else if (arg === '-B') beforeContext = num
        else { afterContext = num; beforeContext = num }
        continue
      }

      // Combined forms: -A5, -B3, -C2
      if (/^-[ABC]\d+$/.test(arg)) {
        const flag = arg[1]
        const num = parseInt(arg.slice(2), 10)
        if (flag === 'A') afterContext = num
        else if (flag === 'B') beforeContext = num
        else { afterContext = num; beforeContext = num }
        continue
      }

      if (arg.startsWith('-') && !arg.startsWith('--')) {
        if (arg.includes('i')) ignoreCase = true
        if (arg.includes('r') || arg.includes('R')) recursive = true
        if (arg.includes('n')) showLineNumbers = true
        if (arg.includes('E')) extendedRegex = true
        if (arg.includes('l')) filesOnly = true
      } else if (arg === '--ignore-case') {
        ignoreCase = true
      } else if (arg === '--recursive') {
        recursive = true
      } else if (arg === '--line-number') {
        showLineNumbers = true
      } else if (arg === '--extended-regexp') {
        extendedRegex = true
      } else if (arg === '--files-with-matches') {
        filesOnly = true
      } else {
        positionalArgs.push(arg)
      }
    }

    // Semantic search modes
    const mode = positionalArgs[0]?.toLowerCase()

    if (mode === 'skill' || mode === 'skills') {
      const query = positionalArgs.slice(1).join(' ')
      if (!query) {
        return { exitCode: 2, stdout: '', stderr: 'grep skill: missing query' }
      }
      return this.searchSkills(query)
    }

    if (mode === 'code') {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'grep code: project indexing not yet implemented',
      }
    }

    if (positionalArgs.length === 0) {
      return { exitCode: 2, stdout: '', stderr: 'grep: missing pattern' }
    }

    const rawPattern = positionalArgs[0]
    const files = positionalArgs.slice(1)

    // In basic mode, convert \| to | (POSIX basic regex alternation)
    // In extended mode (-E), | is already literal alternation
    const pattern = extendedRegex ? rawPattern : rawPattern.replace(/\\\|/g, '|')
    const regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g')

    const matches: string[] = []
    const matchedFiles = new Set<string>()
    const errors: string[] = []

    // If no files and stdin provided, search stdin
    if (files.length === 0 && stdin !== undefined) {
      const stdinMatches = searchContent(stdin, regex, showLineNumbers, '', beforeContext, afterContext)
      matches.push(...stdinMatches)
    } else if (files.length === 0) {
      return { exitCode: 2, stdout: '', stderr: 'grep: no input files' }
    } else {
      for (const file of files) {
        const filePath = resolvePath(cwd, file)
        const showFileName = files.length > 1 || recursive

        try {
          const stat = await fs.stat(filePath)

          if (stat.isDirectory()) {
            if (recursive) {
              await searchDirectory(fs, filePath, regex, showLineNumbers, matches, errors, beforeContext, afterContext)
            } else {
              errors.push(`grep: ${file}: Is a directory`)
            }
          } else {
            const content = await fs.readFile(filePath, { encoding: 'utf8' })
            const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
            const fileMatches = searchContent(
              text,
              regex,
              showLineNumbers,
              showFileName ? file : '',
              beforeContext,
              afterContext
            )
            if (fileMatches.length > 0) {
              matchedFiles.add(file)
              matches.push(...fileMatches)
            }
          }
        } catch {
          errors.push(`grep: ${file}: No such file or directory`)
        }
      }
    }

    // -l: only output filenames that had matches
    if (filesOnly && matchedFiles.size > 0) {
      return {
        exitCode: 0,
        stdout: [...matchedFiles].join('\n') + '\n',
        stderr: errors.join('\n'),
      }
    }

    // Helpful hint when files don't exist and nothing matched
    if (matches.length === 0 && errors.length > 0) {
      errors.push('\nHint: Use `find . -name "*.tsx"` or `ls <dir>` to verify file paths')
    }

    const exitCode = matches.length > 0 ? 0 : errors.length > 0 ? 2 : 1

    return {
      exitCode,
      stdout: matches.join('\n') + (matches.length > 0 ? '\n' : ''),
      stderr: errors.join('\n'),
    }
  }

  /**
   * Search skills using Orama semantic search (typo-tolerant, relevance-ranked)
   */
  private async searchSkills(query: string): Promise<ShellResult> {
    const db = await getSearchDb()
    const results = await semanticSearch(db, 'skill', query, 5)

    if (results.count === 0) {
      return { exitCode: 1, stdout: '', stderr: `No matches for "${query}" in skills` }
    }

    const output = results.hits
      .map((hit) => {
        const doc = hit.document
        const content = doc.content.slice(0, 500) + (doc.content.length > 500 ? '...' : '')
        return `--- ${doc.source} / ${doc.section} (score: ${hit.score.toFixed(2)}) ---\n${content}`
      })
      .join('\n\n')

    return { exitCode: 0, stdout: output + '\n', stderr: '' }
  }
}

function fmtLine(line: string, idx: number, fileName: string, showLineNumbers: boolean, sep: string): string {
  let r = line
  if (showLineNumbers) r = `${idx + 1}${sep}${r}`
  if (fileName) r = `${fileName}${sep}${r}`
  return r
}

function searchContent(
  content: string,
  regex: RegExp,
  showLineNumbers: boolean,
  fileName: string,
  beforeContext = 0,
  afterContext = 0
): string[] {
  const lines = content.split('\n')
  const hasContext = beforeContext > 0 || afterContext > 0

  if (!hasContext) {
    // Fast path: current behavior (no context)
    const matches: string[] = []
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        regex.lastIndex = 0
        matches.push(fmtLine(lines[i], i, fileName, showLineNumbers, ':'))
      }
    }
    return matches
  }

  // Context path: collect match indices, expand ranges
  const matchIndices = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      regex.lastIndex = 0
      matchIndices.add(i)
    }
  }

  if (matchIndices.size === 0) return []

  // Expand to include context lines
  const outputIndices = new Set<number>()
  for (const idx of matchIndices) {
    for (let j = Math.max(0, idx - beforeContext); j <= Math.min(lines.length - 1, idx + afterContext); j++) {
      outputIndices.add(j)
    }
  }

  const sorted = [...outputIndices].sort((a, b) => a - b)
  const result: string[] = []
  let lastIdx = -2

  for (const idx of sorted) {
    // Group separator between non-contiguous ranges
    if (idx > lastIdx + 1 && lastIdx >= 0) {
      result.push('--')
    }
    const sep = matchIndices.has(idx) ? ':' : '-'
    result.push(fmtLine(lines[idx], idx, fileName, showLineNumbers, sep))
    lastIdx = idx
  }

  return result
}

async function searchDirectory(
  fs: ShellOptions['fs'],
  dirPath: string,
  regex: RegExp,
  showLineNumbers: boolean,
  matches: string[],
  errors: string[],
  beforeContext = 0,
  afterContext = 0
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries as { name: string; type: string }[]) {
      const entryPath = `${dirPath}/${entry.name}`

      if (entry.type === 'dir') {
        await searchDirectory(fs, entryPath, regex, showLineNumbers, matches, errors, beforeContext, afterContext)
      } else {
        try {
          const content = await fs.readFile(entryPath, { encoding: 'utf8' })
          const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
          const fileMatches = searchContent(text, regex, showLineNumbers, entryPath, beforeContext, afterContext)
          matches.push(...fileMatches)
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    errors.push(`grep: ${dirPath}: Permission denied`)
  }
}
