import * as React from 'react'

export interface FileEntry {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileEntry[]
}

interface FileState {
  selectedFile: string | null
  expandedDirs: Set<string>
  openFiles: string[]
}

interface FileContextValue extends FileState {
  selectFile: (path: string) => void
  toggleDir: (path: string) => void
  expandDir: (path: string) => void
  collapseDir: (path: string) => void
  openFile: (path: string) => void
  closeFile: (path: string) => void
  isExpanded: (path: string) => boolean
}

const FileContext = React.createContext<FileContextValue | null>(null)

export function useFileContext() {
  const context = React.useContext(FileContext)
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider')
  }
  return context
}

interface FileProviderProps {
  children: React.ReactNode
  onFileSelect?: (path: string) => void
}

export function FileProvider({ children, onFileSelect }: FileProviderProps) {
  const [state, setState] = React.useState<FileState>({
    selectedFile: null,
    expandedDirs: new Set(),
    openFiles: [],
  })

  const selectFile = React.useCallback(
    (path: string) => {
      setState((s) => ({ ...s, selectedFile: path }))
      onFileSelect?.(path)
    },
    [onFileSelect]
  )

  const toggleDir = React.useCallback((path: string) => {
    setState((s) => {
      const newExpanded = new Set(s.expandedDirs)
      if (newExpanded.has(path)) {
        newExpanded.delete(path)
      } else {
        newExpanded.add(path)
      }
      return { ...s, expandedDirs: newExpanded }
    })
  }, [])

  const expandDir = React.useCallback((path: string) => {
    setState((s) => {
      const newExpanded = new Set(s.expandedDirs)
      newExpanded.add(path)
      return { ...s, expandedDirs: newExpanded }
    })
  }, [])

  const collapseDir = React.useCallback((path: string) => {
    setState((s) => {
      const newExpanded = new Set(s.expandedDirs)
      newExpanded.delete(path)
      return { ...s, expandedDirs: newExpanded }
    })
  }, [])

  const openFile = React.useCallback((path: string) => {
    setState((s) => {
      if (s.openFiles.includes(path)) {
        return { ...s, selectedFile: path }
      }
      return { ...s, openFiles: [...s.openFiles, path], selectedFile: path }
    })
  }, [])

  const closeFile = React.useCallback((path: string) => {
    setState((s) => {
      const newOpenFiles = s.openFiles.filter((f) => f !== path)
      const newSelected =
        s.selectedFile === path ? newOpenFiles[newOpenFiles.length - 1] || null : s.selectedFile
      return { ...s, openFiles: newOpenFiles, selectedFile: newSelected }
    })
  }, [])

  const isExpanded = React.useCallback(
    (path: string) => state.expandedDirs.has(path),
    [state.expandedDirs]
  )

  const value = React.useMemo(
    () => ({
      ...state,
      selectFile,
      toggleDir,
      expandDir,
      collapseDir,
      openFile,
      closeFile,
      isExpanded,
    }),
    [state, selectFile, toggleDir, expandDir, collapseDir, openFile, closeFile, isExpanded]
  )

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>
}
