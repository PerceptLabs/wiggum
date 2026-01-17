import * as React from 'react'

interface LayoutState {
  sidebarCollapsed: boolean
  previewVisible: boolean
  sidebarWidth: number
  previewWidth: number
}

interface LayoutContextValue extends LayoutState {
  toggleSidebar: () => void
  togglePreview: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setPreviewVisible: (visible: boolean) => void
  setSidebarWidth: (width: number) => void
  setPreviewWidth: (width: number) => void
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

  const value = React.useMemo(
    () => ({
      ...state,
      toggleSidebar,
      togglePreview,
      setSidebarCollapsed,
      setPreviewVisible,
      setSidebarWidth,
      setPreviewWidth,
    }),
    [state, toggleSidebar, togglePreview, setSidebarCollapsed, setPreviewVisible, setSidebarWidth, setPreviewWidth]
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
