/**
 * Provider Registry using Vercel AI SDK
 * Creates and manages provider instances for multi-provider support
 */

import { experimental_createProviderRegistry as createProviderRegistry } from 'ai'
import type {
  AnyProviderConfig,
  OfficialProviderConfig,
  OllamaLocalProviderConfig,
  OllamaCloudProviderConfig,
  CustomProviderConfig,
} from './types'

// Import provider adapters
import { createOpenAIProvider } from './openai'
import { createAnthropicProvider } from './anthropic'
import { createGoogleProvider } from './google'
import { createOllamaLocalProvider, createOllamaCloudProvider } from './ollama'
import { createCustomProvider as createCustomProviderAdapter } from './custom'

/**
 * Create a Vercel AI SDK provider instance from a config
 */
function createProviderInstance(config: AnyProviderConfig) {
  switch (config.type) {
    case 'official':
      return createOfficialProvider(config)
    case 'ollama-local':
      return createOllamaLocalProviderInstance(config)
    case 'ollama-cloud':
      return createOllamaCloudProviderInstance(config)
    case 'custom':
      return createCustomProviderInstance(config)
    default:
      throw new Error(`Unknown provider type: ${(config as AnyProviderConfig).type}`)
  }
}

/**
 * Create an official provider (OpenAI, Anthropic, Google)
 */
function createOfficialProvider(config: OfficialProviderConfig) {
  switch (config.officialProvider) {
    case 'openai':
      return createOpenAIProvider(config.apiKey)
    case 'anthropic':
      return createAnthropicProvider(config.apiKey)
    case 'google':
      return createGoogleProvider(config.apiKey)
    default:
      throw new Error(`Unknown official provider: ${config.officialProvider}`)
  }
}

/**
 * Create an Ollama Local provider (no API key required)
 */
function createOllamaLocalProviderInstance(config: OllamaLocalProviderConfig) {
  return createOllamaLocalProvider(config.baseUrl)
}

/**
 * Create an Ollama Cloud provider (API key required)
 */
function createOllamaCloudProviderInstance(config: OllamaCloudProviderConfig) {
  if (!config.apiKey) {
    throw new Error('Ollama Cloud requires an API key')
  }
  return createOllamaCloudProvider(config.apiKey, config.baseUrl)
}

/**
 * Create a custom OpenAI-compatible provider
 */
function createCustomProviderInstance(config: CustomProviderConfig) {
  return createCustomProviderAdapter({
    id: config.id,
    name: config.name,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    headers: config.headers,
  })
}

/**
 * Provider Registry class
 * Manages provider instances and provides model access
 */
export class ProviderRegistry {
  private configs: Map<string, AnyProviderConfig> = new Map()
  private instances: Map<string, ReturnType<typeof createProviderInstance>> = new Map()
  private registry: ReturnType<typeof createProviderRegistry> | null = null

