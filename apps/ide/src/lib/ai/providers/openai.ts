/**
 * OpenAI Provider Adapter
 * Wraps @ai-sdk/openai for use with the provider system
 */

import { createOpenAI } from '@ai-sdk/openai'
import type { ModelInfo, OfficialProviderConfig } from './types'

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS: ModelInfo[] = [
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
]

/**
 * Create an OpenAI provider instance
 */
export function createOpenAIProvider(apiKey?: string) {
  return createOpenAI({
    apiKey,
    compatibility: 'strict',
  })
}

/**
 * Get the default OpenAI provider configuration
 */
export function getOpenAIConfig(apiKey?: string): OfficialProviderConfig {
  return {
    id: 'openai',
    name: 'OpenAI',
    type: 'official',
    officialProvider: 'openai',
    apiKey,
    models: OPENAI_MODELS,
    enabled: true,
    defaultModelId: 'gpt-4o',
  }
}
