import * as React from 'react'
import {
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Monitor,
  Tablet,
  Smartphone,
  FileCode,
} from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@wiggum/stack'
import type { BuildError } from '@/lib/build'

/**
 * Get MIME type for a file path
 */
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const types: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    eot: 'application/vnd.ms-fontobject',
  }
  return types[ext] || 'text/plain'
}

// Viewport presets for responsive preview
const VIEWPORT_PRESETS = [
  { name: 'Desktop', width: '100%', height: '100%', icon: Monitor },
  { name: 'Tablet', width: '768px', height: '1024px', icon: Tablet },
  { name: 'Mobile', width: '375px', height: '667px', icon: Smartphone },
] as const

type ViewportPreset = (typeof VIEWPORT_PRESETS)[number]

/**
 * Check if a path has a file extension (for SPA fallback logic)
 */
function hasFileExtension(path: string): boolean {
  const lastSegment = path.split('/').pop() || ''
  return lastSegment.includes('.') && !lastSegment.startsWith('.')
}

interface PreviewPaneProps {
  /** URL to load directly in iframe */
  url?: string
  /** Simple error message (backwards compatibility) */
  error?: string
  /** Structured build errors with location info */
  errors?: BuildError[]
  isLoading?: boolean
  onRefresh?: () => void
  onOpenExternal?: () => void
  /** Navigate to error location in editor */
  onGoToError?: (file: string, line: number) => void
  className?: string
  /** Current file being previewed */
  currentFile?: string

  // --- Service Worker mode props ---
  /** Project path for SW mode file serving */
  projectPath?: string
  /** Build version - increments on each build to trigger reload */
  buildVersion?: number
  /** Callback to read a file from the virtual filesystem (supports binary) */
  onReadFile?: (path: string) => Promise<string | Uint8Array | null>
}

