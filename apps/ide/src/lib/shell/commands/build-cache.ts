import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import { listBuildCache, clearBuildCache } from '../../build/build-cache'

/**
 * build-cache - Manage the content-hash build cache
 *
 * Subcommands:
 *   build-cache status — Show cache entry count
 *   build-cache list   — List cached builds with hash + timestamp
 *   build-cache clear  — Clear all cached builds
 */
export class BuildCacheCommand implements ShellCommand {
  name = 'build-cache'
  description = `Manage build output cache. Subcommands:
  build-cache status  - Show cache entry count
  build-cache list    - List cached builds
  build-cache clear   - Clear build cache`

  async execute(args: string[], _options: ShellOptions): Promise<ShellResult> {
    const sub = args[0]?.toLowerCase()

    if (!sub || sub === 'status') {
      return this.status()
    }
    if (sub === 'list') {
      return this.list()
    }
    if (sub === 'clear') {
      return this.clear()
    }

    return {
      exitCode: 1,
      stdout: '',
      stderr: `build-cache: unknown subcommand "${sub}". Use: status, list, clear`,
    }
  }

  private async status(): Promise<ShellResult> {
    const entries = await listBuildCache()
    const lines = ['Build Cache Status:', '']
    lines.push(`  Entries: ${entries.length} / 10 (max)`)

    if (entries.length > 0) {
      const newest = entries[0]
      lines.push(`  Most recent: ${new Date(newest.timestamp).toLocaleString()}`)
      lines.push(`  Hash: ${newest.hash.slice(0, 16)}...`)
    }

    return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
  }

  private async list(): Promise<ShellResult> {
    const entries = await listBuildCache()

    if (entries.length === 0) {
      return { exitCode: 0, stdout: 'Build cache is empty.\n', stderr: '' }
    }

    const lines = ['Cached Builds:', '']
    for (const entry of entries) {
      const date = new Date(entry.timestamp).toLocaleString()
      lines.push(`  ${entry.hash.slice(0, 16)}  ${date}`)
    }

    return { exitCode: 0, stdout: lines.join('\n') + '\n', stderr: '' }
  }

  private async clear(): Promise<ShellResult> {
    const count = await clearBuildCache()
    if (count > 0) {
      return { exitCode: 0, stdout: `Cleared ${count} cached build${count > 1 ? 's' : ''}.\n`, stderr: '' }
    }
    return { exitCode: 0, stdout: 'Build cache was already empty.\n', stderr: '' }
  }
}
