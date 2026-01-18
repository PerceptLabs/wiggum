import * as esbuild from 'esbuild-wasm'
import type { BuildState, BuildResult, BuildOptions, BuildError, BuildWarning } from './types'

/**
 * Global build state for tracking esbuild initialization
 */
const state: BuildState = {
  initialized: false,
}

/**
 * Default WASM URL from unpkg CDN
 */
const DEFAULT_WASM_URL = 'https://unpkg.com/esbuild-wasm@0.27.2/esbuild.wasm'

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
      await esbuild.initialize({
        wasmURL: wasmURL || DEFAULT_WASM_URL,
        worker: true,
      })
      state.initialized = true
    } catch (err) {
      state.error = err instanceof Error ? err : new Error(String(err))
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
function toBuildError(msg: esbuild.Message): BuildError {
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
function toBuildWarning(msg: esbuild.Message): BuildWarning {
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
  plugins?: esbuild.Plugin[]
): Promise<BuildResult> {
  const startTime = Date.now()

  // Ensure initialized
  if (!state.initialized) {
    await initialize()
  }

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
      const buildErr = err as esbuild.BuildFailure
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
  if (state.initialized) {
    await esbuild.stop()
    state.initialized = false
    state.initPromise = undefined
  }
}

// Re-export Plugin type for plugin authors
export type { Plugin, PluginBuild, OnResolveArgs, OnLoadArgs } from 'esbuild-wasm'
