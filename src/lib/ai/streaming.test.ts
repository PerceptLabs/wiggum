import { describe, it, expect, vi } from 'vitest'
import { processStream, createStreamProcessor, hasToolCalls, finishedWithToolCalls } from './streaming'
import type { AIStreamChunk } from './types'

describe('processStream', () => {
  async function* makeStream(chunks: AIStreamChunk[]): AsyncIterable<AIStreamChunk> {
    for (const chunk of chunks) {
      yield chunk
    }
  }

  it('should accumulate content from chunks', async () => {
    const chunks: AIStreamChunk[] = [
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }] },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: ' world' }, finish_reason: null }] },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
    ]

    const result = await processStream(makeStream(chunks))
    expect(result.content).toBe('Hello world')
    expect(result.finishReason).toBe('stop')
  })

  it('should call onContent callback for each content chunk', async () => {
    const chunks: AIStreamChunk[] = [
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'A' }, finish_reason: null }] },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'B' }, finish_reason: null }] },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
    ]

    const onContent = vi.fn()
    await processStream(makeStream(chunks), { onContent })

    expect(onContent).toHaveBeenCalledWith('A')
    expect(onContent).toHaveBeenCalledWith('B')
    expect(onContent).toHaveBeenCalledTimes(2)
  })

  it('should accumulate tool calls from chunks', async () => {
    const chunks: AIStreamChunk[] = [
      {
        id: '1',
        object: 'chunk',
        created: 1,
        model: 'test',
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'shell' } }],
          },
          finish_reason: null,
        }],
      },
      {
        id: '1',
        object: 'chunk',
        created: 1,
        model: 'test',
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '{"command":' } }],
          },
          finish_reason: null,
        }],
      },
      {
        id: '1',
        object: 'chunk',
        created: 1,
        model: 'test',
        choices: [{
          index: 0,
          delta: {
            tool_calls: [{ index: 0, function: { arguments: ' "ls"}' } }],
          },
          finish_reason: null,
        }],
      },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    ]

    const result = await processStream(makeStream(chunks))

    expect(result.toolCalls).toHaveLength(1)
    expect(result.toolCalls[0].id).toBe('call_1')
    expect(result.toolCalls[0].function.name).toBe('shell')
    expect(result.toolCalls[0].function.arguments).toBe('{"command": "ls"}')
    expect(result.finishReason).toBe('tool_calls')
  })

  it('should handle multiple tool calls', async () => {
    const chunks: AIStreamChunk[] = [
      {
        id: '1',
        object: 'chunk',
        created: 1,
        model: 'test',
        choices: [{
          index: 0,
          delta: {
            tool_calls: [
              { index: 0, id: 'call_1', type: 'function', function: { name: 'tool1', arguments: '{}' } },
              { index: 1, id: 'call_2', type: 'function', function: { name: 'tool2', arguments: '{}' } },
            ],
          },
          finish_reason: null,
        }],
      },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    ]

    const result = await processStream(makeStream(chunks))
    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls[0].function.name).toBe('tool1')
    expect(result.toolCalls[1].function.name).toBe('tool2')
  })

  it('should call onToolCall callback', async () => {
    const chunks: AIStreamChunk[] = [
      {
        id: '1',
        object: 'chunk',
        created: 1,
        model: 'test',
        choices: [{
          index: 0,
          delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'test', arguments: '{}' } }] },
          finish_reason: null,
        }],
      },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
    ]

    const onToolCall = vi.fn()
    await processStream(makeStream(chunks), { onToolCall })

    expect(onToolCall).toHaveBeenCalledWith(expect.objectContaining({
      id: 'call_1',
      function: { name: 'test', arguments: '{}' },
    }))
  })

  it('should call onFinish callback', async () => {
    const chunks: AIStreamChunk[] = [
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Done' }, finish_reason: null }] },
      { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
    ]

    const onFinish = vi.fn()
    await processStream(makeStream(chunks), { onFinish })

    expect(onFinish).toHaveBeenCalledWith('stop')
  })

  it('should handle errors', async () => {
    async function* errorStream(): AsyncIterable<AIStreamChunk> {
      yield { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Start' }, finish_reason: null }] }
      throw new Error('Stream error')
    }

    const onError = vi.fn()
    await expect(processStream(errorStream(), { onError })).rejects.toThrow('Stream error')
    expect(onError).toHaveBeenCalled()
  })
})

describe('createStreamProcessor', () => {
  it('should process chunks and return result', () => {
    const processor = createStreamProcessor()

    processor.process({ id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Hello' }, finish_reason: null }] })
    processor.process({ id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: ' world' }, finish_reason: null }] })
    processor.process({ id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })

    const result = processor.getResult()
    expect(result.content).toBe('Hello world')
    expect(result.finishReason).toBe('stop')
  })

  it('should call callbacks during processing', () => {
    const onContent = vi.fn()
    const onFinish = vi.fn()
    const processor = createStreamProcessor({ onContent, onFinish })

    processor.process({ id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }] })
    expect(onContent).toHaveBeenCalledWith('Hi')

    processor.process({ id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })
    expect(onFinish).toHaveBeenCalledWith('stop')
  })
})

describe('hasToolCalls', () => {
  it('should return true when tool calls present', () => {
    expect(hasToolCalls({ content: '', toolCalls: [{ id: '1', type: 'function', function: { name: 'test', arguments: '{}' } }], finishReason: 'tool_calls' })).toBe(true)
  })

  it('should return false when no tool calls', () => {
    expect(hasToolCalls({ content: 'Hello', toolCalls: [], finishReason: 'stop' })).toBe(false)
  })
})

describe('finishedWithToolCalls', () => {
  it('should return true when finish reason is tool_calls', () => {
    expect(finishedWithToolCalls({ content: '', toolCalls: [], finishReason: 'tool_calls' })).toBe(true)
  })

  it('should return false for other finish reasons', () => {
    expect(finishedWithToolCalls({ content: '', toolCalls: [], finishReason: 'stop' })).toBe(false)
  })
})
