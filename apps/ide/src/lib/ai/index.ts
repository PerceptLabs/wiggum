// ==================================
// Legacy Types (kept for compatibility)
// ==================================
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

// Legacy Client (kept for compatibility)
export { createAIClient, AIClient, createProvider } from './client'

// Legacy Streaming (kept for compatibility)
export { processStream, createStreamProcessor, hasToolCalls, finishedWithToolCalls } from './streaming'

// ==================================
// New Vercel AI SDK Provider System
// ==================================

// LLM Manager (main entry point)
export { llmManager } from './manager'
export type { StreamChatOptions, StreamChatResult } from './manager'

// Re-export Vercel AI SDK types for convenience
export type { CoreMessage, CoreTool, ToolCallPart } from 'ai'

// Provider types and utilities
export type {
  ModelInfo,
  ProviderType,
  ProviderConfig,
  OfficialProviderConfig,
  OllamaProviderConfig,
  OllamaLocalProviderConfig,
  OllamaCloudProviderConfig,
  CustomProviderConfig,
  AnyProviderConfig,
} from './providers'

export { DEFAULT_MODELS, DEFAULT_PROVIDERS, ProviderRegistry, providerRegistry } from './providers'

// Provider adapters
export {
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  GOOGLE_MODELS,
  DEFAULT_OLLAMA_URL,
  OLLAMA_CLOUD_URL,
  CUSTOM_PROVIDER_PRESETS,
  fetchOllamaModels,
  checkOllamaAvailable,
  getOllamaLocalConfig,
  getOllamaCloudConfig,
} from './providers'
