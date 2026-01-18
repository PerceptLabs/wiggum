import * as React from 'react'
import { RefreshCw, ExternalLink, AlertCircle } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@wiggum/stack'

interface PreviewPaneProps {
  html?: string
  url?: string
  error?: string
  isLoading?: boolean
  onRefresh?: () => void
  onOpenExternal?: () => void
  className?: string
}

export function PreviewPane({
  html,
  url,
  error,
  isLoading = false,
  onRefresh,
  onOpenExternal,
  className,
}: PreviewPaneProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          {url && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{url}</span>
          )}
        </div>

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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenExternal}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in new tab</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {error ? (
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
          <iframe
            ref={iframeRef}
            src={url || 'about:blank'}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            title="Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">No preview available</p>
          </div>
        )}
      </div>
    </div>
  )
}
