import * as React from 'react'
import { X, Trash2, Download } from 'lucide-react'
import { Button, ScrollArea, cn } from '@wiggum/stack'
import { useLayout } from './LayoutContext'

interface LogsPanelProps {
  className?: string
}

export function LogsPanel({ className }: LogsPanelProps) {
  const { logsOpen, setLogsOpen, buildLogs, clearBuildLogs } = useLayout()
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs come in
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [buildLogs])

  const handleDownload = () => {
    const blob = new Blob([buildLogs.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `build-logs-${new Date().toISOString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!logsOpen) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute right-0 top-full z-50 mt-2 mr-4 w-[500px] max-h-[400px]',
        'flex flex-col',
        'border-2 border-border bg-card',
        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_hsl(50,100%,53%)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-border px-4 py-2">
        <span className="text-sm font-bold uppercase tracking-wide">Build Logs</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            disabled={buildLogs.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearBuildLogs}
            disabled={buildLogs.length === 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLogsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Logs content */}
      <ScrollArea className="flex-1 max-h-[340px]" ref={scrollRef}>
        {buildLogs.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            No logs yet. Build your project to see logs here.
          </div>
        ) : (
          <pre className="p-4 font-mono text-xs leading-relaxed text-foreground whitespace-pre-wrap">
            {buildLogs.map((log, index) => (
              <div
                key={index}
                className={cn(
                  'py-0.5',
                  log.includes('error') && 'text-destructive',
                  log.includes('warning') && 'text-warning',
                  log.includes('success') && 'text-success'
                )}
              >
                <span className="text-muted-foreground mr-2 select-none">[{String(index + 1).padStart(3, '0')}]</span>
                {log}
              </div>
            ))}
          </pre>
        )}
      </ScrollArea>
    </div>
  )
}
