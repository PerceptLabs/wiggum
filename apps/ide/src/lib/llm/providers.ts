/**
 * Provider presets for common OpenAI-compatible APIs.
 * Supports Ollama, LM Studio, and custom endpoints.
 */

import type { LLMProvider } from './client';

export type ProviderPreset = 'openai' | 'anthropic' | 'ollama' | 'lmstudio' | 'custom';

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Default models for each provider
 */
const defaultModels: Record<ProviderPreset, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  ollama: 'llama3.2',
  lmstudio: 'local-model',
  custom: 'gpt-4o',
};

/**
 * Default base URLs for each provider
 */
const defaultBaseUrls: Record<ProviderPreset, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://localhost:11434',
  lmstudio: 'http://localhost:1234/v1',
  custom: 'http://localhost:8080/v1',
};

/**
 * Create an LLM provider from a preset
 */
export function createProvider(
  preset: ProviderPreset,
  config: ProviderConfig = {}
): LLMProvider {
  const baseUrl = config.baseUrl ?? defaultBaseUrls[preset];
  // Ollama needs /v1 appended for chat completions
  const chatBaseUrl = preset === 'ollama' ? `${baseUrl}/v1` : baseUrl;

  return {
    name: preset,
    baseUrl: chatBaseUrl,
    apiKey: config.apiKey,
    model: config.model ?? defaultModels[preset],
  };
}

/**
 * Provider factory functions
 */
export const providers = {
  openai: (apiKey: string, model?: string): LLMProvider =>
    createProvider('openai', { apiKey, model }),

  anthropic: (apiKey: string, model?: string): LLMProvider =>
    createProvider('anthropic', { apiKey, model }),

  ollama: (model?: string, baseUrl?: string): LLMProvider =>
    createProvider('ollama', { model, baseUrl }),

  lmstudio: (model?: string, baseUrl?: string): LLMProvider =>
    createProvider('lmstudio', { model, baseUrl }),

  custom: (baseUrl: string, model: string, apiKey?: string): LLMProvider =>
    createProvider('custom', { baseUrl, model, apiKey }),
};

/**
 * Ollama model response format
 */
interface OllamaTagsResponse {
  models?: Array<{ name: string; modified_at?: string; size?: number }>;
}

/**
 * OpenAI-compatible models response (for LM Studio, etc.)
 */
interface OpenAIModelsResponse {
  data?: Array<{ id: string; object?: string }>;
}

/**
 * Fetch available models from Ollama using /api/tags endpoint
 */
export async function fetchOllamaModels(
  baseUrl: string = defaultBaseUrls.ollama
): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`Ollama API returned ${response.status}`);
      return [];
    }

    const data: OllamaTagsResponse = await response.json();
    const models = data.models ?? [];
    return models.map((m) => m.name);
  } catch (error) {
    console.warn('Failed to fetch Ollama models:', error);
    return [];
  }
}

/**
 * Fetch available models from an OpenAI-compatible endpoint (LM Studio, etc.)
 */
export async function fetchOpenAICompatibleModels(
  baseUrl: string
): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/models`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`OpenAI-compatible API returned ${response.status}`);
      return [];
    }

    const data: OpenAIModelsResponse = await response.json();
    const models = data.data ?? [];
    return models.map((m) => m.id);
  } catch (error) {
    console.warn('Failed to fetch models from OpenAI-compatible API:', error);
    return [];
  }
}

/**
 * Check if a local provider is available
 */
export async function checkProviderAvailable(
  preset: ProviderPreset,
  baseUrl?: string
): Promise<boolean> {
  const url = baseUrl ?? defaultBaseUrls[preset];

  try {
    if (preset === 'ollama') {
      // Ollama has a simple health check at root
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } else if (preset === 'lmstudio' || preset === 'custom') {
      // OpenAI-compatible APIs have /models endpoint
      const response = await fetch(`${url}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Result of auto-detecting local providers
 */
export interface LocalProviderStatus {
  preset: ProviderPreset;
  available: boolean;
  baseUrl: string;
  models: string[];
}

/**
 * Auto-detect available local providers (Ollama, LM Studio)
 */
export async function detectLocalProviders(): Promise<LocalProviderStatus[]> {
  const results: LocalProviderStatus[] = [];

  // Check Ollama
  const ollamaUrl = defaultBaseUrls.ollama;
  const ollamaAvailable = await checkProviderAvailable('ollama', ollamaUrl);
  const ollamaModels = ollamaAvailable ? await fetchOllamaModels(ollamaUrl) : [];
  results.push({
    preset: 'ollama',
    available: ollamaAvailable,
    baseUrl: ollamaUrl,
    models: ollamaModels,
  });

  // Check LM Studio
  const lmstudioUrl = defaultBaseUrls.lmstudio;
  const lmstudioAvailable = await checkProviderAvailable('lmstudio', lmstudioUrl);
  const lmstudioModels = lmstudioAvailable
    ? await fetchOpenAICompatibleModels(lmstudioUrl)
    : [];
  results.push({
    preset: 'lmstudio',
    available: lmstudioAvailable,
    baseUrl: lmstudioUrl,
    models: lmstudioModels,
  });

  return results;
}

/**
 * Get default base URL for a provider
 */
export function getDefaultBaseUrl(preset: ProviderPreset): string {
  return defaultBaseUrls[preset];
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(preset: ProviderPreset): string {
  return defaultModels[preset];
}
