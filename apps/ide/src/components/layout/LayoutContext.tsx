import * as React from 'react'

export type ViewMode = 'preview' | 'code'

interface LayoutState {
  viewMode: ViewMode
  logsOpen: boolean
  buildLogs: string[]
}

interface LayoutContextValue extends LayoutState {
  setViewMode: (mode: ViewMode) => void
  toggleLogs: () => void
  setLogsOpen: (open: boolean) => void
  addBuildLog: (log: string) => void
  clearBuildLogs: () => void
}

const LayoutContext = React.createContext<LayoutContextValue | null>(null)

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LayoutState>({
    viewMode: 'preview',
    logsOpen: false,
    buildLogs: [],
  })

  const setViewMode = React.useCallback((mode: ViewMode) => {
    setState((s) => ({ ...s, viewMode: mode }))
  }, [])

  const toggleLogs = React.useCallback(() => {
    setState((s) => ({ ...s, logsOpen: !s.logsOpen }))
  }, [])

  const setLogsOpen = React.useCallback((open: boolean) => {
    setState((s) => ({ ...s, logsOpen: open }))
  }, [])

  const addBuildLog = React.useCallback((log: string) => {
    setState((s) => ({ ...s, buildLogs: [...s.buildLogs, log] }))
  }, [])

  const clearBuildLogs = React.useCallback(() => {
    setState((s) => ({ ...s, buildLogs: [] }))
  }, [])

  const value = React.useMemo(
    () => ({
      ...state,
      setViewMode,
      toggleLogs,
      setLogsOpen,
      addBuildLog,
      clearBuildLogs,
    }),
    [state, setViewMode, toggleLogs, setLogsOpen, addBuildLog, clearBuildLogs]
  )

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export function useLayout() {
  const context = React.useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}

export { LayoutContext }
