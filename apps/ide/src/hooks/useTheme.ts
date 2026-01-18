import * as React from 'react'
import { useLocalStorage } from './useLocalStorage'

type Theme = 'light' | 'dark' | 'system'

/**
 * Hook for theme management (dark/light mode)
 */
export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>('wiggum-theme', 'dark')

  // Apply theme to document
  React.useEffect(() => {
    const root = document.documentElement

    if (theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', systemDark)
    } else {
      root.classList.toggle('dark', theme === 'dark')
    }
  }, [theme])

  // Listen for system theme changes
  React.useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const toggleTheme = React.useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [setTheme])

  const isDark = React.useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme === 'dark'
  }, [theme])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  }
}
