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

// Viewport presets for responsive preview
const VIEWPORT_PRESETS = [
  { name: 'Desktop', width: '100%', height: '100%', icon: Monitor },
  { name: 'Tablet', width: '768px', height: '1024px', icon: Tablet },
  { name: 'Mobile', width: '375px', height: '667px', icon: Smartphone },
] as const

type ViewportPreset = (typeof VIEWPORT_PRESETS)[number]

interface PreviewPaneProps {
  html?: string
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
}

export function PreviewPane({
  html,
  url,
  error,
  errors,
  isLoading = false,
  onRefresh,
  onOpenExternal,
  onGoToError,
  className,
  currentFile,
}: PreviewPaneProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [viewport, setViewport] = React.useState<ViewportPreset>(VIEWPORT_PRESETS[0])

  // Update iframe content when html changes
  React.useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(html)
        doc.close()
      }
    }
  }, [html])

  // Open preview in new tab
  const handleOpenExternal = React.useCallback(() => {
    if (html) {
      const blob = new Blob([html], { type: 'text/html' })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank')
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    } else if (url) {
      window.open(url, '_blank')
    }
    onOpenExternal?.()
  }, [html, url, onOpenExternal])

  const isDesktopMode = viewport.name === 'Desktop'

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
                disabled={!html && !url}
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
        ) : html || url ? (
          <div
            className={cn(
              'h-full',
              // Desktop mode: full size
              isDesktopMode && 'w-full',
              // Non-desktop: center with padding
              !isDesktopMode && 'flex items-start justify-center p-4'
            )}
          >
            <div
              className={cn(
                'bg-white transition-all duration-200',
                // Desktop mode: no styling
                isDesktopMode && 'w-full h-full',
                // Non-desktop: device frame styling
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
                ref={iframeRef}
                src={url || 'about:blank'}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                title="Preview"
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
