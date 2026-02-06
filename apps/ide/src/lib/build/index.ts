import type { JSRuntimeFS } from '../fs/types'
import type { BuildResult, BuildOptions } from './types'
import { initialize, build, transform, stop, isInitialized } from './esbuild'
import { createFSPlugin } from './plugins/fsPlugin'
import { createESMPlugin, createModuleCache } from './plugins/esmPlugin'
import { createWiggumStackPlugin } from './plugins/wiggumStackPlugin'
import { loadLockfile, createResolver } from './lockfile'
import * as path from 'path-browserify'

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
      external: options.external,
      versions: options.versions,
      resolver,
    }),
  ]

  // Build
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

  return result
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
