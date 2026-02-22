import type { Plugin } from 'esbuild-wasm'
import type { CDNConfig } from '../types'
import { CDN_CONFIGS } from '../types'
import type { LockfileResolver } from '../lockfile'

/**
 * Options for the ESM plugin
 */
export interface ESMPluginOptions {
  /** CDN to use for imports */
  cdn?: 'esm.sh' | 'unpkg' | 'jsdelivr'
  /** Custom CDN configuration */
  cdnConfig?: CDNConfig
  /** Cache for fetched modules */
  cache?: Map<string, string>
  /** Packages that should be marked external */
  external?: string[]
  /** Package version overrides */
  versions?: Record<string, string>
  /** Lockfile resolver for pinned versions */
  resolver?: LockfileResolver
  /** Use esm.sh unbundled mode (recommended with lockfile) */
  unbundled?: boolean
}

/**
 * HTTP namespace for remote modules
 */
const HTTP_NAMESPACE = 'http-url'

/**
 * Cache for esm.sh redirect URLs (e.g., /*react@^18 → /*react@18.2.0)
 */
const redirectCache = new Map<string, string>()

/**
 * Extract lockfile context from esm.sh URL
 * URLs may contain ?_ctx=node_modules/react-dom for nested resolution
 */
function extractContext(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get('_ctx')
  } catch {
    return null
  }
}

/**
 * Fetch content from URL with caching and redirect tracking
 */
async function fetchWithCache(
  url: string,
  cache: Map<string, string>
): Promise<string> {
  // Check if we have a cached redirect for this URL
  const finalUrl = redirectCache.get(url) || url

  // Check content cache first
  const cached = cache.get(finalUrl)
  if (cached !== undefined) {
    return cached
  }

  // Fetch from network (follow redirects)
  const response = await fetch(finalUrl, { redirect: 'follow' })

  if (!response.ok) {
    throw new Error(`Failed to fetch ${finalUrl}: ${response.status} ${response.statusText}`)
  }

  // Cache redirect if URL changed (esm.sh resolves version ranges)
  if (response.url !== url && response.url !== finalUrl) {
    redirectCache.set(url, response.url)
  }

  const content = await response.text()

  // Cache the result using final URL
  cache.set(response.url, content)

  return content
}

/**
 * Parse package specifier to extract name and version
 */
function parsePackageSpecifier(specifier: string): { name: string; subpath: string } {
  // Handle scoped packages
  const isScoped = specifier.startsWith('@')
  const parts = specifier.split('/')

  if (isScoped) {
    // @scope/package/subpath
    const name = `${parts[0]}/${parts[1]}`
    const subpath = parts.slice(2).join('/')
    return { name, subpath }
  }

  // package/subpath
  const name = parts[0]
  const subpath = parts.slice(1).join('/')
  return { name, subpath }
}

/**
 * Build full CDN URL for a package
 */
function buildCDNUrl(
  cdnConfig: CDNConfig,
  packageName: string,
  subpath: string,
  version?: string
): string {
  const baseUrl = cdnConfig.getUrl(packageName, version)

  if (subpath) {
    // Handle subpath imports
    return `${baseUrl}/${subpath}`
  }

  return baseUrl
}

/**
 * Resolve relative URL against base URL
 */
