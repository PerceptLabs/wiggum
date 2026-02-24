import { z } from 'zod'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'
import { getSearchDb, semanticSearch } from '../../search'
import { getPackageEntry } from '../../packages/registry'

// ============================================================================
// SCHEMAS (flat — no discriminated unions, models can't fill them)
// ============================================================================

/** Flat schema for discrete grep tool (regex search) */
export const GrepRegexSchema = z.object({
  pattern: z.string().min(1).describe('Regex pattern to search for'),
  path: z.string().optional().describe('File or directory to search'),
  include: z.string().optional().describe('Glob to filter files (e.g. "*.tsx")'),
})

/** Flat schema for discrete search tool (skill/package/code) */
export const SearchSchema = z.object({
  query: z.string().min(1).describe('Semantic search query'),
  scope: z.enum(['skill', 'package', 'code']).optional().describe('Search domain (default: skill)'),
})

// ============================================================================
// COMMAND
// ============================================================================

export class GrepCommand implements ShellCommand<any> {
  name = 'grep'
  description = `Search files, skills, or packages. Modes:
  grep skill "<query>"   - Semantic search of skills (typo-tolerant)
  grep package "<query>" - Package registry search (imports + guidance)
  grep code "<query>"    - Semantic search of project (coming soon)
  grep "<pattern>" <file> - Exact regex match in file`

  additionalTools = [
    {
      name: 'grep',
      description: 'Regex search in project files',
      argsSchema: GrepRegexSchema,
      examples: ['grep({ pattern: "useState", path: "src/" })'],
    },
    {
      name: 'search',
      description: 'Semantic search for skills, packages, or code',
      argsSchema: SearchSchema,
      examples: ['search({ query: "form validation" })'],
    },
  ]

  parseCliArgs(args: string[]): unknown {
    let ignoreCase = false
    let recursive = false
    let lineNumbers = false
    let extendedRegex = false
    let filesOnly = false
    let afterContext: number | undefined
    let beforeContext: number | undefined
    const positionalArgs: string[] = []

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      // Context flags: -A <n>, -B <n>, -C <n>
      if (arg === '-A' || arg === '-B' || arg === '-C') {
        const num = parseInt(args[++i], 10)
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
        if (arg.includes('n')) lineNumbers = true
        if (arg.includes('E')) extendedRegex = true
        if (arg.includes('l')) filesOnly = true
      } else if (arg === '--ignore-case') {
        ignoreCase = true
      } else if (arg === '--recursive') {
        recursive = true
      } else if (arg === '--line-number') {
        lineNumbers = true
      } else if (arg === '--extended-regexp') {
        extendedRegex = true
      } else if (arg === '--files-with-matches') {
        filesOnly = true
      } else {
        positionalArgs.push(arg)
      }
    }

    // Semantic search modes
    const modeStr = positionalArgs[0]?.toLowerCase()

    if (modeStr === 'skill' || modeStr === 'skills') {
      return { mode: 'skill', query: positionalArgs.slice(1).join(' ') }
    }
    if (modeStr === 'package' || modeStr === 'packages') {
      return { mode: 'package', query: positionalArgs.slice(1).join(' ') }
    }
    if (modeStr === 'code') {
      return { mode: 'code', query: positionalArgs.slice(1).join(' ') }
    }

