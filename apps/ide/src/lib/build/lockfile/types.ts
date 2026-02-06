/**
 * Lockfile Types - Interfaces for package dependency resolution
 *
 * Supports npm (package-lock.json) and yarn (yarn.lock) lockfile formats.
 * Used to pin exact dependency versions for reproducible builds.
 */

/**
 * Resolved package information from a lockfile
 */
export interface ResolvedPackage {
  /** Package name */
  name: string
  /** Exact version (e.g., "18.2.0") */
  version: string
  /** Lockfile path (e.g., "node_modules/react" or "node_modules/foo/node_modules/react") */
  lockfilePath?: string
  /** Resolved URL (where to fetch from) */
  resolved?: string
  /** Integrity hash for verification */
  integrity?: string
  /** Direct dependencies of this package */
  dependencies?: Record<string, string>
  /** Peer dependencies (not automatically installed) */
  peerDependencies?: Record<string, string>
  /** Optional dependencies */
  optionalDependencies?: Record<string, string>
}

/**
 * Parsed lockfile data structure
 */
export interface ParsedLockfile {
  /** Lockfile type */
  type: 'npm' | 'yarn' | 'pnpm'
  /** Lockfile format version */
  version: number
  /** All resolved packages keyed by "name@version" or path */
  packages: Map<string, ResolvedPackage>
  /** Top-level dependencies from package.json */
  rootDependencies: Record<string, string>
}

/**
 * Package-lock.json v3 format (npm >= 7)
 */
export interface NpmLockfile {
  name: string
  version: string
  lockfileVersion: 3
  requires?: boolean
  packages: Record<string, NpmPackageEntry>
}

/**
 * Entry in package-lock.json packages map
 */
export interface NpmPackageEntry {
  version?: string
  resolved?: string
  integrity?: string
  dev?: boolean
  optional?: boolean
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/**
 * Yarn.lock v1 format (classic yarn)
 */
export interface YarnLockfile {
  /** Parsed YAML entries keyed by descriptor (e.g., "react@^18.0.0") */
  [descriptor: string]: YarnLockEntry
}

/**
 * Entry in yarn.lock
 */
export interface YarnLockEntry {
  version: string
  resolved: string
  integrity?: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

/**
 * Resolution request - what we're trying to resolve
 */
export interface ResolutionRequest {
  /** Package name (e.g., "react") */
  name: string
  /** Version specifier (e.g., "^18.0.0" or "18.2.0") */
  specifier?: string
  /** Importing package context (for nested resolution) */
  importer?: string
}

/**
 * Resolution result - the resolved package info
 */
export interface ResolutionResult {
  /** Package name */
  name: string
  /** Resolved exact version */
  version: string
  /** CDN URL to fetch from (e.g., https://esm.sh/react@18.2.0) */
  url: string
  /** Lockfile path for context tracking (e.g., "node_modules/react") */
  lockfilePath?: string
  /** Dependencies to resolve next */
  dependencies?: Record<string, string>
}

/**
 * esm.sh specific options for URL building
 */
export interface EsmShOptions {
  /** Use unbundled mode (recommended for lockfile resolution) */
  unbundled?: boolean
  /** Pin transitive dependencies with ?deps param */
  deps?: string[]
  /** Target environment */
  target?: 'es2022' | 'es2021' | 'es2020' | 'esnext'
  /** External packages (won't be bundled) */
  external?: string[]
}
