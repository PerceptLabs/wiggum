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
export type AIMessage = Message;
export type AIToolCall = ToolCall;
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';
