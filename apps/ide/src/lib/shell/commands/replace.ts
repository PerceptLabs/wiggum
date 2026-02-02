import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * replace - Replace all occurrences of a string in a file
 * Usage: replace <file> "<old>" "<new>"
 */
export class ReplaceCommand implements ShellCommand {
  name = 'replace'
  description = 'Replace all occurrences of a string in a file'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    if (args.length < 3) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: 'Usage: replace <file> "<old>" "<new>"\nExample: replace src/App.tsx "oldText" "newText"',
      }
    }

    const [file, oldStr, newStr] = args
    const filePath = resolvePath(cwd, file)

    // Security: must be within cwd
    if (!filePath.startsWith(cwd)) {
      return { exitCode: 1, stdout: '', stderr: 'replace: cannot access paths outside project' }
    }

    try {
      const content = await fs.readFile(filePath, { encoding: 'utf8' })
      const text = typeof content === 'string' ? content : new TextDecoder().decode(content)

      // Count occurrences
      const escapedOld = escapeRegex(oldStr)
      const regex = new RegExp(escapedOld, 'g')
      const matches = text.match(regex)
      const count = matches ? matches.length : 0

      if (count === 0) {
        return { exitCode: 1, stdout: '', stderr: `replace: "${oldStr}" not found in ${file}` }
      }

      // Replace all occurrences
      const newContent = text.split(oldStr).join(newStr)
      await fs.writeFile(filePath, newContent)

      return {
        exitCode: 0,
        stdout: `Replaced ${count} occurrence${count > 1 ? 's' : ''} in ${file}`,
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
