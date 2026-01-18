// Types
export type {
  AIProvider,
  MessageRole,
  AIToolCall,
  AIMessage,
  AIToolDefinition,
  AIStreamDelta,
  AIStreamChunk,
  AIChatCompletion,
  AIChatOptions,
  StreamCallbacks,
  StreamResult,
} from './types'

export { PROVIDER_PRESETS } from './types'

// Client
export { createAIClient, AIClient, createProvider } from './client'

// Streaming
export { processStream, createStreamProcessor, hasToolCalls, finishedWithToolCalls } from './streaming'
