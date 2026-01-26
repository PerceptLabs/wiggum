import * as React from 'react'
import { Tree, NodeApi } from 'react-arborist'
import useResizeObserver from 'use-resize-observer'
import {
  FolderPlus,
  FilePlus,
  RefreshCw,
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Bot,
} from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, cn } from '@wiggum/stack'
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

// Convert FileEntry[] to react-arborist format
interface TreeNode {
  id: string // path (used as unique ID)
  name: string
  children?: TreeNode[]
}

/**
 * Sort entries: directories first, .ralph at top, then alphabetically
 */
function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.type === b.type) {
      // .ralph directory should be at the top
      if (a.name === '.ralph') return -1
      if (b.name === '.ralph') return 1
      return a.name.localeCompare(b.name)
    }
    return a.type === 'directory' ? -1 : 1
  })
}

/**
 * Convert FileEntry[] to react-arborist TreeNode[] format
 */
function toTreeData(entries: FileEntry[]): TreeNode[] {
  const sorted = sortEntries(entries)
  return sorted.map((entry) => ({
    id: entry.path,
    name: entry.name,
    children:
      entry.type === 'directory' && entry.children ? toTreeData(entry.children) : undefined,
  }))
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
  // Convert entries to react-arborist format
  const treeData = React.useMemo(() => toTreeData(entries), [entries])

  // Context menu state
  const [contextMenu, setContextMenu] = React.useState<{
    x: number
    y: number
    path: string
  } | null>(null)

  // Dynamic height from container
  const { ref: containerRef, height = 400 } = useResizeObserver<HTMLDivElement>()

  // Handle context menu
  const handleContextMenu = React.useCallback((e: React.MouseEvent, path: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, path })
  }, [])

  const closeContextMenu = () => setContextMenu(null)

  return (
    <FileProvider onFileSelect={onFileSelect} onToggleDir={onToggleDir}>
      <div className={cn('flex flex-col h-full', className)}>
        {/* Toolbar */}
        <div className="flex items-center justify-between pb-2 flex-shrink-0">
          <span className="text-xs font-medium text-muted-foreground uppercase">Files</span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onNewFile}
                  aria-label="New file"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onNewFolder}
                  aria-label="New folder"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New folder</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={onRefresh}
                  aria-label="Refresh"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tree container - flex-1 to fill remaining space */}
        <div ref={containerRef} className="flex-1 overflow-hidden min-h-0">
          {treeData.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No matching files' : 'No files yet'}
            </div>
          ) : (
            <Tree<TreeNode>
              data={treeData}
              openByDefault={false}
              width="100%"
              height={height}
              indent={12}
              rowHeight={26}
              searchTerm={searchQuery}
              searchMatch={(node, term) =>
                node.data.name.toLowerCase().includes(term.toLowerCase())
              }
              selection={selectedPath}
              onSelect={(nodes: NodeApi<TreeNode>[]) => {
                const node = nodes[0]
                if (node) {
                  if (node.isLeaf) {
                    onFileSelect?.(node.id)
                  } else {
                    onToggleDir?.(node.id)
                  }
                }
              }}
            >
              {(props) => (
                <FileNode {...props} gitStatus={gitStatus} onContextMenu={handleContextMenu} />
              )}
            </Tree>
          )}
        </div>

        {/* Context Menu (positioned absolutely) */}
        {contextMenu && (
          <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
            <div
              className="absolute bg-popover border rounded-md shadow-md py-1 min-w-32"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                type="button"
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent"
                onClick={() => {
                  onRename?.(contextMenu.path)
                  closeContextMenu()
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-accent text-destructive"
                onClick={() => {
                  onDelete?.(contextMenu.path)
                  closeContextMenu()
                }}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </FileProvider>
  )
}

// Custom node renderer props
interface FileNodeProps {
  node: NodeApi<TreeNode>
  style: React.CSSProperties
  dragHandle?: React.RefCallback<HTMLElement>
  gitStatus?: GitStatusMap
  onContextMenu: (e: React.MouseEvent, path: string) => void
}

// Custom node renderer
function FileNode({
  node,
  style,
  dragHandle,
  gitStatus,
  onContextMenu,
}: FileNodeProps) {
  const isRalph = node.data.name === '.ralph'
  const status = gitStatus?.get(node.id)
  const isFolder = !node.isLeaf

  const Icon = isRalph ? Bot : isFolder ? (node.isOpen ? FolderOpen : Folder) : File

  const statusColors: Record<GitFileStatus, string> = {
    modified: 'bg-yellow-500',
    added: 'bg-green-500',
    deleted: 'bg-red-500',
    untracked: 'bg-gray-400',
    ignored: 'bg-gray-300',
    unchanged: '',
  }

  return (
    <div
      ref={dragHandle}
      style={style}
      className={cn(
        'flex items-center gap-1 px-2 py-0.5 cursor-pointer rounded text-sm',
        'hover:bg-accent',
        node.isSelected && 'bg-accent'
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (isFolder) {
          node.toggle()
        } else {
          node.select()
        }
      }}
      onContextMenu={(e) => onContextMenu(e, node.id)}
      data-path={node.id}
      data-is-directory={isFolder}
    >
      {/* Expand/collapse indicator */}
      {isFolder ? (
        <span className="w-4 flex-shrink-0">
          {node.isOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}

      {/* Icon */}
      <Icon className={cn('w-4 h-4 flex-shrink-0', isRalph && 'text-primary')} />

      {/* Name (editable when renaming) */}
      {node.isEditing ? (
        <input
          type="text"
          defaultValue={node.data.name}
          autoFocus
          className="flex-1 bg-background border px-1 text-sm min-w-0"
          onBlur={() => node.reset()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') node.submit(e.currentTarget.value)
            if (e.key === 'Escape') node.reset()
          }}
        />
      ) : (
        <span className="truncate flex-1 min-w-0">{node.data.name}</span>
      )}

      {/* Git status indicator */}
      {status && status !== 'unchanged' && (
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[status])} />
      )}
    </div>
  )
}
