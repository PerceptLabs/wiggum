import * as React from 'react'
import { SessionManager } from '@/lib/session'
import { AIClient } from '@/lib/ai'
import type { AIMessage } from '@/lib/ai'
import type { Tool } from '@/lib/tools'
import { useAISettings } from './AIContext'

interface SessionState {
  messages: AIMessage[]
  isLoading: boolean
  streamingContent: string
  error: string | null
}

interface SessionContextValue extends SessionState {
  manager: SessionManager | null
  sendMessage: (projectId: string, content: string) => Promise<void>
  stopGeneration: (projectId: string) => void
  startNewSession: (projectId: string) => void
  loadSession: (projectId: string, tools: Tool[]) => void
  createRalphSendMessage: (projectId: string, tools: Tool[]) => (prompt: string) => Promise<string>
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { provider, selectedModel, isConfigured } = useAISettings()
  const [manager, setManager] = React.useState<SessionManager | null>(null)
  const [state, setState] = React.useState<SessionState>({
    messages: [],
    isLoading: false,
    streamingContent: '',
    error: null,
  })

  // Create/update session manager when AI settings change
  React.useEffect(() => {
    if (isConfigured && provider) {
      const client = new AIClient(provider)
      const newManager = new SessionManager(client, {
        onStreamContent: (_projectId, content) => {
          setState((s) => ({ ...s, streamingContent: content }))
        },
      })

      // Subscribe to events
      newManager.on('messageAdded', ({ message }) => {
        setState((s) => ({ ...s, messages: [...s.messages, message] }))
      })

      newManager.on('loadingChanged', ({ isLoading }) => {
        setState((s) => ({ ...s, isLoading }))
      })

      newManager.on('generationError', ({ error }) => {
        setState((s) => ({ ...s, error }))
      })

      newManager.on('generationComplete', () => {
        setState((s) => ({ ...s, streamingContent: '' }))
      })

      newManager.on('sessionCleared', () => {
        setState({
          messages: [],
          isLoading: false,
          streamingContent: '',
          error: null,
        })
      })

      setManager(newManager)
    } else {
      setManager(null)
    }
  }, [isConfigured, provider])

  const sendMessage = React.useCallback(
    async (projectId: string, content: string) => {
      if (manager) {
        setState((s) => ({ ...s, error: null }))
        await manager.sendMessage(projectId, content, { model: selectedModel })
      }
    },
    [manager, selectedModel]
  )

  const stopGeneration = React.useCallback(
    (projectId: string) => {
      manager?.stopGeneration(projectId)
    },
    [manager]
  )

  const startNewSession = React.useCallback(
    (projectId: string) => {
      manager?.startNewSession(projectId)
    },
    [manager]
  )

  const loadSession = React.useCallback(
    (projectId: string, tools: Tool[]) => {
      if (manager) {
        const session = manager.loadSession(projectId, tools)
        setState((s) => ({
          ...s,
          messages: session.messages,
          isLoading: session.isLoading,
          streamingContent: session.streamingContent || '',
          error: session.error || null,
        }))
      }
    },
    [manager]
  )

  const createRalphSendMessage = React.useCallback(
    (projectId: string, tools: Tool[]) => {
      if (manager) {
        return manager.createRalphSendMessage(projectId, tools)
      }
      return async () => ''
    },
    [manager]
  )

  const value = React.useMemo(
    () => ({
      ...state,
      manager,
      sendMessage,
      stopGeneration,
      startNewSession,
      loadSession,
      createRalphSendMessage,
    }),
    [state, manager, sendMessage, stopGeneration, startNewSession, loadSession, createRalphSendMessage]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = React.useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

export { SessionContext }
