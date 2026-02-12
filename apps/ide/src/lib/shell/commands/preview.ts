import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { countHtmlElements } from '../../preview/static-render'

/**
 * preview - Build project and capture rendered output
 *
 * Triggers an on-demand build, reports errors/warnings,
 * and runs a static render to produce inspectable HTML.
 */
export class PreviewCommand implements ShellCommand {
  name = 'preview'
  description = 'Build project and capture rendered output'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { fs, cwd, preview } = options

    if (!preview) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'preview: not available (no preview context wired)',
      }
    }

    const lines: string[] = []

    // Step 1: Build
    let buildSuccess = false
    try {
      const buildResult = await preview.build()
      buildSuccess = buildResult.success

      if (!buildResult.success) {
        lines.push('# Build FAILED')
        lines.push('')
        if (buildResult.errors && buildResult.errors.length > 0) {
          for (const err of buildResult.errors) {
            const loc = err.file ? ` (${err.file}${err.line ? ':' + err.line : ''})` : ''
            lines.push(`  ❌ ${err.message}${loc}`)
          }
        } else {
          lines.push('  ❌ Unknown build error')
        }
        lines.push('')
      } else {
        lines.push('# Build OK')
        lines.push('')
      }

      if (buildResult.warnings && buildResult.warnings.length > 0) {
        lines.push(`Warnings: ${buildResult.warnings.length}`)
        for (const w of buildResult.warnings) {
          const loc = w.file ? ` (${w.file}${w.line ? ':' + w.line : ''})` : ''
          lines.push(`  ⚠️ ${w.message}${loc}`)
        }
        lines.push('')
      }
    } catch (err) {
      lines.push('# Build ERROR')
      lines.push(`  ${err instanceof Error ? err.message : String(err)}`)
      lines.push('')
      return {
        exitCode: 1,
        stdout: lines.join('\n') + '\n',
        stderr: '',
      }
    }

    // Step 2: Runtime errors
    try {
      const runtimeErrors = preview.getErrors()
      if (runtimeErrors.length > 0) {
        lines.push(`Runtime errors: ${runtimeErrors.length}`)
        for (const e of runtimeErrors) {
          const loc = e.source ? ` (${e.source}${e.lineno ? ':' + e.lineno : ''})` : ''
          lines.push(`  ❌ ${e.message}${loc}`)
        }
        lines.push('')
      }
    } catch {
      // Runtime error collection not available
    }

    // Step 3: Static render (only if build succeeded)
    if (buildSuccess) {
      try {
        const result = await preview.renderStatic()

        if (result.errors.length > 0) {
          lines.push('Static render errors:')
          for (const err of result.errors) {
            lines.push(`  ❌ ${err}`)
          }
          lines.push('')
        }

        if (result.html) {
          const elementSummary = countHtmlElements(result.html)
          if (elementSummary.length > 0) {
            lines.push(`Structure: ${elementSummary}`)
          }

          // Write full HTML to .ralph/output/
          try {
            await fs.mkdir(`${cwd}/.ralph/output`, { recursive: true })
            await fs.writeFile(`${cwd}/.ralph/output/index.html`, result.html, {
              encoding: 'utf8',
            })
            lines.push('Full render written to .ralph/output/index.html')
          } catch {
            lines.push('(could not write render output)')
          }
        } else {
          lines.push('Static render: no output (build may have component errors)')
        }
      } catch {
        lines.push('Static render failed')
      }
    }

    return {
      exitCode: buildSuccess ? 0 : 1,
      stdout: lines.join('\n') + '\n',
      stderr: '',
    }
  }
}
