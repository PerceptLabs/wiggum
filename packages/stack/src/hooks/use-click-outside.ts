import { useEffect, useRef, type RefObject } from 'react'

type Handler = (event: MouseEvent | TouchEvent) => void

/**
 * Hook that detects clicks outside of a referenced element
 * @param handler - Callback function to run when clicking outside
 * @returns Ref to attach to the element
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: Handler
): RefObject<T | null> {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current

      // Do nothing if clicking ref's element or descendent elements
      if (!el || el.contains(event.target as Node)) {
        return
      }

      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [handler])

  return ref
}

/**
 * Hook that detects clicks outside of multiple referenced elements
 * @param refs - Array of refs to monitor
 * @param handler - Callback function to run when clicking outside all refs
 */
export function useClickOutsideMultiple<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T>[],
  handler: Handler
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Check if click is inside any of the refs
      const isInside = refs.some((ref) => {
        const el = ref.current
        return el && el.contains(event.target as Node)
      })

      if (!isInside) {
        handler(event)
      }
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [refs, handler])
}
