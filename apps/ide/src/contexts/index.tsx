import * as React from 'react'
import { TooltipProvider } from '@wiggum/stack'
import { FSProvider } from './FSContext'
import { AIProvider } from './AIContext'
import { SessionProvider } from './SessionContext'
import { ProjectProvider } from './ProjectContext'
import { LayoutProvider } from '@/components/layout'

// Re-export hooks and types
export { useFS } from './FSContext'
export { useAISettings } from './AIContext'
export { useSession } from './SessionContext'
export { useProject } from './ProjectContext'
export type { Project } from './ProjectContext'

/**
 * Combined provider that wraps all app context providers
 * Order matters: inner providers may depend on outer ones
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <FSProvider>
        <AIProvider>
          <ProjectProvider>
            <SessionProvider>
              <LayoutProvider>{children}</LayoutProvider>
            </SessionProvider>
          </ProjectProvider>
        </AIProvider>
      </FSProvider>
    </TooltipProvider>
  )
}
