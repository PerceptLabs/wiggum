/**
 * Lockfile Parser - Parse npm and yarn lockfiles
 *
 * Extracts dependency information from lockfiles for version pinning.
 */

import type {
  ParsedLockfile,
  ResolvedPackage,
  NpmLockfile,
  NpmPackageEntry,
} from './types'

/**
 * Parse a lockfile string and return structured data
 */
export function parseLockfile(content: string, filename: string): ParsedLockfile | null {
  if (filename === 'package-lock.json') {
    return parseNpmLockfile(content)
  }

  if (filename === 'yarn.lock') {
    return parseYarnLockfile(content)
  }

  if (filename === 'pnpm-lock.yaml') {
    // PNPM support is more complex - not implemented yet
    return null
  }

  return null
}

/**
 * Parse npm package-lock.json (v3 format)
 */
function parseNpmLockfile(content: string): ParsedLockfile | null {
  try {
    const lockfile = JSON.parse(content) as NpmLockfile

    // Only support lockfileVersion 3 for now
    if (lockfile.lockfileVersion !== 3) {
      console.warn('[lockfile] Unsupported npm lockfile version:', lockfile.lockfileVersion)
      return null
    }

    const packages = new Map<string, ResolvedPackage>()
    const rootDependencies: Record<string, string> = {}

    // Parse packages map
    for (const [path, entry] of Object.entries(lockfile.packages)) {
      // Root package is ""
      if (path === '') {
        // Extract root dependencies
        if (entry.dependencies) {
          Object.assign(rootDependencies, entry.dependencies)
        }
        continue
      }

      // Parse node_modules paths like "node_modules/react"
      const name = extractPackageName(path)
      if (!name || !entry.version) continue

      const resolved: ResolvedPackage = {
        name,
        version: entry.version,
        lockfilePath: path, // e.g., "node_modules/react" or "node_modules/foo/node_modules/react"
        resolved: entry.resolved,
        integrity: entry.integrity,
        dependencies: entry.dependencies,
        peerDependencies: entry.peerDependencies,
        optionalDependencies: entry.optionalDependencies,
      }

      // Index by path for context-aware resolution (nested deps)
      packages.set(path, resolved)
      // Also key by name@version for simple lookup
      packages.set(`${name}@${entry.version}`, resolved)
    }

    return {
      type: 'npm',
      version: 3,
      packages,
      rootDependencies,
    }
  } catch (err) {
    console.error('[lockfile] Failed to parse npm lockfile:', err)
    return null
  }
}

/**
 * Parse yarn.lock (v1 format)
 */
function parseYarnLockfile(content: string): ParsedLockfile | null {
  try {
    const packages = new Map<string, ResolvedPackage>()
    const rootDependencies: Record<string, string> = {}

    // Simple YAML-like parsing for yarn.lock v1
    // Format:
    // "package@^version", "package@^other":
    //   version "1.2.3"
    //   resolved "https://..."
    //   integrity sha512-...
    //   dependencies:
    //     dep-a "^1.0.0"

    const entries = parseYarnLockEntries(content)

    for (const { descriptors, data } of entries) {
      if (!data.version) continue

      // Extract package name from first descriptor
      const name = extractPackageNameFromDescriptor(descriptors[0])
      if (!name) continue

      const resolved: ResolvedPackage = {
        name,
        version: data.version,
        resolved: data.resolved,
        integrity: data.integrity,
        dependencies: data.dependencies,
      }

      packages.set(`${name}@${data.version}`, resolved)

      // Also register by descriptor for lookup
      for (const desc of descriptors) {
        packages.set(desc, resolved)
      }
    }

    return {
      type: 'yarn',
      version: 1,
      packages,
      rootDependencies,
    }
  } catch (err) {
    console.error('[lockfile] Failed to parse yarn lockfile:', err)
    return null
  }
}

/**
 * Extract package name from node_modules path
 * "node_modules/react" -> "react"
 * "node_modules/@types/react" -> "@types/react"
 */
function extractPackageName(path: string): string | null {
  const match = path.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/)
  return match ? match[1] : null
}

/**
 * Extract package name from yarn descriptor
 * "react@^18.0.0" -> "react"
 * "@types/react@^18.0.0" -> "@types/react"
 */
function extractPackageNameFromDescriptor(descriptor: string): string | null {
  // Handle scoped packages
  if (descriptor.startsWith('@')) {
    const match = descriptor.match(/^(@[^@]+)@/)
    return match ? match[1] : null
  }

  // Regular packages
  const atIndex = descriptor.indexOf('@')
  return atIndex > 0 ? descriptor.slice(0, atIndex) : descriptor
}

