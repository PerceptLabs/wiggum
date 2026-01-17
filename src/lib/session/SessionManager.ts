import type { AIClient, AIMessage, AIToolDefinition, AIToolCall } from '../ai'
import { processStream, hasToolCalls } from '../ai'
import type { Tool, ToolResult } from '../tools'
import type {
  SessionState,
  SessionEventType,
  SessionEvents,
  SessionEventListener,
  SessionConfig,
  SessionManagerOptions,
  GenerationOptions,
  ToolExecutionResult,
} from './types'
import { DEFAULT_SESSION_CONFIG } from './types'
import { buildSystemPrompt } from './systemPrompt'

/**
 * SessionManager - Manages AI sessions for projects
 *
 * Handles:
 * - Message history per project
 * - AI generation with streaming
 * - Tool call execution loop
 * - Event emission for UI updates
 * - Provides sendMessage callback for ralph
 */
export class SessionManager {
  private sessions = new Map<string, SessionState>()
  private eventListeners = new Map<SessionEventType, Set<SessionEventListener<SessionEventType>>>()
  private aiClient: AIClient
  private config: SessionConfig
  private options: SessionManagerOptions

  constructor(aiClient: AIClient, options: SessionManagerOptions = {}) {
    this.aiClient = aiClient
    this.config = { ...DEFAULT_SESSION_CONFIG, ...options.config }
    this.options = options
  }

  /**
   * Get or create a session for a project
   */
  getSession(projectId: string): SessionState {
    let session = this.sessions.get(projectId)
    if (!session) {
      session = this.createSession(projectId)
    }
    return session
  }

  /**
   * Load a session with specific tools
   */
  loadSession(projectId: string, tools: Tool[]): SessionState {
    const session = this.getSession(projectId)
    session.tools = tools
    return session
  }

  /**
   * Create a new session
   */
  private createSession(projectId: string): SessionState {
    const session: SessionState = {
      projectId,
      messages: [],
      isLoading: false,
      tools: [],
    }
    this.sessions.set(projectId, session)
    return session
  }

  /**
   * Add a message to a session
   */
  addMessage(projectId: string, message: AIMessage): void {
    const session = this.getSession(projectId)
    session.messages.push(message)
    this.emit('messageAdded', { projectId, message })
  }

  /**
   * Update a message at a specific index
   */
  updateMessage(projectId: string, index: number, message: AIMessage): void {
    const session = this.getSession(projectId)
    if (index >= 0 && index < session.messages.length) {
      session.messages[index] = message
      this.emit('messageUpdated', { projectId, index, message })
    }
  }

  /**
   * Send a user message and start AI generation
   */
  async sendMessage(
    projectId: string,
    content: string,
    options: GenerationOptions
  ): Promise<void> {
    // Add user message
    this.addMessage(projectId, { role: 'user', content })

    // Start generation
    await this.startGeneration(projectId, options)
  }

