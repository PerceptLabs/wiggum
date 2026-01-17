/**
 * AI Provider configuration
 * Supports any OpenAI-compatible API
 */
export interface AIProvider {
  id: string
  name: string
  baseURL: string
  apiKey: string
  defaultModel?: string
}

/**
 * Built-in provider presets
 */
export const PROVIDER_PRESETS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4',
  },
  local: {
    id: 'local',
    name: 'Local',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
  },
} as const

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/**
 * Tool call in an AI message
 */
export interface AIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * AI chat message
 */
export interface AIMessage {
  role: MessageRole
  content: string | null
  name?: string
  tool_call_id?: string
  tool_calls?: AIToolCall[]
}

/**
 * Tool definition for API
 */
export interface AIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters?: {
      type: 'object'
      properties?: Record<string, unknown>
      required?: string[]
    }
  }
}

/**
 * Streaming chunk delta
 */
export interface AIStreamDelta {
  role?: MessageRole
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

/**
 * Streaming response chunk
 */
export interface AIStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: AIStreamDelta
    finish_reason: 'stop' | 'tool_calls' | 'length' | null
  }>
}

/**
 * Non-streaming chat completion response
 */
export interface AIChatCompletion {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: AIMessage
    finish_reason: 'stop' | 'tool_calls' | 'length'
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Chat completion request options
 */
export interface AIChatOptions {
  model: string
  messages: AIMessage[]
  tools?: AIToolDefinition[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

/**
 * Streaming callbacks
 */
export interface StreamCallbacks {
  onContent?: (content: string) => void
  onToolCall?: (toolCall: AIToolCall) => void
  onFinish?: (reason: string) => void
  onError?: (error: Error) => void
}

/**
 * Accumulated streaming result
 */
export interface StreamResult {
  content: string
  toolCalls: AIToolCall[]
  finishReason: string | null
}
