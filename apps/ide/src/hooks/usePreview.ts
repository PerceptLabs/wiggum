import * as React from 'react'
import { useFS } from '@/contexts'
import {
  buildProject,
  initialize,
  isInitialized,
  createModuleCache,
} from '@/lib/build'
import { writePreviewFile, clearPreviewCache } from '@/lib/preview-cache'
import { injectAllCapture } from '@/lib/preview/chobitsu-bridge'
import type { BuildResult, BuildProjectOptions, BuildError } from '@/lib/build'

const BUILD_TIMEOUT_MS = 30000

export interface UsePreviewOptions extends Omit<BuildProjectOptions, 'moduleCache'> {
  /** Auto-build on file changes */
  autoBuild?: boolean
  /** Debounce time for auto-build (ms) */
  debounceMs?: number
  /** Callback for build log messages */
  onLog?: (message: string) => void
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
  const { autoBuild = true, debounceMs = 500, onLog, ...buildOptions } = options

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
    onLog?.(`Building ${projectPath}...`)

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
          onLog?.(`Found standalone HTML: ${htmlFile}`)

          const htmlContent = await fs.readFile(`${projectPath}/${htmlFile}`, 'utf8') as string

          // Inject runtime error capture script
          const htmlWithErrorCapture = injectAllCapture(htmlContent)

          // Write to preview cache
          await clearPreviewCache(projectId)
          await writePreviewFile(projectId, '/index.html', htmlWithErrorCapture, 'text/html')

          console.timeEnd('[Preview] Build total')
          onLog?.('✓ Standalone HTML served')
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
        // Find the main output files
        const mainOutput = result.outputFiles.find(
          (f) => f.path.endsWith('.js') || f.path.endsWith('.mjs')
        )
        const cssOutput = result.outputFiles.find((f) => f.path.endsWith('.css'))

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
              // Fallback: generate index.html with Tailwind if missing
              indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: 'hsl(var(--background))',
            foreground: 'hsl(var(--foreground))',
            primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
            secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
            muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
            accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
            destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
            card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
            popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
            border: 'hsl(var(--border))',
            input: 'hsl(var(--input))',
            ring: 'hsl(var(--ring))',
          },
          borderRadius: {
            DEFAULT: 'var(--radius)',
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 0 0% 3.9%;
      --primary: 0 0% 9%;
      --primary-foreground: 0 0% 98%;
      --secondary: 0 0% 96.1%;
      --secondary-foreground: 0 0% 9%;
      --muted: 0 0% 96.1%;
      --muted-foreground: 0 0% 45.1%;
      --accent: 0 0% 96.1%;
      --accent-foreground: 0 0% 9%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 98%;
      --card: 0 0% 100%;
      --card-foreground: 0 0% 3.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 0 0% 3.9%;
      --border: 0 0% 89.8%;
      --input: 0 0% 89.8%;
      --ring: 0 0% 3.9%;
      --radius: 0.5rem;
    }
    * { box-sizing: border-box; border-color: hsl(var(--border)); }
    body { margin: 0; background-color: hsl(var(--background)); color: hsl(var(--foreground)); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>`
            }
            // Write CSS bundle if present
            if (cssOutput) {
              await fs.writeFile(`${distPath}/bundle.css`, cssOutput.contents)
            }

            // Replace the src/main.tsx reference with bundle.js
            let distHtml = indexHtml.replace(
              /src="\.\/src\/main\.tsx"/,
              'src="./bundle.js"'
            )

            // Add CSS link tag if CSS was bundled
            if (cssOutput) {
              distHtml = distHtml.replace(
                '</head>',
                '  <link rel="stylesheet" href="./bundle.css">\n</head>'
              )
            }

            await fs.writeFile(`${distPath}/index.html`, distHtml)

            // Inject runtime error capture script for preview
            const distHtmlWithErrorCapture = injectAllCapture(distHtml)

            // Write to preview cache for direct SW access
            // This enables "Open in new tab" without postMessage!
            await clearPreviewCache(projectId)
            await writePreviewFile(projectId, '/index.html', distHtmlWithErrorCapture, 'text/html')
            await writePreviewFile(
              projectId,
              '/bundle.js',
              mainOutput.contents,
              'application/javascript'
            )

            // Write CSS to preview cache if present
            if (cssOutput) {
              await writePreviewFile(projectId, '/bundle.css', cssOutput.contents, 'text/css')
            }

            // Increment build version to trigger preview reload
            const bundleSize = (mainOutput.contents.length / 1024).toFixed(1)
            onLog?.(`✓ Build succeeded in ${result.duration ?? 0}ms`)
            onLog?.(`  bundle.js: ${bundleSize}KB`)
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
        onLog?.(`✘ Build failed: ${result.errors[0].message}`)
        setErrors(result.errors)
        setError(result.errors[0].message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Build failed'
      onLog?.(`✘ Build failed: ${message}`)
      setError(message)
      setErrors([{ message }])
    } finally {
      setIsBuilding(false)
    }
  }, [fs, fsReady, projectPath, isReady, buildOptions, onLog])

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
