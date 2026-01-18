import type { Plugin } from 'esbuild-wasm'
import type { JSRuntimeFS } from '../../fs/types'
import path from 'path-browserify'

/**
 * Options for the filesystem plugin
 */
export interface FSPluginOptions {
  /** Virtual filesystem instance */
  fs: JSRuntimeFS
  /** Project root directory */
  projectRoot: string
  /** File extensions to handle */
  extensions?: string[]
}

/**
 * Default extensions to resolve
 */
const DEFAULT_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.css']

/**
 * Get loader type from file extension
 */
function getLoader(ext: string): 'tsx' | 'ts' | 'jsx' | 'js' | 'json' | 'css' | 'text' {
  switch (ext) {
    case '.tsx':
      return 'tsx'
    case '.ts':
    case '.mts':
      return 'ts'
    case '.jsx':
      return 'jsx'
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'js'
    case '.json':
      return 'json'
    case '.css':
      return 'css'
    default:
      return 'text'
  }
}

/**
 * Check if a path exists in the filesystem
 */
async function exists(fs: JSRuntimeFS, filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Try to resolve a file path with various extensions
 */
async function resolveFile(
  fs: JSRuntimeFS,
  basePath: string,
  extensions: string[]
): Promise<string | null> {
  // Try exact path first
  if (await exists(fs, basePath)) {
    const stat = await fs.stat(basePath)
    if (stat.isFile()) {
      return basePath
    }
  }

  // Try with extensions
  for (const ext of extensions) {
    const pathWithExt = basePath + ext
    if (await exists(fs, pathWithExt)) {
      return pathWithExt
    }
  }

  // Try as directory with index file
  for (const ext of extensions) {
    const indexPath = path.join(basePath, `index${ext}`)
    if (await exists(fs, indexPath)) {
      return indexPath
    }
  }

  return null
}

/**
 * Resolve a module from node_modules
 */
async function resolveNodeModule(
  fs: JSRuntimeFS,
  projectRoot: string,
  moduleName: string,
  extensions: string[]
): Promise<string | null> {
  // Parse package name and subpath
  const parts = moduleName.split('/')
  const isScoped = moduleName.startsWith('@')
  const pkgName = isScoped ? `${parts[0]}/${parts[1]}` : parts[0]
  const subPath = isScoped ? parts.slice(2).join('/') : parts.slice(1).join('/')

  // Try to find package.json
  const nodeModulesPath = path.join(projectRoot, 'node_modules', pkgName)
  const pkgJsonPath = path.join(nodeModulesPath, 'package.json')

  if (await exists(fs, pkgJsonPath)) {
    try {
      const pkgJson = JSON.parse(
        (await fs.readFile(pkgJsonPath, { encoding: 'utf8' })) as string
      )

      // If subpath specified, resolve it
      if (subPath) {
        const subPathFull = path.join(nodeModulesPath, subPath)
        return resolveFile(fs, subPathFull, extensions)
      }

      // Resolve main entry point
      // Check exports field first
      if (pkgJson.exports) {
        const exportEntry =
          typeof pkgJson.exports === 'string'
            ? pkgJson.exports
            : pkgJson.exports['.']?.import ||
              pkgJson.exports['.']?.default ||
              pkgJson.exports['.']

        if (typeof exportEntry === 'string') {
          const entryPath = path.join(nodeModulesPath, exportEntry)
          if (await exists(fs, entryPath)) {
            return entryPath
          }
        }
      }

      // Try module field (ESM)
      if (pkgJson.module) {
        const modulePath = path.join(nodeModulesPath, pkgJson.module)
        if (await exists(fs, modulePath)) {
          return modulePath
        }
      }

      // Try main field
      if (pkgJson.main) {
        const mainPath = path.join(nodeModulesPath, pkgJson.main)
        const resolved = await resolveFile(fs, mainPath, extensions)
        if (resolved) {
          return resolved
        }
      }

      // Try index file
      return resolveFile(fs, path.join(nodeModulesPath, 'index'), extensions)
    } catch {
      // Invalid package.json, try index
      return resolveFile(fs, path.join(nodeModulesPath, 'index'), extensions)
    }
  }

  return null
}

/**
 * Create an esbuild plugin that reads from the virtual filesystem
 */
export function createFSPlugin(options: FSPluginOptions): Plugin {
  const { fs, projectRoot, extensions = DEFAULT_EXTENSIONS } = options

  return {
    name: 'wiggum-fs',
    setup(build) {
      // Resolve file imports
      build.onResolve({ filter: /^\./ }, async (args) => {
        // Relative import
        const resolveDir = args.resolveDir || projectRoot
        const absolutePath = path.resolve(resolveDir, args.path)
        const resolved = await resolveFile(fs, absolutePath, extensions)

        if (resolved) {
          return {
            path: resolved,
            namespace: 'wiggum-fs',
          }
        }

        return null
      })

      // Resolve absolute imports (starting with /)
      build.onResolve({ filter: /^\// }, async (args) => {
        const resolved = await resolveFile(fs, args.path, extensions)

        if (resolved) {
          return {
            path: resolved,
            namespace: 'wiggum-fs',
          }
        }

        return null
      })

      // Resolve bare module imports (node_modules)
      build.onResolve({ filter: /^[^./]/ }, async (args) => {
        // Skip http(s) URLs - let esmPlugin handle those
        if (args.path.startsWith('http://') || args.path.startsWith('https://')) {
          return null
        }

        const resolved = await resolveNodeModule(fs, projectRoot, args.path, extensions)

        if (resolved) {
          return {
            path: resolved,
            namespace: 'wiggum-fs',
          }
        }

        // Not found in virtual FS - let other plugins handle it
        return null
      })

      // Load files from virtual filesystem
      build.onLoad({ filter: /.*/, namespace: 'wiggum-fs' }, async (args) => {
        try {
          const contents = (await fs.readFile(args.path, { encoding: 'utf8' })) as string
          const ext = path.extname(args.path)
          const loader = getLoader(ext)
          const resolveDir = path.dirname(args.path)

          return {
            contents,
            loader,
            resolveDir,
          }
        } catch (err) {
          return {
            errors: [
              {
                text: `Failed to load ${args.path}: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
          }
        }
      })
    },
  }
}
