import * as React from 'react'
import { useSession, useAISettings } from '@/contexts'
import type { AIMessage, ToolCall } from '@/lib/ai'

export interface UseChatOptions {
  onMessage?: (message: AIMessage) => void
  onToolCall?: (toolCall: ToolCall) => void
  onError?: (error: Error) => void
}

/**
 * Hook for AI chat functionality
 */
export function useAIChat(options: UseChatOptions = {}) {
  const { session, messages, isLoading, error: sessionError } = useSession()
  const { settings } = useAISettings()
  const [streamingContent, setStreamingContent] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  // Handle streaming content updates
  React.useEffect(() => {
    if (!session) return

    const handleContentDelta = (delta: string) => {
      setStreamingContent((prev) => prev + delta)
    }

    const handleMessageComplete = (message: AIMessage) => {
      setStreamingContent('')
      options.onMessage?.(message)
    }

    const handleToolCall = (toolCall: ToolCall) => {
      options.onToolCall?.(toolCall)
    }

    const handleError = (err: Error) => {
      setError(err.message)
      options.onError?.(err)
    }

    session.on('content_delta', handleContentDelta)
    session.on('message_complete', handleMessageComplete)
    session.on('tool_call', handleToolCall)
    session.on('error', handleError)

    return () => {
      session.off('content_delta', handleContentDelta)
      session.off('message_complete', handleMessageComplete)
      session.off('tool_call', handleToolCall)
      session.off('error', handleError)
    }
  }, [session, options])

  // Send a message
  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!session || !settings.apiKey) {
        setError('No API key configured')
        return
      }

      setError(null)
      setStreamingContent('')

      try {
        await session.sendMessage(content)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send message'
        setError(message)
        options.onError?.(err instanceof Error ? err : new Error(message))
      }
    },
    [session, settings.apiKey, options]
  )

  // Cancel current request
  const cancel = React.useCallback(() => {
    session?.cancel()
    setStreamingContent('')
  }, [session])

  // Clear chat history
  const clearHistory = React.useCallback(() => {
    session?.clearHistory()
  }, [session])

  // Retry last message
  const retry = React.useCallback(async () => {
    if (!session) return
    await session.retry()
  }, [session])

  return {
    messages,
    streamingContent,
    isLoading,
    error: error || sessionError,
    sendMessage,
    cancel,
    clearHistory,
    retry,
    isReady: !!session && !!settings.apiKey,
  }
}
