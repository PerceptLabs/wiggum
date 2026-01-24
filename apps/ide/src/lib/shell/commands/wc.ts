import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * wc - Word, line, and character count
 * Supports -l (lines), -w (words), -c (characters/bytes)
 */
export class WcCommand implements ShellCommand {
  name = 'wc'
  description = 'Print newline, word, and byte counts'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, stdin } = options

    // Parse flags
    let countLines = false
    let countWords = false
    let countChars = false
    const files: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        if (arg.includes('l')) countLines = true
        if (arg.includes('w')) countWords = true
        if (arg.includes('c') || arg.includes('m')) countChars = true
      } else {
        files.push(arg)
      }
    }

    // Default to all counts if no flags specified
    if (!countLines && !countWords && !countChars) {
      countLines = true
      countWords = true
      countChars = true
    }

    const outputs: string[] = []
    const errors: string[] = []
    let totalLines = 0
    let totalWords = 0
    let totalChars = 0

    const processContent = (content: string, fileName: string) => {
      const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0)
      const words = content.trim().length > 0 ? content.trim().split(/\s+/).length : 0
      const chars = content.length

      totalLines += lines
      totalWords += words
      totalChars += chars

      const parts: string[] = []
      if (countLines) parts.push(lines.toString().padStart(8))
      if (countWords) parts.push(words.toString().padStart(8))
      if (countChars) parts.push(chars.toString().padStart(8))
      if (fileName) parts.push(` ${fileName}`)

      return parts.join('')
    }

    // If no files and stdin provided, use stdin
    if (files.length === 0 && stdin !== undefined) {
      outputs.push(processContent(stdin, ''))
    } else if (files.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'wc: missing file operand' }
    } else {
      for (const file of files) {
        const filePath = resolvePath(cwd, file)

        try {
          const content = await fs.readFile(filePath, { encoding: 'utf8' })
          const text = typeof content === 'string' ? content : new TextDecoder().decode(content)
          outputs.push(processContent(text, file))
        } catch {
          errors.push(`wc: ${file}: No such file or directory`)
        }
      }

      // Show total if multiple files
      if (files.length > 1 && errors.length < files.length) {
        const parts: string[] = []
        if (countLines) parts.push(totalLines.toString().padStart(8))
        if (countWords) parts.push(totalWords.toString().padStart(8))
        if (countChars) parts.push(totalChars.toString().padStart(8))
        parts.push(' total')
        outputs.push(parts.join(''))
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: outputs.join('\n') + (outputs.length > 0 ? '\n' : ''),
      stderr: errors.join('\n'),
    }
  }
}
