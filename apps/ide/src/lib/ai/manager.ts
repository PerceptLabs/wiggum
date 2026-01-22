/**
 * LLM Manager
 * Singleton that manages LLM providers and provides a unified interface
 */

import { streamText, type CoreMessage, type CoreTool, type ToolCallPart } from 'ai'
import { providerRegistry, ProviderRegistry } from './providers/registry'
import {
  DEFAULT_PROVIDERS,
  type AnyProviderConfig,
  type ModelInfo,
  type OllamaLocalProviderConfig,
  type OllamaCloudProviderConfig,
  type CustomProviderConfig,
} from './providers/types'
import {
  getOllamaLocalConfig,
  getOllamaCloudConfig,
  fetchOllamaModels,
  checkOllamaAvailable,
  DEFAULT_OLLAMA_URL,
  OLLAMA_CLOUD_URL,
} from './providers/ollama'
import {
  createCustomProviderConfig,
  createFromPreset,
  fetchCustomModels,
  CUSTOM_PROVIDER_PRESETS,
} from './providers/custom'

/**
 * Options for streaming chat
 */
export interface StreamChatOptions {
  /** Model ID in format 'providerId:modelName' */
  modelId: string
  /** Messages to send */
  messages: CoreMessage[]
  /** Tools available to the AI */
  tools?: Record<string, CoreTool>
  /** System prompt */
  system?: string
  /** Temperature (0-1) */
  temperature?: number
  /** Max tokens to generate */
  maxTokens?: number
  /** Abort signal */
  abortSignal?: AbortSignal
  /** Callback for text chunks */
  onTextChunk?: (text: string) => void
  /** Callback for tool calls */
  onToolCall?: (toolCall: ToolCallPart) => void
  /** Callback when streaming starts */
  onStart?: () => void
  /** Callback when streaming finishes */
  onFinish?: (result: StreamChatResult) => void
}

/**
 * Result of a streaming chat
 */
export interface StreamChatResult {
  /** Full text content */
  text: string
  /** Tool calls made */
  toolCalls: ToolCallPart[]
  /** Finish reason */
  finishReason: string | undefined
  /** Usage stats */
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

/**
 * LLM Manager class
 * Provides a high-level interface for managing and using LLM providers
 */
class LLMManagerClass {
  private registry: ProviderRegistry
  private initialized = false
  private selectedModelId: string | null = null

  constructor(registry: ProviderRegistry) {
    this.registry = registry
  }

  /**
   * Initialize the manager with default providers
   * Call this once at app startup
   */
  initialize(): void {
    if (this.initialized) return

    // Register default official providers
    for (const provider of DEFAULT_PROVIDERS) {
      this.registry.registerProvider(provider)
    }

    // Set default selected model
    this.selectedModelId = 'openai:gpt-4o'
    this.initialized = true
  }

  /**
   * Register a new provider
   */
  registerProvider(config: AnyProviderConfig): void {
    this.registry.registerProvider(config)
  }

  /**
   * Register Ollama Local provider
   * @param baseUrl - Local Ollama server URL (default: http://localhost:11434)
   * @param models - Optional list of models (will auto-detect if not provided)
   */
  registerOllamaLocal(
    baseUrl = DEFAULT_OLLAMA_URL,
    models: ModelInfo[] = []
  ): void {
    const config = getOllamaLocalConfig(baseUrl, models)
    config.enabled = true
    this.registry.registerProvider(config)
  }

  /**
   * Register Ollama Local with auto-detected models
   * Fetches available models from the server and registers them
   */
  async registerOllamaLocalWithModels(
    baseUrl = DEFAULT_OLLAMA_URL
  ): Promise<ModelInfo[]> {
    const models = await fetchOllamaModels(baseUrl, 'ollama-local')
    this.registerOllamaLocal(baseUrl, models)
    return models
  }

  /**
   * Refresh models for Ollama Local provider
   */
  async refreshOllamaLocalModels(baseUrl = DEFAULT_OLLAMA_URL): Promise<ModelInfo[]> {
    const models = await fetchOllamaModels(baseUrl, 'ollama-local')
    if (models.length > 0) {
      this.registry.updateProvider('ollama-local', {
        models,
        lastRefreshed: Date.now(),
      } as Partial<OllamaLocalProviderConfig>)
    }
    return models
  }

