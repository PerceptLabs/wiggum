import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import {
  MODULE_BUNDLES,
  PREWARM_PROFILES,
  ESM_CACHE_NAME,
  getCacheStatus,
  prewarmBundle,
  prewarmProfile,
} from '../../module-prewarmer'

/**
 * modules - Manage ESM module cache
 *
 * Subcommands:
 *   modules list           — List all bundles and their packages
 *   modules status [bundle] — Show cache status per bundle
 *   modules warm <name>    — Prewarm a profile or bundle
 *   modules clear          — Clear the ESM module cache
 */
export class ModulesCommand implements ShellCommand {
  name = 'modules'
  description = `Manage ESM module cache. Subcommands:
  modules list            - List all bundles and packages
  modules status [bundle] - Show cache status
  modules warm <name>     - Prewarm a profile or bundle
  modules clear           - Clear ESM module cache`

  async execute(args: string[], _options: ShellOptions): Promise<ShellResult> {
    const sub = args[0]?.toLowerCase()

    if (!sub || sub === 'list') {
      return this.list()
    }
    if (sub === 'status') {
      return this.status(args[1])
    }
    if (sub === 'warm') {
      return this.warm(args[1])
    }
    if (sub === 'clear') {
      return this.clear()
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: `modules: unknown subcommand "${sub}". Use: list, status, warm, clear`,
    }
  }

  private list(): ShellResult {
    const lines: string[] = ['ESM Module Bundles:', '']

    for (const [name, urls] of Object.entries(MODULE_BUNDLES)) {
      lines.push(`  ${name} (${urls.length} packages):`)
      for (const url of urls) {
        // Extract package name from URL: https://esm.sh/*react@19.2.0?target=es2022 → react@19.2.0
        const match = url.match(/esm\.sh\/\*?(.+?)(\?|$)/)
        const pkg = match ? match[1] : url
        lines.push(`    ${pkg}`)
      }
      lines.push('')
    }

    lines.push('Profiles:')
    for (const [name, bundles] of Object.entries(PREWARM_PROFILES)) {
      lines.push(`  ${name}: ${bundles.join(', ')}`)
    }

    return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
  }

  private async status(bundle?: string): Promise<ShellResult> {
    const status = await getCacheStatus()
    const lines: string[] = ['ESM Module Cache Status:', '']

    if (bundle) {
      if (!(bundle in MODULE_BUNDLES)) {
        return {
          exitCode: 1,
          stdout: '',
          stderr: `modules status: unknown bundle "${bundle}". Available: ${Object.keys(MODULE_BUNDLES).join(', ')}`,
        }
      }
      const cached = status[bundle] ? 'cached' : 'not cached'
      lines.push(`  ${bundle}: ${cached}`)
      lines.push('')
      lines.push('  URLs:')
      for (const url of MODULE_BUNDLES[bundle]) {
        lines.push(`    ${url}`)
      }
    } else {
      for (const [name, cached] of Object.entries(status)) {
        const icon = cached ? '+' : '-'
        const label = cached ? 'cached' : 'not cached'
        lines.push(`  [${icon}] ${name}: ${label} (${MODULE_BUNDLES[name].length} packages)`)
      }
    }

    return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
  }

  private warm(name?: string): ShellResult {
    if (!name) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'modules warm: specify a profile or bundle name. Available profiles: ' +
          Object.keys(PREWARM_PROFILES).join(', ') +
          '. Available bundles: ' +
          Object.keys(MODULE_BUNDLES).join(', '),
      }
    }

    if (name in PREWARM_PROFILES) {
      prewarmProfile(name)
      return {
        exitCode: 0,
        stdout: `Warming profile "${name}" (${PREWARM_PROFILES[name].join(', ')}) in background...\n`,
        stderr: '',
      }
    }

    if (name in MODULE_BUNDLES) {
      prewarmBundle(name)
      return {
        exitCode: 0,
        stdout: `Warming bundle "${name}" (${MODULE_BUNDLES[name].length} packages) in background...\n`,
        stderr: '',
      }
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: `modules warm: unknown profile/bundle "${name}". Available profiles: ` +
        Object.keys(PREWARM_PROFILES).join(', ') +
        '. Available bundles: ' +
        Object.keys(MODULE_BUNDLES).join(', '),
    }
  }

  private async clear(): Promise<ShellResult> {
    if (typeof caches === 'undefined') {
      return { exitCode: 1, stdout: '', stderr: 'modules clear: Cache API not available' }
    }

    try {
      const deleted = await caches.delete(ESM_CACHE_NAME)
      if (deleted) {
        return { exitCode: 0, stdout: 'ESM module cache cleared.\n', stderr: '' }
      }
      return { exitCode: 0, stdout: 'ESM module cache was already empty.\n', stderr: '' }
    } catch (err) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: `modules clear: failed — ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }
}
