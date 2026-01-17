import * as React from 'react'
import { PanelRightClose, PanelRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { LayoutProvider, useLayout, DEFAULT_PREVIEW_WIDTH } from './LayoutContext'
import { cn } from '@/lib/utils/cn'

interface AppLayoutProps {
  projectName?: string
  sidebar?: React.ReactNode
  chat?: React.ReactNode
  preview?: React.ReactNode
  onSettingsClick?: () => void
}

function AppLayoutInner({
  projectName,
  sidebar,
  chat,
  preview,
  onSettingsClick,
}: AppLayoutProps) {
  const { previewVisible, togglePreview, previewWidth } = useLayout()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header projectName={projectName} onSettingsClick={onSettingsClick} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar>{sidebar}</Sidebar>

        {/* Main content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Chat pane */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {chat}
            </div>

            {/* Preview toggle button (when preview is hidden) */}
            {!previewVisible && (
              <div className="flex items-start border-l p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={togglePreview}>
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
                className="flex flex-col border-l bg-muted/30"
                style={{ width: previewWidth || DEFAULT_PREVIEW_WIDTH }}
              >
                <div className="flex h-10 items-center justify-between border-b px-3">
                  <span className="text-sm font-medium">Preview</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={togglePreview}>
                        <PanelRightClose className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Hide preview</TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex-1 overflow-hidden">{preview}</div>
              </aside>
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