export function PreviewPane({
  url,
  error,
  errors,
  isLoading = false,
  onRefresh,
  onOpenExternal,
  onGoToError,
  className,
  currentFile,
  // SW mode props
  projectPath,
  buildVersion = 0,
  onReadFile,
}: PreviewPaneProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [viewport, setViewport] = React.useState<ViewportPreset>(VIEWPORT_PRESETS[0])
  const [swReady, setSwReady] = React.useState(false)
  const [iframeKey, setIframeKey] = React.useState(0)

  // Determine which mode we're in
  const isSwMode = projectPath && onReadFile

  // Handle JSON-RPC fetch requests from Service Worker (via bridge)
  React.useEffect(() => {
    if (!isSwMode || !onReadFile) {
      return
    }

    const handleMessage = async (event: MessageEvent) => {
      const { jsonrpc, id, method, params } = event.data || {}

      // Only handle JSON-RPC fetch requests
      if (jsonrpc !== '2.0' || method !== 'fetch') {
        return
      }

      // Only respond to messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }

      const { url: requestUrl } = params || {}
      if (!requestUrl) return

      try {
        let content: string | Uint8Array | null = null
        let contentType = 'text/plain'
        let status = 200

        // Read from dist folder in LightningFS
        const distPath = `${projectPath}/dist${requestUrl === '/' ? '/index.html' : requestUrl}`

        content = await onReadFile(distPath)

        if (content !== null) {
          contentType = getContentType(requestUrl === '/' ? '/index.html' : requestUrl)
        } else {
          // SPA fallback: serve index.html for routes without file extension
          if (!hasFileExtension(requestUrl)) {
            content = await onReadFile(`${projectPath}/dist/index.html`)
            if (content !== null) {
              contentType = 'text/html'
            }
          }

          // Still not found
          if (content === null) {
            status = 404
            content = `File not found: ${requestUrl}`
          }
        }

        // Encode content for postMessage transfer
        let encodedBody: string
        if (typeof content === 'string') {
          // Text file - base64 encode with UTF-8 support
          encodedBody = btoa(unescape(encodeURIComponent(content)))
        } else if (content instanceof Uint8Array) {
          // Binary file - convert to base64
          encodedBody = btoa(String.fromCharCode(...content))
        } else {
          encodedBody = ''
        }

        // Send response back to iframe (bridge will forward to SW)
        iframeRef.current?.contentWindow?.postMessage(
          {
            jsonrpc: '2.0',
            id,
            result: {
              status,
              headers: { 'Content-Type': contentType },
              body: encodedBody,
            },
          },
          '*'
        )
      } catch (err) {
        // Send error response
        iframeRef.current?.contentWindow?.postMessage(
          {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32000,
              message: err instanceof Error ? err.message : 'Unknown error',
            },
          },
          '*'
        )
      }
    }

    window.addEventListener('message', handleMessage)
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [isSwMode, projectPath, onReadFile])

  // SW mode: Trigger reload when build version changes
  React.useEffect(() => {
    if (!isSwMode) return
    if (buildVersion === 0) return // Skip initial state

    // Force iframe reload by changing key (ensures clean SW re-registration)
    setIframeKey((k) => k + 1)
  }, [buildVersion, isSwMode])

  // Open preview in new tab
  const handleOpenExternal = React.useCallback(async () => {
    if (isSwMode && projectPath) {
      // Extract project ID from projectPath (e.g., "/projects/1it1yd238l8" → "1it1yd238l8")
      const projectId = projectPath.split('/').pop()
      if (projectId) {
        // Open preview with project ID - SW will serve files from IndexedDB cache
        window.open(`/preview/?project=${projectId}`, '_blank')
        onOpenExternal?.()
        return
      }
    }
    
    // Fallback for direct URL mode
    if (url) {
      window.open(url, '_blank')
    }
    onOpenExternal?.()
  }, [isSwMode, projectPath, url, onOpenExternal])

  const isDesktopMode = viewport.name === 'Desktop'

  // Determine iframe src
  const iframeSrc = React.useMemo(() => {
    if (isSwMode && projectPath) {
      // Extract project ID from path (e.g., "/projects/abc123" → "abc123")
      // The SW needs this to know which project's files to serve from IndexedDB
      const projectId = projectPath.split('/').filter(Boolean).pop()
      return `/preview/?project=${projectId}`
    }
    return url || 'about:blank'
  }, [isSwMode, projectPath, url])

  // Handle iframe load event (for SW mode)
  const handleIframeLoad = React.useCallback(() => {
    if (isSwMode) {
      setSwReady(true)
    }
  }, [isSwMode])

  const hasContent = url || (isSwMode && buildVersion > 0)

  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2 gap-2">
        {/* Left side - viewport switcher */}
        <div className="flex items-center gap-1">
          {VIEWPORT_PRESETS.map((preset) => {
            const Icon = preset.icon
            const isActive = viewport.name === preset.name
            return (
              <Tooltip key={preset.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="icon"
                    className={cn('h-7 w-7', isActive && 'bg-primary/20')}
                    onClick={() => setViewport(preset)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{preset.name}</TooltipContent>
              </Tooltip>
            )
          })}
        </div>

        {/* Center - current file indicator */}
        {currentFile && (
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            {currentFile.split('/').pop()}
          </span>
        )}

        {/* Right side - actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleOpenExternal}
                disabled={!hasContent}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in new tab</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-auto">
        {errors && errors.length > 0 ? (
          <div className="h-full bg-destructive/5 p-4 overflow-auto">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-destructive">
                Build Failed ({errors.length} error{errors.length > 1 ? 's' : ''})
              </h3>
            </div>

            <div className="space-y-3">
              {errors.map((err, i) => (
                <div
                  key={i}
                  className="bg-background rounded-lg p-3 border border-destructive/20"
                >
                  {err.file && (
                    <button
                      type="button"
                      onClick={() => onGoToError?.(err.file!, err.line ?? 1)}
                      className="text-sm text-primary hover:underline mb-1 flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" />
                      {err.file}
                      {err.line ? `:${err.line}` : ''}
                      {err.column ? `:${err.column}` : ''}
                    </button>
                  )}
                  <pre className="text-sm text-destructive whitespace-pre-wrap">
                    {err.message}
                  </pre>
                  {err.snippet && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto font-mono">
                      {err.snippet}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm font-medium text-destructive">Build Error</p>
            <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto bg-muted p-2 rounded">
              {error}
            </pre>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Building...</p>
            </div>
          </div>
        ) : hasContent ? (
          <div
            className={cn(
              'h-full',
              isDesktopMode && 'w-full',
              !isDesktopMode && 'flex items-start justify-center p-4'
            )}
          >
            <div
              className={cn(
                'bg-white transition-all duration-200',
                isDesktopMode && 'w-full h-full',
                !isDesktopMode && 'rounded-lg shadow-xl border border-gray-300 overflow-hidden'
              )}
              style={
                isDesktopMode
                  ? undefined
                  : {
                      width: viewport.width,
                      height: viewport.height,
                      maxWidth: '100%',
                      maxHeight: '100%',
                    }
              }
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={iframeSrc}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                title="Preview"
                onLoad={handleIframeLoad}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Monitor className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No preview available</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Select an HTML file or build your project
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
