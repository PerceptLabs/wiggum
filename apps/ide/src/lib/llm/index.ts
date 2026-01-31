export {
  chat,
  LLMError,
  type LLMProvider,
  type Message,
  type ToolCall,
  type Tool,
} from './client';

export {
  createProvider,
  providers,
  fetchOllamaModels,
  fetchOpenAICompatibleModels,
  checkProviderAvailable,
  detectLocalProviders,
  getDefaultBaseUrl,
  getDefaultModel,
  type ProviderPreset,
  type ProviderConfig,
  type LocalProviderStatus,
} from './providers';

export { shellTool, executeShellTool } from './shell-tool';

// Type aliases for backwards compatibility with old @/lib/ai types
import type { Message, ToolCall } from './client';

/** Extended message type for UI with optional display metadata */
export interface AIMessage extends Message {
  /** UI display type - 'status' for reasoning, 'action' for command echoes, 'intent'/'summary' for structured output */
  _displayType?: 'status' | 'action' | 'intent' | 'summary';
}

export type AIToolCall = ToolCall;
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
