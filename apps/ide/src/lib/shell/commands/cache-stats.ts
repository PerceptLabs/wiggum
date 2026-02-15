import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * cache-stats - Show Cache Storage statistics
 *
 * Lists all caches, entry counts, and overall storage usage.
 */
export class CacheStatsCommand implements ShellCommand {
  name = 'cache-stats'
  description = 'Show Cache Storage statistics (caches, entry counts, storage usage)'

  async execute(_args: string[], _options: ShellOptions): Promise<ShellResult> {
    if (typeof caches === 'undefined') {
      return { exitCode: 1, stdout: '', stderr: 'cache-stats: Cache API not available' }
    }

    const lines: string[] = ['Cache Storage:', '']

    try {
      const names = await caches.keys()

      if (names.length === 0) {
        lines.push('  (no caches)')
      } else {
        // Measure entry count per cache
        for (const name of names.sort()) {
          try {
            const cache = await caches.open(name)
            const keys = await cache.keys()
            const padded = name.padEnd(30)
            lines.push(`  ${padded} ${keys.length} entries`)
          } catch {
            lines.push(`  ${name.padEnd(30)} (error reading)`)
          }
        }
      }
    } catch (err) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `cache-stats: failed to read caches — ${err instanceof Error ? err.message : String(err)}`,
      }
    }

    // Storage estimate
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        const used = formatBytes(estimate.usage ?? 0)
        const quota = formatBytes(estimate.quota ?? 0)
        lines.push('')
        lines.push(`Storage: ${used} used / ${quota} available`)
      } catch {
        // Storage estimate not available — skip
      }
    }

    return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(1)} ${units[i]}`
}
