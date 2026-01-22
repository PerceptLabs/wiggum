import * as React from 'react'
import { llmManager, type StreamChatResult } from '@/lib/ai'
import { tool as createTool, type CoreMessage, type CoreTool } from 'ai'
import type { Tool } from '@/lib/tools'
import { useAISettings } from './AIContext'
import { z } from 'zod'

/**
 * Convert internal Tool[] to CoreTool record for Vercel AI SDK
 * Uses Vercel AI SDK's tool() helper for proper formatting
 *
 * @deprecated Use createTools() from @/lib/tools for AI SDK native tools
 */
function convertToolsToCoreTool(tools: Tool[]): Record<string, CoreTool> {
  const result: Record<string, CoreTool> = {}

  for (const t of tools) {
    // Use the Vercel AI SDK tool() helper
    result[t.name] = createTool({
      description: t.description,
      parameters: t.inputSchema || z.object({}),
      execute: async (params) => {
        console.log(`[convertToolsToCoreTool] Executing ${t.name} with:`, params)
        const toolResult = await t.execute(params)
        console.log(`[convertToolsToCoreTool] ${t.name} result:`, toolResult.content?.slice(0, 100))
        return toolResult.content
      },
    })
  }

  return result
}

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
  toolResults?: Array<{
    toolCallId: string
    result: string
  }>
}

interface SessionState {
  messages: SessionMessage[]
  isLoading: boolean
  streamingContent: string
  error: string | null
}

interface SessionContextValue extends SessionState {
  sendMessage: (projectId: string, content: string) => Promise<void>
  stopGeneration: (projectId: string) => void
  startNewSession: (projectId: string) => void
  loadSession: (projectId: string, tools: Tool[]) => void
  /** @deprecated Use createRalphSendMessageNative with AI SDK native tools */
  createRalphSendMessage: (projectId: string, tools: Tool[]) => (prompt: string) => Promise<string>
  /** Create sendMessage function with AI SDK native tools (preferred) */
  createRalphSendMessageNative: (tools: Record<string, CoreTool>) => (prompt: string) => Promise<string>
}

