import type { Tool } from './types'

/**
 * Message content for AI conversation
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

/**
 * Tool call from AI response
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * AI client interface (compatible with OpenAI API)
 */
export interface AIClient {
  chat: {
    completions: {
      create(options: {
        model: string
        messages: Message[]
        tools?: ToolDefinition[]
        stream?: boolean
      }): Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>>
    }
  }
}

/**
 * Tool definition for AI API
 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters?: Record<string, unknown>
  }
}

/**
 * Chat completion response
 */
export interface ChatCompletion {
  choices: Array<{
    message: {
      role: 'assistant'
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }>
}

/**
 * Streaming chunk
 */
export interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      role?: 'assistant'
      content?: string | null
      tool_calls?: Array<{
        index: number
        id?: string
        type?: 'function'
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason: string | null
  }>
}

/**
 * Options for creating the sendMessage callback
 */
export interface CreateSendMessageOptions {
  /** AI client (OpenAI-compatible) */
  client: AIClient
  /** Model to use */
  model: string
  /** Available tools */
  tools: Tool[]
  /** System prompt (optional) */
  systemPrompt?: string
  /** Callback for each tool call */
  onToolCall?: (name: string, args: unknown, result: string) => void
  /** Callback for AI response text */
  onResponse?: (text: string) => void
  /** Maximum iterations to prevent infinite loops */
  maxIterations?: number
}

/**
 * Convert Tool to OpenAI tool definition
 */
function toolToDefinition(tool: Tool): ToolDefinition {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema
        ? {
            type: 'object',
            properties: {
              // This is a simplified schema conversion
              // Real implementation would use zod-to-json-schema
              ...Object.fromEntries(
                Object.keys(tool.inputSchema._def?.shape?.() ?? {}).map((key) => [
                  key,
                  { type: 'string' },
                ])
              ),
            },
          }
        : undefined,
    },
  }
}

/**
 * Create a sendMessage callback for ralph
 *
 * This factory creates the function that ralph uses to invoke the AI with fresh context.
 * Each call creates a new conversation (no history pollution) and executes the full
 * tool-call loop until the AI stops requesting tools.
 */
export function createSendMessage(options: CreateSendMessageOptions): (prompt: string) => Promise<string> {
  const {
    client,
    model,
    tools,
    systemPrompt = 'You are an AI assistant helping with software development.',
    onToolCall,
    onResponse,
    maxIterations = 10,
  } = options

  // Build tool map for lookup
  const toolMap = new Map(tools.map((t) => [t.name, t]))

  // Convert tools to API format
  const toolDefinitions = tools.map(toolToDefinition)

  return async (prompt: string): Promise<string> => {
    // Start fresh conversation with system prompt and user message
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]

    let iterations = 0
    let finalResponse = ''

    // Tool call loop
    while (iterations < maxIterations) {
      iterations++

      // Call the AI
      const response = await client.chat.completions.create({
        model,
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
      })

      // Handle non-streaming response
      const completion = response as ChatCompletion
      const choice = completion.choices[0]
      const assistantMessage = choice.message

      // Accumulate response text
      if (assistantMessage.content) {
        finalResponse += assistantMessage.content
        onResponse?.(assistantMessage.content)
      }

      // Check if AI wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: assistantMessage.content ?? '',
          tool_calls: assistantMessage.tool_calls,
        })

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name
          const tool = toolMap.get(toolName)

          let result: string
          if (tool) {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              const toolResult = await tool.execute(args)
              result = toolResult.content
              onToolCall?.(toolName, args, result)
            } catch (err) {
              result = `Error executing tool: ${(err as Error).message}`
            }
          } else {
            result = `Unknown tool: ${toolName}`
          }

          // Add tool result message
          messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          })
        }

        // Continue loop to let AI process tool results
        continue
      }

      // No tool calls, AI is done
      break
    }

    return finalResponse
  }
}

/**
 * Create a sendMessage callback for streaming responses
 *
 * Similar to createSendMessage but handles streaming chunks
 */
export function createSendMessageStreaming(
  options: CreateSendMessageOptions & {
    onChunk?: (chunk: string) => void
  }
): (prompt: string) => Promise<string> {
  const {
    client,
    model,
    tools,
    systemPrompt = 'You are an AI assistant helping with software development.',
    onToolCall,
    onResponse,
    onChunk,
    maxIterations = 10,
  } = options

  const toolMap = new Map(tools.map((t) => [t.name, t]))
  const toolDefinitions = tools.map(toolToDefinition)

  return async (prompt: string): Promise<string> => {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ]

    let iterations = 0
    let finalResponse = ''

    while (iterations < maxIterations) {
      iterations++

      const stream = await client.chat.completions.create({
        model,
        messages,
        tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
        stream: true,
      })

      // Accumulate streaming response
      let content = ''
      const toolCalls: Map<number, ToolCall> = new Map()

      for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          content += delta.content
          onChunk?.(delta.content)
        }

        // Accumulate tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            let existing = toolCalls.get(tc.index)
            if (!existing) {
              existing = {
                id: tc.id ?? '',
                type: 'function',
                function: { name: '', arguments: '' },
              }
              toolCalls.set(tc.index, existing)
            }
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.function.name += tc.function.name
            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
          }
        }
      }

      if (content) {
        finalResponse += content
        onResponse?.(content)
      }

      // Process tool calls if any
      const allToolCalls = Array.from(toolCalls.values()).filter((tc) => tc.id && tc.function.name)

      if (allToolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: content,
          tool_calls: allToolCalls,
        })

        for (const toolCall of allToolCalls) {
          const tool = toolMap.get(toolCall.function.name)

          let result: string
          if (tool) {
            try {
              const args = JSON.parse(toolCall.function.arguments)
              const toolResult = await tool.execute(args)
              result = toolResult.content
              onToolCall?.(toolCall.function.name, args, result)
            } catch (err) {
              result = `Error: ${(err as Error).message}`
            }
          } else {
            result = `Unknown tool: ${toolCall.function.name}`
          }

          messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          })
        }

        continue
      }

      break
    }

    return finalResponse
  }
}
