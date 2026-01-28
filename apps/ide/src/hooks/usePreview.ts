import * as React from 'react'
import { useFS } from '@/contexts'
import {
  buildProject,
  initialize,
  isInitialized,
  createModuleCache,
} from '@/lib/build'
import { writePreviewFile, clearPreviewCache } from '@/lib/preview-cache'
import type { BuildResult, BuildProjectOptions, BuildError } from '@/lib/build'

const BUILD_TIMEOUT_MS = 30000

export interface UsePreviewOptions extends Omit<BuildProjectOptions, 'moduleCache'> {
  /** Auto-build on file changes */
  autoBuild?: boolean
  /** Debounce time for auto-build (ms) */
  debounceMs?: number
}

export interface UsePreviewResult {
  /** Build version - increments on each successful build */
  buildVersion: number
  /** Build error message (first error summary) */
  error: string | null
  /** Structured build errors with location info */
  errors: BuildError[] | null
  /** Whether currently building */
  isBuilding: boolean
  /** Whether esbuild is initialized */
  isReady: boolean
  /** Last build result */
  lastBuild: BuildResult | null
  /** Trigger a build */
  build: () => Promise<void>
  /** Build duration in ms */
  duration: number | null
}

/**
 * Hook for building and previewing projects
 */
export function usePreview(
  projectPath: string | null,
  options: UsePreviewOptions = {}
): UsePreviewResult {
  const { fs, isReady: fsReady } = useFS()
  const { autoBuild = true, debounceMs = 500, ...buildOptions } = options

  const [buildVersion, setBuildVersion] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<BuildError[] | null>(null)
  const [isBuilding, setIsBuilding] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const [lastBuild, setLastBuild] = React.useState<BuildResult | null>(null)
  const [duration, setDuration] = React.useState<number | null>(null)

  // Shared module cache
  const moduleCacheRef = React.useRef(createModuleCache())

  // Initialize esbuild
  React.useEffect(() => {
    if (isInitialized()) {
      setIsReady(true)
      return
    }

    initialize()
      .then(() => setIsReady(true))
      .catch((err) => {
        setError(`Failed to initialize build system: ${err.message}`)
      })
  }, [])

  // Build function
  const doBuild = React.useCallback(async () => {
    if (!fs || !fsReady || !projectPath || !isReady) {
      return
    }

    setIsBuilding(true)
    setError(null)
    setErrors(null)

    try {
      console.time('[Preview] Build total')

      // Extract project ID from path (e.g., /projects/abc123 -> abc123)
      const projectId = projectPath.split('/').filter(Boolean).pop() || 'default'

      // --- Check for standalone HTML files first ---
      // If there's a .html file in the project root (not index.html), serve it directly
      // This handles cases where Ralph creates landing pages, static sites, etc.
      try {
        const files = await fs.readdir(projectPath)
        const standaloneHtmlFiles = files.filter(
          (f: string) => f.endsWith('.html') && f !== 'index.html'
        )

        if (standaloneHtmlFiles.length > 0) {
          // Found standalone HTML - serve the first one directly (no esbuild needed)
          const htmlFile = standaloneHtmlFiles[0]
          console.log(`[Preview] Found standalone HTML: ${htmlFile}, serving directly`)

          const htmlContent = await fs.readFile(`${projectPath}/${htmlFile}`, 'utf8') as string

          // Write to preview cache
          await clearPreviewCache(projectId)
          await writePreviewFile(projectId, '/index.html', htmlContent, 'text/html')

          console.timeEnd('[Preview] Build total')
          setBuildVersion((v) => v + 1)
          setError(null)
          setErrors(null)
          setIsBuilding(false)
          return
        }
      } catch {
        // Ignore errors reading directory, proceed with React build
      }

      // --- Standard React/TypeScript build ---
      // Build with timeout
      const buildPromise = buildProject(fs, projectPath, {
        ...buildOptions,
        moduleCache: moduleCacheRef.current,
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Build timeout: exceeded 30 seconds')),
          BUILD_TIMEOUT_MS
        )
      )

      const result = await Promise.race([buildPromise, timeoutPromise])

      console.timeEnd('[Preview] Build total')

      setLastBuild(result)
      setDuration(result.duration ?? null)

      if (result.success && result.outputFiles && result.outputFiles.length > 0) {
        // Find the main output file
        const mainOutput = result.outputFiles.find(
          (f) => f.path.endsWith('.js') || f.path.endsWith('.mjs')
        )

        if (mainOutput) {
          // Write bundle to dist folder for SW mode
          try {
            const distPath = `${projectPath}/dist`
            await fs.mkdir(distPath, { recursive: true })

            // Write bundle
            await fs.writeFile(`${distPath}/bundle.js`, mainOutput.contents)

            // Read and copy index.html from project root
            let indexHtml: string
            try {
              indexHtml = await fs.readFile(`${projectPath}/index.html`, 'utf8') as string
            } catch {
              // Fallback: generate basic index.html if missing
              indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
  <div id="root"></div>
  <script src="./src/main.tsx"></script>
</body>
</html>`
            }
            // Replace the src/main.tsx reference with bundle.js
            const distHtml = indexHtml.replace(
              /src="\.\/src\/main\.tsx"/,
              'src="./bundle.js"'
            )
            await fs.writeFile(`${distPath}/index.html`, distHtml)

            // Write to preview cache for direct SW access
            // This enables "Open in new tab" without postMessage!
            await clearPreviewCache(projectId)
            await writePreviewFile(projectId, '/index.html', distHtml, 'text/html')
            await writePreviewFile(
              projectId,
              '/bundle.js',
              mainOutput.contents,
              'application/javascript'
            )

            // Increment build version to trigger preview reload
            setBuildVersion((v) => v + 1)
            setError(null)
            setErrors(null)
          } catch (writeErr) {
            setError(`Failed to write dist files: ${writeErr instanceof Error ? writeErr.message : 'Unknown error'}`)
          }
        } else {
          setError('No JavaScript output generated')
        }
      } else if (result.errors && result.errors.length > 0) {
        setErrors(result.errors)
        setError(result.errors[0].message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Build failed'
      setError(message)
      setErrors([{ message }])
    } finally {
      setIsBuilding(false)
    }
  }, [fs, fsReady, projectPath, isReady, buildOptions])

  // Auto-build on mount and when project changes
  React.useEffect(() => {
    if (autoBuild && projectPath && isReady && fsReady) {
      doBuild()
    }
  }, [projectPath, isReady, fsReady, autoBuild]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    buildVersion,
    error,
    errors,
    isBuilding,
    isReady,
    lastBuild,
    build: doBuild,
    duration,
  }
}

/**
 * Hook for watching files and auto-rebuilding
 */
export function usePreviewWithWatch(
  projectPath: string | null,
  watchPaths: string[],
  options: UsePreviewOptions = {}
): UsePreviewResult & { triggerRebuild: () => void } {
  const preview = usePreview(projectPath, { ...options, autoBuild: false })
  const { debounceMs = 500 } = options

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerRebuild = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      preview.build()
    }, debounceMs)
  }, [preview, debounceMs])

  // Initial build
  React.useEffect(() => {
    if (preview.isReady && projectPath) {
      preview.build()
    }
  }, [preview.isReady, projectPath]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    ...preview,
    triggerRebuild,
  }
}