/**
 * Parse yarn.lock v1 entries
 * Returns array of { descriptors, data } where descriptors are package specifiers
 */
interface YarnEntry {
  descriptors: string[]
  data: {
    version?: string
    resolved?: string
    integrity?: string
    dependencies?: Record<string, string>
  }
}

function parseYarnLockEntries(content: string): YarnEntry[] {
  const entries: YarnEntry[] = []
  const lines = content.split('\n')

  let currentDescriptors: string[] = []
  let currentData: YarnEntry['data'] = {}
  let inDependencies = false

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.startsWith('#') || line.trim() === '') {
      continue
    }

    // New entry starts with no indentation and ends with :
    if (!line.startsWith(' ') && line.endsWith(':')) {
      // Save previous entry
      if (currentDescriptors.length > 0) {
        entries.push({ descriptors: currentDescriptors, data: currentData })
      }

      // Parse new descriptors (comma-separated, quoted)
      currentDescriptors = line
        .slice(0, -1) // Remove trailing :
        .split(',')
        .map((d) => d.trim().replace(/^"|"$/g, ''))

      currentData = {}
      inDependencies = false
      continue
    }

    // Indented lines are data
    const trimmed = line.trim()

    if (trimmed === 'dependencies:') {
      inDependencies = true
      currentData.dependencies = {}
      continue
    }

    if (inDependencies && currentData.dependencies) {
      // Parse dependency line: dep-name "^1.0.0"
      const depMatch = trimmed.match(/^([^\s]+)\s+"([^"]+)"/)
      if (depMatch) {
        currentData.dependencies[depMatch[1]] = depMatch[2]
      }
      continue
    }

    // Parse key-value: key "value"
    const kvMatch = trimmed.match(/^(\w+)\s+"([^"]+)"/)
    if (kvMatch) {
      const [, key, value] = kvMatch
      if (key === 'version') currentData.version = value
      if (key === 'resolved') currentData.resolved = value
      if (key === 'integrity') currentData.integrity = value
      inDependencies = false
    }
  }

  // Save last entry
  if (currentDescriptors.length > 0) {
    entries.push({ descriptors: currentDescriptors, data: currentData })
  }

  return entries
}

/**
 * Get resolved version for a package from lockfile (simple lookup)
 */
export function resolveFromLockfile(
  lockfile: ParsedLockfile,
  packageName: string,
  specifier?: string
): ResolvedPackage | null {
  // Try exact match first
  if (specifier) {
    const exact = lockfile.packages.get(`${packageName}@${specifier}`)
    if (exact) return exact
  }

  // Try finding by name (return first match)
  for (const [, pkg] of lockfile.packages) {
    if (pkg.name === packageName) {
      return pkg
    }
  }

  return null
}

/**
 * Resolve a package using Node.js resolution algorithm with context
 *
 * Walks up from the importer's location looking for node_modules/{name}.
 * This handles nested dependencies correctly.
 *
 * @param lockfile - Parsed lockfile
 * @param packageName - Package to resolve (e.g., "react")
 * @param context - Importer's lockfile path (e.g., "node_modules/react-dom") or null for root
 */
export function resolveWithContext(
  lockfile: ParsedLockfile,
  packageName: string,
  context: string | null
): ResolvedPackage | null {
  // If no context, resolve from root
  if (!context) {
    const rootPath = `node_modules/${packageName}`
    const resolved = lockfile.packages.get(rootPath)
    if (resolved) return resolved

    // Fallback to simple lookup
    return resolveFromLockfile(lockfile, packageName)
  }

  // Walk up from context looking for the package
  // e.g., context = "node_modules/foo/node_modules/bar"
  // Try: node_modules/foo/node_modules/bar/node_modules/{name}
  // Then: node_modules/foo/node_modules/{name}
  // Then: node_modules/{name}

  let currentPath = context

  while (currentPath) {
    // Try nested path
    const nestedPath = `${currentPath}/node_modules/${packageName}`
    const nested = lockfile.packages.get(nestedPath)
    if (nested) return nested

    // Move up one level
    // "node_modules/foo/node_modules/bar" -> "node_modules/foo"
    const lastNodeModules = currentPath.lastIndexOf('/node_modules/')
    if (lastNodeModules === -1) {
      // At root level, try root
      break
    }
    currentPath = currentPath.substring(0, lastNodeModules)
  }

  // Try root level
  const rootPath = `node_modules/${packageName}`
  const rootResolved = lockfile.packages.get(rootPath)
  if (rootResolved) return rootResolved

  // Fallback to simple lookup
  return resolveFromLockfile(lockfile, packageName)
}
