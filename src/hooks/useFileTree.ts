import * as React from 'react'
import { useFS } from '@/contexts'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

/**
 * Hook for managing file tree state and operations
 */
export function useFileTree(rootPath: string | null) {
  const { fs, isReady } = useFS()
  const [tree, setTree] = React.useState<FileNode[]>([])
  const [expandedDirs, setExpandedDirs] = React.useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Load directory contents
  const loadDirectory = React.useCallback(
    async (dirPath: string): Promise<FileNode[]> => {
      if (!fs) return []

      try {
        const entries = await fs.readdir(dirPath)
        const nodes: FileNode[] = []

        for (const entry of entries) {
          // Skip hidden files and node_modules
          if (entry.startsWith('.') || entry === 'node_modules') continue

          const fullPath = dirPath === '/' ? `/${entry}` : `${dirPath}/${entry}`
          const stat = await fs.stat(fullPath)

          nodes.push({
            name: entry,
            path: fullPath,
            type: stat.isDirectory() ? 'directory' : 'file',
          })
        }

        // Sort: directories first, then alphabetically
        return nodes.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        })
      } catch (err) {
        console.error('Failed to load directory:', dirPath, err)
        return []
      }
    },
    [fs]
  )

  // Load root directory
  const refresh = React.useCallback(async () => {
    if (!fs || !isReady || !rootPath) return

    setIsLoading(true)
    setError(null)

    try {
      const nodes = await loadDirectory(rootPath)
      setTree(nodes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree')
    } finally {
      setIsLoading(false)
    }
  }, [fs, isReady, rootPath, loadDirectory])

  // Load on mount and when root changes
  React.useEffect(() => {
    refresh()
  }, [refresh])

  // Toggle directory expansion
  const toggleDir = React.useCallback(
    async (path: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
        return next
      })

      // Load children if not already loaded
      setTree((prev) => {
        const loadChildren = async (nodes: FileNode[]): Promise<FileNode[]> => {
          return Promise.all(
            nodes.map(async (node) => {
              if (node.path === path && node.type === 'directory' && !node.children) {
                const children = await loadDirectory(path)
                return { ...node, children }
              }
              if (node.children) {
                return { ...node, children: await loadChildren(node.children) }
              }
              return node
            })
          )
        }

        // Trigger async update
        loadChildren(prev).then(setTree)
        return prev
      })
    },
    [loadDirectory]
  )

  // Select a file
  const selectFile = React.useCallback((path: string | null) => {
    setSelectedFile(path)
  }, [])

  // Create a new file
  const createFile = React.useCallback(
    async (path: string, content = '') => {
      if (!fs) return

      await fs.writeFile(path, content, 'utf8')
      await refresh()
    },
    [fs, refresh]
  )

  // Create a new directory
  const createDirectory = React.useCallback(
    async (path: string) => {
      if (!fs) return

      await fs.mkdir(path)
      await refresh()
    },
    [fs, refresh]
  )

  // Delete a file or directory
  const deleteEntry = React.useCallback(
    async (path: string) => {
      if (!fs) return

      const stat = await fs.stat(path)
      if (stat.isDirectory()) {
        await fs.rmdir(path)
      } else {
        await fs.unlink(path)
      }
      await refresh()
    },
    [fs, refresh]
  )

  // Rename a file or directory
  const renameEntry = React.useCallback(
    async (oldPath: string, newPath: string) => {
      if (!fs) return

      await fs.rename(oldPath, newPath)
      await refresh()
    },
    [fs, refresh]
  )

  return {
    tree,
    expandedDirs,
    selectedFile,
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
