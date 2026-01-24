import * as React from 'react'
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileJson,
  FileText,
  FileCode,
  Image,
  Bot,
} from 'lucide-react'
import { cn } from '@wiggum/stack'
import { useFileContext, type FileEntry } from './FileContext'
import type { GitStatusMap, GitFileStatus } from './FileTree'

interface FileTreeItemProps {
  entry: FileEntry
  depth?: number
  gitStatus?: GitStatusMap
  searchQuery?: string
}

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  json: FileJson,
  md: FileText,
  txt: FileText,
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  css: FileCode,
  html: FileCode,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  svg: Image,
}

/** Colors for git status indicators */
const GIT_STATUS_COLORS: Record<GitFileStatus, string> = {
  modified: 'bg-yellow-500',
  added: 'bg-green-500',
  deleted: 'bg-red-500',
  untracked: 'bg-gray-400',
  ignored: 'bg-gray-300',
  unchanged: '',
}

/** Tooltip labels for git status */
const GIT_STATUS_LABELS: Record<GitFileStatus, string> = {
  modified: 'Modified',
  added: 'Staged',
  deleted: 'Deleted',
  untracked: 'Untracked',
  ignored: 'Ignored',
  unchanged: '',
}

function getFileIcon(name: string, isDirectory: boolean, isExpanded: boolean) {
  if (isDirectory) {
    // Special icon for .ralph directory
    if (name === '.ralph') {
      return Bot
    }
    return isExpanded ? FolderOpen : Folder
  }

  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICONS[ext] || File
}

export function FileTreeItem({ entry, depth = 0, gitStatus, searchQuery }: FileTreeItemProps) {
  const { selectedFile, selectFile, toggleDir, isExpanded, openFile } = useFileContext()

  const isDir = entry.type === 'directory'
  const expanded = isExpanded(entry.path)
  const isSelected = selectedFile === entry.path
  const isRalphDir = entry.name === '.ralph'

  // Get git status for this file
  const fileGitStatus = gitStatus?.get(entry.path)
  const statusColor = fileGitStatus ? GIT_STATUS_COLORS[fileGitStatus] : ''
  const statusLabel = fileGitStatus ? GIT_STATUS_LABELS[fileGitStatus] : ''

  const Icon = getFileIcon(entry.name, isDir, expanded)

  const handleClick = () => {
    if (isDir) {
      toggleDir(entry.path)
    } else {
      selectFile(entry.path)
    }
  }

  const handleDoubleClick = () => {
    if (!isDir) {
      openFile(entry.path)
    }
  }

  // Auto-expand directories when searching
  const shouldExpand = searchQuery && isDir && !expanded

  React.useEffect(() => {
    if (shouldExpand) {
      toggleDir(entry.path)
    }
  }, [shouldExpand, entry.path, toggleDir])

  return (
    <div>
      <button
        data-path={entry.path}
        data-is-directory={isDir}
        className={cn(
          'flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-accent',
          isSelected && 'bg-accent',
          isRalphDir && 'text-primary'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isDir ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}

        <Icon
          className={cn(
            'h-4 w-4 shrink-0',
            isDir ? 'text-yellow-500' : 'text-muted-foreground',
            isRalphDir && 'text-primary'
          )}
        />

        <span className="truncate flex-1">{entry.name}</span>

        {/* Git status indicator */}
        {statusColor && (
          <span
            className={cn('h-2 w-2 rounded-full shrink-0', statusColor)}
            title={statusLabel}
          />
        )}
      </button>

      {isDir && expanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              gitStatus={gitStatus}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  )
}
