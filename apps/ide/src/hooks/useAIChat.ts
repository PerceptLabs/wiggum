import * as React from 'react'
import { useFS, useSession, useProject, useAISettings } from '@/contexts'
import type { AIMessage } from '@/lib/ai'
import { createTools, type WiggumTools } from '@/lib/tools'
import {
  initLoopState,
  readLoopState,
  buildLoopContext,
  updateIteration,
  appendProgress,
  checkComplete,
  checkWaiting,
  setStatus,
  cleanupLoopState,
  readConfig,
} from '@/lib/commands/ralph'

export interface UseChatOptions {
  /** Custom AI SDK native tools (defaults to createTools() if not provided) */
  tools?: WiggumTools
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
  streamingContent: string
  error: string | null
  ralphStatus: 'idle' | 'running' | 'waiting' | 'complete' | 'error'
  ralphIteration: number
}

/**
 * Hook for AI chat functionality with automatic loop
 *
 * Every message goes through the autonomous loop:
 * - Simple tasks complete in 1 iteration
 * - Complex tasks may take multiple iterations
 * - AI signals completion by writing "complete" to .ralph/status.txt
 */
export function useAIChat(options: UseChatOptions = {}) {
  const { fs } = useFS()
  const { createRalphSendMessageNative } = useSession()
  const { currentProject } = useProject()
  const { isConfigured } = useAISettings()

  const [state, setState] = React.useState<ChatState>({
    messages: [],
    isLoading: false,
    streamingContent: '',
    error: null,
    ralphStatus: 'idle',
    ralphIteration: 0,
  })

  const abortRef = React.useRef<AbortController | null>(null)

  // Get project path or default
  const cwd = currentProject?.path ?? '/projects/default'

  // Create AI SDK native tools
  const tools = React.useMemo(() => {
    // Use provided tools or create default tools
    if (options.tools) {
      console.log('[useAIChat] Using provided tools:', Object.keys(options.tools))
      return options.tools
    }

    if (!fs) {
      console.log('[useAIChat] No filesystem, returning empty tools')
      return {} as WiggumTools
    }

    // Create native tools with filesystem access
    const nativeTools = createTools({ fs, cwd })
    console.log('[useAIChat] Created native tools with cwd:', cwd, 'tools:', Object.keys(nativeTools))
    return nativeTools
  }, [fs, cwd, options.tools])

  /**
   * Run the autonomous loop
   */
  const runLoop = React.useCallback(
    async (task: string, sendMessage: (prompt: string) => Promise<string>) => {
      if (!fs) {
        throw new Error('Filesystem not ready')
      }

      // Read config for max iterations
      const config = await readConfig(fs, cwd)
      const maxIterations = config.maxIterations

      let iteration = 0
      let complete = false
      let waiting = false

      while (!complete && !waiting && iteration < maxIterations) {
        // Check for abort
        if (abortRef.current?.signal.aborted) {
          throw new DOMException('Generation aborted', 'AbortError')
        }

        iteration++

        // Update iteration state
        setState((s) => ({ ...s, ralphIteration: iteration }))
        options.onIteration?.(iteration)
        await updateIteration(fs, cwd, iteration)

        // Read fresh state
        const loopState = await readLoopState(fs, cwd)

        // Build context for this iteration
        const context = buildLoopContext(loopState, iteration)

        // Send to AI (this executes tools and returns final content)
        console.log('[useAIChat] Sending to AI:', { iteration, contextLength: context.length })
        const response = await sendMessage(context)
        console.log('[useAIChat] AI response:', { responseLength: response?.length })

        // Log progress
        await appendProgress(fs, cwd, iteration, response)

        // Add assistant message to UI
        const assistantMessage: AIMessage = {
          role: 'assistant',
          content: response,
        }
        setState((s) => ({
          ...s,
          messages: [...s.messages, assistantMessage],
          streamingContent: '',
        }))
        options.onMessage?.(assistantMessage)

        // Check for completion or waiting
        complete = await checkComplete(fs, cwd)
        waiting = await checkWaiting(fs, cwd)

        // Small delay between iterations (not on first)
        if (!complete && !waiting && iteration > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // Determine final status
      if (complete) {
        return 'complete' as const
      } else if (waiting) {
        return 'waiting' as const
      } else {
        // Hit max iterations
        return 'idle' as const
      }
    },
    [fs, cwd, options]
  )

  /**
   * Send a message - starts the autonomous loop
   */
  const sendMessage = React.useCallback(
    async (content: string) => {
      const toolCount = Object.keys(tools).length
      console.log('[useAIChat] sendMessage called:', { content, fs: !!fs, isConfigured, toolCount })

      if (!fs || !isConfigured) {
        console.log('[useAIChat] Not ready:', { fs: !!fs, isConfigured })
        setState((s) => ({ ...s, error: 'Not ready - check API key and filesystem' }))
        options.onError?.(new Error('Not ready'))
        return
      }

      // Reset state
      setState((s) => ({
        ...s,
        isLoading: true,
        error: null,
        ralphStatus: 'running',
        ralphIteration: 0,
        streamingContent: '',
      }))
      options.onStatusChange?.('running')

      // Create abort controller
      abortRef.current = new AbortController()

      // Add user message to UI
      const userMessage: AIMessage = { role: 'user', content }
      setState((s) => ({ ...s, messages: [...s.messages, userMessage] }))

      try {
        // Initialize loop state with the user's task
        await initLoopState(fs, cwd, content)

        // Create sendMessage function with native tools
        console.log('[useAIChat] Creating AI sendMessage with native tools:', Object.keys(tools))
        const aiSendMessage = createRalphSendMessageNative(tools)

        // Run the loop
        const finalStatus = await runLoop(content, aiSendMessage)

        // Update final status
        setState((s) => ({
          ...s,
          isLoading: false,
          ralphStatus: finalStatus,
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

        // Set error status in .ralph/
        try {
          await setStatus(fs, cwd, 'error')
        } catch {
          // Ignore
        }
      } finally {
        abortRef.current = null
      }
    },
    [fs, isConfigured, cwd, options, createRalphSendMessageNative, runLoop, tools]
  )

  /**
   * Cancel ongoing generation
   */
  const cancel = React.useCallback(async () => {
    abortRef.current?.abort()
    setState((s) => ({
      ...s,
      isLoading: false,
      streamingContent: '',
      ralphStatus: 'idle',
    }))
    options.onStatusChange?.('idle')

    // Set status to idle
    if (fs) {
      try {
        await setStatus(fs, cwd, 'idle')
      } catch {
        // Ignore
      }
    }
  }, [fs, cwd, options])

  /**
   * Clear chat history
   */
  const clearHistory = React.useCallback(async () => {
    setState({
      messages: [],
      isLoading: false,
      streamingContent: '',
      error: null,
      ralphStatus: 'idle',
      ralphIteration: 0,
    })

    // Clean up .ralph/
    if (fs) {
      try {
        await cleanupLoopState(fs, cwd)
      } catch {
        // Ignore
      }
    }
  }, [fs, cwd])

  /**
   * Resume from waiting state
   */
  const resume = React.useCallback(async () => {
    if (!fs || !isConfigured) {
      return
    }

    // Read current state
    const loopState = await readLoopState(fs, cwd)
    if (loopState.status !== 'waiting') {
      return
    }

    // Set status to running
    await setStatus(fs, cwd, 'running')

    setState((s) => ({
      ...s,
      isLoading: true,
      ralphStatus: 'running',
    }))
    options.onStatusChange?.('running')

    abortRef.current = new AbortController()

    try {
      const aiSendMessage = createRalphSendMessageNative(tools)
      const finalStatus = await runLoop(loopState.task, aiSendMessage)

      setState((s) => ({
        ...s,
        isLoading: false,
        ralphStatus: finalStatus,
      }))
      options.onStatusChange?.(finalStatus)
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setState((s) => ({
          ...s,
          isLoading: false,
          ralphStatus: 'idle',
        }))
        return
      }

      const message = err instanceof Error ? err.message : 'Failed to resume'
      setState((s) => ({
        ...s,
        isLoading: false,
        error: message,
        ralphStatus: 'error',
      }))
      options.onError?.(err instanceof Error ? err : new Error(message))
    } finally {
      abortRef.current = null
    }
  }, [fs, isConfigured, cwd, options, createRalphSendMessageNative, runLoop, tools])

  return {
    messages: state.messages,
    streamingContent: state.streamingContent,
    isLoading: state.isLoading,
    error: state.error,
    ralphStatus: state.ralphStatus,
    ralphIteration: state.ralphIteration,
    sendMessage,
    cancel,
    clearHistory,
    resume,
    isReady: !!fs && isConfigured,
  }
}
