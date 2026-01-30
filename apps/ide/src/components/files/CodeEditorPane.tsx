import * as React from 'react'
import { ArrowLeft, Save, FileCode2, Loader2 } from 'lucide-react'
import { Button, Badge, cn } from '@wiggum/stack'
import { useLayout } from '@/components/layout/LayoutContext'
import { FileEditor } from './FileEditor'

interface CodeEditorPaneProps {
  selectedFile: string | null
  content: string
  onChange?: (content: string) => void
  onSave?: () => void | Promise<void>
  isModified?: boolean
  isLoading?: boolean
  className?: string
}

export function CodeEditorPane({
  selectedFile,
  content,
  onChange,
  onSave,
  isModified = false,
  isLoading = false,
  className,
}: CodeEditorPaneProps) {
  const { setViewMode } = useLayout()

  const handleBackToPreview = () => {
    setViewMode('preview')
  }

  const handleSave = React.useCallback(() => {
    onSave?.()
  }, [onSave])

  // Handle keyboard shortcuts at this level too
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isModified) {
          handleSave()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave, isModified])

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
      <div className="flex h-12 items-center justify-between border-b-[length:var(--border-width,1px)] border-border px-4">
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
                <span className="text-sm font-medium">{selectedFile.split('/').pop()}</span>
                <Badge variant="secondary" className="text-xs">
                  {getLanguage(selectedFile)}
                </Badge>
                {isLoading && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </Badge>
                )}
                {isModified && !isLoading && (
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
            onClick={handleSave}
            disabled={!isModified || isLoading}
            className="gap-2 [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)]"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        )}
      </div>

      {/* Editor content */}
      {selectedFile ? (
        isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <FileEditor
            path={selectedFile}
            content={content}
            onChange={onChange}
            onSave={handleSave}
            isModified={isModified}
            className="flex-1"
          />
        )
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center border-[length:var(--border-width,1px)] border-border bg-card p-8 [box-shadow:var(--shadow)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-muted [box-shadow:var(--shadow-sm)]">
          <FileCode2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-xl [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">Select a file</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Choose a file from the sidebar to view and edit its contents.
        </p>
      </div>
    </div>
  )
}
