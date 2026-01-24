import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { resolvePath } from './utils'

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

    for (const source of sources) {
      const sourcePath = resolvePath(cwd, source)
      const finalDest = destIsDir ? `${destPath}/${getBasename(source)}` : destPath

      try {
        const stat = await fs.stat(sourcePath)

        if (stat.isDirectory()) {
          if (!recursive) {
            errors.push(`cp: -r not specified; omitting directory '${source}'`)
          } else {
            await copyRecursive(fs, sourcePath, finalDest)
          }
        } else {
          const content = await fs.readFile(sourcePath)
          await fs.writeFile(finalDest, content)
        }
      } catch (err) {
        errors.push(`cp: cannot stat '${source}': No such file or directory`)
      }
    }

    return {
      exitCode: errors.length > 0 ? 1 : 0,
      stdout: '',
      stderr: errors.join('\n'),
    }
  }
}

async function copyRecursive(fs: ShellOptions['fs'], sourcePath: string, destPath: string): Promise<void> {
  await fs.mkdir(destPath, { recursive: true })

  const entries = await fs.readdir(sourcePath, { withFileTypes: true })

  for (const entry of entries as { name: string; type: string }[]) {
    const srcEntry = `${sourcePath}/${entry.name}`
    const destEntry = `${destPath}/${entry.name}`

    if (entry.type === 'dir') {
      await copyRecursive(fs, srcEntry, destEntry)
    } else {
      const content = await fs.readFile(srcEntry)
      await fs.writeFile(destEntry, content)
    }
  }
}

function getBasename(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || parts[parts.length - 2] || path
}
