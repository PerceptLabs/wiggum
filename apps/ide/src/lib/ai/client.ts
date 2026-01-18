import OpenAI from 'openai'
import type { AIProvider, AIChatOptions, AIChatCompletion, AIStreamChunk } from './types'

/**
 * Create an OpenAI-compatible client for any provider
 * Works with OpenAI, Anthropic (via proxy), OpenRouter, local models, etc.
 */
export function createAIClient(provider: AIProvider): OpenAI {
  return new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    dangerouslyAllowBrowser: true, // Required for browser usage
  })
}

/**
 * Simple AI client wrapper that provides type-safe methods
 */
export class AIClient {
  private client: OpenAI
  private provider: AIProvider

  constructor(provider: AIProvider) {
    this.provider = provider
    this.client = createAIClient(provider)
  }

  /**
   * Get the provider info
   */
  getProvider(): AIProvider {
    return this.provider
  }

  /**
   * Get the default model for this provider
   */
  getDefaultModel(): string {
    return this.provider.defaultModel ?? 'gpt-4o'
  }

  /**
   * Create a chat completion (non-streaming)
   */
  async chat(options: AIChatOptions): Promise<AIChatCompletion> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages as OpenAI.ChatCompletionMessageParam[],
      tools: options.tools as OpenAI.ChatCompletionTool[],
      stream: false,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    })

    return response as unknown as AIChatCompletion
  }

  /**
   * Create a streaming chat completion
   * Returns an async iterable of chunks
   */
  async *chatStream(options: AIChatOptions): AsyncGenerator<AIStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: options.messages as OpenAI.ChatCompletionMessageParam[],
      tools: options.tools as OpenAI.ChatCompletionTool[],
      stream: true,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    })

    for await (const chunk of stream) {
      yield chunk as unknown as AIStreamChunk
    }
  }

  /**
   * Get the raw OpenAI client for advanced usage
   */
  getRawClient(): OpenAI {
    return this.client
  }

  /**
   * Update the provider (e.g., when API key changes)
   */
  updateProvider(provider: AIProvider): void {
    this.provider = provider
    this.client = createAIClient(provider)
  }
}

/**
 * Create a provider configuration from a preset and API key
 */
export function createProvider(
  preset: { id: string; name: string; baseURL: string; defaultModel?: string },
  apiKey: string
): AIProvider {
  return {
    ...preset,
    apiKey,
  }
}
