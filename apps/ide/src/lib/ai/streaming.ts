import type { AIStreamChunk, AIToolCall, StreamCallbacks, StreamResult } from './types'

/**
 * Accumulator for building tool calls from streaming chunks
 */
interface ToolCallAccumulator {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/**
 * Process a stream of AI response chunks
 * Accumulates content and tool calls, calling callbacks as data arrives
 */
export async function processStream(
  stream: AsyncIterable<AIStreamChunk>,
  callbacks?: StreamCallbacks
): Promise<StreamResult> {
  let content = ''
  const toolCallAccumulators = new Map<number, ToolCallAccumulator>()
  let finishReason: string | null = null

  try {
    for await (const chunk of stream) {
      const choice = chunk.choices[0]
      if (!choice) continue

      const delta = choice.delta

      // Accumulate content
      if (delta.content) {
        content += delta.content
        callbacks?.onContent?.(delta.content)
      }

      // Accumulate tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          let accumulator = toolCallAccumulators.get(tc.index)

          if (!accumulator) {
            accumulator = {
              id: tc.id ?? '',
              type: 'function',
              function: {
                name: '',
                arguments: '',
              },
            }
            toolCallAccumulators.set(tc.index, accumulator)
          }

          // Accumulate parts
          if (tc.id) accumulator.id = tc.id
          if (tc.function?.name) accumulator.function.name += tc.function.name
          if (tc.function?.arguments) accumulator.function.arguments += tc.function.arguments
        }
      }

      // Capture finish reason
      if (choice.finish_reason) {
        finishReason = choice.finish_reason
      }
    }
  } catch (err) {
    callbacks?.onError?.(err as Error)
    throw err
  }

  // Build final tool calls array
  const toolCalls: AIToolCall[] = Array.from(toolCallAccumulators.values())
    .filter((tc) => tc.id && tc.function.name)
    .map((tc) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }))

  // Emit completed tool calls
  for (const toolCall of toolCalls) {
    callbacks?.onToolCall?.(toolCall)
  }

  // Emit finish
  if (finishReason) {
    callbacks?.onFinish?.(finishReason)
  }

  return {
    content,
    toolCalls,
    finishReason,
  }
}

/**
 * Create a transform stream that processes chunks and emits results
 * Useful for piping through UI components
 */
export function createStreamProcessor(callbacks?: StreamCallbacks): {
  process: (chunk: AIStreamChunk) => void
  getResult: () => StreamResult
} {
  let content = ''
  const toolCallAccumulators = new Map<number, ToolCallAccumulator>()
  let finishReason: string | null = null

  return {
    process(chunk: AIStreamChunk) {
      const choice = chunk.choices[0]
      if (!choice) return

      const delta = choice.delta

      if (delta.content) {
        content += delta.content
        callbacks?.onContent?.(delta.content)
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          let accumulator = toolCallAccumulators.get(tc.index)

          if (!accumulator) {
            accumulator = {
              id: tc.id ?? '',
              type: 'function',
              function: { name: '', arguments: '' },
            }
            toolCallAccumulators.set(tc.index, accumulator)
          }

          if (tc.id) accumulator.id = tc.id
          if (tc.function?.name) accumulator.function.name += tc.function.name
          if (tc.function?.arguments) accumulator.function.arguments += tc.function.arguments
        }
      }

      if (choice.finish_reason) {
        finishReason = choice.finish_reason

        // Emit completed tool calls on finish
        const toolCalls = Array.from(toolCallAccumulators.values())
          .filter((tc) => tc.id && tc.function.name)
          .map((tc) => ({
            id: tc.id,
            type: tc.type as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          }))

        for (const toolCall of toolCalls) {
          callbacks?.onToolCall?.(toolCall)
        }

        callbacks?.onFinish?.(finishReason)
      }
    },

    getResult(): StreamResult {
      const toolCalls = Array.from(toolCallAccumulators.values())
        .filter((tc) => tc.id && tc.function.name)
        .map((tc) => ({
          id: tc.id,
          type: tc.type as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }))

      return { content, toolCalls, finishReason }
    },
  }
}

/**
 * Helper to check if a stream result has tool calls
 */
export function hasToolCalls(result: StreamResult): boolean {
  return result.toolCalls.length > 0
}

/**
 * Helper to check if stream finished due to tool calls
 */
export function finishedWithToolCalls(result: StreamResult): boolean {
  return result.finishReason === 'tool_calls'
}
