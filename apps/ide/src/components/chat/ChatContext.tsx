import * as React from 'react'
import type { AIMessage } from '@/lib/ai'
import { useAIChat } from '@/hooks/useAIChat'

interface ChatState {
  messages: AIMessage[]
  isLoading: boolean
  streamingContent: string
  error?: string
  ralphStatus?: 'idle' | 'running' | 'waiting' | 'complete' | 'error'
  ralphIteration?: number
}

interface ChatContextValue extends ChatState {
  sendMessage: (content: string) => Promise<void>
  stopGeneration: () => void
  clearMessages: () => void
}

const ChatContext = React.createContext<ChatContextValue | null>(null)

export function useChat() {
  const context = React.useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

/**
 * ChatProvider - Provides chat functionality to child components
 * Uses useAIChat internally to connect to the AI system
 */
export function ChatProvider({ children }: ChatProviderProps) {
  const chat = useAIChat()

  const value = React.useMemo(
    () => ({
      messages: chat.messages,
      isLoading: chat.isLoading,
      streamingContent: chat.streamingContent,
      error: chat.error ?? undefined,
      ralphStatus: chat.ralphStatus,
      ralphIteration: chat.ralphIteration,
      sendMessage: chat.sendMessage,
      stopGeneration: chat.cancel,
      clearMessages: chat.clearHistory,
    }),
    [
      chat.messages,
      chat.isLoading,
      chat.streamingContent,
      chat.error,
      chat.ralphStatus,
      chat.ralphIteration,
      chat.sendMessage,
      chat.cancel,
      chat.clearHistory,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export { ChatContext }
