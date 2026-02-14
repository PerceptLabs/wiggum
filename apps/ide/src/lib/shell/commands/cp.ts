import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { validateFileWrite, formatValidationError } from '../write-guard'
import { resolvePath, basename } from './utils'

/**
 * cp - Copy files
 * Supports -r (recursive)
 */
export class CpCommand implements ShellCommand {
  name = 'cp'
  description = 'Copy files and directories'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options

    // Parse flags
    let recursive = false
    const paths: string[] = []

    for (const arg of args) {
      if (arg === '-r' || arg === '-R' || arg === '--recursive') {
        recursive = true
      } else if (!arg.startsWith('-')) {
        paths.push(arg)
      }
    }

    if (paths.length < 2) {
      return { exitCode: 1, stdout: '', stderr: 'cp: missing destination file operand' }
    }

    const dest = paths.pop()!
    const sources = paths

    const errors: string[] = []

    // Check if destination is a directory
    let destIsDir = false
    let destPath = resolvePath(cwd, dest)

    try {
      const destStat = await fs.stat(destPath)
      destIsDir = destStat.isDirectory()
    } catch {
      // Destination doesn't exist
    }

    // If multiple sources, destination must be a directory
    if (sources.length > 1 && !destIsDir) {
      return { exitCode: 1, stdout: '', stderr: `cp: target '${dest}' is not a directory` }
    }

    const changedPaths: string[] = []

    for (const source of sources) {
      const sourcePath = resolvePath(cwd, source)
      const finalDest = destIsDir ? `${destPath}/${basename(source)}` : destPath

      const validation = validateFileWrite(finalDest, cwd)
      if (!validation.allowed) {
        errors.push(formatValidationError(validation, dest))
        continue
      }

      try {
        const stat = await fs.stat(sourcePath)

        if (stat.isDirectory()) {
          if (!recursive) {
            errors.push(`cp: -r not specified; omitting directory '${source}'`)
          } else {
            const copied = await copyRecursive(fs, sourcePath, finalDest, cwd)
            changedPaths.push(...copied)
          }
        } else {
          const content = await fs.readFile(sourcePath)
          await fs.writeFile(finalDest, content)
          changedPaths.push(finalDest)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`cp: cannot stat '${source}': ${msg}`)
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: '',
      stderr: errors.join('\n'),
      filesChanged: changedPaths.length > 0 ? changedPaths : undefined,
    }
  }
}

async function copyRecursive(fs: ShellOptions['fs'], sourcePath: string, destPath: string, cwd: string): Promise<string[]> {
  const copied: string[] = []
  await fs.mkdir(destPath, { recursive: true })

  const entries = await fs.readdir(sourcePath, { withFileTypes: true })

  for (const entry of entries as { name: string; type: string }[]) {
    const srcEntry = `${sourcePath}/${entry.name}`
    const destEntry = `${destPath}/${entry.name}`

    if (entry.type === 'dir') {
      const subCopied = await copyRecursive(fs, srcEntry, destEntry, cwd)
      copied.push(...subCopied)
    } else {
      const validation = validateFileWrite(destEntry, cwd)
      if (!validation.allowed) continue

      const content = await fs.readFile(srcEntry)
      await fs.writeFile(destEntry, content)
      copied.push(destEntry)
    }
  }
  return copied
}

