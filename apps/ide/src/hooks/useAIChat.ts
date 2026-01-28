import * as React from 'react'
import { useFS, useProject, useAISettings } from '@/contexts'
import type { AIMessage, LLMProvider } from '@/lib/llm'
import { ShellExecutor } from '@/lib/shell'
import { registerAllCommands } from '@/lib/shell/commands'
import { runRalphLoop, type RalphCallbacks } from '@/lib/ralph'
import { Git } from '@/lib/git'

// Storage key for chat messages (scoped by project)
const getChatStorageKey = (projectId: string | undefined) =>
  projectId ? `wiggum-chat-${projectId}` : null

// Load messages from localStorage
function loadMessagesFromStorage(projectId: string | undefined): AIMessage[] {
  const key = getChatStorageKey(projectId)
  if (!key) return []
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

// Save messages to localStorage
function saveMessagesToStorage(projectId: string | undefined, messages: AIMessage[]): void {
  const key = getChatStorageKey(projectId)
  if (!key) return
  try {
    // Only save user and assistant messages (not status/action ephemeral messages)
    const persistableMessages = messages.filter(
      (m) => !('_displayType' in m) || m._displayType === undefined
    )
    localStorage.setItem(key, JSON.stringify(persistableMessages))
  } catch {
    // Ignore storage errors
  }
}

export interface UseChatOptions {
  /** Callback when a message is received */
  onMessage?: (message: AIMessage) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Callback on iteration change */
  onIteration?: (iteration: number) => void
  /** Callback on status change */
  onStatusChange?: (status: 'idle' | 'running' | 'waiting' | 'complete' | 'error') => void
}

export interface ChatState {
  messages: AIMessage[]
  isLoading: boolean
  error: string | null
  ralphStatus: 'idle' | 'running' | 'waiting' | 'complete' | 'error'
  ralphIteration: number
  streamingContent: string
}

/**
 * Hook for AI chat functionality with the Ralph autonomous loop
 *
 * Every message goes through the autonomous loop:
 * - Simple tasks complete in 1 iteration
 * - Complex tasks may take multiple iterations
 * - AI signals completion by writing "complete" to .ralph/status.txt
 */
export function useAIChat(options: UseChatOptions = {}) {
  const { fs } = useFS()
  const { currentProject } = useProject()
  const { isConfigured, getProvider } = useAISettings()

  const [state, setState] = React.useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    ralphStatus: 'idle',
    ralphIteration: 0,
    streamingContent: '',
  })

  const abortRef = React.useRef<AbortController | null>(null)
  const isRunningRef = React.useRef(false)
  const lastLoadedProjectRef = React.useRef<string | null>(null)

  // Get project path or default
  const cwd = currentProject?.path ?? '/projects/default'

  // Load messages from storage when project is available or changes
  React.useEffect(() => {
    if (!currentProject?.id) {
      // No project - clear messages if we had previously loaded something
      if (lastLoadedProjectRef.current !== null) {
        setState((s) => ({ ...s, messages: [] }))
        lastLoadedProjectRef.current = null
      }
      return
    }

    // Only load if this is a different project than what we last loaded
    if (lastLoadedProjectRef.current !== currentProject.id) {
      const messages = loadMessagesFromStorage(currentProject.id)
      setState((s) => ({ ...s, messages }))
      lastLoadedProjectRef.current = currentProject.id
    }
  }, [currentProject?.id])

  // Persist messages to storage when they change
  React.useEffect(() => {
    saveMessagesToStorage(currentProject?.id, state.messages)
  }, [state.messages, currentProject?.id])

  // Create shell executor and git instance
  const { shell, git } = React.useMemo(() => {
    if (!fs) {
      return { shell: null, git: null }
    }
    const gitInstance = new Git(fs, cwd)
    const shellExecutor = new ShellExecutor(fs, gitInstance)
    // Register all built-in shell commands
    registerAllCommands(shellExecutor)
    console.log('[useAIChat] Shell commands registered:', shellExecutor.listCommands().map(c => c.name))
    return { shell: shellExecutor, git: gitInstance }
  }, [fs, cwd])

  /**
   * Send a message - starts the Ralph autonomous loop
   */
  const sendMessage = React.useCallback(
    async (content: string) => {
      console.log('[useAIChat] sendMessage called:', { content, fs: !!fs, isConfigured, shell: !!shell })

      if (!fs || !isConfigured || !shell || !git) {
        console.log('[useAIChat] Not ready:', { fs: !!fs, isConfigured, shell: !!shell, git: !!git })
        setState((s) => ({ ...s, error: 'Not ready - check API key and filesystem' }))
        options.onError?.(new Error('Not ready'))
        return
      }

      // Get provider
      const provider = getProvider()
      if (!provider) {
        setState((s) => ({ ...s, error: 'Failed to create LLM provider' }))
        options.onError?.(new Error('Failed to create LLM provider'))
        return
      }

      // Prevent concurrent runs
      if (isRunningRef.current) {
        console.log('[useAIChat] Already running, ignoring')
        return
      }
      isRunningRef.current = true

      // Reset state
      setState((s) => ({
        ...s,
        isLoading: true,
        error: null,
        ralphStatus: 'running',
        ralphIteration: 0,
      }))
      options.onStatusChange?.('running')

      // Create abort controller
      abortRef.current = new AbortController()

      // Add user message to UI
      const userMessage: AIMessage = { role: 'user', content }
      setState((s) => ({ ...s, messages: [...s.messages, userMessage] }))
      options.onMessage?.(userMessage)

      // Setup Ralph callbacks
      const callbacks: RalphCallbacks = {
        signal: abortRef.current.signal,  // Pass abort signal for cancellation
        onIterationStart: (iteration) => {
          console.log('[useAIChat] Iteration start:', iteration)
          setState((s) => ({ ...s, ralphIteration: iteration }))
          options.onIteration?.(iteration)
        },
        onIterationEnd: (iteration) => {
          console.log('[useAIChat] Iteration end:', iteration)
        },
        onToolCall: (command, result) => {
          console.log('[useAIChat] Tool call:', { command, resultLength: result.length })
        },
        onStatus: (status) => {
          // Add status message (Ralph's reasoning) to UI
          console.log('[useAIChat] Status:', status)
          const statusMessage: AIMessage = {
            role: 'assistant',
            content: status,
            _displayType: 'status',
          }
          setState((s) => ({
            ...s,
            messages: [...s.messages, statusMessage],
          }))
        },
        onAction: (action) => {
          // Add action echo message to UI
          console.log('[useAIChat] Action:', action)
          const actionMessage: AIMessage = {
            role: 'assistant',
            content: action,
            _displayType: 'action',
          }
          setState((s) => ({
            ...s,
            messages: [...s.messages, actionMessage],
          }))
        },
        onMessage: (content) => {
          // LLM sent a text response - add to messages (with duplicate prevention)
          console.log('[useAIChat] Received message from LLM:', content.slice(0, 100))
          const assistantMessage: AIMessage = {
            role: 'assistant',
            content,
          }
          setState((s) => {
            // Prevent duplicate messages (check last message)
            const lastMsg = s.messages[s.messages.length - 1]
            if (lastMsg?.role === 'assistant' && lastMsg?.content === content) {
              console.log('[useAIChat] Skipping duplicate message')
              return s
            }
            return {
              ...s,
              messages: [...s.messages, assistantMessage],
            }
          })
          options.onMessage?.(assistantMessage)
        },
        onComplete: (iterations) => {
          console.log('[useAIChat] Complete after iterations:', iterations)
        },
        onError: (error) => {
          console.error('[useAIChat] Ralph error:', error)
          options.onError?.(error)
        },
      }

      try {
        // Run the Ralph loop
        const result = await runRalphLoop(
          provider,
          fs,
          shell,
          git,
          cwd,
          content,
          callbacks
        )

        // Determine final status
        let finalStatus: 'idle' | 'complete' | 'waiting' | 'error' = 'idle'
        if (result.success) {
          finalStatus = result.error?.includes('Waiting') ? 'waiting' : 'complete'
        } else if (result.error) {
          finalStatus = 'error'
        }

        // Add final message if there was an error or waiting
        if (result.error && !result.success) {
          const errorMessage: AIMessage = {
            role: 'assistant',
            content: `Error: ${result.error}`,
          }
          setState((s) => ({
            ...s,
            messages: [...s.messages, errorMessage],
          }))
          options.onMessage?.(errorMessage)
        } else if (result.error?.includes('Waiting')) {
          const waitingMessage: AIMessage = {
            role: 'assistant',
            content: 'Waiting for your input. Please provide more information.',
          }
          setState((s) => ({
            ...s,
            messages: [...s.messages, waitingMessage],
          }))
          options.onMessage?.(waitingMessage)
        }

        // Update final state
        setState((s) => ({
          ...s,
          isLoading: false,
          ralphStatus: finalStatus,
          error: result.success ? null : (result.error ?? null),
        }))
        options.onStatusChange?.(finalStatus)
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState((s) => ({
            ...s,
            isLoading: false,
            ralphStatus: 'idle',
          }))
          options.onStatusChange?.('idle')
          return
        }

        const message = err instanceof Error ? err.message : 'Failed to send message'
        setState((s) => ({
          ...s,
          isLoading: false,
          error: message,
          ralphStatus: 'error',
        }))
        options.onError?.(err instanceof Error ? err : new Error(message))
        options.onStatusChange?.('error')
      } finally {
        abortRef.current = null
        isRunningRef.current = false
      }
    },
    [fs, isConfigured, cwd, options, getProvider, shell, git]
  )

  /**
   * Cancel ongoing generation
   */
  const cancel = React.useCallback(() => {
    console.log('[useAIChat] Cancel requested, abortRef:', !!abortRef.current)
    if (abortRef.current) {
      abortRef.current.abort()
      console.log('[useAIChat] Abort signal sent')
    }
    isRunningRef.current = false
    setState((s) => ({
      ...s,
      isLoading: false,
      ralphStatus: 'idle',
    }))
    options.onStatusChange?.('idle')
  }, [options])

  /**
   * Clear chat history
   */
  const clearHistory = React.useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      ralphStatus: 'idle',
      ralphIteration: 0,
      streamingContent: '',
    })
    // Also clear from storage
    const key = getChatStorageKey(currentProject?.id)
    if (key) {
      try {
        localStorage.removeItem(key)
      } catch {
        // Ignore storage errors
      }
    }
  }, [currentProject?.id])

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    ralphStatus: state.ralphStatus,
    ralphIteration: state.ralphIteration,
    streamingContent: state.streamingContent,
    sendMessage,
    cancel,
    clearHistory,
    isReady: !!fs && isConfigured && !!shell && !!git,
  }
}
