/**
 * Lockfile Loader - Load lockfiles from virtual filesystem
 *
 * Reads package-lock.json or yarn.lock from the project and parses it.
 */

import type { JSRuntimeFS } from '../../fs/types'
import type { ParsedLockfile } from './types'
import { parseLockfile } from './parse'

/**
 * Load and parse a lockfile from the virtual filesystem
 *
 * Tries package-lock.json first, then yarn.lock.
 * Returns null if no lockfile is found.
 *
 * @param fs - Virtual filesystem
 * @param cwd - Project root directory
 */
export async function loadLockfile(
  fs: JSRuntimeFS,
  cwd: string
): Promise<ParsedLockfile | null> {
  // Try package-lock.json first (npm)
  try {
    const content = await fs.readFile(`${cwd}/package-lock.json`, { encoding: 'utf8' })
    const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content)
    const lockfile = parseLockfile(contentStr, 'package-lock.json')
    if (lockfile) {
      console.log('[lockfile] Loaded package-lock.json')
      return lockfile
    }
  } catch {
    // package-lock.json not found or failed to parse
  }

  // Try yarn.lock
  try {
    const content = await fs.readFile(`${cwd}/yarn.lock`, { encoding: 'utf8' })
    const contentStr = typeof content === 'string' ? content : new TextDecoder().decode(content)
    const lockfile = parseLockfile(contentStr, 'yarn.lock')
    if (lockfile) {
      console.log('[lockfile] Loaded yarn.lock')
      return lockfile
    }
  } catch {
    // yarn.lock not found or failed to parse
  }

  console.log('[lockfile] No lockfile found')
  return null
}
