import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSendMessage, createSendMessageStreaming } from './createSendMessage'
import type { AIClient, Tool, ChatCompletion, ChatCompletionChunk } from './index'

// Mock tool for testing
const mockTool: Tool<{ input: string }> = {
  name: 'test_tool',
  description: 'A test tool',
  async execute(params: { input: string }) {
    return { content: `Result: ${params.input}` }
  },
}

// Mock tool that throws
const errorTool: Tool = {
  name: 'error_tool',
  description: 'A tool that errors',
  async execute() {
    throw new Error('Tool failed')
  },
}

describe('createSendMessage', () => {
  let mockClient: AIClient
  let createMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createMock = vi.fn()
    mockClient = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    }
  })

  it('should create a sendMessage function', () => {
    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [],
    })
    expect(typeof sendMessage).toBe('function')
  })

  it('should send prompt and return response', async () => {
    const response: ChatCompletion = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Hello, how can I help?',
          },
          finish_reason: 'stop',
        },
      ],
    }
    createMock.mockResolvedValue(response)

    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [],
    })

    const result = await sendMessage('Hello')
    expect(result).toBe('Hello, how can I help?')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: 'Hello' }),
        ]),
      })
    )
  })

  it('should use custom system prompt', async () => {
    const response: ChatCompletion = {
      choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
    }
    createMock.mockResolvedValue(response)

    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [],
      systemPrompt: 'You are a coding assistant.',
    })

    await sendMessage('Hello')
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system', content: 'You are a coding assistant.' }),
        ]),
      })
    )
  })

  it('should handle tool calls', async () => {
    // First response requests tool call
    const responseWithTool: ChatCompletion = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Let me use a tool',
            tool_calls: [
              {
                id: 'call_123',
                type: 'function',
                function: {
                  name: 'test_tool',
                  arguments: '{"input": "test"}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    }

    // Second response is final
    const finalResponse: ChatCompletion = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Done!',
          },
          finish_reason: 'stop',
        },
      ],
    }

    createMock.mockResolvedValueOnce(responseWithTool).mockResolvedValueOnce(finalResponse)

    const onToolCall = vi.fn()
    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [mockTool],
      onToolCall,
    })

    const result = await sendMessage('Use the tool')
    expect(result).toBe('Let me use a toolDone!')
    expect(onToolCall).toHaveBeenCalledWith('test_tool', { input: 'test' }, 'Result: test')
  })

  it('should call onResponse callback', async () => {
    const response: ChatCompletion = {
      choices: [{ message: { role: 'assistant', content: 'Response text' }, finish_reason: 'stop' }],
    }
    createMock.mockResolvedValue(response)

    const onResponse = vi.fn()
    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [],
      onResponse,
    })

    await sendMessage('Hello')
    expect(onResponse).toHaveBeenCalledWith('Response text')
  })

  it('should handle tool errors gracefully', async () => {
    const responseWithTool: ChatCompletion = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_err',
                type: 'function',
                function: {
                  name: 'error_tool',
                  arguments: '{}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    }

    const finalResponse: ChatCompletion = {
      choices: [{ message: { role: 'assistant', content: 'Handled error' }, finish_reason: 'stop' }],
    }

    createMock.mockResolvedValueOnce(responseWithTool).mockResolvedValueOnce(finalResponse)

    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [errorTool],
    })

    const result = await sendMessage('Try error tool')
    expect(result).toBe('Handled error')
  })

  it('should handle unknown tool', async () => {
    const responseWithTool: ChatCompletion = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_unknown',
                type: 'function',
                function: {
                  name: 'unknown_tool',
                  arguments: '{}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    }

    const finalResponse: ChatCompletion = {
      choices: [{ message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
    }

    createMock.mockResolvedValueOnce(responseWithTool).mockResolvedValueOnce(finalResponse)

    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [],
    })

    const result = await sendMessage('Use unknown')
    expect(result).toBe('OK')
  })

  it('should respect maxIterations', async () => {
    // Always request tool calls
    const toolResponse: ChatCompletion = {
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'Calling tool...',
            tool_calls: [
              {
                id: 'call_loop',
                type: 'function',
                function: {
                  name: 'test_tool',
                  arguments: '{"input": "loop"}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    }

    createMock.mockResolvedValue(toolResponse)

    const sendMessage = createSendMessage({
      client: mockClient,
      model: 'gpt-4',
      tools: [mockTool],
      maxIterations: 3,
    })

    await sendMessage('Loop forever')
    expect(createMock).toHaveBeenCalledTimes(3)
  })
})

describe('createSendMessageStreaming', () => {
  let mockClient: AIClient
  let createMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createMock = vi.fn()
    mockClient = {
      chat: {
        completions: {
          create: createMock,
        },
      },
    }
  })

  async function* makeStream(chunks: ChatCompletionChunk[]): AsyncIterable<ChatCompletionChunk> {
    for (const chunk of chunks) {
      yield chunk
    }
  }

  it('should handle streaming responses', async () => {
    const chunks: ChatCompletionChunk[] = [
      { choices: [{ delta: { role: 'assistant' }, finish_reason: null }] },
      { choices: [{ delta: { content: 'Hello' }, finish_reason: null }] },
      { choices: [{ delta: { content: ' world' }, finish_reason: null }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
    ]

    createMock.mockResolvedValue(makeStream(chunks))

    const onChunk = vi.fn()
    const sendMessage = createSendMessageStreaming({
      client: mockClient,
      model: 'gpt-4',
      tools: [],
      onChunk,
    })

    const result = await sendMessage('Hello')
    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledWith('Hello')
    expect(onChunk).toHaveBeenCalledWith(' world')
  })

  it('should handle streaming tool calls', async () => {
    // First stream with tool call
    const toolChunks: ChatCompletionChunk[] = [
      { choices: [{ delta: { role: 'assistant' }, finish_reason: null }] },
      {
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: 'call_1', type: 'function', function: { name: 'test_' } },
              ],
            },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { name: 'tool', arguments: '{"in' } }],
            },
            finish_reason: null,
          },
        ],
      },
      {
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { arguments: 'put": "x"}' } }],
            },
            finish_reason: null,
          },
        ],
      },
      { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
    ]

    // Final stream with response
    const finalChunks: ChatCompletionChunk[] = [
      { choices: [{ delta: { content: 'Done' }, finish_reason: null }] },
      { choices: [{ delta: {}, finish_reason: 'stop' }] },
    ]

    createMock.mockResolvedValueOnce(makeStream(toolChunks)).mockResolvedValueOnce(makeStream(finalChunks))

    const onToolCall = vi.fn()
    const sendMessage = createSendMessageStreaming({
      client: mockClient,
      model: 'gpt-4',
      tools: [mockTool],
      onToolCall,
    })

    const result = await sendMessage('Use tool')
    expect(result).toBe('Done')
    expect(onToolCall).toHaveBeenCalledWith('test_tool', { input: 'x' }, 'Result: x')
  })
})
