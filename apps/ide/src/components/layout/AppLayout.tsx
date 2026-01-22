import * as React from 'react'
import { PanelRightClose, PanelRight } from 'lucide-react'
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, cn } from '@wiggum/stack'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { LogsPanel } from './LogsPanel'
import { LayoutProvider, useLayout, DEFAULT_PREVIEW_WIDTH } from './LayoutContext'

interface Project {
  id: string
  name: string
}

interface AppLayoutProps {
  // Project props
  projects?: Project[]
  currentProject?: Project | null
  onProjectSelect?: (project: Project) => void
  onNewProject?: () => void
  // Sidebar props
  onSearch?: (query: string) => void
  onInitGit?: () => void
  isGitInitialized?: boolean
  // Build props
  onBuild?: () => void
  onRefreshPreview?: () => void
  previewUrl?: string
  isBuilding?: boolean
  // Content
  sidebar?: React.ReactNode
  chat?: React.ReactNode
  preview?: React.ReactNode
  codeEditor?: React.ReactNode
}

function AppLayoutInner({
  projects = [],
  currentProject,
  onProjectSelect,
  onNewProject,
  onSearch,
  onInitGit,
  isGitInitialized = false,
  onBuild,
  onRefreshPreview,
  previewUrl,
  isBuilding = false,
  sidebar,
  chat,
  preview,
  codeEditor,
}: AppLayoutProps) {
  const { previewVisible, togglePreview, previewWidth, viewMode } = useLayout()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header with project selector and action buttons */}
      <div className="relative">
        <Header
          projectName={currentProject?.name}
          projects={projects}
          currentProject={currentProject}
          onProjectSelect={onProjectSelect}
          onNewProject={onNewProject}
          onBuild={onBuild}
          onRefreshPreview={onRefreshPreview}
          previewUrl={previewUrl}
          isBuilding={isBuilding}
        />
        {/* Logs panel overlay */}
        <LogsPanel />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with file tree */}
        <Sidebar
          onSearch={onSearch}
          onInitGit={onInitGit}
          isGitInitialized={isGitInitialized}
        >
          {sidebar}
        </Sidebar>

        {/* Main content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Chat pane (always visible) */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {chat}
            </div>

            {/* Right panel - switches between Preview and Code Editor */}
            {viewMode === 'code' ? (
              // Code editor view
              <aside
                className="flex flex-col border-l-3 border-border bg-card"
                style={{ width: previewWidth || DEFAULT_PREVIEW_WIDTH }}
              >
                {codeEditor}
              </aside>
            ) : (
              // Preview view
              <>
                {/* Preview toggle button (when preview is hidden) */}
                {!previewVisible && (
                  <div className="flex items-start border-l-3 border-border p-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={togglePreview}>
                          <PanelRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">Show preview</TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Preview pane */}
                {previewVisible && (
                  <aside
                    className="flex flex-col border-l-3 border-border bg-card"
                    style={{ width: previewWidth || DEFAULT_PREVIEW_WIDTH }}
                  >
                    <div className="flex h-12 items-center justify-between border-b-2 border-border px-3">
                      <span className="text-sm font-bold uppercase tracking-wide">Preview</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={togglePreview}>
                            <PanelRightClose className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Hide preview</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex-1 overflow-hidden">{preview}</div>
                  </aside>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <TooltipProvider>
      <LayoutProvider>
        <AppLayoutInner {...props} />
      </LayoutProvider>
    </TooltipProvider>
  )
}
