import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

/**
 * rm - Remove files and directories
 * Supports -r (recursive), -f (force)
 */
export class RmCommand implements ShellCommand {
  name = 'rm'
  description = 'Remove files or directories'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse flags
    let recursive = false
    let force = false
    const targets: string[] = []

    for (const arg of args) {
      if (arg.startsWith('-') && arg.length > 1) {
        if (arg.includes('r') || arg.includes('R')) recursive = true
        if (arg.includes('f')) force = true
      } else if (arg === '--recursive') {
        recursive = true
      } else if (arg === '--force') {
        force = true
      } else {
        targets.push(arg)
      }
    }

    if (targets.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'rm: missing operand' }
    }

    const errors: string[] = []

    for (const target of targets) {
      const targetPath = resolvePath(cwd, target)

      try {
        const stat = await fs.stat(targetPath)

        if (stat.isDirectory()) {
          if (!recursive) {
            errors.push(`rm: cannot remove '${target}': Is a directory`)
          } else {
            await removeRecursive(fs, targetPath)
          }
        } else {
          await fs.unlink(targetPath)
        }
      } catch (err) {
        if (!force) {
          errors.push(`rm: cannot remove '${target}': No such file or directory`)
        }
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: '',
      stderr: errors.join('\n'),
    }
  }
}

async function removeRecursive(fs: ShellOptions['fs'], dirPath: string): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries as { name: string; type: string }[]) {
    const entryPath = `${dirPath}/${entry.name}`

    if (entry.type === 'dir') {
      await removeRecursive(fs, entryPath)
    } else {
      await fs.unlink(entryPath)
    }
  }

  await fs.rmdir(dirPath)
}
