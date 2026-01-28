import * as React from 'react'
import {
  TooltipProvider,
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@wiggum/stack'
import { Header } from './Header'
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
  // Build props
  onBuild?: () => void
  onRefreshPreview?: () => void
  previewUrl?: string
  isBuilding?: boolean
  isPreviewable?: boolean
  // Content
  fileTree?: React.ReactNode
  chat?: React.ReactNode
  preview?: React.ReactNode
  codeEditor?: React.ReactNode
}

function AppLayoutInner({
  projects = [],
  currentProject,
  onProjectSelect,
  onNewProject,
  onBuild,
  onRefreshPreview,
  previewUrl,
  isBuilding = false,
  isPreviewable = true,
  fileTree,
  chat,
  preview,
  codeEditor,
}: AppLayoutProps) {
  const { viewMode } = useLayout()

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
          isPreviewable={isPreviewable}
        />
        {/* Logs panel overlay */}
        <LogsPanel />
      </div>

      {/* Main content area with resizable panels */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Chat panel - always visible */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="flex flex-col h-full overflow-hidden">{chat}</div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right panel - switches based on mode */}
          <ResizablePanel defaultSize={50} minSize={30}>
            {viewMode === 'preview' ? (
              // Preview mode: just the preview pane
              <div className="flex flex-col h-full bg-card overflow-hidden">{preview}</div>
            ) : (
              // Code mode: file tree + code editor side by side
              <div className="flex h-full">
                {/* File Tree - fixed width */}
                <div className="w-64 border-r border-border flex-shrink-0 overflow-hidden">
                  {fileTree}
                </div>
                {/* Code Editor - fills remaining */}
                <div className="flex-1 overflow-hidden">{codeEditor}</div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
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

export { useLayout } from './LayoutContext'
