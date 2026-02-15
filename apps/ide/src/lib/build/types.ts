/**
 * Build system types for in-browser bundling with esbuild-wasm
 */

/**
 * Output file from build
 */
export interface OutputFile {
  /** Output file path */
  path: string
  /** File contents as string */
  contents: string
  /** File contents as bytes */
  bytes?: Uint8Array
}

/**
 * Build error with location info
 */
export interface BuildError {
  /** Error message */
  message: string
  /** File where error occurred */
  file?: string
  /** Line number */
  line?: number
  /** Column number */
  column?: number
  /** Length of error span */
  length?: number
  /** Source code snippet */
  snippet?: string
}

/**
 * Build warning
 */
export interface BuildWarning {
  /** Warning message */
  message: string
  /** File where warning occurred */
  file?: string
  /** Line number */
  line?: number
  /** Column number */
  column?: number
}

/**
 * Result of a build operation
 */
export interface BuildResult {
  /** Whether build succeeded */
  success: boolean
  /** Build errors if any */
  errors?: BuildError[]
  /** Build warnings */
  warnings?: BuildWarning[]
  /** Output files */
  outputFiles?: OutputFile[]
  /** Build duration in milliseconds */
  duration?: number
  /** Import map for browser-native module resolution (when lockfile present) */
  importMap?: { imports: Record<string, string> }
  /** Compiled Tailwind CSS from tailwindcss-iso */
  tailwindCss?: string | null
}

/**
 * Output format for built code
 */
export type BuildFormat = 'iife' | 'esm' | 'cjs'

/**
 * Platform target
 */
export type BuildPlatform = 'browser' | 'node' | 'neutral'

/**
 * Build configuration options
 */
export interface BuildOptions {
  /** Entry point file path */
  entryPoint: string
  /** Output directory */
  outdir?: string
  /** Output filename (for single file output) */
  outfile?: string
  /** Output format */
  format?: BuildFormat
  /** Bundle all dependencies */
  bundle?: boolean
  /** Minify output */
  minify?: boolean
  /** Generate source maps */
  sourcemap?: boolean | 'inline' | 'external'
  /** Target platform */
  platform?: BuildPlatform
  /** Target environments (e.g., ['es2020', 'chrome90']) */
  target?: string[]
  /** External packages to exclude from bundle */
  external?: string[]
  /** Define global constants */
  define?: Record<string, string>
  /** JSX factory function */
  jsxFactory?: string
  /** JSX fragment */
  jsxFragment?: string
  /** Inject files at start of output */
  inject?: string[]
  /** Loader for specific extensions */
  loader?: Record<string, 'js' | 'jsx' | 'ts' | 'tsx' | 'json' | 'css' | 'text' | 'binary' | 'base64'>
  /** Working directory for resolution */
  workingDir?: string
  /** Enable tree shaking */
  treeShaking?: boolean
}

/**
 * Resolved module information
 */
export interface ResolvedModule {
  /** Resolved path */
  path: string
  /** Namespace (e.g., 'file', 'http', 'virtual') */
  namespace: string
  /** Whether this is an external module */
  external?: boolean
}

/**
 * Plugin resolve result
 */
export interface PluginResolveResult {
  /** Resolved path */
  path: string
  /** Namespace */
  namespace?: string
  /** Mark as external */
  external?: boolean
  /** Suffix to add to import */
  suffix?: string
  /** Plugin data to pass to load */
  pluginData?: unknown
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  /** File contents */
  contents: string
  /** Loader to use */
  loader?: 'js' | 'jsx' | 'ts' | 'tsx' | 'json' | 'css' | 'text'
  /** Resolve directory for imports in this file */
  resolveDir?: string
  /** Plugin data */
  pluginData?: unknown
}

/**
 * CDN configuration for ESM imports
 */
export interface CDNConfig {
  /** Base URL for CDN */
  baseUrl: string
  /** Transform package specifier to URL */
  getUrl: (pkg: string, version?: string) => string
}

/**
 * Default CDN configurations
 */
export const CDN_CONFIGS: Record<string, CDNConfig> = {
  'esm.sh': {
    baseUrl: 'https://esm.sh',
    getUrl: (pkg, version) => `https://esm.sh/${pkg}${version ? `@${version}` : ''}`,
  },
  unpkg: {
    baseUrl: 'https://unpkg.com',
    getUrl: (pkg, version) => `https://unpkg.com/${pkg}${version ? `@${version}` : ''}?module`,
  },
  jsdelivr: {
    baseUrl: 'https://cdn.jsdelivr.net',
    getUrl: (pkg, version) =>
      `https://cdn.jsdelivr.net/npm/${pkg}${version ? `@${version}` : ''}/+esm`,
  },
}

/**
 * Build state for tracking initialization
 */
export interface BuildState {
  /** Whether esbuild is initialized */
  initialized: boolean
  /** Initialization promise */
  initPromise?: Promise<void>
  /** Initialization error */
  error?: Error
}
