/**
 * Custom Provider Factory
 * Creates OpenAI-compatible providers for user-defined endpoints
 *
 * Supports any OpenAI-compatible API:
 * - Together AI (https://api.together.xyz/v1)
 * - Groq (https://api.groq.com/openai/v1)
 * - OpenRouter (https://openrouter.ai/api/v1)
 * - Local servers (LM Studio, vLLM, etc.)
 * - Any other OpenAI-compatible endpoint
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelInfo, CustomProviderConfig } from './types'

/**
 * Create a custom OpenAI-compatible provider
 */
export function createCustomProvider(config: {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  headers?: Record<string, string>
}) {
  return createOpenAICompatible({
    name: config.id,
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    headers: config.headers,
  })
}

/**
 * Create a custom provider configuration
 */
export function createCustomProviderConfig(options: {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  headers?: Record<string, string>
  models?: ModelInfo[]
  defaultModelId?: string
}): CustomProviderConfig {
  return {
    id: options.id,
    name: options.name,
    type: 'custom',
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    headers: options.headers,
    models: options.models || [],
    enabled: true,
    defaultModelId: options.defaultModelId,
  }
}

/**
 * Preset configurations for popular OpenAI-compatible providers
 */
export const CUSTOM_PROVIDER_PRESETS = {
  together: {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    models: [
      {
        id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        label: 'Llama 3.3 70B Turbo',
        providerId: 'together',
        maxTokens: 128000,
        isCloud: true,
        supportsTools: true,
        description: 'Fast Llama 3.3 70B on Together',
      },
      {
        id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
        label: 'Llama 3.1 405B',
        providerId: 'together',
        maxTokens: 128000,
        isCloud: true,
        supportsTools: true,
        description: 'Largest open model',
      },
      {
        id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
        label: 'Qwen 2.5 Coder 32B',
        providerId: 'together',
        maxTokens: 32768,
        isCloud: true,
        supportsTools: true,
        description: 'Strong coding model',
      },
      {
        id: 'deepseek-ai/DeepSeek-R1',
        label: 'DeepSeek R1',
        providerId: 'together',
        maxTokens: 64000,
        isCloud: true,
        supportsTools: false,
        description: 'Reasoning model',
      },
    ] as ModelInfo[],
    defaultModelId: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },

  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B',
        providerId: 'groq',
        maxTokens: 128000,
        isCloud: true,
        supportsTools: true,
        description: 'Fast inference on Groq',
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B',
        providerId: 'groq',
        maxTokens: 128000,
        isCloud: true,
        supportsTools: true,
        description: 'Ultra-fast small model',
      },
      {
        id: 'mixtral-8x7b-32768',
        label: 'Mixtral 8x7B',
        providerId: 'groq',
        maxTokens: 32768,
        isCloud: true,
        supportsTools: true,
        description: 'MoE model on Groq',
      },
    ] as ModelInfo[],
    defaultModelId: 'llama-3.3-70b-versatile',
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      {
        id: 'anthropic/claude-sonnet-4',
        label: 'Claude Sonnet 4',
        providerId: 'openrouter',
        maxTokens: 200000,
        isCloud: true,
        supportsTools: true,
        description: 'Claude via OpenRouter',
      },
      {
        id: 'openai/gpt-4o',
        label: 'GPT-4o',
        providerId: 'openrouter',
        maxTokens: 128000,
        isCloud: true,
        supportsTools: true,
        description: 'GPT-4o via OpenRouter',
      },
      {
        id: 'google/gemini-2.0-flash-001',
        label: 'Gemini 2.0 Flash',
        providerId: 'openrouter',
        maxTokens: 1000000,
        isCloud: true,
        supportsTools: true,
        description: 'Gemini via OpenRouter',
      },
      {
        id: 'meta-llama/llama-3.3-70b-instruct',
        label: 'Llama 3.3 70B',
        providerId: 'openrouter',
        maxTokens: 128000,
        isCloud: true,
        supportsTools: true,
        description: 'Llama via OpenRouter',
      },
    ] as ModelInfo[],
    defaultModelId: 'anthropic/claude-sonnet-4',
  },

  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    models: [] as ModelInfo[], // User must configure
    defaultModelId: undefined,
  },
} as const

/**
 * Create a provider from a preset
 */
export function createFromPreset(
  presetId: keyof typeof CUSTOM_PROVIDER_PRESETS,
  apiKey?: string
): {
  provider: ReturnType<typeof createOpenAICompatible>
  config: CustomProviderConfig
} {
  const preset = CUSTOM_PROVIDER_PRESETS[presetId]
  const provider = createCustomProvider({
    ...preset,
    apiKey,
  })
  const config = createCustomProviderConfig({
    ...preset,
    apiKey,
  })

  return { provider, config }
}

/**
 * Try to fetch models from a custom endpoint
 * Many OpenAI-compatible APIs support GET /models
 */
export async function fetchCustomModels(
  baseUrl: string,
  apiKey?: string
): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    const models = data.data || data.models || []

    return models.map((m: { id: string; owned_by?: string }) => ({
      id: m.id,
      label: m.id,
      providerId: 'custom',
      maxTokens: 128000, // Default, unknown
      isCloud: true,
      supportsTools: true,
      description: m.owned_by ? `By ${m.owned_by}` : undefined,
    }))
  } catch {
    return []
  }
}