    return {
      mode: 'regex',
      pattern: positionalArgs[0] ?? '',
      files: positionalArgs.length > 1 ? positionalArgs.slice(1) : undefined,
      ignoreCase: ignoreCase || undefined,
      recursive: recursive || undefined,
      lineNumbers: lineNumbers || undefined,
      extendedRegex: extendedRegex || undefined,
      filesOnly: filesOnly || undefined,
      afterContext,
      beforeContext,
    }
  }

  async execute(args: any, options: ShellOptions): Promise<ShellResult> {
    // Discrete search tool: { query, scope? }
    if ('query' in args && !('mode' in args)) {
      const scope = args.scope ?? 'skill'
      if (scope === 'skill') return this.searchSkills(args.query)
      if (scope === 'package') return this.searchPackages(args.query)
      return { exitCode: 1, stdout: '', stderr: 'search code: project indexing not yet implemented' }
    }

    // Discrete grep tool: { pattern } (no mode field)
    if ('pattern' in args && !('mode' in args)) {
      return this.regexSearch({
        mode: 'regex' as const, pattern: args.pattern,
        files: args.path ? [args.path] : [],
        recursive: true, lineNumbers: true,
      }, options)
    }

    // Shell path (parseCliArgs output has mode field)
    if (args.mode === 'skill') return this.searchSkills(args.query)
    if (args.mode === 'package') return this.searchPackages(args.query)
    if (args.mode === 'code') {
      return { exitCode: 1, stdout: '', stderr: 'grep code: project indexing not yet implemented' }
    }

    return this.regexSearch(args, options)
  }

  private async regexSearch(
    args: { pattern: string; files?: string[]; ignoreCase?: boolean; recursive?: boolean; lineNumbers?: boolean; extendedRegex?: boolean; filesOnly?: boolean; beforeContext?: number; afterContext?: number },
    options: ShellOptions,
  ): Promise<ShellResult> {
    const { fs, cwd, stdin } = options
    const { pattern, files = [], ignoreCase, recursive, lineNumbers, extendedRegex, filesOnly, beforeContext = 0, afterContext = 0 } = args

    // In basic mode, convert \| to | (POSIX basic regex alternation)
    const resolved = extendedRegex ? pattern : pattern.replace(/\\\|/g, '|')
    const regex = new RegExp(resolved, ignoreCase ? 'gi' : 'g')

    const matches: string[] = []
    const matchedFiles = new Set<string>()
    const errors: string[] = []

    if (files.length === 0 && stdin !== undefined) {
      const stdinMatches = searchContent(stdin, regex, !!lineNumbers, '', beforeContext, afterContext)
      matches.push(...stdinMatches)
    } else if (files.length === 0) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: [
          `grep: no input files`,
          `Did you mean:  grep "${pattern}" src/          (search src/ recursively)`,
          `               grep "${pattern}" src/**/*.tsx   (search .tsx files)`,
          `               grep skill "${pattern}"          (search skills library)`,
        ].join('\n'),
      }
    } else {
      for (const file of files) {
        const filePath = resolvePath(cwd, file)
        const showFileName = files.length > 1 || !!recursive

        try {
          const stat = await fs.stat(filePath)

          if (stat.isDirectory()) {
            if (recursive) {
              await searchDirectory(fs, filePath, regex, !!lineNumbers, matches, errors, beforeContext, afterContext)
            } else {
              errors.push(`grep: ${file}: Is a directory`)
            }
          } else {
            const content = await fs.readFile(filePath, { encoding: 'utf8' })
            const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
            const fileMatches = searchContent(
              text, regex, !!lineNumbers, showFileName ? file : '', beforeContext, afterContext,
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

    if (filesOnly && matchedFiles.size > 0) {
      return { exitCode: 0, stdout: [...matchedFiles].join('\n') + '\n', stderr: errors.join('\n') }
    }

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

  /**
   * Search package registry using Orama semantic search
   */
  private async searchPackages(query: string): Promise<ShellResult> {
    const db = await getSearchDb()
    const results = await semanticSearch(db, 'package', query, 5)

    if (results.count === 0) {
      return { exitCode: 1, stdout: '', stderr: `No packages match "${query}"` }
    }

    const output = results.hits
      .map((hit) => {
        const name = hit.document.source
        const entry = getPackageEntry(name)
        if (!entry) return `${name} (no registry entry)`

        const importPath = entry.subpath ? `${name}/${entry.subpath.replace(`${name}/`, '')}` : name
        const lines = [
          `${name} v${entry.version} (~${entry.bundleSize})`,
          `  ${entry.description}`,
          `  import { ${entry.imports.named.slice(0, 4).join(', ')} } from '${importPath}'`,
          `  Use when: ${entry.useWhen.join(', ')}`,
          `  Not when: ${entry.notWhen.join(', ')}`,
        ]
        if (entry.relatedPackages?.length) {
          lines.push(`  Related: ${entry.relatedPackages.join(', ')}`)
        }
        return lines.join('\n')
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
