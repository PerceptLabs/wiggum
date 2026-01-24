import * as React from 'react'
import { useFS } from '@/contexts'

export interface UseFileContentResult {
  /** Current file content (editable) */
  content: string
  /** Update the content (marks as modified) */
  setContent: (content: string) => void
  /** Whether content differs from saved version */
  isModified: boolean
  /** Whether file is currently loading */
  isLoading: boolean
  /** Error message if load/save failed */
  error: string | null
  /** Save the file to filesystem */
  saveFile: () => Promise<void>
  /** Reload content from filesystem (discards changes) */
  reload: () => Promise<void>
}

/**
 * Hook for loading, editing, and saving file content
 *
 * @param filePath - Absolute path to the file, or null if no file selected
 */
export function useFileContent(filePath: string | null): UseFileContentResult {
  const { fs, isReady } = useFS()

  const [content, setContent] = React.useState<string>('')
  const [originalContent, setOriginalContent] = React.useState<string>('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Track current file path to handle race conditions
  const currentPathRef = React.useRef<string | null>(null)

  // Load file content
  const loadFile = React.useCallback(async () => {
    if (!fs || !isReady || !filePath) {
      setContent('')
      setOriginalContent('')
      setError(null)
      return
    }

    // Check if this is a directory by trying to stat it
    try {
      const stat = await fs.stat(filePath)
      if (stat.isDirectory()) {
        // Don't try to read directory content
        setContent('')
        setOriginalContent('')
        setError(null)
        return
      }
    } catch {
      // File doesn't exist or error - will be handled in readFile
    }

    setIsLoading(true)
    setError(null)
    currentPathRef.current = filePath

    try {
      const fileContent = await fs.readFile(filePath, { encoding: 'utf8' })

      // Only update if this is still the current file
      if (currentPathRef.current === filePath) {
        const textContent = typeof fileContent === 'string' ? fileContent : new TextDecoder().decode(fileContent)
        setContent(textContent)
        setOriginalContent(textContent)
      }
    } catch (err) {
      if (currentPathRef.current === filePath) {
        const message = err instanceof Error ? err.message : 'Failed to load file'
        setError(message)
        setContent('')
        setOriginalContent('')
      }
    } finally {
      if (currentPathRef.current === filePath) {
        setIsLoading(false)
      }
    }
  }, [fs, isReady, filePath])

  // Load file when path changes
  React.useEffect(() => {
    loadFile()
  }, [loadFile])

  // Save file to filesystem
  const saveFile = React.useCallback(async () => {
    if (!fs || !filePath) {
      setError('Cannot save: no file selected')
      return
    }

    try {
      await fs.writeFile(filePath, content, 'utf8')
      setOriginalContent(content)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file'
      setError(message)
      throw err
    }
  }, [fs, filePath, content])

  // Reload file (discard changes)
  const reload = React.useCallback(async () => {
    await loadFile()
  }, [loadFile])

  // Calculate if modified
  const isModified = content !== originalContent

  return {
    content,
    setContent,
    isModified,
    isLoading,
    error,
    saveFile,
    reload,
  }
}
