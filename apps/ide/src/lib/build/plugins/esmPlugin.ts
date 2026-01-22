import type { Plugin } from 'esbuild-wasm'
import type { CDNConfig } from '../types'
import { CDN_CONFIGS } from '../types'

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
}

/**
 * HTTP namespace for remote modules
 */
const HTTP_NAMESPACE = 'http-url'

/**
 * Fetch content from URL with caching
 */
async function fetchWithCache(
  url: string,
  cache: Map<string, string>
): Promise<string> {
  // Check cache first
  const cached = cache.get(url)
  if (cached !== undefined) {
    return cached
  }

  // Fetch from network
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`)
  }

  const content = await response.text()

  // Cache the result
  cache.set(url, content)

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
 */
export function createESMPlugin(options: ESMPluginOptions = {}): Plugin {
  const {
    cdn = 'esm.sh',
    cdnConfig = CDN_CONFIGS[cdn],
    cache = new Map(),
    external = [],
    versions = {},
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
