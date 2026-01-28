import * as React from 'react'
import { useFS } from '@/contexts'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  isExpanded: boolean
  children: FileNode[]
}

/**
 * Hook for managing file tree state with eager loading.
 *
 * Key design decisions:
 * - Load entire tree on mount (projects are small, <500 files)
 * - isExpanded stored on each node (not in separate Set)
 * - toggleDir is synchronous (just flips a boolean)
 * - No lazy loading (eliminates race conditions)
 */
export function useFileTree(rootPath: string | null) {
  const { fs, isReady } = useFS()
  const [tree, setTree] = React.useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null)
  const [activeDirectory, setActiveDirectory] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load entire tree recursively (eager loading)
  const loadFullTree = React.useCallback(
    async (dirPath: string): Promise<FileNode[]> => {
      if (!fs) return []

      const entries = await fs.readdir(dirPath)
      const nodes: FileNode[] = []

      for (const entry of entries) {
        // Skip node_modules
        if (entry === 'node_modules') continue

        const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`

        try {
          const stat = await fs.stat(fullPath)
          const isDir = stat.isDirectory()

          nodes.push({
            name: entry,
            path: fullPath,
            type: isDir ? 'directory' : 'file',
            isExpanded: false,
            children: isDir ? await loadFullTree(fullPath) : [],
          })
        } catch {
          // Skip files we can't stat
        }
      }

      return sortNodes(nodes)
    },
    [fs]
  )

  // Refresh entire tree with error handling
  const refresh = React.useCallback(async () => {
    if (!fs || !isReady || !rootPath) return

    setIsLoading(true)
    setError(null)

    try {
      const nodes = await loadFullTree(rootPath)
      setTree(nodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree')
    } finally {
      setIsLoading(false)
    }
  }, [fs, isReady, rootPath, loadFullTree])

  // Load on mount and when root changes
  React.useEffect(() => {
    refresh()
  }, [refresh])

  // Synchronous toggle - just flip the boolean
  const toggleDir = React.useCallback((path: string) => {
    setTree((prev) => updateNodeExpansion(prev, path))
    setActiveDirectory(path)
  }, [])

  // Select a file and update active directory
  const selectFile = React.useCallback(
    (path: string | null) => {
      setSelectedFile(path)
      if (path) {
        // Set active directory to parent of selected file
        const parent = path.substring(0, path.lastIndexOf('/'))
        setActiveDirectory(parent || rootPath)
      }
    },
    [rootPath]
  )

  // Create a new file
  const createFile = React.useCallback(
    async (path: string, content = '') => {
      if (!fs) return

      try {
        await fs.writeFile(path, content, 'utf8')
        await refresh()
      } catch (err) {
        throw new Error(
          `Failed to create file: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    },
    [fs, refresh]
  )

  // Create a new directory
  const createDirectory = React.useCallback(
    async (path: string) => {
      if (!fs) return

      try {
        await fs.mkdir(path)
        await refresh()
      } catch (err) {
        throw new Error(
          `Failed to create directory: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    },
    [fs, refresh]
  )

  // Delete a file or directory
  const deleteEntry = React.useCallback(
    async (path: string) => {
      if (!fs) return

      try {
        const stat = await fs.stat(path)
        if (stat.isDirectory()) {
          await fs.rmdir(path, { recursive: true })
        } else {
          await fs.unlink(path)
        }
        await refresh()
      } catch (err) {
        throw new Error(
          `Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    },
    [fs, refresh]
  )

  // Rename a file or directory
  const renameEntry = React.useCallback(
    async (oldPath: string, newPath: string) => {
      if (!fs) return

      try {
        await fs.rename(oldPath, newPath)
        await refresh()
      } catch (err) {
        throw new Error(
          `Failed to rename: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    },
    [fs, refresh]
  )

  return {
    tree,
    selectedFile,
    activeDirectory,
    isLoading,
    error,
    toggleDir,
    selectFile,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    refresh,
  }
}

/**
 * Recursively update isExpanded for a specific path
 */
function updateNodeExpansion(nodes: FileNode[], targetPath: string): FileNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, isExpanded: !node.isExpanded }
    }
    if (node.children.length > 0) {
      return { ...node, children: updateNodeExpansion(node.children, targetPath) }
    }
    return node
  })
}

/**
 * Sort nodes: .ralph first, then directories, then files alphabetically
 */
function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    // .ralph always first
    if (a.name === '.ralph') return -1
    if (b.name === '.ralph') return 1
    // Directories before files
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    // Alphabetical within same type
    return a.name.localeCompare(b.name)
  })
}
