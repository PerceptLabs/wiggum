import * as React from 'react'

export type ViewMode = 'preview' | 'code'

interface LayoutState {
  sidebarCollapsed: boolean
  previewVisible: boolean
  sidebarWidth: number
  previewWidth: number
  viewMode: ViewMode
  logsOpen: boolean
  buildLogs: string[]
}

interface LayoutContextValue extends LayoutState {
  toggleSidebar: () => void
  togglePreview: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setPreviewVisible: (visible: boolean) => void
  setSidebarWidth: (width: number) => void
  setPreviewWidth: (width: number) => void
  setViewMode: (mode: ViewMode) => void
  toggleLogs: () => void
  setLogsOpen: (open: boolean) => void
  addBuildLog: (log: string) => void
  clearBuildLogs: () => void
}

const LayoutContext = React.createContext<LayoutContextValue | null>(null)

const DEFAULT_SIDEBAR_WIDTH = 260
const DEFAULT_PREVIEW_WIDTH = 400
const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 400
const MIN_PREVIEW_WIDTH = 300
const MAX_PREVIEW_WIDTH = 600

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LayoutState>({
    sidebarCollapsed: false,
    previewVisible: true,
    sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
    previewWidth: DEFAULT_PREVIEW_WIDTH,
    viewMode: 'preview',
    logsOpen: false,
    buildLogs: [],
  })

  const toggleSidebar = React.useCallback(() => {
    setState((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed }))
  }, [])

  const togglePreview = React.useCallback(() => {
    setState((s) => ({ ...s, previewVisible: !s.previewVisible }))
  }, [])

  const setSidebarCollapsed = React.useCallback((collapsed: boolean) => {
    setState((s) => ({ ...s, sidebarCollapsed: collapsed }))
  }, [])

  const setPreviewVisible = React.useCallback((visible: boolean) => {
    setState((s) => ({ ...s, previewVisible: visible }))
  }, [])

  const setSidebarWidth = React.useCallback((width: number) => {
    const clampedWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width))
    setState((s) => ({ ...s, sidebarWidth: clampedWidth }))
  }, [])

  const setPreviewWidth = React.useCallback((width: number) => {
    const clampedWidth = Math.max(MIN_PREVIEW_WIDTH, Math.min(MAX_PREVIEW_WIDTH, width))
    setState((s) => ({ ...s, previewWidth: clampedWidth }))
  }, [])

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
      toggleSidebar,
      togglePreview,
      setSidebarCollapsed,
      setPreviewVisible,
      setSidebarWidth,
      setPreviewWidth,
      setViewMode,
      toggleLogs,
      setLogsOpen,
      addBuildLog,
      clearBuildLogs,
    }),
    [state, toggleSidebar, togglePreview, setSidebarCollapsed, setPreviewVisible, setSidebarWidth, setPreviewWidth, setViewMode, toggleLogs, setLogsOpen, addBuildLog, clearBuildLogs]
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

export { DEFAULT_SIDEBAR_WIDTH, DEFAULT_PREVIEW_WIDTH }
