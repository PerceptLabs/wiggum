import * as React from 'react'
import { ChevronDown, ChevronRight, Terminal, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn, Badge } from '@wiggum/stack'

interface ToolCallDisplayProps {
  name: string
  arguments?: string
  result?: string
  isRunning?: boolean
  isError?: boolean
  isRalphIteration?: boolean
  className?: string
}

export function ToolCallDisplay({
  name,
  arguments: args,
  result,
  isRunning = false,
  isError = false,
  isRalphIteration = false,
  className,
}: ToolCallDisplayProps) {
  const [expanded, setExpanded] = React.useState(false)

  // Parse arguments for display
  let parsedArgs: Record<string, unknown> = {}
  try {
    if (args) {
      parsedArgs = JSON.parse(args)
    }
  } catch {
    // Keep empty object
  }

  const hasDetails = Object.keys(parsedArgs).length > 0 || result

  return (
    <div
      className={cn(
        'rounded-md border bg-muted/50',
        isRalphIteration && 'border-primary/50 bg-primary/5',
        className
      )}
    >
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/80"
        onClick={() => hasDetails && setExpanded(!expanded)}
        disabled={!hasDetails}
      >
        {hasDetails ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <div className="w-4" />
        )}

        <Terminal className="h-4 w-4 shrink-0 text-muted-foreground" />

        <span className="flex-1 truncate font-mono text-sm">{name}</span>

        {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {!isRunning && !isError && result && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {isError && <XCircle className="h-4 w-4 text-destructive" />}

        {isRalphIteration && (
          <Badge variant="secondary" className="ml-2">
            ralph
          </Badge>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="border-t px-3 py-2 space-y-2">
          {Object.keys(parsedArgs).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Arguments</p>
              <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                {JSON.stringify(parsedArgs, null, 2)}
              </pre>
            </div>
          )}

          {result && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Result</p>
              <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
