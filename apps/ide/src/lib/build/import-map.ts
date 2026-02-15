/**
 * Import Map Generation
 *
 * Generates browser-native import maps from lockfile data so the preview
 * iframe can resolve npm dependencies directly without esbuild processing.
 *
 * URL format: Standard esm.sh mode (no unbundled `/*` prefix, no `?target=`)
 * because the browser needs self-contained ESM bundles.
 */

import type { ParsedLockfile } from './lockfile/types'
import { buildEsmShUrl } from './lockfile/resolve'
import { resolveFromLockfile } from './lockfile/parse'

export interface ImportMap {
  imports: Record<string, string>
}

/**
 * Packages that should NOT be externalized — they're handled by
 * dedicated esbuild plugins (wiggumStackPlugin, fsPlugin).
 */
const SKIP_PACKAGES = new Set(['@wiggum/stack'])

/**
 * Generate an import map from a parsed lockfile.
 * Each root dependency gets a main entry + trailing-slash prefix for subpath imports.
 *
 * Example output:
 *   "react": "https://esm.sh/react@19.2.0"
 *   "react/": "https://esm.sh/react@19.2.0/"
 */
export function generateImportMap(lockfile: ParsedLockfile): ImportMap {
  const imports: Record<string, string> = {}

  for (const [name, specifier] of Object.entries(lockfile.rootDependencies)) {
    if (SKIP_PACKAGES.has(name)) continue

    // Resolve pinned version from lockfile
    const resolved = resolveFromLockfile(lockfile, name, specifier)
    const version = resolved?.version ?? specifier.replace(/^[\^~>=<]/, '')

    // Standard mode URL (no unbundled prefix, no target)
    const url = buildEsmShUrl(name, version, { unbundled: false })

    // Main entry
    imports[name] = url
    // Trailing-slash prefix for subpath imports (e.g., react-dom/client)
    imports[name + '/'] = url + '/'
  }

  return { imports }
}

/**
 * Generate the esbuild `external` list from lockfile dependencies.
 * Includes glob patterns for subpath imports (e.g., `react-dom/*`).
 */
export function generateExternals(lockfile: ParsedLockfile): string[] {
  const externals: string[] = []

  for (const name of Object.keys(lockfile.rootDependencies)) {
    if (SKIP_PACKAGES.has(name)) continue
    externals.push(name, `${name}/*`)
  }

  return externals
}

/**
 * Serialize an import map as an HTML `<script type="importmap">` tag.
 */
export function serializeImportMap(importMap: ImportMap): string {
  return `<script type="importmap">\n${JSON.stringify(importMap, null, 2)}\n</script>`
}