  /**
   * Register Ollama Cloud provider
   * @param apiKey - Required API key for Ollama Cloud
   * @param baseUrl - Optional custom base URL
   */
  registerOllamaCloud(apiKey: string, baseUrl = OLLAMA_CLOUD_URL): void {
    const config = getOllamaCloudConfig(apiKey, baseUrl)
    config.enabled = true
    this.registry.registerProvider(config)
  }

  /**
   * Check if Ollama local server is available
   */
  async checkOllamaAvailable(baseUrl = DEFAULT_OLLAMA_URL): Promise<boolean> {
    return checkOllamaAvailable(baseUrl)
  }

  /**
   * Set Ollama Cloud API key
   */
  setOllamaCloudApiKey(apiKey: string): void {
    this.registry.updateProvider('ollama-cloud', { apiKey })
  }

  /**
   * Update Ollama Local base URL
   */
  setOllamaLocalBaseUrl(baseUrl: string): void {
    this.registry.updateProvider('ollama-local', { baseUrl })
  }

  /**
   * Register a custom OpenAI-compatible provider
   */
  registerCustomProvider(
    id: string,
    name: string,
    baseUrl: string,
    apiKey?: string,
    models: ModelInfo[] = [],
    headers?: Record<string, string>
  ): void {
    const config = createCustomProviderConfig({
      id,
      name,
      baseUrl,
      apiKey,
      headers,
      models,
    })
    this.registry.registerProvider(config)
  }

  /**
   * Register a custom provider from a preset (Together, Groq, OpenRouter, etc.)
   */
  registerFromPreset(
    presetId: keyof typeof CUSTOM_PROVIDER_PRESETS,
    apiKey?: string
  ): void {
    const { config } = createFromPreset(presetId, apiKey)
    this.registry.registerProvider(config)
  }

  /**
   * Fetch and register models for a custom provider
   */
  async fetchAndSetCustomModels(
    providerId: string,
    baseUrl: string,
    apiKey?: string
  ): Promise<ModelInfo[]> {
    const models = await fetchCustomModels(baseUrl, apiKey)
    if (models.length > 0) {
      // Update providerId for fetched models
      const modelsWithProvider = models.map((m) => ({ ...m, providerId }))
      this.registry.updateProvider(providerId, { models: modelsWithProvider })
    }
    return models
  }

  /**
   * Get available presets for custom providers
   */
  getCustomPresets() {
    return CUSTOM_PROVIDER_PRESETS
  }

  /**
   * Update a provider's API key
   */
  setApiKey(providerId: string, apiKey: string): void {
    this.registry.updateProvider(providerId, { apiKey })
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): void {
    this.registry.updateProvider(providerId, { enabled })
  }

  /**
   * Get a language model instance
   * @param modelId - Format: 'providerId:modelName' (e.g., 'openai:gpt-4o')
   */
  getModel(modelId: string) {
    return this.registry.getLanguageModel(modelId)
  }

  /**
   * Get an embedding model instance
   * @param modelId - Format: 'providerId:modelName' (e.g., 'openai:text-embedding-3-small')
   */
  getEmbeddingModel(modelId: string) {
    return this.registry.getEmbeddingModel(modelId)
  }

  /**
   * Get the currently selected model
   */
  getSelectedModel() {
    if (!this.selectedModelId) {
      throw new Error('No model selected')
    }
    return this.getModel(this.selectedModelId)
  }

  /**
   * Set the currently selected model
   */
  setSelectedModel(modelId: string): void {
    // Validate that the model exists
    this.getModel(modelId)
    this.selectedModelId = modelId
  }

  /**
   * Get the currently selected model ID
   */
  getSelectedModelId(): string | null {
    return this.selectedModelId
  }

  /**
   * List all registered providers
   */
  listProviders(): AnyProviderConfig[] {
    return this.registry.listProviders()
  }

  /**
   * List all available models across all providers
   */
  listModels(): ModelInfo[] {
    const providers = this.registry.listProviders()
    const models: ModelInfo[] = []

    for (const provider of providers) {
      if (provider.enabled) {
        models.push(...provider.models)
      }
    }

    return models
  }

