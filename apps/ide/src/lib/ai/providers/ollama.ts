/**
 * Ollama Provider Adapters
 *
 * Uses @ai-sdk/openai-compatible to connect to Ollama's OpenAI-compatible API.
 * Two separate providers:
 * - ollama-local: Local server at http://localhost:11434, no API key required
 * - ollama-cloud: Ollama cloud API at https://api.ollama.com, requires API key
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { ModelInfo, OllamaLocalProviderConfig, OllamaCloudProviderConfig } from './types'

/**
 * Default Ollama local server URL
 */
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434'

/**
 * Ollama cloud API URL
 */
export const OLLAMA_CLOUD_URL = 'https://api.ollama.com'

/**
 * Response type from Ollama /api/tags endpoint
 */
interface OllamaTagsResponse {
  models: Array<{
    name: string
    model: string
    modified_at: string
    size: number
    digest: string
    details: {
      parent_model?: string
      format?: string
      family?: string
      families?: string[]
      parameter_size?: string
      quantization_level?: string
    }
  }>
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)}GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(0)}MB`
  return `${bytes}B`
}

/**
 * Convert Ollama model info to our ModelInfo format
 */
function toModelInfo(model: OllamaTagsResponse['models'][0], providerId: string): ModelInfo {
  const paramSize = model.details.parameter_size || ''
  const size = formatSize(model.size)

  // Build description
  let description = `${paramSize}`
  if (model.details.quantization_level) {
    description += ` ${model.details.quantization_level}`
  }
  description += ` (${size})`

  return {
    id: model.name,
    label: model.name,
    providerId,
    maxTokens: 128000, // Default context, varies by model
    isCloud: providerId === 'ollama-cloud',
    supportsVision: model.details.families?.includes('clip') || false,
    supportsTools: true, // Most modern Ollama models support tools
    description,
  }
}

/**
 * Fetch available models from a local Ollama server
 * Returns empty array if Ollama isn't running
 */
export async function fetchOllamaModels(
  baseUrl = DEFAULT_OLLAMA_URL,
  providerId = 'ollama-local'
): Promise<ModelInfo[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`Ollama server returned ${response.status}`)
      return []
    }

    const data: OllamaTagsResponse = await response.json()

    if (!data.models || data.models.length === 0) {
      console.log('Ollama server is running but no models are installed')
      return []
    }

    return data.models.map((m) => toModelInfo(m, providerId))
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        console.warn('Ollama server connection timed out')
      } else if (error.message.includes('fetch')) {
        console.warn('Ollama server is not running')
      } else {
        console.warn('Failed to fetch Ollama models:', error.message)
      }
    }
    return []
  }
}

/**
 * Check if Ollama local server is available
 */
export async function checkOllamaAvailable(
  baseUrl = DEFAULT_OLLAMA_URL
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Create an Ollama Local provider instance using OpenAI-compatible API
 * Ollama exposes OpenAI-compatible endpoints at /v1/*
 */
export function createOllamaLocalProvider(baseUrl = DEFAULT_OLLAMA_URL) {
  console.log('[Ollama] Creating local provider with baseUrl:', baseUrl)
  return createOpenAICompatible({
    name: 'ollama-local',
    baseURL: `${baseUrl}/v1`,
    // No API key needed for local Ollama
    headers: {},
  })
}

/**
 * Create an Ollama Cloud provider instance
 */
export function createOllamaCloudProvider(apiKey: string, baseUrl = OLLAMA_CLOUD_URL) {
  console.log('[Ollama] Creating cloud provider with baseUrl:', baseUrl)
  return createOpenAICompatible({
    name: 'ollama-cloud',
    baseURL: `${baseUrl}/v1`,
    apiKey,
  })
}

/**
 * Get the default Ollama Local provider configuration
 */
export function getOllamaLocalConfig(
  baseUrl = DEFAULT_OLLAMA_URL,
  models: ModelInfo[] = []
): OllamaLocalProviderConfig {
  return {
    id: 'ollama-local',
    name: 'Ollama Local',
    type: 'ollama-local',
    baseUrl,
    models,
    enabled: false, // Disabled by default until user enables it
    defaultModelId: models[0]?.id,
    lastRefreshed: models.length > 0 ? Date.now() : undefined,
  }
}

/**
 * Get the default Ollama Cloud provider configuration
 */
export function getOllamaCloudConfig(
  apiKey?: string,
  baseUrl = OLLAMA_CLOUD_URL
): OllamaCloudProviderConfig {
  return {
    id: 'ollama-cloud',
    name: 'Ollama Cloud',
    type: 'ollama-cloud',
    baseUrl,
    apiKey,
    models: [], // Models populated after authentication
    enabled: false,
    defaultModelId: undefined,
  }
}

/**
 * Create provider with auto-discovered models
 */
export async function createOllamaLocalWithModels(
  baseUrl = DEFAULT_OLLAMA_URL
): Promise<{
  provider: ReturnType<typeof createOpenAICompatible>
  config: OllamaLocalProviderConfig
}> {
  const models = await fetchOllamaModels(baseUrl, 'ollama-local')
  const provider = createOllamaLocalProvider(baseUrl)
  const config = getOllamaLocalConfig(baseUrl, models)

  return { provider, config }
}
