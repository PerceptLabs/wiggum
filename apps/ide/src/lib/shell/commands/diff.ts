import { diffLines } from 'diff'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * diff - Compare two files line by line
 * Returns exit code 0 if files are identical, 1 if different, 2 on error
 */
export class DiffCommand implements ShellCommand {
  name = 'diff'
  description = 'Compare two files line by line'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Filter out flags (none supported currently, but ignore them)
    const files = args.filter((arg) => !arg.startsWith('-'))

    if (files.length < 2) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: 'diff: need two files\nUsage: diff <file1> <file2>',
      }
    }

    const [file1, file2] = files

    try {
      const path1 = resolvePath(cwd, file1)
      const path2 = resolvePath(cwd, file2)

      const content1 = await fs.readFile(path1, { encoding: 'utf8' })
      const content2 = await fs.readFile(path2, { encoding: 'utf8' })

      const text1 = typeof content1 === 'string' ? content1 : new TextDecoder().decode(content1)
      const text2 = typeof content2 === 'string' ? content2 : new TextDecoder().decode(content2)

      const changes = diffLines(text1, text2)

      // Check if there are any differences
      const hasDiff = changes.some((part) => part.added || part.removed)

      if (!hasDiff) {
        // Files are identical
        return { exitCode: 0, stdout: '', stderr: '' }
      }

      // Format output similar to unified diff
      const output: string[] = []
      output.push(`--- ${file1}`)
      output.push(`+++ ${file2}`)

      for (const part of changes) {
        const prefix = part.added ? '+' : part.removed ? '-' : ' '
        const lines = part.value.split('\n')

        // Don't add prefix to empty trailing line
        for (let i = 0; i < lines.length; i++) {
          if (i === lines.length - 1 && lines[i] === '') continue
          output.push(prefix + lines[i])
        }
      }

      return {
        exitCode: 1, // Files differ
        stdout: output.join('\n') + '\n',
        stderr: '',
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('ENOENT') || message.includes('no such')) {
        // Figure out which file is missing
        try {
          await fs.stat(resolvePath(cwd, file1))
          return { exitCode: 2, stdout: '', stderr: `diff: ${file2}: No such file or directory` }
        } catch {
          return { exitCode: 2, stdout: '', stderr: `diff: ${file1}: No such file or directory` }
        }
      }
      return { exitCode: 2, stdout: '', stderr: `diff: ${message}` }
    }
  }
}
