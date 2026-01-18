import path from 'path-browserify'
import type { JSRuntimeFS, DirectoryEntry } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface CpOptions {
  recursive: boolean
}

function parseOptions(args: string[]): { options: CpOptions; paths: string[] } {
  const options: CpOptions = { recursive: false }
  const paths: string[] = []

  for (const arg of args) {
    if (arg === '-r' || arg === '-R' || arg === '--recursive') {
      options.recursive = true
    } else if (arg.startsWith('-')) {
      // Ignore unknown options
    } else {
      paths.push(arg)
    }
  }

  return { options, paths }
}

/**
 * cp - copy files and directories
 */
export class CpCommand implements ShellCommand {
  name = 'cp'
  description = 'Copy files and directories'
  usage = 'cp [-r] <source> <destination>'

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)

    if (paths.length < 2) {
      return createErrorResult('cp: missing destination file operand')
    }

    const sources = paths.slice(0, -1)
    const dest = paths[paths.length - 1]
    const destPath = path.isAbsolute(dest) ? dest : path.join(cwd, dest)

    // Check if destination is a directory
    let destIsDir = false
    try {
      const destStat = await this.fs.stat(destPath)
      destIsDir = destStat.isDirectory()
    } catch {
      // Destination doesn't exist
    }

    // Multiple sources require dest to be a directory
    if (sources.length > 1 && !destIsDir) {
      return createErrorResult(`cp: target '${dest}' is not a directory`)
    }

    for (const source of sources) {
      const srcPath = path.isAbsolute(source) ? source : path.join(cwd, source)

      try {
        const srcStat = await this.fs.stat(srcPath)

        if (srcStat.isDirectory()) {
          if (!options.recursive) {
            return createErrorResult(`cp: -r not specified; omitting directory '${source}'`)
          }

          const targetDir = destIsDir ? path.join(destPath, path.basename(srcPath)) : destPath
          await this.copyDir(srcPath, targetDir)
        } else {
          const targetFile = destIsDir ? path.join(destPath, path.basename(srcPath)) : destPath
          await this.copyFile(srcPath, targetFile)
        }
      } catch {
        return createErrorResult(`cp: cannot stat '${source}': No such file or directory`)
      }
    }

    return createSuccessResult('')
  }

  private async copyFile(src: string, dest: string): Promise<void> {
    const content = await this.fs.readFile(src)
    await this.fs.writeFile(dest, content as Uint8Array)
  }

  private async copyDir(src: string, dest: string): Promise<void> {
    await this.fs.mkdir(dest, { recursive: true })

    const entries = (await this.fs.readdir(src, { withFileTypes: true })) as DirectoryEntry[]

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.type === 'dir') {
        await this.copyDir(srcPath, destPath)
      } else {
        await this.copyFile(srcPath, destPath)
      }
    }
  }
}