const SessionContext = React.createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { selectedModelId, isConfigured } = useAISettings()

  // Message history per project
  const messagesRef = React.useRef<Map<string, CoreMessage[]>>(new Map())
  // Tools per project
  const toolsRef = React.useRef<Map<string, Tool[]>>(new Map())
  // Abort controllers per project
  const abortControllersRef = React.useRef<Map<string, AbortController>>(new Map())

  const [state, setState] = React.useState<SessionState>({
    messages: [],
    isLoading: false,
    streamingContent: '',
    error: null,
  })

  /**
   * Convert CoreMessage[] to SessionMessage[] for UI display
   */
  const toSessionMessages = React.useCallback((coreMessages: CoreMessage[]): SessionMessage[] => {
    return coreMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m): SessionMessage => {
        if (m.role === 'user') {
          return {
            role: 'user',
            content: typeof m.content === 'string' ? m.content : '',
          }
        }

        // Assistant message
        if (typeof m.content === 'string') {
          return { role: 'assistant', content: m.content }
        }

        // Content array (text + tool calls)
        let text = ''
        const toolCalls: SessionMessage['toolCalls'] = []

        for (const part of m.content) {
          if (part.type === 'text') {
            text += part.text
          } else if (part.type === 'tool-call') {
            toolCalls.push({
              id: part.toolCallId,
              name: part.toolName,
              args: part.args,
            })
          }
        }

        return {
          role: 'assistant',
          content: text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        }
      })
  }, [])

  const sendMessage = React.useCallback(
    async (projectId: string, content: string) => {
      if (!isConfigured) {
        setState((s) => ({ ...s, error: 'No AI provider configured' }))
        return
      }

      // Get or create message history for this project
      const messages = messagesRef.current.get(projectId) || []
      const tools = toolsRef.current.get(projectId) || []

      // Add user message
      const userMessage: CoreMessage = { role: 'user', content }
      messages.push(userMessage)
      messagesRef.current.set(projectId, messages)

      // Update state with new user message
      setState((s) => ({
        ...s,
        messages: toSessionMessages(messages),
        isLoading: true,
        streamingContent: '',
        error: null,
      }))

      // Create abort controller for this request
      const abortController = new AbortController()
      abortControllersRef.current.set(projectId, abortController)

      try {
        // Convert tools to CoreTool format
        const coreTools = tools.length > 0 ? convertToolsToCoreTool(tools) : undefined

        let streamingText = ''

        const result = await llmManager.streamChat({
          modelId: selectedModelId,
          messages,
          tools: coreTools,
          abortSignal: abortController.signal,
          onTextChunk: (chunk) => {
            streamingText += chunk
            setState((s) => ({ ...s, streamingContent: streamingText }))
          },
        })

        // Add assistant response to history
        // Filter out malformed tool calls (missing required args)
        // These would fail AI SDK schema validation on retry
        const validToolCalls = result.toolCalls.filter(tc => {
          const hasArgs = tc.args && Object.keys(tc.args).length > 0
          if (!hasArgs) {
            console.warn('[SessionContext] Skipping malformed tool call (no args):', tc.toolName)
          }
          return hasArgs
        })

        // Normalize valid tool calls
        const normalizedToolCalls = validToolCalls.map(tc => ({
          type: 'tool-call' as const,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args,
        }))

        // If model made tool calls but all were malformed, show error
        if (result.toolCalls.length > 0 && validToolCalls.length === 0) {
          const toolNames = result.toolCalls.map(tc => tc.toolName).join(', ')
          const errorText = result.text + `\n\n[Error: Model called tool(s) "${toolNames}" without required arguments. This model may not support function calling properly.]`
          messages.push({ role: 'assistant', content: errorText })
          messagesRef.current.set(projectId, messages)
          setState((s) => ({
            ...s,
            messages: toSessionMessages(messages),
            isLoading: false,
            streamingContent: '',
            error: 'Model does not support function calling properly',
          }))
          return
        }

        const assistantMessage: CoreMessage = normalizedToolCalls.length > 0
          ? {
              role: 'assistant',
              content: [
                ...(result.text ? [{ type: 'text' as const, text: result.text }] : []),
                ...normalizedToolCalls,
              ],
            }
          : { role: 'assistant', content: result.text }

        messages.push(assistantMessage)
        messagesRef.current.set(projectId, messages)

        // Handle tool calls
        if (normalizedToolCalls.length > 0 && coreTools) {
          for (const toolCall of normalizedToolCalls) {
            const tool = tools.find((t) => t.name === toolCall.toolName)
            if (tool) {
              try {
                const toolResult = await tool.execute(toolCall.args as Parameters<typeof tool.execute>[0])
                // Add tool result to messages
                messages.push({
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      result: toolResult.content,
                    },
                  ],
                })
              } catch (err) {
                messages.push({
                  role: 'tool',
                  content: [
                    {
                      type: 'tool-result',
                      toolCallId: toolCall.toolCallId,
                      toolName: toolCall.toolName,
                      result: `Error: ${(err as Error).message}`,
                      isError: true,
                    },
                  ],
                })
              }
            }
          }
          messagesRef.current.set(projectId, messages)

          // Continue conversation after tool execution
          // Recursive call to get AI response to tool results
          await sendMessage(projectId, '')
          return
        }

        setState((s) => ({
          ...s,
          messages: toSessionMessages(messages),
          isLoading: false,
          streamingContent: '',
        }))
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState((s) => ({
            ...s,
            messages: toSessionMessages(messagesRef.current.get(projectId) || []),
            isLoading: false,
            streamingContent: '',
          }))
          return
        }

        setState((s) => ({
          ...s,
          messages: toSessionMessages(messagesRef.current.get(projectId) || []),
          isLoading: false,
          streamingContent: '',
          error: (err as Error).message,
        }))
      } finally {
        abortControllersRef.current.delete(projectId)
      }
    },
    [isConfigured, selectedModelId, toSessionMessages]
  )

  const stopGeneration = React.useCallback((projectId: string) => {
    const controller = abortControllersRef.current.get(projectId)
    controller?.abort()
    abortControllersRef.current.delete(projectId)
    setState((s) => ({ ...s, isLoading: false, streamingContent: '' }))
  }, [])

  const startNewSession = React.useCallback((projectId: string) => {
    messagesRef.current.set(projectId, [])
    setState({
      messages: [],
      isLoading: false,
      streamingContent: '',
      error: null,
    })
  }, [])

  const loadSession = React.useCallback(
    (projectId: string, tools: Tool[]) => {
      toolsRef.current.set(projectId, tools)
      const messages = messagesRef.current.get(projectId) || []
      setState({
        messages: toSessionMessages(messages),
        isLoading: false,
        streamingContent: '',
        error: null,
      })
    },
    [toSessionMessages]
  )

  /**
   * Create sendMessage function with AI SDK native tools (preferred)
   * Tools should be created with createTools() from @/lib/tools
   */
  const createRalphSendMessageNative = React.useCallback(
    (tools: Record<string, CoreTool>) => {
      console.log('[SessionContext.createRalphSendMessageNative] Called:', {
        toolCount: Object.keys(tools).length,
        toolNames: Object.keys(tools),
        isConfigured,
        selectedModelId,
      })

      if (!isConfigured) {
        console.log('[SessionContext.createRalphSendMessageNative] Not configured, returning empty function')
        return async () => ''
      }

      // Use the native method that lets AI SDK handle tool execution
      return llmManager.createRalphSendMessageNative(selectedModelId, tools)
    },
    [isConfigured, selectedModelId]
  )

  /**
   * @deprecated Use createRalphSendMessageNative with AI SDK native tools
   */
  const createRalphSendMessage = React.useCallback(
    (projectId: string, tools: Tool[]) => {
      console.log('[SessionContext.createRalphSendMessage] Called:', { projectId, toolCount: tools.length, isConfigured, selectedModelId })

      if (!isConfigured) {
        console.log('[SessionContext.createRalphSendMessage] Not configured, returning empty function')
        return async () => ''
      }

      const coreTools = convertToolsToCoreTool(tools)
      console.log('[SessionContext.createRalphSendMessage] Converted tools:', Object.keys(coreTools))

      // Create tool executor
      const executeToolCall = async (name: string, args: unknown): Promise<string> => {
        console.log('[DEBUG] executeToolCall received:', { name, args, argsType: typeof args })
        console.log('[DEBUG] executeToolCall args JSON:', JSON.stringify(args))

        const tool = tools.find((t) => t.name === name)
        if (!tool) {
          console.error('[SessionContext.executeToolCall] Tool not found:', name, 'Available:', tools.map(t => t.name))
          throw new Error(`Tool not found: ${name}`)
        }

        console.log('[DEBUG] executeToolCall calling tool.execute with:', args)
        const result = await tool.execute(args as Parameters<typeof tool.execute>[0])
        console.log('[SessionContext.executeToolCall] Result:', result.content?.slice(0, 200))
        return result.content
      }

      console.log('[SessionContext.createRalphSendMessage] Creating with model:', selectedModelId, 'coreTools:', Object.keys(coreTools))
      return llmManager.createRalphSendMessage(selectedModelId, coreTools, executeToolCall)
    },
    [isConfigured, selectedModelId]
  )

  const value = React.useMemo(
    () => ({
      ...state,
      sendMessage,
      stopGeneration,
      startNewSession,
      loadSession,
      createRalphSendMessage,
      createRalphSendMessageNative,
    }),
    [state, sendMessage, stopGeneration, startNewSession, loadSession, createRalphSendMessage, createRalphSendMessageNative]
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
