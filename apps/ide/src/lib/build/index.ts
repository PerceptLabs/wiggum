import type { JSRuntimeFS } from '../fs/types'
import type { BuildResult, BuildOptions } from './types'
import { initialize, build, transform, stop, isInitialized } from './esbuild'
import { createFSPlugin } from './plugins/fsPlugin'
import { createESMPlugin, createModuleCache } from './plugins/esmPlugin'
import { createWiggumStackPlugin } from './plugins/wiggumStackPlugin'
import { loadLockfile, createResolver } from './lockfile'
import * as path from 'path-browserify'
import { validateImports, collectSourceFiles } from './import-validator'
import { computeSourceHash, getCachedBuild, setCachedBuild } from './build-cache'
import { generateImportMap, generateExternals } from './import-map'
import { compileTailwind } from './tailwind-compiler'

// Re-export types
export type {
  BuildResult,
  BuildOptions,
  BuildError,
  BuildWarning,
  OutputFile,
  BuildFormat,
  BuildPlatform,
  CDNConfig,
} from './types'

export { CDN_CONFIGS } from './types'

// Export utilities
export { exportSingleHTML, downloadFile } from './export'
export type { ExportResult, ExportFormat } from './export'

// Re-export esbuild functions
export { initialize, transform, stop, isInitialized }

// Re-export plugins
export { createFSPlugin, createESMPlugin, createModuleCache, preloadModules, createWiggumStackPlugin } from './plugins'
export type { FSPluginOptions, ESMPluginOptions } from './plugins'

/**
 * Options for building a project
 */
export interface BuildProjectOptions {
  /** Entry point relative to project root (default: 'src/main.tsx' or 'src/index.tsx') */
  entryPoint?: string
  /** Output format */
  format?: 'esm' | 'iife'
  /** Minify output */
  minify?: boolean
  /** Generate source maps */
  sourcemap?: boolean | 'inline'
  /** CDN for external packages */
  cdn?: 'esm.sh' | 'unpkg' | 'jsdelivr'
  /** External packages (won't be bundled) */
  external?: string[]
  /** Define global constants */
  define?: Record<string, string>
  /** Package versions for CDN */
  versions?: Record<string, string>
  /** Shared module cache */
  moduleCache?: Map<string, string>
  /** Skip import validation (fast-path for single-file changes with unchanged imports) */
  skipImportValidation?: boolean
}

/**
 * Default entry points to try
 */
const DEFAULT_ENTRY_POINTS = [
  'src/main.tsx',
  'src/main.ts',
  'src/index.tsx',
  'src/index.ts',
  'src/App.tsx',
  'src/App.ts',
  'index.tsx',
  'index.ts',
  'main.tsx',
  'main.ts',
]

/**
 * Check if a file exists in the filesystem
 */
async function fileExists(fs: JSRuntimeFS, filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath)
    return stat.isFile()
  } catch {
    return false
  }
}

/**
 * Find the entry point for a project
 */
async function findEntryPoint(fs: JSRuntimeFS, projectPath: string): Promise<string | null> {
  for (const entry of DEFAULT_ENTRY_POINTS) {
    const fullPath = path.join(projectPath, entry)
    if (await fileExists(fs, fullPath)) {
      return fullPath
    }
  }
  return null
}

/**
 * Build a project from the virtual filesystem
 * @param fs - Virtual filesystem instance
 * @param projectPath - Path to project root
 * @param options - Build options
 * @returns Build result with compiled output
 */
