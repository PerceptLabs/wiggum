import * as React from 'react'
import { useFS } from '@/contexts'
import {
  buildProject,
  generateHTML,
  initialize,
  isInitialized,
  createModuleCache,
} from '@/lib/build'
import type { BuildResult, BuildProjectOptions } from '@/lib/build'

export interface UsePreviewOptions extends Omit<BuildProjectOptions, 'moduleCache'> {
  /** Auto-build on file changes */
  autoBuild?: boolean
  /** Debounce time for auto-build (ms) */
  debounceMs?: number
}

export interface UsePreviewResult {
  /** Generated HTML for iframe */
  html: string | null
  /** Build error message */
  error: string | null
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

  const [html, setHtml] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
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

    try {
      const result = await buildProject(fs, projectPath, {
        ...buildOptions,
        moduleCache: moduleCacheRef.current,
      })

      setLastBuild(result)
      setDuration(result.duration ?? null)

      if (result.success && result.outputFiles && result.outputFiles.length > 0) {
        // Find the main output file
        const mainOutput = result.outputFiles.find(
          (f) => f.path.endsWith('.js') || f.path.endsWith('.mjs')
        )

        if (mainOutput) {
          const generatedHtml = generateHTML(mainOutput.contents)
          setHtml(generatedHtml)
          setError(null)
        } else {
          setError('No JavaScript output generated')
        }
      } else if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors
          .map((e) => {
            let msg = e.message
            if (e.file) {
              msg = `${e.file}${e.line ? `:${e.line}` : ''}: ${msg}`
            }
            return msg
          })
          .join('\n')

        setError(errorMessages)
        setHtml(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Build failed')
      setHtml(null)
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
    html,
    error,
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