function resolveUrl(relative: string, base: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

/**
 * Create an esbuild plugin for ESM imports with CDN fallback
 *
 * When a lockfile resolver is provided, uses esm.sh unbundled mode with
 * pinned versions for reproducible builds. Without a resolver, falls back
 * to standard CDN resolution.
 */
export function createESMPlugin(options: ESMPluginOptions = {}): Plugin {
  const {
    cdn = 'esm.sh',
    cdnConfig = CDN_CONFIGS[cdn],
    cache = new Map(),
    external = [],
    versions = {},
    resolver,
    unbundled = !!resolver, // Enable unbundled mode when resolver is present
  } = options

  return {
    name: 'wiggum-esm',
    setup(build) {
      // Handle http(s) URLs directly
      build.onResolve({ filter: /^https?:\/\// }, (args) => {
        return {
          path: args.path,
          namespace: HTTP_NAMESPACE,
        }
      })

      // Handle absolute paths starting with / in http namespace (esm.sh uses these)
      build.onResolve({ filter: /^\//, namespace: HTTP_NAMESPACE }, (args) => {
        // Resolve absolute path against the CDN base URL
        const resolvedUrl = `${cdnConfig.baseUrl}${args.path}`
        return {
          path: resolvedUrl,
          namespace: HTTP_NAMESPACE,
        }
      })

      // Handle bare module specifiers that weren't resolved by fsPlugin
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        // Don't intercept data: or blob: URIs — valid browser-native resources
        if (args.path.startsWith('data:') || args.path.startsWith('blob:')) {
          return { external: true }
        }

        // Skip if already in http namespace (relative imports from CDN)
        if (args.namespace === HTTP_NAMESPACE) {
          const resolvedUrl = resolveUrl(args.path, args.importer)
          return {
            path: resolvedUrl,
            namespace: HTTP_NAMESPACE,
          }
        }

        // Check if marked as external
        const { name } = parsePackageSpecifier(args.path)
        if (external.includes(name) || external.includes(args.path)) {
          return { path: args.path, external: true }
        }

        // Build CDN URL
        const { name: pkgName, subpath } = parsePackageSpecifier(args.path)

        // Try lockfile resolver first for pinned versions
        if (resolver) {
          // Extract context from esm.sh importer URL for nested resolution
          // This enables proper resolution of nested dependencies
          const ctx = args.importer.startsWith('https://esm.sh')
            ? extractContext(args.importer)
            : null

          // Use context-aware resolution for proper nested dep handling
          const result = resolver.resolveWithContext(pkgName, ctx)
          let url = result.url

          // Append subpath if present (before query params)
          if (subpath) {
            url = url.replace(/(\?|$)/, `/${subpath}$1`)
          }

          // Embed lockfile path as _ctx for downstream resolution
          // This allows imports from this module to resolve correctly
          if (result.lockfilePath) {
            const separator = url.includes('?') ? '&' : '?'
            url += `${separator}_ctx=${encodeURIComponent(result.lockfilePath)}`
          }

          return {
            path: url,
            namespace: HTTP_NAMESPACE,
          }
        }

        // Fallback to standard CDN resolution
        const version = versions[pkgName]
        const url = buildCDNUrl(cdnConfig, pkgName, subpath, version)

        return {
          path: url,
          namespace: HTTP_NAMESPACE,
        }
      })

      // Handle relative imports within http namespace
      build.onResolve({ filter: /^\./, namespace: HTTP_NAMESPACE }, (args) => {
        const resolvedUrl = resolveUrl(args.path, args.importer)
        return {
          path: resolvedUrl,
          namespace: HTTP_NAMESPACE,
        }
      })

      // Load modules from HTTP
      build.onLoad({ filter: /.*/, namespace: HTTP_NAMESPACE }, async (args) => {
        try {
          const contents = await fetchWithCache(args.path, cache)

          // Determine loader from URL
          let loader: 'js' | 'jsx' | 'ts' | 'tsx' | 'css' | 'json' = 'js'

          if (args.path.endsWith('.ts') || args.path.endsWith('.mts')) {
            loader = 'ts'
          } else if (args.path.endsWith('.tsx')) {
            loader = 'tsx'
          } else if (args.path.endsWith('.jsx')) {
            loader = 'jsx'
          } else if (args.path.endsWith('.css')) {
            loader = 'css'
          } else if (args.path.endsWith('.json')) {
            loader = 'json'
          }

          return {
            contents,
            loader,
          }
        } catch (err) {
          return {
            errors: [
              {
                text: `Failed to fetch ${args.path}: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          }
        }
      })
    },
  }
}

/**
 * Create a shared module cache
 */
export function createModuleCache(): Map<string, string> {
  return new Map()
}

/**
 * Preload modules into cache
 */
export async function preloadModules(
  modules: string[],
  cache: Map<string, string>,
  cdnConfig: CDNConfig = CDN_CONFIGS['esm.sh']
): Promise<void> {
  await Promise.all(
    modules.map(async (module) => {
      const { name, subpath } = parsePackageSpecifier(module)
      const url = buildCDNUrl(cdnConfig, name, subpath)
      try {
        await fetchWithCache(url, cache)
      } catch {
        // Ignore preload failures
      }
    })
  )
}
