import * as React from 'react'
import { ArrowLeft, Save, FileCode2 } from 'lucide-react'
import { Button, Badge, cn } from '@wiggum/stack'
import { useLayout } from '@/components/layout/LayoutContext'
import { FileEditor } from './FileEditor'

interface CodeEditorPaneProps {
  selectedFile: string | null
  content: string
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  isModified?: boolean
  className?: string
}

export function CodeEditorPane({
  selectedFile,
  content,
  onChange,
  onSave,
  isModified = false,
  className,
}: CodeEditorPaneProps) {
  const { setViewMode } = useLayout()

  const handleBackToPreview = () => {
    setViewMode('preview')
  }

  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts':
      case 'tsx':
        return 'TypeScript'
      case 'js':
      case 'jsx':
        return 'JavaScript'
      case 'css':
        return 'CSS'
      case 'html':
        return 'HTML'
      case 'json':
        return 'JSON'
      case 'md':
        return 'Markdown'
      default:
        return 'Text'
    }
  }

  return (
    <div className={cn('flex flex-1 flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b-2 border-border px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToPreview}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Preview
          </Button>

          {selectedFile && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedFile}</span>
                <Badge variant="secondary" className="text-xs">
                  {getLanguage(selectedFile)}
                </Badge>
                {isModified && (
                  <Badge variant="warning" className="text-xs">
                    Modified
                  </Badge>
                )}
              </div>
            </>
          )}
        </div>

        {selectedFile && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSave?.(content)}
            disabled={!isModified}
            className="gap-2 font-bold uppercase"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        )}
      </div>

      {/* Editor content */}
      {selectedFile ? (
        <FileEditor
          path={selectedFile}
          content={content}
          onChange={onChange}
          onSave={onSave}
          isModified={isModified}
          className="flex-1"
        />
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center border-2 border-border bg-card p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_hsl(50,100%,53%)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-2 border-border bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
          <FileCode2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-xl font-bold uppercase tracking-wide">Select a file</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a file from the sidebar to view and edit its contents.
        </p>
      </div>
    </div>
  )
}
