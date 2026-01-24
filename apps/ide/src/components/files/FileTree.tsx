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

/** Git file status from isomorphic-git */
export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored' | 'unchanged'

/** Map of file path to git status */
export type GitStatusMap = Map<string, GitFileStatus>

interface FileTreeProps {
  entries: FileEntry[]
  onFileSelect?: (path: string) => void
  /** Called when a directory is toggled (for lazy-loading children) */
  onToggleDir?: (path: string) => void
  onNewFile?: () => void
  onNewFolder?: () => void
  onRefresh?: () => void
  onDelete?: (path: string) => void
  onRename?: (path: string) => void
  /** Search query for filtering */
  searchQuery?: string
  /** Git status map for file indicators */
  gitStatus?: GitStatusMap
  /** Selected file path */
  selectedPath?: string
  className?: string
}

/**
 * Recursively filter entries based on search query
 * Shows files that match and any parent directories needed to reach them
 */
function filterEntries(entries: FileEntry[], query: string): FileEntry[] {
  if (!query.trim()) return entries

  const lowerQuery = query.toLowerCase()

  return entries.reduce<FileEntry[]>((acc, entry) => {
    const nameMatches = entry.name.toLowerCase().includes(lowerQuery)

    if (entry.type === 'directory' && entry.children) {
      const filteredChildren = filterEntries(entry.children, query)
      // Include directory if name matches or has matching children
      if (nameMatches || filteredChildren.length > 0) {
        acc.push({
          ...entry,
          children: filteredChildren.length > 0 ? filteredChildren : entry.children,
        })
      }
    } else if (nameMatches) {
      acc.push(entry)
    }

    return acc
  }, [])
}

export function FileTree({
  entries,
  onFileSelect,
  onToggleDir,
  onNewFile,
  onNewFolder,
  onRefresh,
  onDelete,
  onRename,
  searchQuery,
  gitStatus,
  selectedPath,
  className,
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = React.useState<{
    x: number
    y: number
    path: string
    isDirectory: boolean
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent, path: string, isDirectory: boolean) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDirectory })
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

  // Filter entries based on search query
  const filteredEntries = React.useMemo(() => {
    return filterEntries(sortedEntries, searchQuery || '')
  }, [sortedEntries, searchQuery])

  return (
    <FileProvider onFileSelect={onFileSelect} onToggleDir={onToggleDir}>
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
          className="flex-1 overflow-y-auto"
          onContextMenu={(e) => {
            const target = e.target as HTMLElement
            const button = target.closest('button[data-path]')
            if (button) {
              const path = button.getAttribute('data-path')
              const isDir = button.getAttribute('data-is-directory') === 'true'
              if (path) {
                handleContextMenu(e, path, isDir)
              }
            }
          }}
        >
          {filteredEntries.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No matching files' : 'No files yet'}
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <FileTreeItem
                key={entry.path}
                entry={entry}
                gitStatus={gitStatus}
                searchQuery={searchQuery}
              />
            ))
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
              <DropdownMenuItem
                onClick={() => {
                  onRename?.(contextMenu.path)
                  closeContextMenu()
                }}
              >
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  onDelete?.(contextMenu.path)
                  closeContextMenu()
                }}
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