  /**
   * List models for a specific provider
   */
  listModelsForProvider(providerId: string): ModelInfo[] {
    const config = this.registry.getProviderConfig(providerId)
    if (!config) {
      throw new Error(`Provider not found: ${providerId}`)
    }
    return config.models
  }

  /**
   * Check if a provider is ready to use (has API key if needed)
   */
  isProviderReady(providerId: string): boolean {
    const config = this.registry.getProviderConfig(providerId)
    if (!config) return false
    if (!config.enabled) return false

    // Ollama doesn't need an API key
    if (config.type === 'ollama') return true

    return this.registry.hasApiKey(providerId)
  }

  /**
   * Get available (ready to use) providers
   */
  getAvailableProviders(): AnyProviderConfig[] {
    return this.listProviders().filter((p) => this.isProviderReady(p.id))
  }

  /**
   * Get a provider config
   */
  getProvider(providerId: string): AnyProviderConfig | undefined {
    return this.registry.getProviderConfig(providerId)
  }

  /**
   * Get the underlying registry (for advanced usage)
   */
  getRegistry(): ProviderRegistry {
    return this.registry
  }

  /**
   * Stream a chat completion using Vercel AI SDK
   * This is the main method for generating AI responses
   */
  async streamChat(options: StreamChatOptions): Promise<StreamChatResult> {
    const {
      modelId,
      messages,
      tools,
      system,
      temperature = 0.7,
      maxTokens,
      abortSignal,
      onTextChunk,
      onToolCall,
      onStart,
      onFinish,
    } = options

    console.log('[llmManager.streamChat] Called:', {
      modelId,
      messageCount: messages.length,
      hasTools: !!tools,
      toolNames: tools ? Object.keys(tools) : [],
      hasSystem: !!system
    })

    // Get the model
    const model = this.getModel(modelId)
    console.log('[llmManager.streamChat] Got model:', !!model)

    // Notify start
    onStart?.()

    // Log detailed tool info
    if (tools) {
      console.log('[llmManager.streamChat] Tools being passed to streamText:')
      for (const [name, tool] of Object.entries(tools)) {
        console.log(`  - ${name}: description="${tool.description}", hasParams=${!!tool.parameters}, hasExecute=${!!tool.execute}`)
      }
    }

    console.log('[llmManager.streamChat] Calling streamText...')
    // Use streamText from Vercel AI SDK
    // maxSteps enables multi-turn tool calling in AI SDK v6
    const result = await streamText({
      model,
      messages,
      tools,
      system,
      temperature,
      maxTokens,
      maxSteps: 5,
      abortSignal,
    })

    // Accumulate results
    let fullText = ''
    const toolCalls: ToolCallPart[] = []

    // Process the text stream
    for await (const chunk of result.textStream) {
      fullText += chunk
      onTextChunk?.(chunk)
    }

    // Get final result data
    const finishReason = await result.finishReason
    const usage = await result.usage

    // Check for tool calls
    const toolCallsResult = await result.toolCalls
    console.log('[llmManager.streamChat] Result:', {
      finishReason,
      textLength: fullText.length,
      toolCallCount: toolCallsResult?.length || 0
    })

    // Debug: Log raw tool calls structure
    if (toolCallsResult && toolCallsResult.length > 0) {
      console.log('[DEBUG] Raw toolCalls:', JSON.stringify(toolCallsResult, null, 2))
    }

    if (toolCallsResult && toolCallsResult.length > 0) {
      console.log('[llmManager.streamChat] Tool calls found:', toolCallsResult.map(tc => ({
        name: tc.toolName,
        args: tc.args
      })))
      for (const tc of toolCallsResult) {
        const toolCallPart: ToolCallPart = {
          type: 'tool-call',
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          args: tc.args,
        }
        toolCalls.push(toolCallPart)
        onToolCall?.(toolCallPart)
      }
    } else {
      console.log('[llmManager.streamChat] No tool calls. Text preview:', fullText.slice(0, 300))
      // Check if the model might be outputting tool-like syntax as text
      if (fullText.includes('TOOL_CALL') || fullText.includes('tool_call') || fullText.includes('function_call')) {
        console.warn('[llmManager.streamChat] Model appears to be outputting tool calls as text instead of using function calling API!')
      }
    }

    const chatResult: StreamChatResult = {
      text: fullText,
      toolCalls,
      finishReason,
      usage: usage
        ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }
        : undefined,
    }

