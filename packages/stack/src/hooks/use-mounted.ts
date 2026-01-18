import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook that returns whether the component is mounted
 * Useful for avoiding state updates after unmount
 * @returns Whether the component is currently mounted
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return mounted
}

/**
 * Hook that returns a ref to check if component is mounted
 * Unlike useMounted(), this doesn't trigger re-renders
 * @returns Ref containing mount status
 */
export function useIsMountedRef(): { readonly current: boolean } {
  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMountedRef
}

/**
 * Hook that wraps setState to only update if component is mounted
 * Prevents "Can't perform a React state update on an unmounted component" warnings
 * @returns Safe setState function
 */
export function useSafeState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue)
  const isMounted = useIsMountedRef()

  const setSafeState = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (isMounted.current) {
        setState(value)
      }
    },
    [isMounted]
  )

  return [state, setSafeState]
}

/**
 * Hook that runs effect only after first mount (not on initial render)
 * @param effect - Effect to run
 * @param deps - Dependencies array
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    return effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