  /**
   * Register a provider configuration
   */
  registerProvider(config: AnyProviderConfig): void {
    // Store config
    this.configs.set(config.id, config)

    // Clear cached instance if exists
    this.instances.delete(config.id)

    // Rebuild registry
    this.rebuildRegistry()
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(providerId: string): void {
    this.configs.delete(providerId)
    this.instances.delete(providerId)
    this.rebuildRegistry()
  }

  /**
   * Update a provider's configuration (e.g., API key)
   */
  updateProvider(providerId: string, updates: Partial<AnyProviderConfig>): void {
    const existing = this.configs.get(providerId)
    if (!existing) {
      throw new Error(`Provider not found: ${providerId}`)
    }

    const updated = { ...existing, ...updates } as AnyProviderConfig
    this.configs.set(providerId, updated)
    this.instances.delete(providerId)
    this.rebuildRegistry()
  }

  /**
   * Get a provider instance
   */
  getProviderInstance(providerId: string) {
    console.log('[ProviderRegistry.getProviderInstance] Called with:', providerId)
    console.log('[ProviderRegistry.getProviderInstance] Available providers:', Array.from(this.configs.keys()))
    const config = this.configs.get(providerId)
    if (!config) {
      console.log('[ProviderRegistry.getProviderInstance] Provider not found:', providerId)
      throw new Error(`Provider not found: ${providerId}`)
    }

    console.log('[ProviderRegistry.getProviderInstance] Config:', { type: config.type, enabled: config.enabled })

    if (!config.enabled) {
      throw new Error(`Provider is disabled: ${providerId}`)
    }

    // Check for cached instance
    let instance = this.instances.get(providerId)
    if (!instance) {
      console.log('[ProviderRegistry.getProviderInstance] Creating new instance')
      instance = createProviderInstance(config)
      this.instances.set(providerId, instance)
    }

    return instance
  }

  /**
   * Get a language model by provider:model ID string
   * e.g., 'openai:gpt-4o' or 'anthropic:claude-sonnet-4-20250514'
   */
  getLanguageModel(modelId: string) {
    console.log('[ProviderRegistry.getLanguageModel] Called with:', modelId)
    const [providerId, modelName] = this.parseModelId(modelId)
    console.log('[ProviderRegistry.getLanguageModel] Parsed:', { providerId, modelName })
    const provider = this.getProviderInstance(providerId)
    console.log('[ProviderRegistry.getLanguageModel] Got provider:', { type: typeof provider, keys: Object.keys(provider || {}) })

    // All Vercel AI SDK providers have a languageModel or __call__ method
    if (typeof provider === 'function') {
      console.log('[ProviderRegistry.getLanguageModel] Using function call')
      return provider(modelName)
    }

    // For providers that expose .languageModel()
    if ('languageModel' in provider && typeof provider.languageModel === 'function') {
      console.log('[ProviderRegistry.getLanguageModel] Using .languageModel()')
      return provider.languageModel(modelName)
    }

    // For providers that expose .chat()
    if ('chat' in provider && typeof provider.chat === 'function') {
      console.log('[ProviderRegistry.getLanguageModel] Using .chat()')
      return provider.chat(modelName)
    }

    throw new Error(`Cannot get language model from provider: ${providerId}`)
  }

  /**
   * Get an embedding model by provider:model ID string
   */
  getEmbeddingModel(modelId: string) {
    const [providerId, modelName] = this.parseModelId(modelId)
    const provider = this.getProviderInstance(providerId)

    if ('embedding' in provider && typeof provider.embedding === 'function') {
      return provider.embedding(modelName)
    }

    if ('textEmbedding' in provider && typeof provider.textEmbedding === 'function') {
      return provider.textEmbedding(modelName)
    }

    throw new Error(`Provider does not support embeddings: ${providerId}`)
  }

  /**
   * Get the unified provider registry (for use with Vercel AI SDK functions)
   */
  getRegistry() {
    if (!this.registry) {
      this.rebuildRegistry()
    }
    return this.registry
  }

  /**
   * List all registered providers
   */
  listProviders(): AnyProviderConfig[] {
    return Array.from(this.configs.values())
  }

  /**
   * Get a specific provider config
   */
  getProviderConfig(providerId: string): AnyProviderConfig | undefined {
    return this.configs.get(providerId)
  }

  /**
   * Check if a provider has a valid API key configured
   */
  hasApiKey(providerId: string): boolean {
    const config = this.configs.get(providerId)
    if (!config) return false

    // Ollama Local doesn't need an API key
    if (config.type === 'ollama-local') return true

    return !!config.apiKey && config.apiKey.length > 0
  }

  /**
   * Parse a model ID string (providerId:modelName)
   */
  private parseModelId(modelId: string): [string, string] {
    const colonIndex = modelId.indexOf(':')
    if (colonIndex === -1) {
      throw new Error(
        `Invalid model ID format: ${modelId}. Expected format: providerId:modelName`
      )
    }
    return [modelId.slice(0, colonIndex), modelId.slice(colonIndex + 1)]
  }

  /**
   * Rebuild the unified provider registry
   */
  private rebuildRegistry(): void {
    const providers: Record<string, ReturnType<typeof createProviderInstance>> = {}

    for (const [id, config] of this.configs) {
      if (config.enabled && (config.type === 'ollama-local' || this.hasApiKey(id))) {
        try {
          providers[id] = this.getProviderInstance(id)
        } catch {
          // Skip providers that fail to initialize
          console.warn(`Failed to initialize provider: ${id}`)
        }
      }
    }

    this.registry = createProviderRegistry({ providers })
  }
}

/**
 * Singleton instance of the provider registry
 */
export const providerRegistry = new ProviderRegistry()