    onFinish?.(chatResult)
    return chatResult
  }

  /**
   * Create a sendMessage function for the Ralph autonomous loop
   * Uses AI SDK native tools with maxSteps - SDK handles tool execution automatically
   *
   * @param modelId - Model to use
   * @param tools - AI SDK native tools (created with tool() helper, with execute functions)
   */
  createRalphSendMessageNative(
    modelId: string,
    tools: Record<string, CoreTool>
  ): (prompt: string) => Promise<string> {
    console.log('[llmManager.createRalphSendMessageNative] Creating function with model:', modelId, 'tools:', Object.keys(tools))

    const systemPrompt = `You are Wiggum, an AI coding assistant operating in an autonomous loop.

## Available Tools
You have access to tools for interacting with the virtual filesystem. Use them to accomplish tasks.

## How to Use Tools
When you need to perform an action, call the appropriate tool. The tools execute automatically.

Common operations:
- shell({ command: "ls /" }) - list files
- shell({ command: "cat /path/file.txt" }) - read a file
- shell({ command: "echo 'content' > /path/file.txt" }) - write to a file
- read_file({ path: "/path/file.txt" }) - quick file read
- write_file({ path: "/path/file.txt", content: "..." }) - quick file write
- list_files({ path: "/" }) - quick directory listing
- search({ pattern: "TODO", path: "./src" }) - search for text

## Guidelines
1. Use tools to make changes - don't just describe what you would do
2. Verify your changes work before marking complete
3. For simple tasks, complete in one iteration
4. When done, use shell to write "complete" to .ralph/status.txt

Be direct and efficient. Execute commands, don't just talk about them.`

    return async (prompt: string): Promise<string> => {
      console.log('[llmManager.ralphSendMessageNative] Called with prompt length:', prompt.length)

      const model = this.getModel(modelId)

      // Use streamText with maxSteps - AI SDK handles the entire tool loop
      const result = await streamText({
        model,
        messages: [{ role: 'user', content: prompt }],
        tools,
        system: systemPrompt,
        temperature: 0.7,
        maxSteps: 10, // AI SDK will loop up to 10 times for tool calls
        onStepFinish: ({ stepType, toolCalls, toolResults, text }) => {
          try {
            console.log('[llmManager.ralphSendMessageNative] Step finished:', {
              stepType,
              toolCallCount: toolCalls?.length || 0,
              toolResultCount: toolResults?.length || 0,
              textLength: text?.length || 0,
            })
            if (toolCalls && toolCalls.length > 0) {
              console.log('[llmManager.ralphSendMessageNative] Tool calls:', toolCalls.map(tc => ({
                name: tc?.toolName ?? 'unknown',
                args: tc?.args ?? {},
              })))
            }
            if (toolResults && toolResults.length > 0) {
              console.log('[llmManager.ralphSendMessageNative] Tool results:', toolResults.map(tr => {
                const result = tr?.result
                let preview = '(no result)'
                if (result !== undefined && result !== null) {
                  const str = typeof result === 'string' ? result : JSON.stringify(result)
                  preview = str?.slice?.(0, 100) ?? String(result).slice(0, 100)
                }
                return {
                  name: tr?.toolName ?? 'unknown',
                  resultPreview: preview,
                }
              }))
            }
          } catch (err) {
            console.error('[llmManager.ralphSendMessageNative] Error in onStepFinish:', err)
          }
        },
      })

      // Collect all text from the stream
      let fullText = ''
      for await (const chunk of result.textStream) {
        fullText += chunk
      }

      console.log('[llmManager.ralphSendMessageNative] Complete. Text length:', fullText.length)
      return fullText
    }
  }

