import * as React from 'react'
import {
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Bot,
  AlertCircle,
} from 'lucide-react'
import { Button, Input, cn } from '@wiggum/stack'
import type { FileNode } from '@/hooks/useFileTree'

export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'untracked' | 'ignored' | 'unchanged'
export type GitStatusMap = Map<string, GitFileStatus>

interface FileTreeProps {
  nodes: FileNode[]
  onFileSelect: (path: string) => void
  onToggleDir: (path: string) => void
  selectedPath: string | null
  activeDirectory: string | null
  gitStatus?: GitStatusMap
  onNewFile?: () => void
  onNewFolder?: () => void
  onRefresh?: () => void
  isLoading?: boolean
  error?: string | null
}

export function FileTree({
  nodes,
  onFileSelect,
  onToggleDir,
  selectedPath,
  gitStatus,
  onNewFile,
  onNewFolder,
  onRefresh,
  isLoading,
  error,
}: FileTreeProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  // Filter tree based on search
  const filteredNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return nodes
    return filterAndExpandMatches(nodes, searchQuery.toLowerCase())
  }, [nodes, searchQuery])

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Toolbar */}
      <div className="p-2 border-b border-border space-y-2">
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 text-sm"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase font-medium">Files</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNewFile}
              title="New file"
            >
              <FilePlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onNewFolder}
              title="New folder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tree or error/empty state */}
      <div className="flex-1 overflow-auto p-2">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <p className="text-sm text-center">{error}</p>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Retry
            </Button>
          </div>
        ) : filteredNodes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {searchQuery ? 'No matching files' : 'No files yet'}
          </p>
        ) : (
          filteredNodes.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              onFileSelect={onFileSelect}
              onToggleDir={onToggleDir}
              selectedPath={selectedPath}
              gitStatus={gitStatus}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface TreeNodeProps {
  node: FileNode
  depth: number
  onFileSelect: (path: string) => void
  onToggleDir: (path: string) => void
  selectedPath: string | null
  gitStatus?: GitStatusMap
}

function TreeNode({
  node,
  depth,
  onFileSelect,
  onToggleDir,
  selectedPath,
  gitStatus,
}: TreeNodeProps) {
  const isSelected = node.path === selectedPath
  const status = gitStatus?.get(node.path)
  const isRalph = node.name === '.ralph'

  const handleClick = () => {
    if (node.type === 'directory') {
      onToggleDir(node.path)
    } else {
      onFileSelect(node.path)
    }
  }

  const Icon = isRalph
    ? Bot
    : node.type === 'directory'
      ? node.isExpanded
        ? FolderOpen
        : Folder
      : File

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 cursor-pointer rounded text-sm hover:bg-accent',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        onClick={handleClick}
      >
        {node.type === 'directory' ? (
          <ChevronRight
            className={cn('w-4 h-4 transition-transform shrink-0', node.isExpanded && 'rotate-90')}
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Icon className={cn('w-4 h-4 shrink-0', isRalph && 'text-primary')} />
        <span className="truncate flex-1">{node.name}</span>
        {status && status !== 'unchanged' && <GitStatusDot status={status} />}
      </div>

      {node.type === 'directory' &&
        node.isExpanded &&
        node.children.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onFileSelect={onFileSelect}
            onToggleDir={onToggleDir}
            selectedPath={selectedPath}
            gitStatus={gitStatus}
          />
        ))}
    </>
  )
}

const GIT_STATUS_COLORS: Record<GitFileStatus, string> = {
  modified: 'bg-yellow-500',
  added: 'bg-green-500',
  deleted: 'bg-red-500',
  untracked: 'bg-gray-400',
  ignored: 'bg-gray-300',
  unchanged: '',
}

function GitStatusDot({ status }: { status: GitFileStatus }) {
  return <span className={cn('w-2 h-2 rounded-full shrink-0', GIT_STATUS_COLORS[status])} />
}

/**
 * Filter tree to only show branches containing matches.
 * All ancestor directories of matches have isExpanded = true.
 */
function filterAndExpandMatches(nodes: FileNode[], query: string): FileNode[] {
  const result: FileNode[] = []

  for (const node of nodes) {
    const nameMatches = node.name.toLowerCase().includes(query)

    if (node.type === 'directory') {
      // Recursively filter children
      const filteredChildren = filterAndExpandMatches(node.children, query)

      // Include this directory if it matches OR has matching descendants
      if (nameMatches || filteredChildren.length > 0) {
        result.push({
          ...node,
          isExpanded: true, // Auto-expand to show matches
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        })
      }
    } else {
      // Include file if it matches
      if (nameMatches) {
        result.push(node)
      }
    }
  }

  return result
}
