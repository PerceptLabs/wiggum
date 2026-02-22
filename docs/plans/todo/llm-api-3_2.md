# Wiggum LLM API 3.2 — Structured Responses, Streaming & Provider Normalization

> Upgrade Wiggum's LLM client from a thin fetch wrapper into a production response-parsing layer that handles streaming accumulation, reasoning content, tool call validation, structured output, provider quirk normalization, usage tracking, and error recovery. No SDK dependency — we build the concepts we need into our own client.
>
> **3.2 changes:** Model capability registry alongside cost generation (§11), context window preflight to prevent oversized requests (§13), conversation budget management for Chief's growing history (§13), spin/stall detection signal in LLMResponse (§3, §13), request/response observability via LogTape (§14).
>
> **3.1 changes:** Streaming JSON repair parity with batch path (§4, §9), finalization guard against premature `finish_reason` (§4), build-time model cost generation (§11).

---

## TABLE OF CONTENTS

1. [Current State & Problems](#1-current-state--problems)
2. [Architecture Overview](#2-architecture-overview)
3. [The Response Type — What chat() Returns](#3-the-response-type--what-chat-returns)
4. [Streaming Support](#4-streaming-support)
5. [Reasoning Content Extraction](#5-reasoning-content-extraction)
6. [Tool Call Parsing & Validation](#6-tool-call-parsing--validation)
7. [Structured Output Mode](#7-structured-output-mode)
8. [Tool Output Optimization](#8-tool-output-optimization)
9. [Empty & Malformed Response Recovery](#9-empty--malformed-response-recovery)
10. [Provider Normalization Layer](#10-provider-normalization-layer) (incl. CORS Proxy)
11. [Usage, Cost & Model Registry](#11-usage-cost--model-registry)
12. [Error Taxonomy](#12-error-taxonomy)
13. [Context Awareness](#13-context-awareness) *(3.2)* — Preflight, Budget Management, Stall Detection
14. [Request/Response Observability](#14-requestresponse-observability) *(3.2)*
15. [Integration with Ralph Loop & Chief Hook](#15-integration-with-ralph-loop--chief-hook)
16. [Implementation Phases](#16-implementation-phases)
17. [File Change Index](#17-file-change-index)
18. [Relationship to Toolkit 2.0](#18-relationship-to-toolkit-20)

---

## 1. CURRENT STATE & PROBLEMS

### What Exists

`src/lib/llm/client.ts` — ~160 lines, plain `fetch`:

- Stateless: `chat(provider, messages, tools?, signal?) → Promise<Message>`
- OpenAI-compatible request/response format
- Retry with exponential backoff (3 attempts, jitter, Retry-After)
- `stream: false` hardcoded (required for Ollama compatibility)
- No streaming, no reasoning content, no usage tracking
- Returns raw OpenAI message type — the loop does its own tool_calls extraction

### What's Wrong

**1. No streaming** — The client hardcodes `stream: false`. This is fine for Ralph (autonomous loop, users watch tool calls not text), but it's a showstopper for Chief. Chief is conversational — users stare at a spinner for 10-15 seconds while the model generates a response. Streaming is a prerequisite for shipping Chief as a usable product.

**2. Unstructured response** — `chat()` returns the raw OpenAI `Message` object. The loop manually checks for `tool_calls`, extracts `function.name`, parses `function.arguments` with `JSON.parse`. Every consumer reimplements the same extraction logic.

**3. No reasoning content** — Models like DeepSeek, Qwen-thinking, and Claude produce reasoning/thinking traces. Wiggum discards them because the response type has no field for them. These traces are valuable for debugging and display.

**4. No provider normalization** — Each provider has quirks:
- Ollama requires `stream: false` and sends `reasoning` instead of `reasoning_content`
- OpenRouter needs `HTTP-Referer` and `X-Title` headers, supports `usage.cost`
- Anthropic via proxy sends `reasoning_content` differently than LiteLLM
- Some providers don't return `tool_call.id` consistently
- Some providers send empty tool names in malformed responses

**5. No usage tracking** — No token counts, no cost calculation. Users have no idea how much a task costs.

**6. No error recovery** — If the model sends a malformed tool call (empty name, unparseable arguments, empty response), the loop crashes or hangs. No structured detection, no recovery path.

**7. No tool output optimization** — Tool results go back to the model verbatim. A 50KB `cat` output burns context window with no truncation or summarization.

**8. No context awareness (3.2)** — The client tracks tokens *after* the response (usage data) but never *before* the request. Ralph rebuilds the message array each iteration: ~350-line system prompt + all `.ralph/` files + tool definitions + accumulated tool results. There's zero check on whether this will fit in the model's context window. If a large `cat` result gets added as a tool message, the next LLM call silently fails with a cryptic 400. No preflight, no warning, no graceful degradation.

**9. No conversation budget management (3.2)** — Chief maintains conversation history across turns — it grows monotonically, which is literally the "malloc without free" problem Ralph's architecture solves at the loop level. Without token-aware trimming, Chief will hit the context wall on long planning conversations. The client has no built-in strategy for this.

**10. No observability (3.2)** — Wiggum has LogTape with a "fingers-crossed" sink that buffers logs and flushes when something goes wrong — exactly when you need LLM request/response data. But the client doesn't integrate with it. When a Ralph loop takes 18 iterations or produces weird tool calls, there's no structured log trail showing what was sent and what came back.

---

## 2. ARCHITECTURE OVERVIEW

### Layers

```
┌──────────────────────────────────────────┐
│  Ralph Loop / Chief Hook                 │ ← Consumers
│  (tool dispatch, gate checks, UI state)  │
├──────────────────────────────────────────┤
│  LLM Client 3.2                          │ ← This document
│  ┌────────────────────────────────────┐  │
│  │ chat() / stream()                  │  │ ← Entry points
│  │ → Context preflight (3.2)         │  │
│  │ → Provider normalization           │  │
│  │ → Request construction             │  │
│  │ → Observability logging (3.2)     │  │
│  │ → fetch / SSE consumption          │  │
│  │ → Response accumulation            │  │
│  │ → Structured parsing               │  │
│  │ → Validation & error recovery      │  │
│  │ → Usage extraction                 │  │
│  │ → Stall signal generation (3.2)   │  │
│  └────────────────────────────────────┘  │
│  Model Registry (3.2): context window,   │
│  max output, capabilities per model      │
│  Returns: LLMResponse (typed, validated) │
├──────────────────────────────────────────┤
│  fetch()                                 │ ← Transport
└──────────────────────────────────────────┘
```

### Design Principles

1. **Two modes, one client** — `chat()` returns a complete response (batch). `stream()` returns an async iterator that yields incremental updates AND a final `LLMResponse`. Both return the same structured `LLMResponse` type at the end.
2. **Right mode for the right consumer** — Ralph uses `chat()` (batch). Chief uses `stream()`. See rationale below.
3. **Provider normalization at the edge** — Quirks are handled in request construction and response parsing, NOT in the consumer. Neither loop nor hook sees provider-specific shapes.
4. **Structured over raw** — The client returns a fully parsed, validated `LLMResponse` — not a raw JSON blob consumers pick apart.
5. **Graceful degradation** — If a provider doesn't support streaming, fall back to batch. If reasoning content isn't present, return `undefined`. If usage data is missing, return `undefined`.
6. **No SDK dependency** — We build exactly what we need. The AI SDK and other projects inform our design, but we don't import them. Wiggum keeps its plain-fetch, browser-native DNA.
7. **Context-aware, not context-blind (3.2)** — The client knows the constraints it's operating within: context window limits, conversation growth, token budgets. It validates *before* sending, not just *after* receiving. The preflight catches problems the provider would reject with a cryptic 400.
8. **Observable without being noisy (3.2)** — The client integrates with Wiggum's LogTape system. In normal operation, logs are buffered silently. When something goes wrong, the fingers-crossed sink flushes the full request/response trail. The client provides the signal; the logging system decides what to surface.

### Why Ralph = Batch, Chief = Streaming

**Ralph (batch via `chat()`):** Ralph is autonomous. The user watches tool calls execute, file writes happen, and gates run — not the model's text output. Each iteration is a fresh context where Ralph emits one or more tool calls then yields control. The model's text content between tool calls is mostly internal reasoning the user doesn't read in real-time. Batch mode is actually cleaner here: get the complete response, parse all tool calls at once, dispatch them, move on. No partial tool call accumulation, no streaming state, no race conditions between content deltas and tool call deltas. The UX feedback loop for Ralph is "watching the terminal" (tool calls appearing), not "watching text stream."

**Chief (streaming via `stream()`):** Chief is conversational. The user asks a question and reads the response as it generates. Batch mode means staring at a spinner for 10-15 seconds while Chief thinks — this is the #1 UX problem for conversational AI. Streaming lets the user start reading immediately, gives a sense of responsiveness, and allows early cancellation if Chief goes off-track. Chief's responses are primarily text (explanations, suggestions, plans) with occasional tool calls (read_file, search_skills) sprinkled in. Streaming text is the core experience.

**The client supports both.** `chat()` and `stream()` share the same response parsing, provider normalization, and error recovery. The only difference is how the transport works (single fetch vs SSE consumption) and what the consumer gets back (complete response vs delta iterator + final response promise).

---

## 3. THE RESPONSE TYPE — WHAT chat() RETURNS

### LLMResponse

Replace the raw OpenAI `Message` return with a structured type:

```typescript
// src/lib/llm/types.ts

interface LLMResponse {
  /** What role this message has */
  role: 'assistant';

  /** The text content the model generated (may be empty if only tool calls) */
  content: string;

  /** Reasoning/thinking trace, if the model produced one */
  reasoning?: string;

  /** Tool calls the model wants to make (already parsed, NOT raw JSON strings) */
  toolCalls: ParsedToolCall[];

  /** Why the model stopped generating */
  finishReason: FinishReason;

  /** Token usage for this response */
  usage?: UsageData;

  /**
   * [3.2] Deterministic hash of tool calls for spin/stall detection.
   * Computed from sorted [name + JSON.stringify(args)] pairs.
   * Two consecutive identical signatures = possible stall.
   * The client computes the signal; the consumer decides the policy.
   */
  toolCallSignature?: string;

  /** The raw response object for debugging / provider-specific access */
  raw: unknown;
}

type FinishReason =
  | 'stop'           // Model finished naturally
  | 'tool_calls'     // Model wants to call tools
  | 'length'         // Hit max tokens
  | 'content_filter' // Provider filtered content
  | 'error'          // Provider error
  | 'unknown';       // Couldn't determine

interface ParsedToolCall {
  /** Provider-assigned ID (generated if missing) */
  id: string;

  /** Tool/function name */
  name: string;

  /** Already-parsed arguments object (NOT a JSON string) */
  args: Record<string, unknown>;

  /** The raw arguments string (for debugging / error messages) */
  rawArgs: string;
}

interface UsageData {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Direct cost if provider reports it (e.g. OpenRouter) */
  cost?: number;
}
```

### Key Design Decisions

**`toolCalls` is `ParsedToolCall[]`, not raw function objects.** The client does the `JSON.parse(arguments)` so consumers never have to. If parsing fails, the client handles it (see §9) — the consumer never sees a raw JSON string.

**`finishReason` is normalized.** Different providers use different strings (`"stop"`, `"end_turn"`, `"eos"`, etc.). The client maps them all to our canonical enum.

**`reasoning` is a flat string.** Some providers send it as a content block, some as a separate field, some as a delta stream field. The client normalizes it into one string.

**`args` is `Record<string, unknown>`, not typed.** Tool-specific typing happens downstream in the tool dispatch layer (Toolkit 2.0's Zod validation). The client just parses JSON — it doesn't know about specific tool schemas.

**`toolCallSignature` is a stall detection signal (3.2).** The client computes a deterministic hash of all tool calls in the response — sorted by name, with stringified args. If Ralph produces the same signature two iterations in a row (reading the same files, writing the same content), the consumer can detect the spin. The client doesn't enforce policy — it just provides the signal. See §13 for consumer-side stall detection patterns.

```typescript
function computeToolCallSignature(toolCalls: ParsedToolCall[]): string | undefined {
  if (toolCalls.length === 0) return undefined;

  const sorted = [...toolCalls]
    .map(tc => `${tc.name}:${JSON.stringify(tc.args)}`)
    .sort()
    .join('|');

  // Simple hash — not cryptographic, just deterministic dedup
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    hash = ((hash << 5) - hash + sorted.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}
```

---

## 4. STREAMING SUPPORT

### The Problem

Wiggum hardcodes `stream: false`. This doesn't matter much for Ralph (autonomous tool-calling loop where users watch commands execute), but it's a critical UX gap for Chief. Chief is conversational — users ask questions and read answers. Without streaming, they stare at a spinner for 10-15 seconds while the model generates. This is the #1 UX blocker for shipping Chief as a usable product.

### Who Uses What

| Consumer | Mode | Why |
|----------|------|-----|
| **Ralph loop** | `chat()` batch | Autonomous. User watches tool calls, not text. Complete response = cleaner dispatch. |
| **Chief hook** | `stream()` | Conversational. User reads text as it arrives. Responsiveness is everything. |
| **Structured output** | `chat()` batch | Schema validation needs the complete response. |
| **Reflection capture** | `chat()` batch | Background LLM call, no UI. |

### Two Entry Points

```typescript
// Batch — wait for complete response
async function chat(
  provider: ProviderConfig,
  messages: Message[],
  options?: RequestOptions,
): Promise<LLMResponse>

// Streaming — yields incremental updates, resolves to complete response
async function stream(
  provider: ProviderConfig,
  messages: Message[],
  options?: RequestOptions,
): Promise<StreamResult>

// [3.2] Unified options — replaces separate tools/signal params
interface RequestOptions {
  tools?: ToolDefinition[];
  signal?: AbortSignal;
  outputSchema?: z.ZodType;      // Phase 4
  /** [3.2] Optional logger for request/response observability (§14) */
  logger?: ClientLogger;
}

interface StreamResult {
  /** Async iterator yielding incremental deltas */
  deltas: AsyncIterable<StreamDelta>;

  /** Resolves to the complete response when streaming finishes */
  response: Promise<LLMResponse>;
}

type StreamDelta =
  | { type: 'content'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool_call_start'; index: number; id: string; name: string }
  | { type: 'tool_call_delta'; index: number; args: string }
  | { type: 'tool_call_end'; index: number }
  | { type: 'finish'; reason: FinishReason }
  | { type: 'usage'; data: UsageData }
  | { type: 'error'; error: LLMError };
```

### Streaming Accumulation

Internally, `stream()` accumulates chunks into a final `LLMResponse`. The accumulator pattern:

```typescript
// Concept — the accumulator that runs inside stream()

class ResponseAccumulator {
  private content = '';
  private reasoning = '';
  private toolCalls = new Map<number, {
    id: string;
    name: string;
    argsBuffer: string;
  }>();
  private finishReason: FinishReason = 'unknown';
  private usage: UsageData | undefined;

  /** Process one SSE chunk from the provider */
  processChunk(chunk: unknown): StreamDelta[] {
    // Parse the provider's chunk format into StreamDelta values
    // Returns array because one chunk may contain multiple deltas
    const deltas: StreamDelta[] = [];

    // Extract content delta
    const contentDelta = extractContentDelta(chunk);
    if (contentDelta) {
      this.content += contentDelta;
      deltas.push({ type: 'content', text: contentDelta });
    }

    // Extract reasoning delta (provider-specific field names)
    const reasoningDelta = extractReasoningDelta(chunk);
    if (reasoningDelta) {
      this.reasoning += reasoningDelta;
      deltas.push({ type: 'reasoning', text: reasoningDelta });
    }

    // Extract tool call deltas
    const toolCallDeltas = extractToolCallDeltas(chunk);
    for (const tcd of toolCallDeltas) {
      let existing = this.toolCalls.get(tcd.index);
      if (!existing) {
        existing = { id: '', name: '', argsBuffer: '' };
        this.toolCalls.set(tcd.index, existing);
        // Emit start delta when we first see a tool call index
      }
      if (tcd.id) existing.id = tcd.id;
      if (tcd.name) existing.name = tcd.name;
      if (tcd.argsDelta) existing.argsBuffer += tcd.argsDelta;
      // Emit appropriate delta type
    }

    // Extract finish reason
    const finish = extractFinishReason(chunk);
    if (finish) {
      this.finishReason = normalizeFinishReason(finish);
      deltas.push({ type: 'finish', reason: this.finishReason });
    }

    // Extract usage (often in the final chunk)
    const usageData = extractUsage(chunk);
    if (usageData) {
      this.usage = usageData;
      deltas.push({ type: 'usage', data: usageData });
    }

    return deltas;
  }

  /** Build the final LLMResponse from accumulated state */
  finalize(rawResponse: unknown): LLMResponse {
    // Parse accumulated tool call argument buffers
    const parsedToolCalls = this.buildToolCalls();

    return {
      role: 'assistant',
      content: this.content,
      reasoning: this.reasoning || undefined,
      toolCalls: parsedToolCalls,
      finishReason: this.finishReason,
      usage: this.usage,
      raw: rawResponse,
    };
  }

  private buildToolCalls(): ParsedToolCall[] {
    return [...this.toolCalls.entries()]
      .sort(([a], [b]) => a - b)  // Sort by index for deterministic order
      .map(([_index, tc]) => {
        const rawArgs = tc.argsBuffer || '{}';
        let args: Record<string, unknown>;
        try {
          args = JSON.parse(rawArgs);
        } catch {
          // [3.1] Streaming arg buffers can end with trailing garbage from
          // partial chunks (e.g. truncated mid-string, trailing comma).
          // Use the same repair path as batch parseToolCall() (§9) before
          // falling back to empty object.
          args = attemptJsonRepair(rawArgs);
        }

        return {
          id: tc.id || generateToolCallId(),
          name: tc.name,
          args,
          rawArgs,
        };
      });
  }
}
```

### Finalization Guard (3.1)

**`finalize()` must only be called after the SSE `[DONE]` sentinel, NOT after seeing `finish_reason` in a delta chunk.** Some providers (observed in OpenAI-compatible endpoints) emit `finish_reason: "stop"` or `finish_reason: "tool_calls"` in a chunk *before* the final tool call argument delta has been sent. If the consumer calls `finalize()` on seeing the finish reason delta, tool call argument buffers will be truncated — producing malformed JSON that even `attemptJsonRepair()` can't recover.

The SSE consumption loop should:
1. Process all chunks through `processChunk()`, including the chunk containing `finish_reason`
2. Continue consuming until `[DONE]` sentinel
3. Only then call `finalize()`

```typescript
// CORRECT — finalize after [DONE]
for await (const line of sseLines) {
  if (line === '[DONE]') break;  // Exit loop, then finalize
  const chunk = JSON.parse(line);
  const deltas = accumulator.processChunk(chunk);
  for (const d of deltas) yield d;
}
const response = accumulator.finalize(rawResponse);

// WRONG — finalize on finish_reason
for await (const line of sseLines) {
  const chunk = JSON.parse(line);
  const deltas = accumulator.processChunk(chunk);
  for (const d of deltas) {
    yield d;
    if (d.type === 'finish') break;  // ← BUG: may miss trailing tool call deltas
  }
}
```

### Tool Call Index Handling

Different providers stream tool calls differently. The critical detail: **tool call chunks include an `index` field** that identifies which tool call the delta belongs to, since a model may request multiple tool calls in one response.

Some providers (notably some Gemini variants) don't include the `index` field on tool call deltas. The accumulator should fall back to using the array position when `index` is undefined:

```typescript
const index = toolCallDelta.index ?? arrayPosition;
```

### Fallback to Batch

If a provider doesn't support streaming (error on SSE connection, or Ollama in certain configs), `stream()` should fall back to `chat()` internally and emit the complete response as a single set of synthetic deltas. Chief's hook doesn't need to know — it just gets the content in one burst instead of incremental chunks.

Note: Ralph already uses `chat()` (batch) by design, so this fallback only matters for Chief.

```typescript
// Inside stream(), if SSE fails:
try {
  const sseStream = await fetchSSE(url, body, signal);
  // ... consume stream ...
} catch (e) {
  if (isStreamNotSupported(e)) {
    // Fall back to batch
    const response = await chat(provider, messages, tools, signal);
    // Emit the complete response as synthetic deltas
    yield { type: 'content', text: response.content };
    // ...etc
  }
}
```

### SSE Parsing

Use the native `EventSource` API if available, or a minimal SSE line parser for `fetch` responses. The SSE format for OpenAI-compatible APIs:

```
data: {"id":"...","choices":[{"delta":{"content":"Hello"},"index":0}]}
data: {"id":"...","choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\""}}]},"index":0}]}
data: [DONE]
```

Build a simple line-by-line parser that:
1. Reads the response body as a stream of text
2. Splits on `\n\n` (SSE event boundary)
3. Extracts the `data:` field
4. Skips `[DONE]` sentinel
5. Parses JSON
6. Feeds into the accumulator

Keep this parser simple and internal — no EventSource polyfill dependency.

---

## 5. REASONING CONTENT EXTRACTION

### The Problem

Reasoning/thinking models produce chain-of-thought traces alongside their response. Different providers expose this differently:

| Provider | Field Name | Location |
|----------|-----------|----------|
| Anthropic (direct) | `thinking` content block | In the content array |
| Anthropic (via OpenRouter/proxy) | `reasoning_content` | Top-level on the message or delta |
| LiteLLM, Z.ai | `reasoning_content` | On the delta object |
| Ollama | `reasoning` | On the delta object |
| DeepSeek (via OpenRouter) | `reasoning_content` | On the delta object |
| OpenAI o-series | Not exposed | N/A (internal CoT) |

### Extraction Strategy

In the accumulator, check multiple field names:

```typescript
function extractReasoningDelta(chunk: unknown): string | undefined {
  const delta = chunk?.choices?.[0]?.delta;
  if (!delta) return undefined;

  // Check provider-specific field names in priority order
  if (typeof delta.reasoning_content === 'string') return delta.reasoning_content;
  if (typeof delta.reasoning === 'string') return delta.reasoning;

  // For Anthropic-native format (content blocks)
  // This applies when using Anthropic's API directly rather than OpenAI-compatible proxy
  if (Array.isArray(delta.content)) {
    const thinkingBlock = delta.content.find(
      (b: any) => b.type === 'thinking' && typeof b.thinking === 'string'
    );
    if (thinkingBlock) return thinkingBlock.thinking;
  }

  return undefined;
}
```

### Batch Mode

For non-streaming responses, extract reasoning from the final message:

```typescript
function extractReasoningFromMessage(message: unknown): string | undefined {
  // Top-level field (most common via proxy)
  if (typeof message.reasoning_content === 'string') return message.reasoning_content;
  if (typeof message.reasoning === 'string') return message.reasoning;

  // Anthropic-native content blocks
  if (Array.isArray(message.content)) {
    return message.content
      .filter((b: any) => b.type === 'thinking')
      .map((b: any) => b.thinking)
      .join('\n');
  }

  return undefined;
}
```

### Display Integration

The Ralph loop's callback system already has `onIterationStart`, `onToolCall`, etc. Add a new callback:

```typescript
// In RalphCallbacks
onReasoning?: (reasoning: string) => void;
```

The UI can display reasoning in a collapsible section, similar to how Claude.ai shows thinking blocks.

---

## 6. TOOL CALL PARSING & VALIDATION

### Parsing (in the client)

The client parses `function.arguments` JSON strings into objects. This is the first line of defense:

```typescript
function parseToolCall(raw: RawToolCall): ParsedToolCall {
  const rawArgs = raw.function?.arguments || '{}';
  let args: Record<string, unknown>;

  try {
    args = JSON.parse(rawArgs);
  } catch (e) {
    // Malformed JSON — attempt repair
    args = attemptJsonRepair(rawArgs);
  }

  return {
    id: raw.id || generateToolCallId(),
    name: raw.function?.name || '',
    args,
    rawArgs,
  };
}
```

### JSON Repair

Models sometimes produce slightly malformed JSON (trailing comma, unquoted key, truncated at length limit). A lightweight repair function:

```typescript
function attemptJsonRepair(raw: string): Record<string, unknown> {
  // Strategy 1: Strip trailing incomplete tokens and close brackets
  let cleaned = raw.trim();

  // If truncated mid-string, close it
  const openBraces = (cleaned.match(/{/g) || []).length;
  const closeBraces = (cleaned.match(/}/g) || []).length;
  if (openBraces > closeBraces) {
    // Try to close the JSON
    cleaned += '"}'.repeat(openBraces - closeBraces);
  }

  // Strategy 2: Remove trailing comma before }
  cleaned = cleaned.replace(/,\s*}/g, '}');

  try {
    return JSON.parse(cleaned);
  } catch {
    // Give up — return empty object, let downstream validation catch it
    return {};
  }
}
```

### Validation (NOT in the client)

The client does NOT validate tool call args against Zod schemas — that's the tool dispatch layer's job (Toolkit 2.0). The client's contract is:

1. Parse the JSON string into an object ✓
2. Recover from simple JSON malformations ✓
3. Return `ParsedToolCall` with `args: Record<string, unknown>` ✓
4. The dispatch layer validates `args` against the specific tool's Zod schema (Toolkit 2.0 §7)

This separation keeps the client tool-agnostic. It doesn't need to know about grep schemas or theme schemas.

### Generated Tool Call IDs

Some providers don't return `tool_call.id` consistently. The client generates IDs for any tool call missing one:

```typescript
function generateToolCallId(): string {
  return `tc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
```

This is important because tool results reference tool calls by ID in the conversation history.

---

## 7. STRUCTURED OUTPUT MODE

### Concept (Borrowed from AI SDK)

The AI SDK has `Output.object({ schema })` — you give it a Zod schema and the model's final text response is parsed and validated against it. This is powerful for getting structured data at the END of a multi-step tool-calling loop.

Wiggum can use this pattern for Ralph's completion step. Instead of Ralph writing free-text to `.ralph/summary.md`, the final response could be a structured object:

```typescript
interface RalphCompletionOutput {
  status: 'complete' | 'blocked' | 'needs_input';
  summary: string;
  filesCreated: string[];
  filesModified: string[];
  keyDecisions: string[];
}
```

### Implementation

Add an optional `outputSchema` parameter to `RequestOptions` (already defined in §4):

```typescript
async function chat<T = void>(
  provider: ProviderConfig,
  messages: Message[],
  options?: RequestOptions & { outputSchema?: z.ZodType<T> },
): Promise<LLMResponse & { output?: T }>
```

When `outputSchema` is provided:

1. The schema is injected as additional system instruction telling the model to respond with JSON matching the schema
2. The final response text is parsed as JSON
3. The parsed JSON is validated against the Zod schema
4. If validation passes, `output` is the typed object
5. If validation fails, `output` is `undefined` and the raw text is still available in `content`

### Schema Injection Strategy

Two approaches, depending on provider:

**A. JSON mode (providers that support it):** Set `response_format: { type: 'json_object' }` or `response_format: { type: 'json_schema', json_schema: { schema } }` in the request. OpenAI, Anthropic, and some others support this.

**B. Prompt injection (universal fallback):** Append to the system prompt:

```
Respond with a JSON object matching this schema:
{schema description}

Output ONLY the JSON object, no other text.
```

### When To Use

This is NOT for every Ralph iteration — most iterations are tool calls, not structured output. Use structured output for:

- **Completion step** — get structured summary + file list instead of free text
- **Planning step** — Chief could return structured plans with typed fields
- **Reflection capture** — replace the current separate LLM call with structured output on the final iteration

### Phase This In Late

Structured output is Phase 3 material. The streaming, response types, and error recovery are more impactful and should ship first.

---

## 8. TOOL OUTPUT OPTIMIZATION

### The Problem

When a tool returns a large result (e.g., `cat` on a big file, `grep -r` across many files), the entire text goes back to the model as a tool result message. This wastes context window and can push the model past its limit.

### toModelOutput Pattern (Borrowed from AI SDK)

The AI SDK's `toModelOutput` separates "what the tool returns to your app" from "what gets sent back to the model." Wiggum can apply the same concept at the tool dispatch level.

### Implementation

Add an optional `toModelOutput` function to the tool dispatch layer:

```typescript
// In the tool dispatch (Toolkit 2.0's dispatch layer, NOT in client.ts)

interface ToolDispatchOptions {
  /** Transform tool output before sending it back to the model */
  toModelOutput?: (result: string, toolName: string) => string;
}
```

Default implementation with size-based truncation:

```typescript
function defaultToModelOutput(result: string, toolName: string): string {
  const MAX_BYTES = 50 * 1024;   // 50 KiB
  const MAX_LINES = 2000;

  const bytes = new Blob([result]).size;
  const lines = result.split('\n').length;

  if (bytes <= MAX_BYTES && lines <= MAX_LINES) {
    return result;  // Under limits, send as-is
  }

  // Over limits: truncate and save full output to file
  const truncated = truncateSmartly(result, MAX_LINES);

  // Save full output for model to grep later
  const savedPath = saveToRalphTmp(result, toolName);

  return `${truncated}\n\n[Output truncated — ${lines} lines, ${formatBytes(bytes)}. Full output saved to: ${savedPath}\nUse \`grep\` to search or \`head\`/\`tail\` to view sections.]`;
}
```

### Smart Truncation

Don't just cut at a byte boundary. Truncate at semantic boundaries:

```typescript
function truncateSmartly(content: string, maxLines: number): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;

  // Show first 60% and last 40% of the budget
  const headLines = Math.floor(maxLines * 0.6);
  const tailLines = maxLines - headLines;
  const omitted = lines.length - headLines - tailLines;

  const head = lines.slice(0, headLines).join('\n');
  const tail = lines.slice(-tailLines).join('\n');

  return `${head}\n\n... [${omitted} lines omitted] ...\n\n${tail}`;
}
```

### Where This Lives

This is NOT in `client.ts`. It's in the tool dispatch layer — somewhere between the tool execution and the message construction that sends results back to the model. Likely in `loop.ts` or in the `buildRalphTools()` function from Toolkit 2.0.

The client doesn't know about tool output sizes. It just sends messages. The truncation happens before the tool result message is constructed.

---

## 9. EMPTY & MALFORMED RESPONSE RECOVERY

### Empty Response Detection

A response is "empty" if it has no content, no reasoning, and no tool calls. This usually indicates a provider issue.

```typescript
function isEmptyResponse(response: LLMResponse): boolean {
  const hasContent = response.content.trim().length > 0;
  const hasReasoning = response.reasoning && response.reasoning.trim().length > 0;
  const hasToolCalls = response.toolCalls.length > 0;

  return !hasContent && !hasReasoning && !hasToolCalls;
}
```

When detected:

1. If `finishReason` is `'stop'` — the model intentionally sent nothing. This is unusual but valid. Log a warning and return.
2. If `finishReason` is anything else — this is likely a provider error. Throw an `EmptyResponseError` with the finish reason and provider info attached.

### Malformed Tool Call Detection

A tool call is "malformed" if:

- `name` is empty or whitespace
- `args` failed JSON parsing AND repair (empty object fallback was used)
- `id` is missing (recoverable — generate one)

```typescript
function validateToolCalls(toolCalls: ParsedToolCall[]): {
  valid: ParsedToolCall[];
  malformed: MalformedToolCall[];
} {
  const valid: ParsedToolCall[] = [];
  const malformed: MalformedToolCall[] = [];

  for (const tc of toolCalls) {
    if (!tc.name || tc.name.trim() === '') {
      malformed.push({
        ...tc,
        reason: 'missing_name',
        message: `Tool call ${tc.id} has no function name`,
      });
    } else {
      valid.push(tc);
    }
  }

  return { valid, malformed };
}
```

When malformed tool calls are detected:

1. Log the malformed calls with full debug info (id, raw args, provider/model)
2. Send tool error results for malformed calls so the model knows they failed:
   ```
   { role: 'tool', tool_call_id: tc.id, content: 'Error: Malformed tool call — missing function name. Please retry.' }
   ```
3. Continue processing valid tool calls normally
4. If ALL tool calls are malformed, throw a `MalformedResponseError`

### Recovery Strategy in the Loop

The Ralph loop already has retry logic (gate failures trigger retries). Extend this to handle response-level errors:

```typescript
// In the loop iteration
try {
  const response = await client.chat(provider, messages, tools, signal);

  if (isEmptyResponse(response)) {
    // Write feedback and retry
    await writeFile('.ralph/feedback.md', 'Empty response from model. Please try again.');
    continue;
  }

  const { valid, malformed } = validateToolCalls(response.toolCalls);

  if (malformed.length > 0) {
    // Add error tool results to conversation and continue
    for (const m of malformed) {
      messages.push({
        role: 'tool',
        tool_call_id: m.id,
        content: `Error: ${m.message}`,
      });
    }
  }

  // Process valid tool calls...
} catch (e) {
  if (e instanceof EmptyResponseError) { /* retry logic */ }
  if (e instanceof MalformedResponseError) { /* retry logic */ }
  // ...
}
```

---

## 10. PROVIDER NORMALIZATION LAYER

### The Problem

Wiggum supports OpenAI, Anthropic (via proxy), Ollama, OpenRouter, and any OpenAI-compatible endpoint. Each has quirks that currently aren't handled.

### Request Normalization

Create a `normalizeRequest()` function that adjusts the request body and headers per provider before sending:

```typescript
function normalizeRequest(
  provider: ProviderConfig,
  body: RequestBody,
  headers: Headers,
): { body: RequestBody; headers: Headers } {

  // Ollama: must disable streaming for some models
  if (provider.type === 'ollama' && !provider.supportsStreaming) {
    body.stream = false;
  }

  // OpenRouter: add attribution headers
  if (provider.id === 'openrouter' || provider.baseURL?.includes('openrouter.ai')) {
    headers.set('HTTP-Referer', 'https://wiggum.dev');
    headers.set('X-Title', 'Wiggum');
    // Request usage data including cost
    body.usage = { include: true };
  }

  // Anthropic via OpenRouter: enable prompt caching
  if (provider.id === 'openrouter' && body.model?.startsWith('anthropic/')) {
    applyCacheControl(body.messages);
  }

  // Stream options: request usage in final chunk when streaming
  if (body.stream) {
    body.stream_options = { include_usage: true };
  }

  return { body, headers };
}
```

### Response Normalization

Already covered by the accumulator's extraction functions (§4, §5), which check multiple field names for reasoning, usage, etc. Additionally:

```typescript
function normalizeFinishReason(raw: string | null): FinishReason {
  if (!raw) return 'unknown';

  switch (raw) {
    case 'stop':
    case 'end_turn':     // Anthropic
    case 'eos':          // Some local models
      return 'stop';

    case 'tool_calls':
    case 'tool_use':     // Anthropic
    case 'function_call': // Legacy OpenAI
      return 'tool_calls';

    case 'length':
    case 'max_tokens':   // Anthropic
      return 'length';

    case 'content_filter':
      return 'content_filter';

    default:
      return 'unknown';
  }
}
```

### Prompt Caching (Anthropic via OpenRouter)

Anthropic models on OpenRouter support prompt caching via `cache_control` markers on content blocks. This can save significant cost on repeated system prompts.

The pattern: convert string content to content block arrays and add `cache_control: { type: 'ephemeral' }` to the system message and the last two conversation messages. These are the blocks most likely to be reused across iterations.

```typescript
function applyCacheControl(messages: Message[]): void {
  // Convert string content to block format
  for (const msg of messages) {
    if (typeof msg.content === 'string' && msg.role !== 'tool') {
      msg.content = [{ type: 'text', text: msg.content }];
    }
  }

  // Add cache_control to system message
  const systemMsg = messages.find(m => m.role === 'system');
  if (systemMsg && Array.isArray(systemMsg.content)) {
    addCacheMarker(systemMsg.content);
  }

  // Add cache_control to last 2 non-system messages
  const nonSystem = messages.filter(m => m.role !== 'system');
  const lastTwo = nonSystem.slice(-2);
  for (const msg of lastTwo) {
    if (Array.isArray(msg.content)) {
      addCacheMarker(msg.content);
    }
  }
}

function addCacheMarker(content: ContentBlock[]): void {
  const lastText = [...content].reverse().find(b => b.type === 'text');
  if (lastText) {
    (lastText as any).cache_control = { type: 'ephemeral' };
  }
}
```

### Image Handling

Some models don't support image inputs. The normalization layer should:

1. Track per-provider whether images are supported
2. If a request with images fails with a 4xx error, retry once with images stripped
3. If the retry succeeds, mark the provider/model as not supporting images for future requests
4. When stripping images, keep any text content blocks that accompanied them (e.g., "Added file: image.png")

This avoids the user needing to know which models support vision.

### CORS Proxy (Browser Transport)

#### The Problem

Wiggum runs entirely in the browser. Browser `fetch()` enforces same-origin policy — requests to `api.openai.com`, `api.anthropic.com`, etc. are blocked unless the server responds with permissive CORS headers. Some providers handle this (Ollama runs locally, OpenRouter sends CORS headers), but many don't. Without a proxy, browser-native LLM clients can't reach these providers.

#### Solution: Self-Hosted Cloudflare Worker

A minimal CORS proxy deployed as a Cloudflare Worker. Written from scratch using **Hono** (MIT licensed) — the same framework already on Wiggum's roadmap for the full-stack layer.

**What the proxy does:**
1. Accepts any request with a `?url=` query parameter containing the target URL
2. Handles CORS preflight (`OPTIONS`) via Hono's built-in `cors()` middleware
3. Forwards the original request (method, headers, body) to the target
4. Streams the response body back with `Access-Control-Allow-Origin: *`

**What the proxy does NOT do:**
- Store, log, or inspect request/response bodies
- Cache responses (LLM responses are unique per request)
- Require authentication (the user's API key passes through to the provider)
- Transform payloads (pure pass-through)

**Architecture:**

```
Browser (Wiggum)                    Cloudflare Edge               Provider
─────────────────                   ─────────────────             ──────────
fetch(proxy.wiggum.dev              Worker receives req           
  ?url=api.openai.com/...)  ───→    strips origin header   ───→  api.openai.com
                                    forwards method/headers/body
                            ←───    adds CORS headers      ←───  response
renders streaming response          streams body through
```

#### Client-Side Integration

Template-based URL rewriting in the normalization layer. Per-provider flag controls whether to proxy:

```typescript
// In normalizeRequest() — before fetch()

interface ProviderConfig {
  // ... existing fields
  /** Whether this provider's API needs CORS proxying */
  proxy?: boolean;
}

function applyProxy(url: string, provider: ProviderConfig, proxyTemplate?: string): string {
  if (!provider.proxy || !proxyTemplate) return url;

  // Template uses {href} placeholder — same pattern as URI Template RFC 6570
  // Examples:
  //   "https://proxy.wiggum.dev/?url={href}"
  //   "http://localhost:8787/?url={href}"  (local dev)
  return proxyTemplate.replace('{href}', encodeURIComponent(url));
}
```

The proxy URL template is a global setting in Wiggum's config, user-configurable for self-hosting:

```typescript
// AppConfig
{
  corsProxy: "https://proxy.wiggum.dev/?url={href}",  // production default
  // Users can point to their own proxy, or leave empty for providers that don't need it
}
```

#### Provider CORS Matrix

| Provider | Needs Proxy? | Why |
|----------|-------------|-----|
| **Ollama** | No | Runs locally, no CORS |
| **OpenRouter** | No | Sends permissive CORS headers |
| **OpenAI direct** | Yes | No CORS headers on api.openai.com |
| **Anthropic direct** | Yes | No CORS headers on api.anthropic.com |
| **Custom endpoints** | Depends | User configures per-provider |

Default behavior: `proxy: false` unless the provider is known to need it. Users can override per-provider in settings.

#### Cost & Capacity

**Cloudflare Workers free tier:** 100,000 requests/day, 10ms CPU/request, zero bandwidth charges. A CORS proxy uses <1ms CPU per request (pure pass-through). At typical Wiggum usage (10-50 LLM calls per task, ~20 tasks/day), a solo developer uses ~200-1,000 requests/day — well within free tier.

**Cloudflare Workers paid tier ($5/mo):** 10M requests/month, still zero bandwidth. Would support hundreds of concurrent users before the LLM API costs themselves become the bottleneck.

For comparison, third-party proxy services like corsproxy.io charge $30/month for unlimited requests — 6x the cost, with the added risk of routing API keys through untrusted infrastructure.

#### Deployment

The proxy is a standalone Cloudflare Worker, deployed separately from Wiggum's main app:

```
wiggum-cors-proxy/
├── src/index.ts          # ~20 lines, Hono + cors() + fetch forwarding
├── wrangler.toml         # Worker config
└── package.json          # hono dependency only
```

Deploy: `npx wrangler deploy`

#### Relationship to Full-Stack Layer

When Wiggum's Hono full-stack backend ships, the CORS proxy becomes unnecessary — the backend makes LLM calls server-side (no browser CORS restriction). The proxy is a bridge for the current browser-only architecture. The proxy template config stays in place so users can remove the proxy URL when they switch to full-stack mode.

#### Security Considerations

- **API keys in transit:** The user's provider API key travels in the `Authorization` header through the proxy. With a self-hosted Worker, this means keys only touch Cloudflare's edge infrastructure (same trust level as any HTTPS CDN). Never route keys through third-party proxy services.
- **Origin allowlisting:** For production, the proxy should validate the `Origin` header against an allowlist (e.g., only `*.wiggum.dev` and `localhost`) to prevent abuse.
- **Rate limiting:** Cloudflare Workers support native rate limiting bindings. Add if proxy is deployed publicly.
- **No logging:** The proxy should not log request/response bodies (which contain prompts and completions).

#### Clean Room Note

The proxy is written from scratch using Hono's MIT-licensed `cors()` middleware and standard Web APIs (`fetch`, `Request`, `Response`). The concept of a CORS proxy Worker is documented in Cloudflare's own public docs and is a common industry pattern. No code from Shakespeare, corsproxy.io, or any other implementation is used.

---

## 11. USAGE, COST & MODEL REGISTRY

### Data Flow

```
Provider response (chunk or final)
  → extractUsage()
  → UsageData { promptTokens, completionTokens, totalTokens, cost? }
  → LLMResponse.usage
  → Loop accumulates per-iteration
  → UI displays total
```

### Per-Iteration and Total

```typescript
interface TaskUsage {
  iterations: IterationUsage[];
  total: UsageData;
}

interface IterationUsage {
  iteration: number;
  usage: UsageData;
  model: string;
  timestamp: number;
}

function accumulateUsage(existing: UsageData | undefined, add: UsageData): UsageData {
  return {
    promptTokens: (existing?.promptTokens ?? 0) + add.promptTokens,
    completionTokens: (existing?.completionTokens ?? 0) + add.completionTokens,
    totalTokens: (existing?.totalTokens ?? 0) + add.totalTokens,
    cost: existing?.cost !== undefined || add.cost !== undefined
      ? (existing?.cost ?? 0) + (add.cost ?? 0)
      : undefined,
  };
}
```

### Cost Sources

1. **Provider-reported cost** — OpenRouter includes `cost` in usage data. Use directly.
2. **Calculated from pricing table (3.1)** — A build-time script fetches current model pricing from public APIs and generates a static cost map. At runtime, if the provider doesn't report cost directly, the client looks up the model in this map and calculates: `promptTokens * inputPricePerToken + completionTokens * outputPricePerToken`.
3. **Unknown** — If neither is available, `cost` remains `undefined`. Don't show $0.00 — show "cost unknown."

### Build-Time Cost Generation (3.1 → superseded by Model Registry in 3.2)

> **3.2 note:** The standalone cost generation script and `model-costs.generated.ts` file described in 3.1 have been superseded by the unified Model Capability Registry below. Cost data is now part of `model-registry.generated.ts` alongside capability metadata. The build script has been renamed from `generate-model-costs.ts` to `generate-model-registry.ts`. The data sources, build-time-not-runtime rationale, and fallback chain remain the same.

**Why build-time, not runtime:** Fetching pricing APIs on every page load adds latency and a network dependency. The cost table changes infrequently (model pricing updates are rare), and a stale table with slightly wrong costs is better than no costs at all. Run the generation script as part of CI or before release.

**Fallback chain:** Provider-reported cost (OpenRouter) → calculated from generated table → `undefined`.

### Model Capability Registry (3.2)

The same build-time script that generates cost data also generates a **capability map**. Context window size, max output tokens, and feature support vary per model — the client needs this data for preflight validation (§13) and adaptive behavior.

**Extended output:** `src/lib/llm/model-registry.generated.ts`

```typescript
// Auto-generated — do not edit manually
// Generated: 2026-02-18T00:00:00Z
// Sources: models.dev, openrouter.ai

export interface ModelCost {
  inputPerToken: number;   // USD per token
  outputPerToken: number;  // USD per token
}

export interface ModelCapability {
  contextWindow: number;     // Total context in tokens (e.g. 128000, 200000)
  maxOutputTokens: number;   // Max response tokens (e.g. 4096, 8192, 16384)
  supportsTools: boolean;    // Function calling / tool use support
  supportsStreaming: boolean; // SSE streaming support
  supportsReasoning: boolean; // Produces reasoning/thinking traces
  supportsImages: boolean;    // Vision / image input support
}

export interface ModelEntry {
  cost?: ModelCost;
  capability: ModelCapability;
}

/** Model ID → entry. Keys are normalized lowercase (e.g. "claude-sonnet-4-20250514") */
export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  "claude-sonnet-4-20250514": {
    cost: { inputPerToken: 0.000003, outputPerToken: 0.000015 },
    capability: {
      contextWindow: 200000,
      maxOutputTokens: 16384,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      supportsImages: true,
    },
  },
  "gpt-4o": {
    cost: { inputPerToken: 0.0000025, outputPerToken: 0.00001 },
    capability: {
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsImages: true,
    },
  },
  // ... generated entries
};
```

**Lookup with fallback:**

```typescript
import { MODEL_REGISTRY, ModelCapability } from './model-registry.generated';

/** Default capability for unknown models — conservative estimates */
const DEFAULT_CAPABILITY: ModelCapability = {
  contextWindow: 128000,  // Assume 128K — most modern models support this
  maxOutputTokens: 4096,  // Conservative
  supportsTools: true,     // Assume yes — most OpenAI-compatible APIs do
  supportsStreaming: true,
  supportsReasoning: false,
  supportsImages: false,
};

function getModelCapability(model: string): ModelCapability {
  const entry = MODEL_REGISTRY[model.toLowerCase()];
  return entry?.capability ?? DEFAULT_CAPABILITY;
}

function calculateCost(model: string, usage: UsageData): number | undefined {
  const entry = MODEL_REGISTRY[model.toLowerCase()];
  if (!entry?.cost) return undefined;
  return (usage.promptTokens * entry.cost.inputPerToken)
       + (usage.completionTokens * entry.cost.outputPerToken);
}
```

**Why unify cost + capability in one registry:** Both come from the same data sources (models.dev, OpenRouter). One build script, one generated file, one lookup function. The alternative — separate `model-costs.generated.ts` and `model-capabilities.generated.ts` — means two build steps, two imports, and two lookups for data that always travels together.

**Updated build script:** `scripts/generate-model-registry.ts` (renamed from `generate-model-costs.ts`) fetches both pricing and capability metadata. The OpenRouter models API already returns context length, max completion tokens, and feature flags alongside pricing.

### Consumers of the Registry

| Consumer | Uses | Why |
|----------|------|-----|
| `calculateCost()` | `cost` | Post-response cost tracking (§11) |
| `preflightCheck()` | `capability.contextWindow` | Pre-request validation (§13) |
| `budgetMessages()` | `capability.contextWindow`, `maxOutputTokens` | Conversation trimming (§13) |
| `normalizeRequest()` | `supportsStreaming`, `supportsImages` | Adaptive request construction (§10) |
| `stream()` fallback | `supportsStreaming` | Fall back to batch if model doesn't stream (§4) |

### New Callback

```typescript
// In RalphCallbacks
onUsage?: (iteration: number, usage: UsageData) => void;
```

The UI can show a running token count and cost in the chat panel.

---

## 12. ERROR TAXONOMY

### Error Classes

Create a set of typed error classes in `src/lib/llm/errors.ts`:

```typescript
/** Base class for all LLM client errors */
class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly model: string,
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/** Model returned empty response (no content, no reasoning, no tool calls) */
class EmptyResponseError extends LLMError {
  public readonly finishReason: FinishReason;

  constructor(finishReason: FinishReason, provider: string, model: string) {
    super(
      `Empty response from ${model} (finish_reason: ${finishReason})`,
      provider, model,
    );
    this.name = 'EmptyResponseError';
    this.finishReason = finishReason;
  }
}

/** Model returned tool calls with missing/empty function names */
class MalformedToolCallError extends LLMError {
  public readonly toolCallIds: string[];

  constructor(toolCallIds: string[], provider: string, model: string) {
    super(
      `Malformed tool call(s) from ${model}: missing function name on ${toolCallIds.join(', ')}`,
      provider, model,
    );
    this.name = 'MalformedToolCallError';
    this.toolCallIds = toolCallIds;
  }
}

/** Provider returned a non-retryable HTTP error */
class ProviderError extends LLMError {
  public readonly status: number;
  public readonly responseBody?: string;

  constructor(status: number, responseBody: string | undefined, provider: string, model: string) {
    super(
      `Provider error ${status} from ${provider}/${model}`,
      provider, model,
    );
    this.name = 'ProviderError';
    this.status = status;
    this.responseBody = responseBody;
  }
}

/** Model hit token limit (finish_reason: length) */
class TokenLimitError extends LLMError {
  constructor(provider: string, model: string) {
    super(
      `${model} hit max tokens — response may be truncated`,
      provider, model,
    );
    this.name = 'TokenLimitError';
  }
}

/** Content was filtered by the provider */
class ContentFilterError extends LLMError {
  constructor(provider: string, model: string) {
    super(
      `Content filtered by ${provider} for ${model}`,
      provider, model,
    );
    this.name = 'ContentFilterError';
  }
}

/** User cancelled the request */
class AbortError extends LLMError {
  constructor(provider: string, model: string) {
    super('Request cancelled', provider, model);
    this.name = 'AbortError';
  }
}

/** [3.2] Request would exceed model's context window */
class ContextOverflowError extends LLMError {
  public readonly estimatedTokens: number;
  public readonly contextWindow: number;

  constructor(estimatedTokens: number, contextWindow: number, provider: string, model: string) {
    super(
      `Request (~${estimatedTokens} tokens) exceeds ${model}'s context window (${contextWindow})`,
      provider, model,
    );
    this.name = 'ContextOverflowError';
    this.estimatedTokens = estimatedTokens;
    this.contextWindow = contextWindow;
  }
}
```

### Error Classification

In the response parsing, classify errors before they reach the consumer:

```typescript
function classifyResponse(response: LLMResponse, provider: string, model: string): void {
  // Check for empty response
  if (isEmptyResponse(response) && response.finishReason !== 'stop') {
    throw new EmptyResponseError(response.finishReason, provider, model);
  }

  // Check for token limit
  if (response.finishReason === 'length') {
    // Don't throw — this is informational. But attach a warning.
    // The loop can decide whether to retry or accept the truncated response.
  }

  // Check for content filter
  if (response.finishReason === 'content_filter') {
    throw new ContentFilterError(provider, model);
  }

  // Check for malformed tool calls
  if (response.toolCalls.length > 0) {
    const allMalformed = response.toolCalls.every(tc => !tc.name || tc.name.trim() === '');
    if (allMalformed) {
      throw new MalformedToolCallError(
        response.toolCalls.map(tc => tc.id),
        provider, model,
      );
    }
  }
}
```

### Retry Classification

Keep the existing retry logic for HTTP-level errors (429, 500, 502, 503, 504). Add response-level retries:

| Error | Retryable? | Strategy |
|-------|-----------|----------|
| `EmptyResponseError` | Yes, once | Retry same request |
| `MalformedToolCallError` | Yes, once | Add error tool results, continue loop |
| `ProviderError` (429) | Yes, with backoff | Respect Retry-After header |
| `ProviderError` (5xx) | Yes, with backoff | Exponential backoff |
| `ProviderError` (4xx) | No | Throw to UI |
| `TokenLimitError` | No (informational) | Log warning, continue |
| `ContentFilterError` | No | Throw to UI |
| `AbortError` | No | Silently return |
| `ContextOverflowError` (3.2) | No | Throw to consumer — consumer can trim and retry, or surface to UI |

---

## 13. CONTEXT AWARENESS (3.2)

The client should be aware of the constraints it operates within — context window limits, conversation growth, repetition patterns — rather than being a dumb pipe that only validates what comes back.

### Context Window Preflight

Before sending a request, estimate whether it will fit in the model's context window. This catches problems *before* the provider rejects them with a cryptic 400 or silently truncates.

```typescript
interface PreflightResult {
  ok: boolean;
  estimatedTokens: number;
  contextWindow: number;
  budgetRemaining: number;  // tokens available for the response
  warning?: string;
}

function preflightCheck(
  model: string,
  messages: Message[],
  tools?: ToolDefinition[],
): PreflightResult {
  const capability = getModelCapability(model);  // From §11 registry
  const estimated = estimateTokens(messages, tools);
  const reserveForOutput = capability.maxOutputTokens;
  const budgetRemaining = capability.contextWindow - estimated - reserveForOutput;

  if (budgetRemaining < 0) {
    return {
      ok: false,
      estimatedTokens: estimated,
      contextWindow: capability.contextWindow,
      budgetRemaining,
      warning: `Request (~${estimated} tokens) + response reserve (${reserveForOutput}) exceeds ${model}'s context window (${capability.contextWindow}). ${-budgetRemaining} tokens over budget.`,
    };
  }

  // Warn if within 10% of limit
  const headroom = budgetRemaining / capability.contextWindow;
  if (headroom < 0.1) {
    return {
      ok: true,
      estimatedTokens: estimated,
      contextWindow: capability.contextWindow,
      budgetRemaining,
      warning: `Request is at ${Math.round((1 - headroom) * 100)}% of context window. Response may be truncated.`,
    };
  }

  return {
    ok: true,
    estimatedTokens: estimated,
    contextWindow: capability.contextWindow,
    budgetRemaining,
  };
}
```

### Token Estimation

Exact token counting requires the model's tokenizer (tiktoken, etc.), which is heavy for browser use. Instead, use a **fast heuristic** that's accurate enough for preflight decisions:

```typescript
/**
 * Estimate token count for messages + tools.
 * Uses the ~4 chars/token heuristic, which is within ±15% for English text
 * and code. Good enough for preflight — not for billing.
 */
function estimateTokens(messages: Message[], tools?: ToolDefinition[]): number {
  let chars = 0;

  for (const msg of messages) {
    // Role overhead: ~4 tokens per message
    chars += 16;

    if (typeof msg.content === 'string') {
      chars += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      // Content block array (Anthropic format)
      for (const block of msg.content) {
        if (block.type === 'text') chars += block.text.length;
        if (block.type === 'image_url') chars += 1000; // ~250 tokens for image reference
      }
    }

    // Tool call arguments in assistant messages
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        chars += (tc.function?.name?.length ?? 0);
        chars += (tc.function?.arguments?.length ?? 0);
      }
    }
  }

  // Tool definitions — JSON schema overhead
  if (tools) {
    chars += JSON.stringify(tools).length;
  }

  return Math.ceil(chars / 4);
}
```

### When Preflight Fires

Preflight runs at the top of both `chat()` and `stream()`, before any network call:

```typescript
async function chat(provider, messages, options) {
  const preflight = preflightCheck(provider.model, messages, options?.tools);

  if (!preflight.ok) {
    // Log the overflow with full details
    options?.logger?.warn('Context window overflow', {
      model: provider.model,
      estimated: preflight.estimatedTokens,
      contextWindow: preflight.contextWindow,
      over: -preflight.budgetRemaining,
    });
    throw new ContextOverflowError(
      preflight.estimatedTokens,
      preflight.contextWindow,
      provider.id,
      provider.model,
    );
  }

  if (preflight.warning) {
    options?.logger?.warn('Context window warning', {
      model: provider.model,
      warning: preflight.warning,
    });
  }

  // ... continue with request
}
```

### Conversation Budget Management (Chief)

Chief maintains conversation history across turns. Without management, it grows monotonically — the "malloc without free" problem at the conversation level. The client provides a `budgetMessages()` utility that Chief's hook calls before each request.

```typescript
interface BudgetOptions {
  /** Maximum tokens for the input (context window - output reserve) */
  maxInputTokens: number;
  /** Always preserve these messages (e.g. system prompt at index 0) */
  protectedIndices?: number[];
  /** Minimum recent messages to keep (default: 4 — last 2 turns) */
  minRecentMessages?: number;
}

/**
 * Trim conversation history to fit within token budget.
 * Preserves system prompt and recent messages, drops from the middle.
 *
 * This is NOT summarization (too much magic). It's deterministic trimming
 * that the consumer controls. Chief's hook calls this; the client provides it.
 */
function budgetMessages(
  messages: Message[],
  options: BudgetOptions,
): { messages: Message[]; trimmed: number; estimatedTokens: number } {
  const { maxInputTokens, protectedIndices = [0], minRecentMessages = 4 } = options;

  // If it fits, ship it
  const currentEstimate = estimateTokens(messages);
  if (currentEstimate <= maxInputTokens) {
    return { messages, trimmed: 0, estimatedTokens: currentEstimate };
  }

  // Split into protected (system prompt), middle (trimmable), and recent (kept)
  const protected_ = protectedIndices.map(i => messages[i]).filter(Boolean);
  const recentStart = Math.max(
    protectedIndices.length,
    messages.length - minRecentMessages,
  );
  const recent = messages.slice(recentStart);
  const middle = messages.slice(protectedIndices.length, recentStart);

  // Drop from the front of middle until we fit
  let trimmed = 0;
  const result = [...protected_];
  const middleCopy = [...middle];

  while (middleCopy.length > 0) {
    const candidate = [...result, ...middleCopy, ...recent];
    if (estimateTokens(candidate) <= maxInputTokens) break;
    middleCopy.shift();  // Drop oldest middle message
    trimmed++;
  }

  const final = [...result, ...middleCopy, ...recent];
  const finalEstimate = estimateTokens(final);

  // If still over budget after dropping all middle messages, warn but send anyway
  // (the preflight in chat()/stream() will catch true overflows)

  return { messages: final, trimmed, estimatedTokens: finalEstimate };
}
```

**Consumer pattern (in `useChiefChat.ts`):**

```typescript
// Before each Chief LLM call
const capability = getModelCapability(provider.model);
const maxInput = capability.contextWindow - capability.maxOutputTokens;

const { messages: trimmedMessages, trimmed } = budgetMessages(
  [systemPrompt, ...conversationHistory, userMessage],
  { maxInputTokens: maxInput, protectedIndices: [0], minRecentMessages: 6 },
);

if (trimmed > 0) {
  // Optionally inject a context note so the model knows history was trimmed
  const note = { role: 'system', content: `[${trimmed} earlier messages trimmed for context budget]` };
  trimmedMessages.splice(1, 0, note);  // After system prompt
}

const response = await stream(provider, trimmedMessages, { tools: CHIEF_TOOLS, signal });
```

**Why not auto-summarization:** Wiggum's core principle is "explicit over magic." Automatic summarization requires an extra LLM call per trim, adds latency, costs tokens, and can lose critical context. Deterministic trimming is predictable, instant, and free. If the user needs to reference dropped context, they can re-state it — Chief will ask clarifying questions.

### Stall Detection Signal

The `toolCallSignature` field in `LLMResponse` (§3) enables stall detection at the consumer level. The client computes it; Ralph's loop checks it.

**Consumer pattern (in `loop.ts`):**

```typescript
// Track signatures across iterations
let lastSignature: string | undefined;
let consecutiveStalls = 0;

// In the iteration loop:
const response = await chat(provider, messages, { tools, signal });

if (response.toolCallSignature && response.toolCallSignature === lastSignature) {
  consecutiveStalls++;

  if (consecutiveStalls >= 3) {
    // Hard stall — Ralph is stuck in a loop
    await writeFile('.ralph/feedback.md',
      `Stall detected: identical tool calls for ${consecutiveStalls} consecutive iterations. ` +
      `Break the pattern: try a different approach, read different files, or write different content.`
    );

    if (consecutiveStalls >= 5) {
      // Abort — burning budget with no progress
      callbacks.onError?.(new Error(`Ralph stalled: ${consecutiveStalls} identical iterations`));
      break;
    }
  }
} else {
  consecutiveStalls = 0;
}

lastSignature = response.toolCallSignature;
```

**Detection thresholds:**

| Consecutive identical signatures | Action |
|----------------------------------|--------|
| 1 | Normal — same response twice can happen legitimately |
| 2 | Log warning via observability (§14) |
| 3 | Write stall feedback to `.ralph/feedback.md`, increment gate failure count |
| 5 | Abort the task — no progress being made |

**Why signature, not content hash:** Content can legitimately repeat (e.g., reading the same file twice when context resets). But the *combination* of tool name + arguments repeating means the model is making the exact same decisions, which indicates a loop. The signature captures the decision pattern, not just the data.

---

## 14. REQUEST/RESPONSE OBSERVABILITY (3.2)

### The Problem

When a Ralph loop goes sideways — takes 18 iterations, produces weird tool calls, hits unexpected errors — debugging requires seeing the actual LLM requests and responses. Wiggum has LogTape with a fingers-crossed sink that buffers in normal operation and flushes when something fails. The client should feed into this system.

### Logger Interface

The client accepts an optional logger that matches Wiggum's LogTape API surface. No hard dependency — the logger is injected, not imported.

```typescript
// In types.ts

interface ClientLogger {
  debug: (msg: string, data?: Record<string, unknown>) => void;
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
}

// Extended options for chat() and stream()
interface RequestOptions {
  tools?: ToolDefinition[];
  signal?: AbortSignal;
  outputSchema?: z.ZodType;
  /** [3.2] Optional logger for request/response observability */
  logger?: ClientLogger;
}
```

### What Gets Logged

The client logs at specific points in the request/response lifecycle:

```typescript
// Pre-request (debug level — buffered, only visible on flush)
logger.debug('llm:request', {
  provider: provider.id,
  model: provider.model,
  messageCount: messages.length,
  estimatedTokens: preflight.estimatedTokens,
  contextWindow: preflight.contextWindow,
  hasTools: !!options?.tools,
  toolCount: options?.tools?.length ?? 0,
  mode: 'batch' | 'stream',
});

// Post-response (debug level)
logger.debug('llm:response', {
  provider: provider.id,
  model: provider.model,
  finishReason: response.finishReason,
  contentLength: response.content.length,
  toolCallCount: response.toolCalls.length,
  toolCallSignature: response.toolCallSignature,
  hasReasoning: !!response.reasoning,
  reasoningLength: response.reasoning?.length ?? 0,
  promptTokens: response.usage?.promptTokens,
  completionTokens: response.usage?.completionTokens,
  cost: response.usage?.cost,
});

// Warning level — context budget pressure
logger.warn('llm:context-pressure', {
  provider: provider.id,
  model: provider.model,
  estimatedTokens: preflight.estimatedTokens,
  contextWindow: preflight.contextWindow,
  headroom: `${Math.round(preflight.budgetRemaining / preflight.contextWindow * 100)}%`,
});

// Warning level — stall detection
logger.warn('llm:stall-detected', {
  provider: provider.id,
  model: provider.model,
  signature: response.toolCallSignature,
  consecutiveCount: consecutiveStalls,
});

// Error level — provider errors, overflows, malformed responses
logger.error('llm:error', {
  provider: provider.id,
  model: provider.model,
  errorType: error.name,
  errorMessage: error.message,
  status: error instanceof ProviderError ? error.status : undefined,
});
```

### What Does NOT Get Logged

- **Message content** — prompts and completions contain user data. Never log the full message array at debug level. Only log metadata (count, estimated tokens, content length).
- **API keys** — the logger never receives headers or authorization data.
- **Tool call arguments** — may contain file content. Log tool names and signature, not args.

If the user enables verbose/trace logging explicitly (future setting), message content could be logged at trace level. But the default is metadata-only.

### Integration with LogTape

In `useAIChat.ts` and `useChiefChat.ts`, create a logger from Wiggum's LogTape and pass it into every `chat()` / `stream()` call:

```typescript
import { getLogger } from '@logtape/logtape';

// In the hook
const llmLogger = getLogger(['wiggum', 'llm']);

// Create a ClientLogger adapter
const clientLogger: ClientLogger = {
  debug: (msg, data) => llmLogger.debug`${msg} ${data}`,
  info: (msg, data) => llmLogger.info`${msg} ${data}`,
  warn: (msg, data) => llmLogger.warn`${msg} ${data}`,
  error: (msg, data) => llmLogger.error`${msg} ${data}`,
};

// Pass to every call
const response = await chat(provider, messages, {
  tools,
  signal,
  logger: clientLogger,
});
```

The fingers-crossed sink in Wiggum's LogTape config buffers all debug-level logs. When an error occurs, it flushes the buffer — giving you the full request/response trail leading up to the failure. In normal operation, zero overhead from logging.

### Log Categories

| Category | Level | When |
|----------|-------|------|
| `llm:request` | debug | Before every LLM call |
| `llm:response` | debug | After every successful response |
| `llm:stream-start` | debug | When SSE connection opens |
| `llm:stream-end` | debug | When SSE stream completes |
| `llm:context-pressure` | warn | When preflight shows <10% headroom |
| `llm:context-overflow` | error | When preflight fails (over budget) |
| `llm:stall-detected` | warn | When consecutive identical signatures ≥ 2 |
| `llm:empty-response` | warn | When model returns nothing |
| `llm:malformed-toolcall` | warn | When tool call has missing name or broken args |
| `llm:json-repair` | debug | When attemptJsonRepair() fires |
| `llm:retry` | info | When retry logic triggers (429, 5xx) |
| `llm:error` | error | Provider errors, abort, content filter |
| `llm:budget-trim` | info | When budgetMessages() drops messages |

---

## 15. INTEGRATION WITH RALPH LOOP & CHIEF HOOK

### Ralph Loop — Stays Batch

Ralph's loop uses `chat()` (batch mode). The response comes back complete, tool calls are already parsed, dispatch happens immediately. No streaming complexity in the autonomous loop.

```typescript
// BEFORE (conceptual — read actual loop.ts for exact code)
const response = await chat(provider, messages, [SHELL_TOOL], signal);
if (response.tool_calls) {
  for (const tc of response.tool_calls) {
    const args = JSON.parse(tc.function.arguments);
    const result = await executor.execute(args.command);
    messages.push({ role: 'tool', tool_call_id: tc.id, content: result.stdout });
  }
}

// AFTER (3.2 — includes preflight, stall detection, observability)
const response = await chat(provider, messages, {
  tools: toolDefinitions,  // From Toolkit 2.0's buildRalphTools()
  signal,
  logger: clientLogger,    // [3.2] LogTape adapter
});

// Usage tracking
if (response.usage) {
  taskUsage = accumulateUsage(taskUsage, response.usage);
  callbacks.onUsage?.(iteration, response.usage);
}

// [3.2] Stall detection
if (response.toolCallSignature && response.toolCallSignature === lastSignature) {
  consecutiveStalls++;
  if (consecutiveStalls >= 3) {
    await writeFile('.ralph/feedback.md',
      `Stall detected: ${consecutiveStalls} identical iterations. Try a different approach.`
    );
  }
  if (consecutiveStalls >= 5) {
    callbacks.onError?.(new Error(`Stalled: ${consecutiveStalls} identical iterations`));
    break;
  }
} else {
  consecutiveStalls = 0;
}
lastSignature = response.toolCallSignature;

// Process tool calls (already parsed — no JSON.parse needed!)
for (const tc of response.toolCalls) {
  // Dispatch through Toolkit 2.0's unified dispatcher
  const output = await dispatch(tc.name, tc.args);

  // Apply toModelOutput truncation
  const modelOutput = defaultToModelOutput(output, tc.name);

  // Add tool result to conversation
  messages.push({
    role: 'tool',
    tool_call_id: tc.id,
    content: modelOutput,
  });

  callbacks.onToolCall?.(tc.name, tc.args, output);
}

// Reasoning (if model produced it) — log for debugging
if (response.reasoning) {
  callbacks.onReasoning?.(response.reasoning);
}
```

**What changes for Ralph:**
- `chat()` returns `LLMResponse` instead of raw message → no manual `JSON.parse` on tool_calls
- Tool call args are pre-parsed objects → dispatch directly
- Usage data available → track costs
- Reasoning content captured → display in debug panel
- Error recovery built in → empty responses and malformed tool calls handled before loop sees them
- **[3.2] Preflight validates context window before every call** → no more cryptic 400s on oversized requests
- **[3.2] Stall detection via `toolCallSignature`** → catches spinning before budget burns
- **[3.2] Full observability trail via LogTape** → fingers-crossed logs flush on error

**What stays the same:**
- Batch mode (no streaming)
- Fresh context per iteration
- One action per iteration, tool dispatch, gate check cycle

### Chief Hook — Streaming

Chief uses `stream()` for real-time conversational UX. The user sees text appear as the model generates.

```typescript
// In useChiefChat.ts — conceptual, adapt to actual hook structure

async function sendMessage(content: string) {
  // Build messages array
  const rawMessages = [
    { role: 'system', content: CHIEF_SYSTEM_PROMPT },
    ...conversationHistory,
    { role: 'user', content },
  ];

  // [3.2] Budget management — trim history to fit context window
  const capability = getModelCapability(provider.model);
  const maxInput = capability.contextWindow - capability.maxOutputTokens;
  const { messages, trimmed } = budgetMessages(rawMessages, {
    maxInputTokens: maxInput,
    protectedIndices: [0],  // Always keep system prompt
    minRecentMessages: 6,   // Keep last 3 turns (user + assistant pairs)
  });

  if (trimmed > 0) {
    // Inject note so model knows context was trimmed
    messages.splice(1, 0, {
      role: 'system',
      content: `[${trimmed} earlier messages trimmed for context budget]`,
    });
    clientLogger.info('llm:budget-trim', { trimmed, remaining: messages.length });
  }

  // Start streaming
  const result = await stream(provider, messages, {
    tools: CHIEF_TOOLS,
    signal: abortController.signal,
    logger: clientLogger,    // [3.2] LogTape adapter
  });

  // Create a placeholder message in the UI
  let currentContent = '';
  let currentReasoning = '';

  // Consume the stream — each delta updates the UI
  for await (const delta of result.deltas) {
    switch (delta.type) {
      case 'content':
        currentContent += delta.text;
        setStreamingContent(currentContent);  // UI updates immediately
        break;

      case 'reasoning':
        currentReasoning += delta.text;
        setStreamingReasoning(currentReasoning);
        break;

      case 'tool_call_start':
        // Show "Chief is reading files..." or "Chief is searching skills..."
        setToolCallInProgress(delta.name);
        break;

      case 'usage':
        // Track cost
        break;

      case 'error':
        setError(delta.error);
        break;
    }
  }

  // Stream complete — get the final structured response
  const response = await result.response;

  // If Chief made tool calls, dispatch them and continue the conversation
  if (response.toolCalls.length > 0) {
    for (const tc of response.toolCalls) {
      const toolResult = await dispatchChiefTool(tc.name, tc.args);
      conversationHistory.push(
        { role: 'assistant', content: currentContent, tool_calls: [/* raw format for history */] },
        { role: 'tool', tool_call_id: tc.id, content: toolResult },
      );
    }

    // Continue the conversation — Chief may want to respond after seeing tool results
    // This is a while loop: stream again, check for more tool calls, repeat until stop
    await continueConversation();
  } else {
    // No tool calls — Chief's response is complete
    conversationHistory.push({ role: 'assistant', content: currentContent });
    setStreamingContent('');  // Clear streaming state
  }
}
```

**Key differences from Ralph:**
- `stream()` instead of `chat()` — deltas arrive in real-time
- UI updates on every content delta — user reads as Chief types
- Tool calls dispatched inline (while loop), not through ShellExecutor
- Conversation history maintained across turns (Chief remembers context)
- Streaming state management in React (`streamingContent`, `streamingReasoning`)
- **[3.2] Budget management via `budgetMessages()`** — history trimmed to fit context window before each call
- **[3.2] Observability via `clientLogger`** — all LLM calls logged for debugging

### New Callbacks — Ralph

```typescript
// Additions to RalphCallbacks (batch mode — no streaming deltas)
interface RalphCallbacks {
  // ...existing callbacks...

  /** Reasoning trace from the model (for debug display) */
  onReasoning?: (reasoning: string) => void;

  /** Usage data for an iteration */
  onUsage?: (iteration: number, usage: UsageData) => void;

  /** [3.2] Stall detected — consecutive identical tool call signatures */
  onStall?: (consecutiveCount: number, signature: string) => void;

  /** [3.2] Context pressure — preflight shows low headroom */
  onContextPressure?: (estimatedTokens: number, contextWindow: number, headroom: number) => void;
}
```

### Streaming State — Chief

Chief doesn't use callbacks — it uses React state in `useChiefChat`. The streaming deltas drive state updates directly:

```typescript
// New state in useChiefChat
const [streamingContent, setStreamingContent] = useState('');
const [streamingReasoning, setStreamingReasoning] = useState('');
const [toolCallInProgress, setToolCallInProgress] = useState<string | null>(null);
const [totalUsage, setTotalUsage] = useState<UsageData | undefined>();
const [messagesTrimmed, setMessagesTrimmed] = useState(0);  // [3.2] budget management feedback
```

### Changes to useAIChat.ts (Ralph)

Minimal changes — Ralph stays batch. The main change is consuming `LLMResponse` instead of the raw message type:

```typescript
// The hook wires RalphCallbacks to React state — same pattern as today
// The only change is that loop.ts now receives LLMResponse with pre-parsed tool calls
// useAIChat doesn't need streaming state for Ralph
// [3.2] Hook creates ClientLogger adapter from LogTape and passes into loop
```

---

## 16. IMPLEMENTATION PHASES

### Phase 1: Response Type & Parsing (no streaming yet)

**Goal:** Replace the raw response with `LLMResponse`. Parse tool calls in the client. Add error detection. Keep batch mode.

1. Create `src/lib/llm/types.ts` with `LLMResponse`, `ParsedToolCall`, `FinishReason`, `UsageData`, `ClientLogger` (3.2), `RequestOptions` (3.2)
2. Create `src/lib/llm/errors.ts` with error classes (including `ContextOverflowError` — 3.2)
3. Create `src/lib/llm/parse-response.ts` with response parsing, reasoning extraction, finish reason normalization, tool call parsing, `computeToolCallSignature()` (3.2)
4. Update `chat()` in `client.ts` to return `LLMResponse` instead of raw message
5. Update Ralph loop to consume `LLMResponse` (no more manual `JSON.parse` on tool_calls)
6. Add empty response detection and malformed tool call recovery
7. Add usage extraction (from batch response)

**Breaking change:** `chat()` return type changes. All consumers must update. There's only two: the Ralph loop and (eventually) Chief.

### Phase 2: Streaming (for Chief)

**Goal:** Add `stream()` entry point. Wire to Chief's conversational UI for real-time text display. Ralph stays batch.

1. Create `src/lib/llm/stream.ts` with `stream()` function, `ResponseAccumulator`, SSE parser
2. Add streaming delta types to `types.ts`
3. Wire `stream()` into `useChiefChat.ts` (from Chief implementation plan)
4. Add streaming state management to Chief's hook (`streamingContent`, `streamingReasoning`, `toolCallInProgress`)
5. Update the Chief chat panel to render streaming content as it arrives
6. Add fallback-to-batch logic for providers that don't support streaming
7. Ralph loop (`loop.ts`) stays on `chat()` — no streaming changes needed there

### Phase 3: Provider Normalization & Optimization

**Goal:** Handle provider quirks, add prompt caching, image retry, cost tracking, model registry, CORS proxy.

1. Create `src/lib/llm/normalize.ts` with request/response normalization
2. Add prompt caching for Anthropic via OpenRouter
3. Add image strip-and-retry logic
4. Create `scripts/generate-model-registry.ts` — build-time script fetching pricing + capability data from models.dev + OpenRouter API (3.1, renamed 3.2)
5. Generate `src/lib/llm/model-registry.generated.ts` — unified cost + capability map (3.2, replaces `model-costs.generated.ts`)
6. Add cost tracking to `UsageData` with fallback chain: provider-reported → generated table → undefined (3.1)
7. Wire cost display to UI
8. Add tool output truncation (`toModelOutput` pattern)
9. Add CORS proxy integration: `applyProxy()` in normalization, proxy template in AppConfig
10. Deploy `wiggum-cors-proxy` Cloudflare Worker (separate repo/package, Hono + cors middleware)

### Phase 4: Structured Output

**Goal:** Add optional schema-based structured output for completion steps.

1. Add `outputSchema` parameter to `chat()` and `stream()`
2. Implement schema injection (JSON mode where supported, prompt injection fallback)
3. Implement response parsing + Zod validation for structured output
4. Use structured output for Ralph's completion step (replace `.ralph/summary.md` free-text)

### Phase 5: Context Awareness & Observability (3.2)

**Goal:** Add pre-request intelligence (preflight, budget management, stall detection) and request/response logging via LogTape.

1. Create `src/lib/llm/preflight.ts` — `estimateTokens()`, `preflightCheck()`, `getModelCapability()` (reads from registry)
2. Create `src/lib/llm/budget.ts` — `budgetMessages()` for Chief's conversation history trimming
3. Add `computeToolCallSignature()` to `parse-response.ts` (if not already done in Phase 1)
4. Add preflight call at the top of `chat()` and `stream()` — throw `ContextOverflowError` when over budget, warn when within 10%
5. Wire `budgetMessages()` into `useChiefChat.ts` — called before every `stream()` call
6. Wire stall detection into Ralph's loop (`loop.ts`) — track `lastSignature`, `consecutiveStalls` counter, threshold-based feedback/abort
7. Add `logger` parameter to `RequestOptions` and log at all lifecycle points (§14 log categories)
8. Create LogTape adapter in hooks — `useAIChat.ts` and `useChiefChat.ts` both create a `ClientLogger` from `getLogger(['wiggum', 'llm'])` and pass it into every call

---

## 17. FILE CHANGE INDEX

### New Files

| File | Purpose | Phase |
|------|---------|-------|
| `src/lib/llm/types.ts` | `LLMResponse`, `ParsedToolCall`, `FinishReason`, `UsageData`, `StreamDelta`, `StreamResult`, `ClientLogger` (3.2), `RequestOptions` (3.2) | 1 |
| `src/lib/llm/errors.ts` | `LLMError`, `EmptyResponseError`, `MalformedToolCallError`, `ProviderError`, `TokenLimitError`, `ContentFilterError`, `AbortError`, `ContextOverflowError` (3.2) | 1 |
| `src/lib/llm/parse-response.ts` | `parseResponse()`, `parseToolCall()`, `attemptJsonRepair()`, `extractReasoning()`, `normalizeFinishReason()`, `extractUsage()`, `isEmptyResponse()`, `validateToolCalls()`, `computeToolCallSignature()` (3.2) | 1 |
| `src/lib/llm/stream.ts` | `stream()`, `ResponseAccumulator`, SSE parser, delta types. **3.1:** `buildToolCalls()` calls `attemptJsonRepair()`, finalization gated on `[DONE]` not `finish_reason` | 2 |
| `src/lib/llm/normalize.ts` | `normalizeRequest()`, `normalizeResponse()`, `applyCacheControl()`, `applyProxy()`, image handling | 3 |
| `src/lib/llm/model-registry.generated.ts` | **3.2:** Unified model pricing + capability map from models.dev + OpenRouter. `ModelEntry` = `ModelCost` + `ModelCapability`. Replaces 3.1's `model-costs.generated.ts`. | 3 |
| `scripts/generate-model-registry.ts` | **3.2:** Build-time script fetching pricing + capability data from models.dev + OpenRouter APIs. Renamed from 3.1's `generate-model-costs.ts`. | 3 |
| `src/lib/llm/preflight.ts` | **3.2:** `estimateTokens()`, `preflightCheck()`, `getModelCapability()`. Pre-request context window validation. | 5 |
| `src/lib/llm/budget.ts` | **3.2:** `budgetMessages()`. Token-aware conversation trimming for Chief's growing history. | 5 |

### New Package (separate repo)

| Package | Purpose | Phase |
|---------|---------|-------|
| `wiggum-cors-proxy/` | Cloudflare Worker — Hono + `cors()` middleware, ~20 lines, pure fetch forwarding with CORS headers | 3 |

### Modified Files

| File | Change | Phase |
|------|--------|-------|
| `src/lib/llm/client.ts` | Return `LLMResponse` from `chat()`. Import and use `parseResponse()`. Add `stream()` export. Add `outputSchema` parameter. **3.2:** Accept `RequestOptions` with `logger`, call `preflightCheck()` before every request. | 1, 2, 4, 5 |
| `src/lib/ralph/loop.ts` | Consume `LLMResponse` instead of raw message. Use `result.toolCalls` (already parsed). Add `onReasoning` and `onUsage` callbacks. **Stays on `chat()` — no streaming.** **3.2:** Track `lastSignature` + `consecutiveStalls` for stall detection. Pass `clientLogger` into every `chat()` call. | 1, 5 |
| `src/hooks/useAIChat.ts` | Minimal change — consume `LLMResponse` from loop callbacks. Add usage display state. **No streaming state needed for Ralph.** **3.2:** Create `ClientLogger` adapter from LogTape `getLogger(['wiggum', 'llm'])`, pass into loop. | 1, 5 |
| `src/hooks/useChiefChat.ts` | **Primary streaming consumer.** Wire `stream()` for conversational UI. Add `streamingContent`, `streamingReasoning`, `toolCallInProgress` state. Consume deltas in real-time. **3.2:** Call `budgetMessages()` before every `stream()` call. Create and pass `clientLogger`. | 2, 5 |
| Chief chat panel component | Render streaming content as it arrives. Show reasoning in collapsible. Display tool-call-in-progress indicator. | 2 |
| Ralph chat panel component | Show usage/cost data. Show reasoning in debug panel. No streaming changes. | 1, 3 |

### Files NOT Changed

- Shell commands — they don't interact with the LLM client directly
- ShellExecutor — doesn't know about the LLM
- Quality gates — they run after the loop, not during LLM calls
- Skills system — independent of the client
- LogTape configuration — the logger adapter is created in hooks, not in logging config

---

## 18. RELATIONSHIP TO TOOLKIT 2.0

The LLM API 3.2 and Toolkit 2.0 are complementary:

| Concern | Owner |
|---------|-------|
| Sending requests to the LLM | LLM API 3.2 (client.ts) |
| Parsing responses from the LLM | LLM API 3.2 (parse-response.ts) |
| Context window preflight (3.2) | LLM API 3.2 (preflight.ts) |
| Conversation budget management (3.2) | LLM API 3.2 (budget.ts) — consumed by Chief hook |
| Stall detection signal (3.2) | LLM API 3.2 (parse-response.ts) — consumed by Ralph loop |
| Request/response observability (3.2) | LLM API 3.2 (logger injection) — consumed by hooks |
| Building the tool list for the LLM | Toolkit 2.0 (tool-builder.ts) |
| Validating tool call args against schemas | Toolkit 2.0 (Zod safeParse in dispatch) |
| Dispatching tool calls to command classes | Toolkit 2.0 (dispatch function) |
| Truncating tool output before sending back | LLM API 3.2 (toModelOutput in loop) |
| Constructing tool result messages | Ralph loop (uses both) |

The handoff:

```
LLM API 3.2                    Toolkit 2.0
─────────────                  ─────────────
preflightCheck() ←──────────── (model from registry)
  ↓ ok
stream() → LLMResponse
  .toolCallSignature ────────→ stall check (loop)
  .toolCalls[0].name ────────→ dispatch("grep", args)
  .toolCalls[0].args ────────→   → Zod validation
                                  → GrepCommand.execute(typed)
                                  → ShellCommandResult
                              ←── output string
toModelOutput(output) ←───────
  → truncated result
  → tool message → messages[]
  → preflight → next stream() call
```

Both documents can be implemented independently. Toolkit 2.0 works without streaming (it's about schema validation and dual-mode dispatch). LLM API 3.2 works without schemas (it's about response parsing, streaming, and context intelligence). But they're designed to complement each other perfectly.

---

## APPENDIX: CLEAN ROOM NOTES

This document describes **architectural patterns and concepts only**.

**From AI SDK (Apache 2.0):** The concepts of structured output via schema, step-based execution, `toModelOutput` separation, and `Output.object()` pattern are general industry patterns documented in Vercel's public docs. No AI SDK code is used or copied.

**From Shakespeare (AGPL):** The concepts of streaming accumulation via indexed tool call maps, multi-provider reasoning field extraction, empty message detection, tool output truncation with file save, prompt caching via cache_control markers, and template-based CORS proxy URL rewriting are described as architectural patterns. No Shakespeare code is used or copied. Implementation should be written fresh against Wiggum's existing codebase. The CORS proxy is built from scratch using Hono (MIT) and standard Web APIs.

**From pi-ai (MIT, 3.1):** The concept of build-time model cost generation from models.dev and OpenRouter public APIs, the finalization guard against premature `finish_reason` in streaming, and JSON repair for streaming argument buffers were identified by studying pi-ai's architecture and changelog. No pi-ai code is used or copied. The cost generation script, finalization guard, and streaming repair are written from scratch against Wiggum's existing codebase.

**Original to Wiggum (3.2):** The following concepts were developed specifically for Wiggum's browser-native, dual-consumer (Ralph + Chief) architecture:

- **Context window preflight** — pre-request token estimation and validation against model capability limits. The ~4 chars/token heuristic is a well-known industry approximation; the preflight-check-before-send pattern is standard practice in production LLM systems.
- **Model capability registry** — extending build-time cost generation to include context window, max output tokens, and feature flags in a unified lookup table. The data sources (models.dev, OpenRouter API) are the same as 3.1's cost generation.
- **Conversation budget management** — deterministic, token-aware message trimming that preserves system prompts and recent context while dropping middle messages. This is explicitly NOT summarization (which would require an extra LLM call). The pattern is a direct response to Chief's "malloc without free" conversation growth problem.
- **Tool call signature for stall detection** — deterministic hashing of sorted [name + args] pairs to detect when Ralph is spinning (identical tool calls across consecutive iterations). The client computes the signal; the consumer enforces policy. This is Wiggum-specific — other systems handle stall detection at the agent orchestration layer, not the transport layer.
- **LogTape observability integration** — injecting a logger interface into the client that maps to Wiggum's existing fingers-crossed sink pattern. The logger interface itself is generic; the integration with LogTape's buffered-then-flush-on-error behavior is Wiggum-specific.

Key references for CC:
- Wiggum's existing client → `src/lib/llm/client.ts` (read the actual fetch wrapper)
- Wiggum's existing message types → check what `chat()` currently returns
- Wiggum's existing loop → `src/lib/ralph/loop.ts` (read how tool_calls are currently extracted)
- Wiggum's existing callbacks → `RalphCallbacks` type (read the actual interface)
- Wiggum's existing hook → `src/hooks/useAIChat.ts` (read state management patterns)
- Wiggum's existing logger → `src/lib/logger/` (read LogTape configuration + fingers-crossed sink)
- OpenAI SSE format → https://platform.openai.com/docs/api-reference/streaming
- Hono CORS middleware → https://hono.dev/docs/middleware/builtin/cors
- Hono on Cloudflare Workers → https://hono.dev/docs/getting-started/cloudflare-workers
- Cloudflare Workers pricing → https://workers.cloudflare.com/pricing
- Zod documentation → https://zod.dev
- models.dev API → https://models.dev (3.1, cost + capability data source)
- OpenRouter models API → https://openrouter.ai/api/v1/models (3.1, cost + capability data source)
