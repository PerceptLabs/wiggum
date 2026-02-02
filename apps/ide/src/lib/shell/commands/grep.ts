import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'
import { getSearchDb, semanticSearch } from '../../search'

/**
 * grep - Search for patterns in files
 * Supports -i (ignore case), -r (recursive), -n (line numbers)
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
    const positionalArgs: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-') && !arg.startsWith('--')) {
        if (arg.includes('i')) ignoreCase = true
        if (arg.includes('r') || arg.includes('R')) recursive = true
        if (arg.includes('n')) showLineNumbers = true
      } else if (arg === '--ignore-case') {
        ignoreCase = true
      } else if (arg === '--recursive') {
        recursive = true
      } else if (arg === '--line-number') {
        showLineNumbers = true
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

    const pattern = positionalArgs[0]
    const files = positionalArgs.slice(1)
    const regex = new RegExp(pattern, ignoreCase ? 'gi' : 'g')

    const matches: string[] = []
    const errors: string[] = []

    // If no files and stdin provided, search stdin
    if (files.length === 0 && stdin !== undefined) {
      const stdinMatches = searchContent(stdin, regex, showLineNumbers, '')
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
              await searchDirectory(fs, filePath, regex, showLineNumbers, matches, errors)
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
              showFileName ? file : ''
            )
            matches.push(...fileMatches)
          }
        } catch {
          errors.push(`grep: ${file}: No such file or directory`)
        }
      }
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

function searchContent(
  content: string,
  regex: RegExp,
  showLineNumbers: boolean,
  fileName: string
): string[] {
  const lines = content.split('\n')
  const matches: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (regex.test(line)) {
      // Reset regex lastIndex for global regex
      regex.lastIndex = 0

      let result = line
      if (showLineNumbers) {
        result = `${i + 1}:${result}`
      }
      if (fileName) {
        result = `${fileName}:${result}`
      }
      matches.push(result)
    }
  }

  return matches
}

async function searchDirectory(
  fs: ShellOptions['fs'],
  dirPath: string,
  regex: RegExp,
  showLineNumbers: boolean,
  matches: string[],
  errors: string[]
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries as { name: string; type: string }[]) {
      const entryPath = `${dirPath}/${entry.name}`

      if (entry.type === 'dir') {
        await searchDirectory(fs, entryPath, regex, showLineNumbers, matches, errors)
      } else {
        try {
          const content = await fs.readFile(entryPath, { encoding: 'utf8' })
          const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
          const fileMatches = searchContent(text, regex, showLineNumbers, entryPath)
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
