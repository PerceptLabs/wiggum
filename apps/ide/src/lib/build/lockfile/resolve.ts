/**
 * Lockfile Resolver - Build esm.sh URLs from lockfile data
 *
 * Uses esm.sh unbundled mode (*) and ?deps for transitive dependencies.
 * Reference: https://esm.sh/#docs
 */

import type {
  ParsedLockfile,
  ResolutionRequest,
  ResolutionResult,
  EsmShOptions,
} from './types'
import { resolveFromLockfile, resolveWithContext as resolveWithContextFromLockfile } from './parse'

const ESM_SH_BASE = 'https://esm.sh'

/**
 * Resolve a package using lockfile data (simple, no context)
 * Returns esm.sh URL with pinned versions
 */
export function resolvePackage(
  request: ResolutionRequest,
  lockfile: ParsedLockfile | null,
  options: EsmShOptions = {}
): ResolutionResult {
  const { name, specifier } = request
  const { unbundled = true, target = 'es2022', deps = [], external = [] } = options

  // Try to resolve from lockfile first
  let version = specifier
  let dependencies: Record<string, string> | undefined
  let lockfilePath: string | undefined

  if (lockfile) {
    const resolved = resolveFromLockfile(lockfile, name, specifier)
    if (resolved) {
      version = resolved.version
      dependencies = resolved.dependencies
      lockfilePath = resolved.lockfilePath
    }
  }

  // Build esm.sh URL
  const url = buildEsmShUrl(name, version, {
    unbundled,
    target,
    deps,
    external,
  })

  return {
    name,
    version: version || 'latest',
    url,
    lockfilePath,
    dependencies,
  }
}

/**
 * Resolve a package using Node.js resolution algorithm with context
 * @param name - Package to resolve
 * @param context - Importer's lockfile path (e.g., "node_modules/react-dom") or null for root
 * @param lockfile - Parsed lockfile
 * @param options - esm.sh options
 */
export function resolvePackageWithContext(
  name: string,
  context: string | null,
  lockfile: ParsedLockfile | null,
  options: EsmShOptions = {}
): ResolutionResult {
  const { unbundled = true, target = 'es2022', deps = [], external = [] } = options

  let version: string | undefined
  let dependencies: Record<string, string> | undefined
  let lockfilePath: string | undefined

  if (lockfile) {
    const resolved = resolveWithContextFromLockfile(lockfile, name, context)
    if (resolved) {
      version = resolved.version
      dependencies = resolved.dependencies
      lockfilePath = resolved.lockfilePath
    }
  }

  // Build esm.sh URL
  const url = buildEsmShUrl(name, version, {
    unbundled,
    target,
    deps,
    external,
  })

  return {
    name,
    version: version || 'latest',
    url,
    lockfilePath,
    dependencies,
  }
}

/**
 * Build esm.sh URL with all options
 *
 * URL structure:
 * - Standard: https://esm.sh/react@18.2.0
 * - Unbundled: https://esm.sh/*react@18.2.0 (returns bare module, no deps bundled)
 * - With deps: https://esm.sh/*react@18.2.0?deps=react-dom@18.2.0
 * - With target: https://esm.sh/*react@18.2.0?target=es2022
 */
export function buildEsmShUrl(
  packageName: string,
  version?: string,
  options: EsmShOptions = {}
): string {
  const { unbundled = false, target, deps = [], external = [] } = options

  // Start with base URL
  let url = ESM_SH_BASE

  // Add unbundled prefix (*) if enabled
  if (unbundled) {
    url += '/*'
  } else {
    url += '/'
  }

  // Add package name and version
  url += packageName
  if (version) {
    url += `@${version}`
  }

  // Build query params
  const params: string[] = []

  // Target environment
  if (target) {
    params.push(`target=${target}`)
  }

  // Pin transitive dependencies
  if (deps.length > 0) {
    params.push(`deps=${deps.join(',')}`)
  }

  // Mark packages as external (won't be resolved)
  if (external.length > 0) {
    params.push(`external=${external.join(',')}`)
  }

  // Append query string
  if (params.length > 0) {
    url += `?${params.join('&')}`
  }

  return url
}

/**
 * Build deps string for esm.sh from lockfile dependencies
 * Returns format: "react@18.2.0,react-dom@18.2.0"
 */
export function buildDepsFromLockfile(
  lockfile: ParsedLockfile,
  dependencies: Record<string, string>
): string[] {
  const deps: string[] = []

  for (const [name, specifier] of Object.entries(dependencies)) {
    const resolved = resolveFromLockfile(lockfile, name, specifier)
    if (resolved) {
      deps.push(`${name}@${resolved.version}`)
    }
  }

  return deps
}

/**
 * Resolver class for maintaining state across resolutions
 */
export class LockfileResolver {
  private lockfile: ParsedLockfile | null = null
  private cache = new Map<string, ResolutionResult>()
  private options: EsmShOptions

  constructor(options: EsmShOptions = {}) {
    this.options = {
      unbundled: true,
      target: 'es2022',
      ...options,
    }
  }

  /**
   * Set the lockfile to use for resolution
   */
  setLockfile(lockfile: ParsedLockfile): void {
    this.lockfile = lockfile
    this.cache.clear() // Clear cache when lockfile changes
  }

  /**
   * Resolve a package import (simple, no context)
   */
  resolve(packageName: string, specifier?: string): ResolutionResult {
    const cacheKey = `${packageName}@${specifier || 'latest'}`

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    // Resolve with lockfile
    const result = resolvePackage(
      { name: packageName, specifier },
      this.lockfile,
      this.options
    )

    // Cache result
    this.cache.set(cacheKey, result)

    return result
  }

  /**
   * Resolve a package import with context (Node.js resolution algorithm)
   * @param packageName - Package to resolve
   * @param context - Importer's lockfile path (e.g., "node_modules/react-dom") or null for root
   */
  resolveWithContext(packageName: string, context: string | null): ResolutionResult {
    // Include context in cache key for proper nested resolution
    const cacheKey = `${packageName}@ctx:${context || 'root'}`

    // Check cache
    const cached = this.cache.get(cacheKey)
    if (cached) return cached

    // Resolve with context
    const result = resolvePackageWithContext(
      packageName,
      context,
      this.lockfile,
      this.options
    )

    // Cache result
    this.cache.set(cacheKey, result)

    return result
  }

  /**
   * Get URL for a package import
   */
  getUrl(packageName: string, specifier?: string): string {
    return this.resolve(packageName, specifier).url
  }

  /**
   * Build ?deps param for a package's dependencies
   */
  getDepsParam(packageName: string): string[] {
    if (!this.lockfile) return []

    const result = this.resolve(packageName)
    if (!result.dependencies) return []

    return buildDepsFromLockfile(this.lockfile, result.dependencies)
  }

  /**
   * Check if lockfile is loaded
   */
  hasLockfile(): boolean {
    return this.lockfile !== null
  }

  /**
   * Get all resolved packages for debugging
   */
  getResolved(): Map<string, ResolutionResult> {
    return new Map(this.cache)
  }
}

/**
 * Create a default resolver instance
 */
export function createResolver(options?: EsmShOptions): LockfileResolver {
  return new LockfileResolver(options)
}
