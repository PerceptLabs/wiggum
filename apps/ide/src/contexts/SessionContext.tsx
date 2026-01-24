import * as React from 'react'
import type { Message } from '@/lib/llm'

/**
 * Message format for the session (compatible with existing UI)
 */
interface SessionMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: Array<{
    id: string
    name: string
    args: unknown
  }>
}

interface SessionState {
  messages: SessionMessage[]
  isLoading: boolean
  error: string | null
}

interface SessionContextValue extends SessionState {
  addMessage: (message: SessionMessage) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<SessionState>({
    messages: [],
    isLoading: false,
    error: null,
  })

  const addMessage = React.useCallback((message: SessionMessage) => {
    setState((s) => ({
      ...s,
      messages: [...s.messages, message],
    }))
  }, [])

  const setLoading = React.useCallback((loading: boolean) => {
    setState((s) => ({ ...s, isLoading: loading }))
  }, [])

  const setError = React.useCallback((error: string | null) => {
    setState((s) => ({ ...s, error }))
  }, [])

  const clearMessages = React.useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
    })
  }, [])

  const value = React.useMemo(
    () => ({
      ...state,
      addMessage,
      setLoading,
      setError,
      clearMessages,
    }),
    [state, addMessage, setLoading, setError, clearMessages]
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

// Convert Message to SessionMessage for compatibility
export function toSessionMessage(msg: Message): SessionMessage {
  return {
    role: msg.role === 'tool' ? 'tool' : msg.role,
    content: msg.content,
    toolCalls: msg.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    })),
  }
}

export { SessionContext }
