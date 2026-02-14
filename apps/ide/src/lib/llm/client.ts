/**
 * Minimal OpenAI-compatible LLM client using plain fetch.
 * Works with OpenAI, Anthropic (via proxy), Ollama, and other compatible APIs.
 */

export interface LLMProvider {
  name: string
  baseUrl: string
  apiKey?: string
  model: string
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_calls?: ToolCall[]
  tool_call_id?: string
  finish_reason?: 'stop' | 'tool_calls' | 'length' | string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface Tool {
  type: 'function'
  function: { name: string; description: string; parameters: object }
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
    finish_reason: string
  }>
}

export class LLMError extends Error {
  constructor(message: string, public status?: number, public response?: unknown) {
    super(message)
    this.name = 'LLMError'
  }
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
}

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getDelayMs(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelayMs
  )
  if (RETRY_CONFIG.jitter) {
    return delay * (0.5 + Math.random() * 0.5)
  }
  return delay
}

function isRetryableError(status: number): boolean {
  return RETRYABLE_STATUS_CODES.includes(status)
}

// ============================================================================
// CHAT FUNCTION
// ============================================================================

export async function chat(
  provider: LLMProvider,
  messages: Message[],
  tools?: Tool[],
  signal?: AbortSignal
): Promise<Message> {
  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`

  // Debug logging
  console.log('[LLM] Request:', {
    url,
    model: provider.model,
    messageCount: messages.length,
    hasTools: !!tools?.length,
  })

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.tool_calls && { tool_calls: m.tool_calls }),
      ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
    })),
    // CRITICAL: Disable streaming - Ollama streams by default which hangs response.json()
    stream: false,
  }
  if (tools?.length) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log('[LLM] Fetch attempt', attempt + 1, 'of', RETRY_CONFIG.maxRetries + 1)
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[LLM] API error response:', response.status, errorText.slice(0, 200))

        // Check if retryable
        if (isRetryableError(response.status) && attempt < RETRY_CONFIG.maxRetries) {
          const delay = getDelayMs(attempt)
          // Respect Retry-After header if present
          const retryAfter = response.headers.get('Retry-After')
          const actualDelay = retryAfter ? parseInt(retryAfter) * 1000 : delay
          console.log(`[LLM] Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${Math.round(actualDelay)}ms (status ${response.status})`)
          await sleep(actualDelay)
          continue
        }

        throw new LLMError(
          `LLM request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        )
      }

      // ========== SUCCESS PATH ==========
      console.log('[LLM] Fetch succeeded, status:', response.status)
      const text = await response.text()
      console.log('[LLM] Raw response (first 500 chars):', text.substring(0, 500))

      let data: ChatCompletionResponse
      try {
        data = JSON.parse(text)
        console.log('[LLM] Parsed OK, choices:', data.choices?.length)
      } catch (e) {
        console.error('[LLM] JSON parse failed:', e)
        throw new LLMError('Failed to parse LLM response as JSON', response.status, text)
      }

      if (!data.choices?.length) {
        console.error('[LLM] No choices in response:', data)
        throw new LLMError('No response choices returned from LLM', response.status, data)
      }

      const choice = data.choices[0]
      console.log('[LLM] finish_reason:', choice.finish_reason)
      return {
        role: 'assistant',
        content: choice.message.content ?? '',
        ...(choice.message.tool_calls && { tool_calls: choice.message.tool_calls }),
        finish_reason: choice.finish_reason,
      }
      // ========== END SUCCESS PATH ==========

    } catch (err) {
      // Re-throw LLMErrors (already handled above)
      if (err instanceof LLMError) throw err

      // Network error - retry if we have attempts left
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = getDelayMs(attempt)
        console.log(`[LLM] Network retry ${attempt + 1}/${RETRY_CONFIG.maxRetries} after ${Math.round(delay)}ms:`, err instanceof Error ? err.message : err)
        await sleep(delay)
        continue
      }

      throw new LLMError(
        `Network error after ${RETRY_CONFIG.maxRetries} retries: ${err instanceof Error ? err.message : String(err)}`,
        0,
        err
      )
    }
  }

  // Safety net - should not reach here
  throw new LLMError('Exhausted all retry attempts', 0)
}
