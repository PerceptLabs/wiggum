import { useState, useCallback } from 'react'

export interface UseDisclosureReturn {
  /** Whether the disclosure is open */
  isOpen: boolean
  /** Open the disclosure */
  open: () => void
  /** Close the disclosure */
  close: () => void
  /** Toggle the disclosure */
  toggle: () => void
  /** Set the disclosure state directly */
  setIsOpen: (value: boolean) => void
}

/**
 * Hook for managing disclosure state (open/closed)
 * Useful for modals, dropdowns, accordions, etc.
 * @param defaultIsOpen - Initial open state (default: false)
 * @returns Disclosure state and handlers
 */
export function useDisclosure(defaultIsOpen = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = useState(defaultIsOpen)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  }
}
