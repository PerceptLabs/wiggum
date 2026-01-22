import type { BuildState, BuildResult, BuildOptions, BuildError, BuildWarning } from './types'
import type * as esbuildTypes from 'esbuild-wasm'

/**
 * Global build state for tracking esbuild initialization
 */
const state: BuildState & { esbuild?: typeof esbuildTypes } = {
  initialized: false,
}

/**
 * esbuild-wasm version to use
 */
const ESBUILD_VERSION = '0.24.0'

/**
 * CDN URLs for esbuild-wasm
 */
const ESBUILD_JS_URL = `https://unpkg.com/esbuild-wasm@${ESBUILD_VERSION}/lib/browser.min.js`
const ESBUILD_WASM_URL = `https://unpkg.com/esbuild-wasm@${ESBUILD_VERSION}/esbuild.wasm`

/**
 * Get the esbuild module (must be initialized first)
 */
function getEsbuild(): typeof esbuildTypes {
  if (!state.esbuild) {
    throw new Error('esbuild-wasm not loaded. Call initialize() first.')
  }
  return state.esbuild
}

/**
 * Load esbuild from CDN
 */
async function loadEsbuildFromCDN(): Promise<typeof esbuildTypes> {
  // Check if already loaded globally
  if (typeof window !== 'undefined' && (window as unknown as { esbuild?: typeof esbuildTypes }).esbuild) {
    return (window as unknown as { esbuild: typeof esbuildTypes }).esbuild
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = ESBUILD_JS_URL
    script.onload = () => {
      const esbuild = (window as unknown as { esbuild?: typeof esbuildTypes }).esbuild
      if (esbuild) {
        resolve(esbuild)
      } else {
        reject(new Error('esbuild not found on window after script load'))
      }
    }
    script.onerror = () => reject(new Error(`Failed to load esbuild from ${ESBUILD_JS_URL}`))
    document.head.appendChild(script)
  })
}

/**
 * Initialize esbuild-wasm
 * Must be called before any build operations
 */
export async function initialize(wasmURL?: string): Promise<void> {
  if (state.initialized) {
    return
  }

  if (state.initPromise) {
    return state.initPromise
  }

  state.initPromise = (async () => {
    try {
      // Load esbuild from CDN (browser.min.js exposes global esbuild)
      const esbuild = await loadEsbuildFromCDN()

      // Check if initialize function exists
      if (typeof esbuild.initialize !== 'function') {
        throw new Error(
          `esbuild.initialize is not a function. ` +
          `Available keys: ${Object.keys(esbuild).join(', ')}`
        )
      }

      await esbuild.initialize({
        wasmURL: wasmURL || ESBUILD_WASM_URL,
        worker: true,
      })

      state.esbuild = esbuild
      state.initialized = true
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
      state.initPromise = undefined // Allow retry
      throw state.error
    }
  })()

  return state.initPromise
}

/**
 * Check if esbuild is initialized
 */
export function isInitialized(): boolean {
  return state.initialized
}

/**
 * Get initialization error if any
 */
export function getInitError(): Error | undefined {
  return state.error
}

/**
 * Convert esbuild message to BuildError
 */
function toBuildError(msg: esbuildTypes.Message): BuildError {
  return {
    message: msg.text,
    file: msg.location?.file,
    line: msg.location?.line,
    column: msg.location?.column,
    length: msg.location?.length,
    snippet: msg.location?.lineText,
  }
}

/**
 * Convert esbuild message to BuildWarning
 */
function toBuildWarning(msg: esbuildTypes.Message): BuildWarning {
  return {
    message: msg.text,
    file: msg.location?.file,
    line: msg.location?.line,
    column: msg.location?.column,
  }
}

/**
 * Build with esbuild
 * Automatically initializes if not already done
 */
export async function build(
  options: BuildOptions,
  plugins?: esbuildTypes.Plugin[]
): Promise<BuildResult> {
  const startTime = Date.now()

  // Ensure initialized
  if (!state.initialized) {
    await initialize()
  }

  const esbuild = getEsbuild()

  try {
    const result = await esbuild.build({
      entryPoints: [options.entryPoint],
      outdir: options.outdir,
      outfile: options.outfile,
      bundle: options.bundle ?? true,
      format: options.format ?? 'esm',
      minify: options.minify ?? false,
      sourcemap: options.sourcemap ?? false,
      platform: options.platform ?? 'browser',
      target: options.target ?? ['es2020'],
      external: options.external,
      define: options.define,
      jsxFactory: options.jsxFactory,
      jsxFragment: options.jsxFragment,
      inject: options.inject,
      loader: options.loader,
      treeShaking: options.treeShaking ?? true,
      write: false, // Return output instead of writing
      plugins: plugins ?? [],
      absWorkingDir: options.workingDir ?? '/',
    })

    const duration = Date.now() - startTime

    return {
      success: result.errors.length === 0,
      errors: result.errors.map(toBuildError),
      warnings: result.warnings.map(toBuildWarning),
      outputFiles: result.outputFiles?.map((f) => ({
        path: f.path,
        contents: f.text,
        bytes: f.contents,
      })),
      duration,
    }
  } catch (err) {
    const duration = Date.now() - startTime

    // Handle build failures that throw
    if (err && typeof err === 'object' && 'errors' in err) {
      const buildErr = err as esbuildTypes.BuildFailure
      return {
        success: false,
        errors: buildErr.errors.map(toBuildError),
        warnings: buildErr.warnings?.map(toBuildWarning) ?? [],
        duration,
      }
    }

    // Unexpected error
    return {
      success: false,
      errors: [
        {
          message: err instanceof Error ? err.message : String(err),
        },
      ],
      duration,
    }
  }
}

/**
 * Transform a single file without bundling
 */
export async function transform(
  code: string,
  options: {
    loader?: 'js' | 'jsx' | 'ts' | 'tsx'
    sourcemap?: boolean | 'inline'
    minify?: boolean
    target?: string[]
    jsxFactory?: string
    jsxFragment?: string
  } = {}
): Promise<{ code: string; map?: string; warnings: BuildWarning[] }> {
  // Ensure initialized
  if (!state.initialized) {
    await initialize()
  }

  const esbuild = getEsbuild()

  const result = await esbuild.transform(code, {
    loader: options.loader ?? 'tsx',
    sourcemap: options.sourcemap,
    minify: options.minify,
    target: options.target ?? ['es2020'],
    jsxFactory: options.jsxFactory,
    jsxFragment: options.jsxFragment,
  })

  return {
    code: result.code,
    map: result.map || undefined,
    warnings: result.warnings.map(toBuildWarning),
  }
}

/**
 * Stop esbuild worker (cleanup)
 */
export async function stop(): Promise<void> {
  if (state.initialized && state.esbuild) {
    await state.esbuild.stop()
    state.initialized = false
    state.initPromise = undefined
    state.esbuild = undefined
  }
}

// Re-export Plugin type for plugin authors
export type { Plugin, PluginBuild, OnResolveArgs, OnLoadArgs } from 'esbuild-wasm'
