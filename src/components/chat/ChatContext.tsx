import * as React from 'react'
import type { AIMessage, AIToolCall } from '@/lib/ai'

interface ChatState {
  messages: AIMessage[]
  isLoading: boolean
  streamingContent: string
  error?: string
  ralphStatus?: 'idle' | 'running' | 'waiting' | 'complete'
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
  onSendMessage?: (content: string) => Promise<void>
  onStopGeneration?: () => void
  onClearMessages?: () => void
  messages?: AIMessage[]
  isLoading?: boolean
  streamingContent?: string
  error?: string
  ralphStatus?: 'idle' | 'running' | 'waiting' | 'complete'
  ralphIteration?: number
}

export function ChatProvider({
  children,
  onSendMessage,
  onStopGeneration,
  onClearMessages,
  messages = [],
  isLoading = false,
  streamingContent = '',
  error,
  ralphStatus,
  ralphIteration,
}: ChatProviderProps) {
  const sendMessage = React.useCallback(
    async (content: string) => {
      await onSendMessage?.(content)
    },
    [onSendMessage]
  )

  const stopGeneration = React.useCallback(() => {
    onStopGeneration?.()
  }, [onStopGeneration])

  const clearMessages = React.useCallback(() => {
    onClearMessages?.()
  }, [onClearMessages])

  const value = React.useMemo(
    () => ({
      messages,
      isLoading,
      streamingContent,
      error,
      ralphStatus,
      ralphIteration,
      sendMessage,
      stopGeneration,
      clearMessages,
    }),
    [messages, isLoading, streamingContent, error, ralphStatus, ralphIteration, sendMessage, stopGeneration, clearMessages]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export { ChatContext }
