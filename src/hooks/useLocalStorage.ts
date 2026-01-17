import * as React from 'react'

/**
 * Hook for persistent storage with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Get stored value or use initial value
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  // Update localStorage when value changes
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue))
    } catch {
      // Ignore storage errors (quota exceeded, etc.)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}
