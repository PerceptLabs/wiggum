/**
 * Minimal OpenAI-compatible LLM client using plain fetch.
 * Works with OpenAI, Anthropic (via proxy), Ollama, and other compatible APIs.
 */

export interface LLMProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  finish_reason?: 'stop' | 'tool_calls' | 'length' | string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface Tool {
  type: 'function';
  function: { name: string; description: string; parameters: object };
}

interface ChatCompletionResponse {
  choices: Array<{
    message: { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] };
    finish_reason: string;
  }>;
}

export class LLMError extends Error {
  constructor(message: string, public status?: number, public response?: unknown) {
    super(message);
    this.name = 'LLMError';
  }
}

export async function chat(
  provider: LLMProvider,
  messages: Message[],
  tools?: Tool[],
  signal?: AbortSignal
): Promise<Message> {
  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

  // Debug logging
  console.log('[LLM] Request:', {
    url,
    model: provider.model,
    messageCount: messages.length,
    hasTools: !!tools?.length,
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers['Authorization'] = `Bearer ${provider.apiKey}`;

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
  };
  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  // Wrap fetch in try/catch to catch network-level errors (CORS, connection refused, etc.)
  let response: Response;
  try {
    console.log('[LLM] About to fetch:', url);
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
    console.log('[LLM] Fetch succeeded, status:', response.status);
  } catch (err) {
    console.error('[LLM] Fetch FAILED (network error):', err);
    throw new LLMError(
      `Network error: ${err instanceof Error ? err.message : String(err)}`,
      0,
      err
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[LLM] API error response:', errorText);
    throw new LLMError(
      `LLM request failed: ${response.status} ${response.statusText}`,
      response.status,
      errorText
    );
  }

  // Parse response with better error handling
  const text = await response.text();
  console.log('[LLM] Raw response (first 500 chars):', text.substring(0, 500));

  let data: ChatCompletionResponse;
  try {
    data = JSON.parse(text);
    console.log('[LLM] Parsed OK, choices:', data.choices?.length);
  } catch (e) {
    console.error('[LLM] JSON parse failed:', e);
    console.error('[LLM] Raw text was:', text);
    throw new LLMError('Failed to parse LLM response as JSON', 0, text);
  }

  if (!data.choices?.length) {
    console.error('[LLM] No choices in response:', data);
    throw new LLMError('No response choices returned from LLM');
  }

  const choice = data.choices[0];
  console.log('[LLM] finish_reason:', choice.finish_reason);
  return {
    role: 'assistant',
    content: choice.message.content ?? '',
    ...(choice.message.tool_calls && { tool_calls: choice.message.tool_calls }),
    finish_reason: choice.finish_reason,
  };
}
