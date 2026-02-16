import * as React from 'react'
import { useFS } from '@/contexts'
import {
  buildProject,
  initialize,
  isInitialized,
  createModuleCache,
} from '@/lib/build'
import { writePreviewFile, clearPreviewCache } from '@/lib/preview-cache'
import { injectErrorCapture } from '@/lib/preview/chobitsu-bridge'
import { serializeImportMap } from '@/lib/build/import-map'
import { canUseFastPath } from '@/lib/build/swc-fast-path'
import { fsEvents } from '@/lib/fs/fs-events'
import type { BuildResult, BuildProjectOptions, BuildError } from '@/lib/build'

/** Strip Tailwind CDN script and <style type="text/tailwindcss"> from HTML */
function stripTailwindCDN(html: string): string {
  html = html.replace(
    /\s*<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@tailwindcss\/browser@[^"]*"><\/script>/g,
    ''
  )
  html = html.replace(
    /\s*<style\s+type="text\/tailwindcss">[\s\S]*?<\/style>/g,
    ''
  )
  return html
}

/** Inject compiled Tailwind CSS before </head> */
function injectTailwindCSS(html: string, css: string): string {
  return html.replace('</head>', `  <style id="tailwind-build">\n${css}\n  </style>\n</head>`)
}

const BUILD_TIMEOUT_MS = 30000

/**
 * Extract @fonts declaration from CSS and return Google Fonts <link> tags.
 * Parses: /* @fonts: Inter:wght@400;500;600;700, JetBrains+Mono:wght@400;500 *​/
 */
function extractFontLinks(cssContent: string): string {
  const match = cssContent.match(/\/\*\s*@fonts:\s*(.+?)\s*\*\//)
  if (!match) return ''

  const fontSpecs = match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (fontSpecs.length === 0) return ''

  const families = fontSpecs.map((spec) => `family=${spec.replace(/ /g, '+')}`).join('&')
  const url = `https://fonts.googleapis.com/css2?${families}&display=swap`

  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    `<link href="${url}" rel="stylesheet">`,
  ].join('\n  ')
}

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
  /** Trigger a build (skipValidation skips import validation on fast-path rebuilds) */
  build: (skipValidation?: boolean) => Promise<BuildResult | undefined>
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

  // Build concurrency lock — synchronous, not React state
  const buildLockRef = React.useRef(false)
  // Pending build request coalesced while build is in-flight (null = none)
  const pendingBuildRef = React.useRef<boolean | null>(null)
  // Monotonic counter for unique console.time labels
  const buildCountRef = React.useRef(0)

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
  const doBuild = React.useCallback(async (skipValidation = false) => {
    if (!fs || !fsReady || !projectPath || !isReady) {
      return
    }

    // Concurrency guard: if build running, coalesce this request
    if (buildLockRef.current) {
      // AND: if ANY request wants full validation (false), coalesced build does full validation
      pendingBuildRef.current =
        pendingBuildRef.current === null
          ? skipValidation
          : pendingBuildRef.current && skipValidation
      return
    }
    buildLockRef.current = true

    setIsBuilding(true)
    setError(null)
    setErrors(null)
    onLog?.(`Building ${projectPath}...`)

    let buildResult: BuildResult | undefined

    try {
      const buildId = ++buildCountRef.current
      const timerLabel = `[Preview] Build #${buildId}`
      console.time(timerLabel)

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
          const htmlWithErrorCapture = injectErrorCapture(htmlContent)

          // Write to preview cache
          await clearPreviewCache(projectId)
          await writePreviewFile(projectId, '/index.html', htmlWithErrorCapture, 'text/html')

          console.timeEnd(timerLabel)
          onLog?.('✓ Standalone HTML served')
          setBuildVersion((v) => v + 1)
          setError(null)
          setErrors(null)
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
        skipImportValidation: skipValidation,
      })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Build timeout: exceeded 30 seconds')),
          BUILD_TIMEOUT_MS
        )
      )

      const result = await Promise.race([buildPromise, timeoutPromise])
      buildResult = result

      console.timeEnd(timerLabel)

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
              // Fallback: generate index.html if missing
              indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    :root {
      --background: oklch(0.98 0.005 240);
      --foreground: oklch(0.145 0.005 240);
      --primary: oklch(0.205 0.015 265);
      --primary-foreground: oklch(0.985 0.002 240);
      --secondary: oklch(0.965 0.005 240);
      --secondary-foreground: oklch(0.205 0.015 240);
      --muted: oklch(0.965 0.005 240);
      --muted-foreground: oklch(0.556 0.01 240);
      --accent: oklch(0.965 0.005 240);
      --accent-foreground: oklch(0.205 0.015 240);
      --destructive: oklch(0.577 0.245 27);
      --destructive-foreground: oklch(0.985 0.002 0);
      --card: oklch(1.0 0 0);
      --card-foreground: oklch(0.145 0.005 240);
      --popover: oklch(1.0 0 0);
      --popover-foreground: oklch(0.145 0.005 240);
      --border: oklch(0.922 0.005 240);
      --input: oklch(0.922 0.005 240);
      --ring: oklch(0.205 0.015 265);
      --radius: 0.5rem;
      --sidebar-background: oklch(0.98 0.005 240);
      --sidebar-foreground: oklch(0.145 0.005 240);
      --sidebar-primary: oklch(0.205 0.015 265);
      --sidebar-primary-foreground: oklch(0.985 0.002 240);
      --sidebar-accent: oklch(0.965 0.005 240);
      --sidebar-accent-foreground: oklch(0.205 0.015 240);
      --sidebar-border: oklch(0.922 0.005 240);
      --sidebar-ring: oklch(0.205 0.015 265);
      --chart-1: oklch(0.646 0.222 16);
      --chart-2: oklch(0.6 0.118 184);
      --chart-3: oklch(0.398 0.07 227);
      --chart-4: oklch(0.828 0.189 84);
      --chart-5: oklch(0.769 0.188 70);
    }
    .dark {
      --background: oklch(0.145 0.005 240);
      --foreground: oklch(0.985 0.002 240);
      --primary: oklch(0.985 0.002 240);
      --primary-foreground: oklch(0.205 0.015 265);
      --secondary: oklch(0.269 0.005 240);
      --secondary-foreground: oklch(0.985 0.002 240);
      --muted: oklch(0.269 0.005 240);
      --muted-foreground: oklch(0.716 0.01 240);
      --accent: oklch(0.269 0.005 240);
      --accent-foreground: oklch(0.985 0.002 240);
      --destructive: oklch(0.396 0.141 25);
      --destructive-foreground: oklch(0.985 0.002 0);
      --card: oklch(0.145 0.005 240);
      --card-foreground: oklch(0.985 0.002 240);
      --popover: oklch(0.145 0.005 240);
      --popover-foreground: oklch(0.985 0.002 240);
      --border: oklch(0.269 0.005 240);
      --input: oklch(0.269 0.005 240);
      --ring: oklch(0.871 0.006 286);
      --sidebar-background: oklch(0.145 0.005 240);
      --sidebar-foreground: oklch(0.985 0.002 240);
      --sidebar-primary: oklch(0.985 0.002 240);
      --sidebar-primary-foreground: oklch(0.205 0.015 265);
      --sidebar-accent: oklch(0.269 0.005 240);
      --sidebar-accent-foreground: oklch(0.985 0.002 240);
      --sidebar-border: oklch(0.269 0.005 240);
      --sidebar-ring: oklch(0.871 0.006 286);
      --chart-1: oklch(0.488 0.243 264);
      --chart-2: oklch(0.696 0.17 162);
      --chart-3: oklch(0.769 0.188 70);
      --chart-4: oklch(0.627 0.265 303);
      --chart-5: oklch(0.645 0.246 16);
    }
    * { box-sizing: border-box; border-color: var(--border); }
    body { margin: 0; background-color: var(--background); color: var(--foreground); }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./src/main.tsx"></script>
