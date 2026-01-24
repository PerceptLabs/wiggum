import * as React from 'react'
import { PanelRightClose, PanelRight, GripVertical } from 'lucide-react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import { Button, Tooltip, TooltipContent, TooltipTrigger, TooltipProvider, cn } from '@wiggum/stack'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { LogsPanel } from './LogsPanel'
import { LayoutProvider, useLayout } from './LayoutContext'

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
  const { previewVisible, togglePreview, viewMode } = useLayout()

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
        <Sidebar onSearch={onSearch} onInitGit={onInitGit} isGitInitialized={isGitInitialized}>
          {sidebar}
        </Sidebar>

        {/* Main content area with resizable panels */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <Group orientation="horizontal" className="flex-1">
            {/* Chat pane (always visible) */}
            <Panel defaultSize={previewVisible ? 55 : 100} minSize={30}>
              <div className="flex flex-col h-full overflow-hidden">{chat}</div>
            </Panel>

            {/* Right panel - switches between Preview and Code Editor */}
            {viewMode === 'code' ? (
              // Code editor view
              <>
                <Separator className="w-1 bg-border hover:bg-primary/50 transition-colors data-[resize-handle-active]:bg-primary" />
                <Panel defaultSize={45} minSize={20}>
                  <aside className="flex flex-col h-full bg-card">{codeEditor}</aside>
                </Panel>
              </>
            ) : (
              // Preview view
              <>
                {/* Preview toggle button (when preview is hidden) */}
                {!previewVisible && (
                  <div className="flex items-start border-l border-border p-2">
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

                {/* Preview pane with resize handle */}
                {previewVisible && (
                  <>
                    <Separator className="w-2 bg-border hover:bg-primary/50 transition-colors data-[resize-handle-active]:bg-primary flex items-center justify-center group">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </Separator>
                    <Panel defaultSize={45} minSize={20}>
                      <aside className="flex flex-col h-full bg-card">
                        <div className="flex h-10 items-center justify-between border-b border-border px-3">
                          <span className="text-sm font-semibold uppercase tracking-wide">
                            Preview
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={togglePreview}
                              >
                                <PanelRightClose className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left">Hide preview</TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex-1 overflow-hidden">{preview}</div>
                      </aside>
                    </Panel>
                  </>
                )}
              </>
            )}
          </Group>
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
