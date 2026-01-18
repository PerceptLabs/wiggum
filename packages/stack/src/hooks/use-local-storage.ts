import { useState, useEffect, useCallback } from 'react'

/**
 * Hook for persisting state to localStorage
 * @param key - localStorage key
 * @param initialValue - Initial value if no stored value exists
 * @returns [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use initialValue
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  }, [initialValue, key])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  // Set value in state and localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        console.warn('useLocalStorage: localStorage is not available')
        return
      }

      try {
        const newValue = value instanceof Function ? value(storedValue) : value
        window.localStorage.setItem(key, JSON.stringify(newValue))
        setStoredValue(newValue)

        // Dispatch storage event for other tabs
        window.dispatchEvent(new Event('local-storage'))
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.removeItem(key)
      setStoredValue(initialValue)
      window.dispatchEvent(new Event('local-storage'))
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [initialValue, key])

  // Listen for changes in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        setStoredValue(JSON.parse(event.newValue) as T)
      }
    }

    const handleLocalStorageChange = () => {
      setStoredValue(readValue())
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('local-storage', handleLocalStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('local-storage', handleLocalStorageChange)
    }
  }, [key, readValue])

  return [storedValue, setValue, removeValue]
}