</body>
</html>`
            }
            // Strip Tailwind CDN from user-provided index.html (migration compatibility)
            indexHtml = stripTailwindCDN(indexHtml)

            // Inject Google Fonts <link> tags from @fonts declaration in index.css
            let fontLinks = ''
            try {
              const cssData = await fs.readFile(`${projectPath}/src/index.css`, { encoding: 'utf8' })
              const cssText = typeof cssData === 'string' ? cssData : new TextDecoder().decode(cssData as Uint8Array)
              fontLinks = extractFontLinks(cssText)
            } catch {
              // No index.css or no @fonts — that's fine
            }

            if (fontLinks) {
              indexHtml = indexHtml.replace('</head>', `  ${fontLinks}\n</head>`)
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

            // Inject browser-native import map if available
            if (result.importMap) {
              const importMapTag = serializeImportMap(result.importMap)
              distHtml = distHtml.replace(/<script\b/i, importMapTag + '\n  <script')
            }

            // Inject compiled Tailwind CSS from build
            if (result.tailwindCss) {
              distHtml = injectTailwindCSS(distHtml, result.tailwindCss)
            }

            await fs.writeFile(`${distPath}/index.html`, distHtml)

            // Inject runtime error capture script for preview
            const distHtmlWithErrorCapture = injectErrorCapture(distHtml)

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
      // Release lock and dispatch any coalesced pending build
      const pending = pendingBuildRef.current
      pendingBuildRef.current = null
      buildLockRef.current = false
      setIsBuilding(false)

      if (pending !== null) {
        queueMicrotask(() => doBuild(pending))
      }
    }

    return buildResult
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
 * Hook for watching files and auto-rebuilding.
 * Subscribes to fsEvents and triggers debounced rebuild on source file changes.
 */
export function usePreviewWithWatch(
  projectPath: string | null,
  watchPaths: string[],
  options: UsePreviewOptions = {}
): UsePreviewResult & { triggerRebuild: () => void } {
  const { fs } = useFS()
  const preview = usePreview(projectPath, { ...options, autoBuild: false })
  const { debounceMs = 500 } = options

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const previousContentsRef = React.useRef<Map<string, string>>(new Map())

  const triggerRebuild = React.useCallback((skipValidation = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      preview.build(skipValidation)
    }, debounceMs)
  }, [preview, debounceMs])

  // Subscribe to FS events for auto-rebuild on source file changes
  React.useEffect(() => {
    if (!projectPath) return

    // Reset content tracking when project changes
    previousContentsRef.current.clear()

    const unsub = fsEvents.subscribe(async (changedPath) => {
      // Skip non-source paths
      if (changedPath.includes('/.ralph/') || changedPath.includes('/dist/') || changedPath.includes('/node_modules/')) return
      if (!/\.(tsx?|css|json)$/.test(changedPath)) return

      // Fast-path detection: check if imports changed for .ts/.tsx files
      let skipValidation = false
      if (fs && /\.tsx?$/.test(changedPath)) {
        try {
          const content = await fs.readFile(changedPath, 'utf8') as string
          const previous = previousContentsRef.current.get(changedPath) ?? null
          skipValidation = canUseFastPath(previous, content)
          previousContentsRef.current.set(changedPath, content)
        } catch {
          // Can't read file — full rebuild
        }
      }

      triggerRebuild(skipValidation)
    })
    return unsub
  }, [projectPath, fs, triggerRebuild])

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
