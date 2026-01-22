/**
 * Provider System Exports
 */

// Types
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
} from './types'

export { DEFAULT_MODELS, DEFAULT_PROVIDERS } from './types'

// Registry
export { ProviderRegistry, providerRegistry } from './registry'

// Provider Adapters
export {
  createOpenAIProvider,
  getOpenAIConfig,
  OPENAI_MODELS,
} from './openai'

export {
  createAnthropicProvider,
  getAnthropicConfig,
  ANTHROPIC_MODELS,
} from './anthropic'

export {
  createGoogleProvider,
  getGoogleConfig,
  GOOGLE_MODELS,
} from './google'

export {
  createOllamaLocalProvider,
  createOllamaCloudProvider,
  getOllamaLocalConfig,
  getOllamaCloudConfig,
  fetchOllamaModels,
  checkOllamaAvailable,
  createOllamaLocalWithModels,
  DEFAULT_OLLAMA_URL,
  OLLAMA_CLOUD_URL,
} from './ollama'

export {
  createCustomProvider,
  createCustomProviderConfig,
  createFromPreset,
  fetchCustomModels,
  CUSTOM_PROVIDER_PRESETS,
} from './custom'