  /**
   * Create a sendMessage function for the Ralph autonomous loop
   * Legacy version with manual tool execution - use createRalphSendMessageNative instead
   *
   * @deprecated Use createRalphSendMessageNative with AI SDK native tools
   */
  createRalphSendMessage(
    modelId: string,
    tools: Record<string, CoreTool>,
    executeToolCall: (name: string, args: unknown) => Promise<string>
  ): (prompt: string) => Promise<string> {
    console.log('[llmManager.createRalphSendMessage] Creating function with model:', modelId, 'tools:', Object.keys(tools))

    // Build system prompt with tool information
    const toolNames = Object.keys(tools)
    const toolDescriptions = toolNames.map(name => {
      const tool = tools[name]
      return `- ${name}: ${tool.description || 'No description'}`
    }).join('\n')

    const systemPrompt = `You are Wiggum, an AI coding assistant operating in an autonomous loop.

## Available Tools
You have access to the following tools. Use them to accomplish tasks:
${toolDescriptions}

## How to Use Tools
When you need to perform an action, use the tools provided. The tools will be called automatically when you request them through the function calling API.

For the shell tool, you can run commands like:
- ls /path - list files
- cat /path/file.txt - read a file
- echo "content" > /path/file.txt - write to a file
- mkdir /path/dir - create a directory

## Guidelines
1. Use tools to make changes - don't just describe what you would do
2. Verify your changes work before marking complete
3. For simple tasks, complete in one iteration
4. When done, use shell to write "complete" to .ralph/status.txt

Be direct and efficient. Execute commands, don't just talk about them.`

    return async (prompt: string): Promise<string> => {
      console.log('[llmManager.ralphSendMessage] Called with prompt length:', prompt.length)
      const messages: CoreMessage[] = [{ role: 'user', content: prompt }]
      let iterations = 0
      const maxIterations = 10
      let finalContent = ''

      while (iterations < maxIterations) {
        iterations++
        console.log('[llmManager.ralphSendMessage] Iteration:', iterations)

        const result = await this.streamChat({
          modelId,
          messages,
          tools: Object.keys(tools).length > 0 ? tools : undefined,
          system: systemPrompt,
          temperature: 0.7,
        })

        finalContent += result.text

        // Add assistant message to context
        if (result.toolCalls.length > 0) {
          // Filter out malformed tool calls (missing required args)
          // These would fail AI SDK schema validation on retry
          const validToolCalls = result.toolCalls.filter(tc => {
            const hasArgs = tc.args && Object.keys(tc.args).length > 0
            if (!hasArgs) {
              console.warn('[llmManager.ralphSendMessage] Skipping malformed tool call (no args):', tc.toolName)
            }
            return hasArgs
          })

          // If all tool calls were malformed, return error to user
          if (validToolCalls.length === 0) {
            const toolNames = result.toolCalls.map(tc => tc.toolName).join(', ')
            finalContent += `\n\n[Error: Model called tool(s) "${toolNames}" without required arguments. This model may not support function calling properly.]`
            break
          }

          // Normalize valid tool calls
          const normalizedToolCalls = validToolCalls.map(tc => ({
            type: 'tool-call' as const,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args,
          }))

          messages.push({
            role: 'assistant',
            content: [
              ...(result.text ? [{ type: 'text' as const, text: result.text }] : []),
              ...normalizedToolCalls,
            ],
          })

          // Execute valid tool calls and add results
          for (const toolCall of validToolCalls) {
            try {
              console.log('[llmManager.ralphSendMessage] Executing tool:', toolCall.toolName, 'with args:', toolCall.args)
              const toolResult = await executeToolCall(toolCall.toolName, toolCall.args)
              console.log('[llmManager.ralphSendMessage] Tool result:', toolResult?.slice(0, 200))
              messages.push({
                role: 'tool',
                content: [
                  {
                    type: 'tool-result',
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    result: toolResult,
                  },
                ],
              })
            } catch (err) {
              console.error('[llmManager.ralphSendMessage] Tool error:', err)
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

          // Continue loop for next iteration
          continue
        }

        // No tool calls, add text response and finish
        if (result.text) {
          messages.push({ role: 'assistant', content: result.text })
        }
        break
      }

      return finalContent
    }
  }
}

/**
 * Singleton instance of the LLM Manager
 */
export const llmManager = new LLMManagerClass(providerRegistry)

// Auto-initialize with defaults
llmManager.initialize()
