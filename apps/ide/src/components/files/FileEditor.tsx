import * as React from 'react'
import { Save, X } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, Badge, cn } from '@wiggum/stack'

interface FileEditorProps {
  path: string
  content: string
  onChange?: (content: string) => void
  onSave?: () => void | Promise<void>
  onClose?: () => void
  isModified?: boolean
  readOnly?: boolean
  className?: string
}

export function FileEditor({
  path,
  content,
  onChange,
  onSave,
  onClose,
  isModified = false,
  readOnly = false,
  className,
}: FileEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = React.useRef<HTMLDivElement>(null)
  const [localContent, setLocalContent] = React.useState(content)

  // Sync with external content
  React.useEffect(() => {
    setLocalContent(content)
  }, [content])

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (!readOnly) {
          onSave?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSave, readOnly])

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setLocalContent(newContent)
    onChange?.(newContent)
  }

  const lines = localContent.split('\n')
  const fileName = path.split('/').pop() || 'Untitled'

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{fileName}</span>
          {isModified && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              Modified
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onSave?.()}
                disabled={readOnly || !isModified}
              >
                <Save className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save (Cmd+S)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className="flex flex-col items-end overflow-hidden bg-muted/50 px-3 py-2 text-right font-mono text-xs text-muted-foreground select-none"
        >
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code area */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={handleChange}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          className={cn(
            'flex-1 resize-none bg-background p-2 font-mono text-sm leading-6 outline-none',
            'overflow-auto whitespace-pre',
            readOnly && 'cursor-not-allowed opacity-75'
          )}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t px-3 py-1 text-xs text-muted-foreground">
        <span>{path}</span>
        <span>
          Ln {lines.length}, Col {localContent.length - localContent.lastIndexOf('\n')}
        </span>
      </div>
    </div>
  )
}