export async function buildProject(
  fs: JSRuntimeFS,
  projectPath: string,
  options: BuildProjectOptions = {}
): Promise<BuildResult> {
  // Ensure esbuild is initialized
  if (!isInitialized()) {
    await initialize()
  }

  // Determine entry point
  let entryPoint: string
  if (options.entryPoint) {
    entryPoint = path.isAbsolute(options.entryPoint)
      ? options.entryPoint
      : path.join(projectPath, options.entryPoint)
  } else {
    const found = await findEntryPoint(fs, projectPath)
    if (!found) {
      return {
        success: false,
        errors: [
          {
            message: `No entry point found. Tried: ${DEFAULT_ENTRY_POINTS.join(', ')}`,
          },
        ],
      }
    }
    entryPoint = found
  }

  // Check entry point exists
  if (!(await fileExists(fs, entryPoint))) {
    return {
      success: false,
      errors: [
        {
          message: `Entry point not found: ${entryPoint}`,
          file: entryPoint,
        },
      ],
    }
  }

  // Create plugins
  const moduleCache = options.moduleCache ?? createModuleCache()

  // Load lockfile for pinned dependency versions
  const lockfile = await loadLockfile(fs, projectPath)
  const resolver = lockfile ? createResolver({ unbundled: true, target: 'es2022' }) : undefined
  if (resolver && lockfile) {
    resolver.setLockfile(lockfile)
  }

  // Generate import map for browser-native module resolution
  const importMap = lockfile ? generateImportMap(lockfile) : undefined
  const lockfileExternals = lockfile ? generateExternals(lockfile) : []

  // Build cache: check for cached build result
  let sourceHash: string | null = null
  try {
    sourceHash = await computeSourceHash(fs, projectPath)
    const cached = await getCachedBuild(sourceHash)
    if (cached) {
      console.log(`[Build] Cache hit: ${sourceHash.slice(0, 12)}...`)
      return {
        success: true,
        warnings: cached.warnings,
        outputFiles: [
          { path: 'bundle.js', contents: cached.js },
          ...(cached.css ? [{ path: 'bundle.css', contents: cached.css }] : []),
        ],
        importMap,
        tailwindCss: cached.tailwindCss ?? null,
        duration: 0,
      }
    }
  } catch {
    // Cache miss or error — proceed with normal build
  }

  const plugins = [
    // Handle @wiggum/stack imports with pre-bundled code
    createWiggumStackPlugin(),
    // Handle virtual filesystem files
    createFSPlugin({
      fs,
      projectRoot: projectPath,
    }),
    // Handle external npm packages via CDN
    // When resolver is present, uses lockfile for pinned versions with context tracking
    createESMPlugin({
      cdn: options.cdn ?? 'esm.sh',
      cache: moduleCache,
      external: [...(options.external ?? []), ...lockfileExternals],
      versions: options.versions,
      resolver,
    }),
  ]

  // Layer 1: Static import validation — advisory, does not block build
  // Skipped on fast-path rebuilds where imports haven't changed
  let validatorWarnings: Array<{ message: string; file: string; line: number }> = []
  if (!options.skipImportValidation) {
    try {
      const sourceFiles = await collectSourceFiles(fs, projectPath)
      if (sourceFiles.size > 0) {
        const importErrors = validateImports(sourceFiles)
        if (importErrors.length > 0) {
          validatorWarnings = importErrors.map((e) => ({
            message: `${e.component} is used in JSX but not imported. ${e.suggestion}`,
            file: e.file,
            line: e.line,
          }))
        }
      }
    } catch {
      // Validation failure is non-fatal
    }
  }

  // Build — always runs regardless of validator
  const result = await build(
    {
      entryPoint,
      outfile: 'bundle.js', // Required for esbuild to generate output
      bundle: true,
      format: options.format ?? 'esm',
      minify: options.minify ?? false,
      sourcemap: options.sourcemap ?? 'inline',
      platform: 'browser',
      target: ['es2020'],
      define: {
        'process.env.NODE_ENV': '"production"',
        ...options.define,
      },
      workingDir: projectPath,
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    },
    plugins
  )

  // Compile Tailwind CSS from esbuild output
  // OutputFile.contents is string (types.ts:12) — no decode needed
  let tailwindCss: string | null = null
  if (result.success && result.outputFiles) {
    const jsOutput = result.outputFiles.find((f) => f.path.endsWith('.js'))
    let indexHtml = ''
    try {
      const data = await fs.readFile(`${projectPath}/index.html`, { encoding: 'utf8' })
      indexHtml = typeof data === 'string' ? data : ''
    } catch { /* no index.html */ }
    const scanContent = [jsOutput?.contents ?? '', indexHtml].join('\n')
    if (scanContent.trim()) {
      tailwindCss = await compileTailwind(scanContent)
    }
  }

  // Cache successful builds (fire-and-forget)
  if (result.success && sourceHash && result.outputFiles) {
    const jsFile = result.outputFiles.find((f) => f.path.endsWith('.js'))
    const cssFile = result.outputFiles.find((f) => f.path.endsWith('.css'))
    if (jsFile) {
      setCachedBuild(sourceHash, {
        hash: sourceHash,
        js: jsFile.contents,
        css: cssFile?.contents ?? null,
        tailwindCss: tailwindCss ?? null,
        warnings: result.warnings ?? [],
        timestamp: Date.now(),
      }).catch(() => {})
    }
  }

  // If esbuild failed, prepend validator context (deduped by file)
  if (!result.success && validatorWarnings.length > 0) {
    const esbuildFiles = new Set((result.errors || []).map((e) => e.file || ''))
    const extraWarnings = validatorWarnings.filter((w) => !esbuildFiles.has(w.file))
    if (extraWarnings.length > 0) {
      return { ...result, errors: [...extraWarnings, ...(result.errors || [])] }
    }
  }

  // Attach import map + tailwind CSS to successful results
  const extras: Partial<BuildResult> = {}
  if (importMap) extras.importMap = importMap
  if (tailwindCss !== null) extras.tailwindCss = tailwindCss
  return Object.keys(extras).length > 0 ? { ...result, ...extras } : result
}

/**
 * Build a single file without project context
 * Useful for quick transforms
 */
export async function buildFile(
  fs: JSRuntimeFS,
  filePath: string,
  options: Omit<BuildProjectOptions, 'entryPoint'> = {}
): Promise<BuildResult> {
  const projectPath = path.dirname(filePath)

  return buildProject(fs, projectPath, {
    ...options,
    entryPoint: filePath,
  })
}

/**
 * Generate HTML wrapper for built code
 */
export function generateHTML(
  code: string,
  options: {
    title?: string
    styles?: string
    bodyContent?: string
  } = {}
): string {
  const { title = 'Wiggum Preview', styles = '', bodyContent = '<div id="root"></div>' } = options

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, sans-serif; }
    ${styles}
  </style>
</head>
<body>
  ${bodyContent}
  <script type="module">
${code}
  </script>
</body>
</html>`
}

/**
 * Watch files for changes and rebuild
 * Returns a function to stop watching
 */
export function watchProject(
  fs: JSRuntimeFS,
  projectPath: string,
  options: BuildProjectOptions & {
    onBuild: (result: BuildResult) => void
    debounceMs?: number
  }
): { stop: () => void; rebuild: () => Promise<void> } {
  const { onBuild, debounceMs = 300, ...buildOptions } = options

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const rebuild = async () => {
    if (stopped) return
    const result = await buildProject(fs, projectPath, buildOptions)
    if (!stopped) {
      onBuild(result)
    }
  }

  const debouncedRebuild = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(rebuild, debounceMs)
  }

  // Initial build
  rebuild()

  return {
    stop: () => {
      stopped = true
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    },
    rebuild,
  }
}
