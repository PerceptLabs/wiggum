import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { buildProject } from '../../build/index'

/**
 * build - Compile project without preview pipeline
 *
 * Quick compile check: runs esbuild only, reports success/failure.
 * Does NOT trigger preview, DOM capture, snapshot, or gate evaluation.
 */
export class BuildCommand implements ShellCommand {
  name = 'build'
  description = 'Compile project (build-only, no preview)'

  async execute(_args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd } = options
    const lines: string[] = []

    try {
      const result = await buildProject(fs, cwd)

      if (!result.success) {
        lines.push('# Build FAILED')
        lines.push('')
        for (const err of result.errors ?? []) {
          const loc = err.file ? ` (${err.file}${err.line ? ':' + err.line : ''})` : ''
          lines.push(`  ${err.message}${loc}`)
          if (err.snippet) lines.push(`     ${err.snippet}`)
        }
        return { exitCode: 1, stdout: lines.join('\n') + '\n', stderr: '' }
      }

      lines.push('Build succeeded.')
      if (result.warnings?.length) {
        lines.push(`Warnings: ${result.warnings.length}`)
        for (const w of result.warnings) {
          const loc = w.file ? ` (${w.file}${w.line ? ':' + w.line : ''})` : ''
          lines.push(`  ${w.message}${loc}`)
        }
      }
      return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
    } catch (err) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `build: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}
