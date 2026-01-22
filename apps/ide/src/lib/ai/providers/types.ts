/**
 * Vercel AI SDK Provider Types
 * Defines interfaces for the multi-provider LLM system
 */

/**
 * Information about a specific model
 */
export interface ModelInfo {
  /** Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4-20250514') */
  id: string
  /** Human-readable label (e.g., 'GPT-4o', 'Claude Sonnet 4') */
  label: string
  /** Provider this model belongs to */
  providerId: string
  /** Maximum context tokens */
  maxTokens: number
  /** Whether this is a cloud model (requires internet/API key) vs local */
  isCloud: boolean
  /** Optional description */
  description?: string
  /** Whether this model supports vision/images */
  supportsVision?: boolean
  /** Whether this model supports tool/function calling */
  supportsTools?: boolean
}

/**
 * Provider type classification
 */
export type ProviderType = 'official' | 'ollama-local' | 'ollama-cloud' | 'custom'

/**
 * Base configuration for any provider
 */
export interface ProviderConfig {
  /** Unique identifier for this provider instance */
  id: string
  /** Human-readable name */
  name: string
  /** Provider type */
  type: ProviderType
  /** API key (if required) */
  apiKey?: string
  /** Base URL (for custom/ollama providers) */
  baseUrl?: string
  /** Available models for this provider */
  models: ModelInfo[]
  /** Whether this provider is enabled */
  enabled: boolean
  /** Default model ID to use */
  defaultModelId?: string
}

/**
 * Configuration for official providers (OpenAI, Anthropic, Google)
 */
export interface OfficialProviderConfig extends ProviderConfig {
  type: 'official'
  /** The official provider identifier */
  officialProvider: 'openai' | 'anthropic' | 'google'
}

/**
 * Configuration for Ollama Local provider (no API key required)
 */
export interface OllamaLocalProviderConfig extends ProviderConfig {
  type: 'ollama-local'
  /** Base URL for Ollama server (default: http://localhost:11434) */
  baseUrl: string
  /** Discovered models from the local server */
  discoveredModels?: ModelInfo[]
  /** Last time models were refreshed */
  lastRefreshed?: number
}

/**
 * Configuration for Ollama Cloud provider (API key required)
 */
export interface OllamaCloudProviderConfig extends ProviderConfig {
  type: 'ollama-cloud'
  /** Base URL for Ollama cloud API */
  baseUrl: string
}

/**
 * Legacy Ollama config for backwards compatibility
 * @deprecated Use OllamaLocalProviderConfig or OllamaCloudProviderConfig
 */
export interface OllamaProviderConfig extends ProviderConfig {
  type: 'ollama-local' | 'ollama-cloud'
  baseUrl: string
}

/**
 * Configuration for custom OpenAI-compatible endpoints
 */
export interface CustomProviderConfig extends ProviderConfig {
  type: 'custom'
  /** Base URL for the OpenAI-compatible API */
  baseUrl: string
  /** Optional custom headers to send with requests */
  headers?: Record<string, string>
}

/**
 * Union type for all provider configs
 */
export type AnyProviderConfig =
  | OfficialProviderConfig
  | OllamaLocalProviderConfig
  | OllamaCloudProviderConfig
  | CustomProviderConfig

/**
 * Default models for official providers
 */
export const DEFAULT_MODELS: Record<string, ModelInfo[]> = {
  openai: [
    {
      id: 'gpt-4o',
      label: 'GPT-4o',
      providerId: 'openai',
      maxTokens: 128000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Most capable GPT-4 model, optimized for speed',
    },
    {
      id: 'gpt-4o-mini',
      label: 'GPT-4o Mini',
      providerId: 'openai',
      maxTokens: 128000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Smaller, faster, cheaper GPT-4o variant',
    },
    {
      id: 'gpt-4-turbo',
      label: 'GPT-4 Turbo',
      providerId: 'openai',
      maxTokens: 128000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Previous generation GPT-4 with vision',
    },
    {
      id: 'o1',
      label: 'o1',
      providerId: 'openai',
      maxTokens: 200000,
      isCloud: true,
      supportsVision: true,
      supportsTools: false,
      description: 'Advanced reasoning model',
    },
    {
      id: 'o1-mini',
      label: 'o1 Mini',
      providerId: 'openai',
      maxTokens: 128000,
      isCloud: true,
      supportsVision: false,
      supportsTools: false,
      description: 'Smaller reasoning model, faster and cheaper',
    },
  ],
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      label: 'Claude Sonnet 4',
      providerId: 'anthropic',
      maxTokens: 200000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Latest Claude model, best for coding',
    },
    {
      id: 'claude-opus-4-20250514',
      label: 'Claude Opus 4',
      providerId: 'anthropic',
      maxTokens: 200000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Most capable Claude model',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku',
      providerId: 'anthropic',
      maxTokens: 200000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Fast and efficient Claude model',
    },
  ],
  google: [
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      providerId: 'google',
      maxTokens: 1000000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Fast multimodal model with 1M context',
    },
    {
      id: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro',
      providerId: 'google',
      maxTokens: 2000000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Most capable Gemini with 2M context',
    },
    {
      id: 'gemini-1.5-flash',
      label: 'Gemini 1.5 Flash',
      providerId: 'google',
      maxTokens: 1000000,
      isCloud: true,
      supportsVision: true,
      supportsTools: true,
      description: 'Balanced speed and capability',
    },
  ],
}

/**
 * Default provider configurations
 */
export const DEFAULT_PROVIDERS: OfficialProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'official',
    officialProvider: 'openai',
    models: DEFAULT_MODELS.openai,
    enabled: true,
    defaultModelId: 'gpt-4o',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'official',
    officialProvider: 'anthropic',
    models: DEFAULT_MODELS.anthropic,
    enabled: true,
    defaultModelId: 'claude-sonnet-4-20250514',
  },
  {
    id: 'google',
    name: 'Google AI',
    type: 'official',
    officialProvider: 'google',
    models: DEFAULT_MODELS.google,
    enabled: true,
    defaultModelId: 'gemini-2.0-flash',
  },
]
