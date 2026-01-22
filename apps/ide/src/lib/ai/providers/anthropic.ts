/**
 * Anthropic Provider Adapter
 * Wraps @ai-sdk/anthropic for use with the provider system
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import type { ModelInfo, OfficialProviderConfig } from './types'

/**
 * Available Anthropic models
 */
export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    label: 'Claude Sonnet 4',
    providerId: 'anthropic',
    maxTokens: 200000,
    isCloud: true,
    supportsVision: true,
    supportsTools: true,
    description: 'Latest Claude model, best balance of capability and speed',
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
]

/**
 * Create an Anthropic provider instance
 */
export function createAnthropicProvider(apiKey?: string) {
  return createAnthropic({
    apiKey,
  })
}

/**
 * Get the default Anthropic provider configuration
 */
export function getAnthropicConfig(apiKey?: string): OfficialProviderConfig {
  return {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'official',
    officialProvider: 'anthropic',
    apiKey,
    models: ANTHROPIC_MODELS,
    enabled: true,
    defaultModelId: 'claude-sonnet-4-20250514',
  }
}
