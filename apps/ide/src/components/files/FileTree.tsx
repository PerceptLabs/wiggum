import * as React from 'react'
import { FolderPlus, FilePlus, RefreshCw } from 'lucide-react'
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  cn,
} from '@wiggum/stack'
import { FileTreeItem } from './FileTreeItem'
import { FileProvider, type FileEntry } from './FileContext'

interface FileTreeProps {
  entries: FileEntry[]
  onFileSelect?: (path: string) => void
  onNewFile?: () => void
  onNewFolder?: () => void
  onRefresh?: () => void
  onDelete?: (path: string) => void
  onRename?: (path: string) => void
  className?: string
}

export function FileTree({
  entries,
  onFileSelect,
  onNewFile,
  onNewFolder,
  onRefresh,
  onDelete,
  onRename,
  className,
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = React.useState<{
    x: number
    y: number
    path: string
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path })
  }

  const closeContextMenu = () => setContextMenu(null)

  // Sort entries: directories first, then alphabetically
  const sortedEntries = React.useMemo(() => {
    return [...entries].sort((a, b) => {
      if (a.type === b.type) {
        // .ralph directory should be at the top
        if (a.name === '.ralph') return -1
        if (b.name === '.ralph') return 1
        return a.name.localeCompare(b.name)
      }
      return a.type === 'directory' ? -1 : 1
    })
  }, [entries])

  return (
    <FileProvider onFileSelect={onFileSelect}>
      <div className={cn('flex flex-col', className)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase">Files</span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewFile}>
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewFolder}>
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New folder</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRefresh}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tree */}
        <div
          className="flex-1"
          onContextMenu={(e) => {
            const target = e.target as HTMLElement
            const button = target.closest('button')
            if (button) {
              const path = button.getAttribute('data-path')
              if (path) {
                handleContextMenu(e, path)
              }
            }
          }}
        >
          {sortedEntries.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              No files yet
            </div>
          ) : (
            sortedEntries.map((entry) => <FileTreeItem key={entry.path} entry={entry} />)
          )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <DropdownMenu open onOpenChange={closeContextMenu}>
            <DropdownMenuTrigger asChild>
              <div
                style={{
                  position: 'fixed',
                  left: contextMenu.x,
                  top: contextMenu.y,
                  width: 1,
                  height: 1,
                }}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onRename?.(contextMenu.path)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(contextMenu.path)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </FileProvider>
  )
}
