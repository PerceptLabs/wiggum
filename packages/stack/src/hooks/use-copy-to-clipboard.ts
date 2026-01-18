import { useState, useCallback } from 'react'

export interface UseCopyToClipboardReturn {
  /** The copied text (null if not copied yet) */
  copiedText: string | null
  /** Whether copying was successful */
  isCopied: boolean
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>
  /** Reset the copied state */
  reset: () => void
}

/**
 * Hook for copying text to clipboard
 * @param resetDelay - Delay in ms before auto-resetting isCopied (0 to disable)
 * @returns Copy state and handlers
 */
export function useCopyToClipboard(resetDelay: number = 2000): UseCopyToClipboardReturn {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const reset = useCallback(() => {
    setCopiedText(null)
    setIsCopied(false)
  }, [])

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn('Clipboard API not available')
        return false
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopiedText(text)
        setIsCopied(true)

        // Auto-reset after delay
        if (resetDelay > 0) {
          setTimeout(() => {
            setIsCopied(false)
          }, resetDelay)
        }

        return true
      } catch (error) {
        console.warn('Failed to copy to clipboard:', error)
        setCopiedText(null)
        setIsCopied(false)
        return false
      }
    },
    [resetDelay]
  )

  return {
    copiedText,
    isCopied,
    copy,
    reset,
  }
}
