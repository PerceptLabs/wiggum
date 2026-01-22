/**
 * Google AI Provider Adapter
 * Wraps @ai-sdk/google for use with the provider system
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { ModelInfo, OfficialProviderConfig } from './types'

/**
 * Available Google AI models
 */
export const GOOGLE_MODELS: ModelInfo[] = [
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
]

/**
 * Create a Google AI provider instance
 */
export function createGoogleProvider(apiKey?: string) {
  return createGoogleGenerativeAI({
    apiKey,
  })
}

/**
 * Get the default Google AI provider configuration
 */
export function getGoogleConfig(apiKey?: string): OfficialProviderConfig {
  return {
    id: 'google',
    name: 'Google AI',
    type: 'official',
    officialProvider: 'google',
    apiKey,
    models: GOOGLE_MODELS,
    enabled: true,
    defaultModelId: 'gemini-2.0-flash',
  }
}
