import { z } from 'zod'
import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { extractBuildMeta, generateSnapshot } from '../../preview/snapshot'

// ============================================================================
// SCHEMA (Toolkit 2.0 dual-mode)
// ============================================================================

const PreviewArgsSchema = z.object({
  action: z.enum(['build']).default('build').describe('Preview action'),
})

type PreviewArgs = z.infer<typeof PreviewArgsSchema>

// ============================================================================
// COMMAND
// ============================================================================

export class PreviewCommand implements ShellCommand<PreviewArgs> {
  name = 'preview'
  description = 'Build project and capture rendered output'

  argsSchema = PreviewArgsSchema

  examples = [
    'preview',
    'preview build',
  ]

  parseCliArgs(args: string[]): unknown {
    return { action: args[0] ?? 'build' }
  }

  async execute(args: PreviewArgs, options: ShellOptions): Promise<ShellResult> {
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
    let buildMetafile: Record<string, unknown> | undefined
    try {
      const buildResult = await preview.build()
      buildSuccess = buildResult.success
      buildMetafile = buildResult.metafile

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

    // Step 3: Layered snapshot
    if (buildSuccess) {
      try {
        // Extract build metadata from esbuild metafile (captured in Step 1)
        const buildMeta = extractBuildMeta(
          buildMetafile as Parameters<typeof extractBuildMeta>[0]
        )

        // Probe iframe (Layer 3 — optional, graceful degradation)
        let probeResult = undefined
        if (preview.probeIframe) {
          try {
            probeResult = await preview.probeIframe()
          } catch {
            // Probe unavailable (preview tab not open, timeout) — Layer 3 skipped
          }
        }

        // Generate snapshot report
        const snapshot = await generateSnapshot(fs, cwd, buildMeta, probeResult)

        // Write report to disk
        await fs.mkdir(`${cwd}/.ralph/snapshot`, { recursive: true }).catch(() => {})
        await fs.writeFile(`${cwd}/.ralph/snapshot/ui-report.md`, snapshot.report, { encoding: 'utf8' })

        // Report layer status
        const layerStatus = [
          snapshot.layers.theme ? '✓ Theme' : '✗ Theme',
          snapshot.layers.structure ? '✓ Structure' : '✗ Structure',
          snapshot.layers.render ? '✓ Render' : '✗ Render',
        ].join('  ')
        lines.push(`Snapshot: ${layerStatus}`)
        lines.push(`Written to .ralph/snapshot/ui-report.md`)
      } catch (err) {
        lines.push(`Snapshot: failed — ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return {
      exitCode: buildSuccess ? 0 : 1,
      stdout: lines.join('\n') + '\n',
      stderr: '',
      filesChanged: buildSuccess ? [`${cwd}/.ralph/snapshot/ui-report.md`] : undefined,
    }
  }
}
