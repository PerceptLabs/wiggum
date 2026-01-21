import * as React from 'react'
import { TooltipProvider } from '@wiggum/stack'
import { FSProvider, useFS } from './FSContext'
import { AISettingsProvider, useAISettings } from './AIContext'
import { SessionProvider, useSession } from './SessionContext'
import { ProjectProvider, useProject } from './ProjectContext'

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
        <AISettingsProvider>
          <ProjectProvider>
            <SessionProvider>{children}</SessionProvider>
          </ProjectProvider>
        </AISettingsProvider>
      </FSProvider>
    </TooltipProvider>
  )
}