  /**
   * Start AI generation - the main loop
   */
  async startGeneration(projectId: string, options: GenerationOptions): Promise<void> {
    const session = this.getSession(projectId)

    // Check if already loading
    if (session.isLoading) {
      return
    }

    // Set up abort controller
    const abortController = new AbortController()
    session.abortController = abortController
    session.isLoading = true
    session.model = options.model
    session.error = undefined
    this.emit('loadingChanged', { projectId, isLoading: true })

    try {
      await this.runGenerationLoop(session, options, abortController.signal)
      this.emit('generationComplete', { projectId })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // Generation was cancelled
        return
      }
      const errorMessage = (err as Error).message
      session.error = errorMessage
      this.emit('generationError', { projectId, error: errorMessage })
    } finally {
      session.isLoading = false
      session.abortController = undefined
      session.streamingContent = undefined
      session.pendingToolCalls = undefined
      this.emit('loadingChanged', { projectId, isLoading: false })
    }
  }

  /**
   * The main AI generation loop
   */
  private async runGenerationLoop(
    session: SessionState,
    options: GenerationOptions,
    signal: AbortSignal
  ): Promise<void> {
    let iterations = 0

    while (iterations < this.config.maxToolIterations) {
      iterations++

      // Check for abort
      if (signal.aborted) {
        throw new DOMException('Generation aborted', 'AbortError')
      }

      // Build messages for API
      const messages = this.buildMessages(session)

      // Convert tools to API format
      const toolDefinitions = this.toolsToDefinitions(session.tools)

      // Stream the response
      const stream = this.aiClient.chatStream({
        model: options.model,
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        temperature: options.temperature ?? this.config.temperature,
        max_tokens: options.maxTokens,
      })

      // Process the stream
      session.streamingContent = ''
      const result = await processStream(stream, {
        onContent: (content) => {
          session.streamingContent = (session.streamingContent ?? '') + content
          this.emit('streamingUpdate', { projectId: session.projectId, content: session.streamingContent })
          this.options.onStreamContent?.(session.projectId, session.streamingContent)
        },
        onToolCall: (toolCall) => {
          this.emit('toolCallStarted', { projectId: session.projectId, toolCall })
        },
      })

      // Add assistant message
      const assistantMessage: AIMessage = {
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
      }
      this.addMessage(session.projectId, assistantMessage)

      // Check for tool calls
      if (hasToolCalls(result)) {
        // Execute tool calls
        const toolResults = await this.executeToolCalls(session, result.toolCalls, signal)

        // Add tool result messages
        for (const toolResult of toolResults) {
          const toolMessage: AIMessage = {
            role: 'tool',
            content: toolResult.result,
            tool_call_id: toolResult.toolCallId,
          }
          this.addMessage(session.projectId, toolMessage)
        }

        // Continue loop for next iteration
        continue
      }

      // No tool calls, we're done
      break
    }
  }

  /**
   * Execute tool calls and return results
   */
  private async executeToolCalls(
    session: SessionState,
    toolCalls: AIToolCall[],
    signal: AbortSignal
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = []
    const toolMap = new Map(session.tools.map((t) => [t.name, t]))

    for (const toolCall of toolCalls) {
      if (signal.aborted) {
        throw new DOMException('Generation aborted', 'AbortError')
      }

      const tool = toolMap.get(toolCall.function.name)
      let result: string
      let error: string | undefined

      if (tool) {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          const toolResult: ToolResult = await tool.execute(args)
          result = toolResult.content
          this.options.onToolExecution?.(toolCall.function.name, args, result)
        } catch (err) {
          error = (err as Error).message
          result = `Error: ${error}`
        }
      } else {
        error = `Unknown tool: ${toolCall.function.name}`
        result = error
      }

      results.push({
        toolCallId: toolCall.id,
        name: toolCall.function.name,
        result,
        error,
      })

      this.emit('toolCallCompleted', {
        projectId: session.projectId,
        toolCall,
        result,
      })
    }

    return results
  }

  /**
   * Build messages array for API call
   */
  private buildMessages(session: SessionState): AIMessage[] {
    const messages: AIMessage[] = []

    // Add system prompt
    if (this.config.includeSystemPrompt) {
      messages.push({
        role: 'system',
        content: buildSystemPrompt({ tools: session.tools }),
      })
    }

    // Add conversation history (limited)
    const history = session.messages.slice(-this.config.maxHistoryMessages)
    messages.push(...history)

    return messages
  }

  /**
   * Convert tools to API definitions
   */
  private toolsToDefinitions(tools: Tool[]): AIToolDefinition[] {
    return tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
          ? this.zodSchemaToJsonSchema(tool.inputSchema)
          : undefined,
      },
    }))
  }

  /**
   * Convert Zod schema to JSON schema (simplified)
   */
  private zodSchemaToJsonSchema(schema: unknown): { type: 'object'; properties?: Record<string, unknown>; required?: string[] } {
    // This is a simplified conversion
    // In production, use zod-to-json-schema
    const zodSchema = schema as { _def?: { shape?: () => Record<string, unknown> } }
    const shape = zodSchema._def?.shape?.() ?? {}

    const properties: Record<string, unknown> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(shape)) {
      const fieldDef = value as { _def?: { description?: string; typeName?: string } }
      properties[key] = {
        type: 'string',
        description: fieldDef._def?.description ?? undefined,
      }
      // Assume all fields are required for simplicity
      required.push(key)
    }

    return {
      type: 'object',
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      required: required.length > 0 ? required : undefined,
    }
  }

  /**
   * Stop ongoing generation
   */
  stopGeneration(projectId: string): void {
    const session = this.sessions.get(projectId)
    if (session?.abortController) {
      session.abortController.abort()
    }
  }

  /**
   * Start a new session (clear history)
   */
  startNewSession(projectId: string): void {
    const session = this.getSession(projectId)
    const tools = session.tools

    // Stop any ongoing generation
    this.stopGeneration(projectId)

    // Reset session
    session.messages = []
    session.streamingContent = undefined
    session.pendingToolCalls = undefined
    session.error = undefined
    session.tools = tools

    this.emit('sessionCleared', { projectId })
  }

  /**
   * Create a sendMessage callback for ralph
   * Each call creates a fresh context (no history pollution)
   */
  createRalphSendMessage(projectId: string, tools: Tool[]): (prompt: string) => Promise<string> {
    return async (prompt: string): Promise<string> => {
      // Create temporary messages for this ralph iteration
      const messages: AIMessage[] = [
        { role: 'user', content: prompt },
      ]

      const toolDefinitions = this.toolsToDefinitions(tools)
      const toolMap = new Map(tools.map((t) => [t.name, t]))

      let iterations = 0
      let finalContent = ''

      while (iterations < this.config.maxToolIterations) {
        iterations++

        // Stream the response
        const stream = this.aiClient.chatStream({
          model: this.aiClient.getDefaultModel(),
          messages,
          tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
          temperature: 0.7,
        })

        const result = await processStream(stream, {
          onContent: (content) => {
            this.options.onStreamContent?.(projectId, content)
          },
        })

        finalContent += result.content

        // Add assistant message
        const assistantMessage: AIMessage = {
          role: 'assistant',
          content: result.content || null,
          tool_calls: result.toolCalls.length > 0 ? result.toolCalls : undefined,
        }
        messages.push(assistantMessage)

        // Execute tool calls if any
        if (hasToolCalls(result)) {
          for (const toolCall of result.toolCalls) {
            const tool = toolMap.get(toolCall.function.name)
            let toolResult: string

            if (tool) {
              try {
                const args = JSON.parse(toolCall.function.arguments)
                const execResult = await tool.execute(args)
                toolResult = execResult.content
                this.options.onToolExecution?.(toolCall.function.name, args, toolResult)
              } catch (err) {
                toolResult = `Error: ${(err as Error).message}`
              }
            } else {
              toolResult = `Unknown tool: ${toolCall.function.name}`
            }

            messages.push({
              role: 'tool',
              content: toolResult,
              tool_call_id: toolCall.id,
            })
          }

          continue
        }

        // No tool calls, done
        break
      }

      return finalContent
    }
  }

  /**
   * Subscribe to session events
   */
  on<T extends SessionEventType>(event: T, listener: SessionEventListener<T>): () => void {
    let listeners = this.eventListeners.get(event)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(event, listeners)
    }
    listeners.add(listener as SessionEventListener<SessionEventType>)

    // Return unsubscribe function
    return () => {
      listeners?.delete(listener as SessionEventListener<SessionEventType>)
    }
  }

  /**
   * Emit a session event
   */
  private emit<T extends SessionEventType>(event: T, payload: SessionEvents[T]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as SessionEventListener<T>)(payload)
        } catch (err) {
          console.error(`Error in session event listener for ${event}:`, err)
        }
      }
    }
  }

  /**
   * Update the AI client
   */
  setAIClient(client: AIClient): void {
    this.aiClient = client
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): SessionState[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Check if a session exists
   */
  hasSession(projectId: string): boolean {
    return this.sessions.has(projectId)
  }

  /**
   * Remove a session
   */
  removeSession(projectId: string): void {
    this.stopGeneration(projectId)
    this.sessions.delete(projectId)
  }
}
