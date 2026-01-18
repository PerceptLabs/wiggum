import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SessionManager } from './SessionManager'
import { buildSystemPrompt, buildRalphSystemPrompt, getToolDescriptions } from './systemPrompt'
import type { AIClient, AIStreamChunk } from '../ai'
import type { Tool } from '../tools'

// Mock AI Client
function createMockAIClient(): AIClient & { mockStream: (chunks: AIStreamChunk[]) => void } {
  let streamChunks: AIStreamChunk[] = []

  async function* chatStream() {
    for (const chunk of streamChunks) {
      yield chunk
    }
  }

  return {
    getProvider: () => ({ id: 'test', name: 'Test', baseURL: 'http://test', apiKey: 'key' }),
    getDefaultModel: () => 'test-model',
    chat: vi.fn(),
    chatStream: vi.fn().mockImplementation(chatStream),
    getRawClient: () => ({} as any),
    updateProvider: vi.fn(),
    mockStream(chunks: AIStreamChunk[]) {
      streamChunks = chunks
    },
  } as any
}

// Mock tool
const mockTool: Tool = {
  name: 'test_tool',
  description: 'A test tool',
  execute: vi.fn().mockResolvedValue({ content: 'Tool result' }),
}

describe('SessionManager', () => {
  let manager: SessionManager
  let mockClient: ReturnType<typeof createMockAIClient>

  beforeEach(() => {
    mockClient = createMockAIClient()
    manager = new SessionManager(mockClient as any)
  })

  describe('session management', () => {
    it('should create session on getSession', () => {
      const session = manager.getSession('project-1')
      expect(session.projectId).toBe('project-1')
      expect(session.messages).toEqual([])
      expect(session.isLoading).toBe(false)
    })

    it('should return same session for same projectId', () => {
      const session1 = manager.getSession('project-1')
      const session2 = manager.getSession('project-1')
      expect(session1).toBe(session2)
    })

    it('should load session with tools', () => {
      const session = manager.loadSession('project-1', [mockTool])
      expect(session.tools).toContain(mockTool)
    })

    it('should check if session exists', () => {
      expect(manager.hasSession('project-1')).toBe(false)
      manager.getSession('project-1')
      expect(manager.hasSession('project-1')).toBe(true)
    })

    it('should remove session', () => {
      manager.getSession('project-1')
      manager.removeSession('project-1')
      expect(manager.hasSession('project-1')).toBe(false)
    })

    it('should get all sessions', () => {
      manager.getSession('project-1')
      manager.getSession('project-2')
      const sessions = manager.getAllSessions()
      expect(sessions).toHaveLength(2)
    })
  })

  describe('message management', () => {
    it('should add message to session', () => {
      manager.addMessage('project-1', { role: 'user', content: 'Hello' })
      const session = manager.getSession('project-1')
      expect(session.messages).toHaveLength(1)
      expect(session.messages[0].content).toBe('Hello')
    })

    it('should emit messageAdded event', () => {
      const listener = vi.fn()
      manager.on('messageAdded', listener)

      manager.addMessage('project-1', { role: 'user', content: 'Hello' })

      expect(listener).toHaveBeenCalledWith({
        projectId: 'project-1',
        message: { role: 'user', content: 'Hello' },
      })
    })

    it('should update message at index', () => {
      manager.addMessage('project-1', { role: 'user', content: 'Hello' })
      manager.updateMessage('project-1', 0, { role: 'user', content: 'Updated' })

      const session = manager.getSession('project-1')
      expect(session.messages[0].content).toBe('Updated')
    })
  })

  describe('event handling', () => {
    it('should subscribe and unsubscribe to events', () => {
      const listener = vi.fn()
      const unsubscribe = manager.on('messageAdded', listener)

      manager.addMessage('project-1', { role: 'user', content: 'First' })
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()
      manager.addMessage('project-1', { role: 'user', content: 'Second' })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should emit loadingChanged events', async () => {
      const listener = vi.fn()
      manager.on('loadingChanged', listener)

      mockClient.mockStream([
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Hi' }, finish_reason: null }] },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      ])

      manager.loadSession('project-1', [])
      await manager.sendMessage('project-1', 'Hello', { model: 'test' })

      expect(listener).toHaveBeenCalledWith({ projectId: 'project-1', isLoading: true })
      expect(listener).toHaveBeenCalledWith({ projectId: 'project-1', isLoading: false })
    })
  })

  describe('generation', () => {
    it('should add user message and generate response', async () => {
      mockClient.mockStream([
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Hello!' }, finish_reason: null }] },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      ])

      manager.loadSession('project-1', [])
      await manager.sendMessage('project-1', 'Hi', { model: 'test' })

      const session = manager.getSession('project-1')
      expect(session.messages).toHaveLength(2)
      expect(session.messages[0]).toEqual({ role: 'user', content: 'Hi' })
      expect(session.messages[1]).toEqual({ role: 'assistant', content: 'Hello!', tool_calls: undefined })
    })

    it('should emit streamingUpdate during generation', async () => {
      const listener = vi.fn()
      manager.on('streamingUpdate', listener)

      mockClient.mockStream([
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'A' }, finish_reason: null }] },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'B' }, finish_reason: null }] },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      ])

      manager.loadSession('project-1', [])
      await manager.sendMessage('project-1', 'Hello', { model: 'test' })

      expect(listener).toHaveBeenCalledWith({ projectId: 'project-1', content: 'A' })
      expect(listener).toHaveBeenCalledWith({ projectId: 'project-1', content: 'AB' })
    })

    it('should execute tool calls', async () => {
      // First response with tool call
      const toolCallChunks: AIStreamChunk[] = [
        {
          id: '1', object: 'chunk', created: 1, model: 'test',
          choices: [{
            index: 0,
            delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'test_tool', arguments: '{}' } }] },
            finish_reason: null,
          }],
        },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
      ]

      // Second response without tool calls
      const finalChunks: AIStreamChunk[] = [
        { id: '2', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Done' }, finish_reason: null }] },
        { id: '2', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      ]

      let callCount = 0
      mockClient.chatStream = vi.fn().mockImplementation(async function* () {
        const chunks = callCount === 0 ? toolCallChunks : finalChunks
        callCount++
        for (const chunk of chunks) {
          yield chunk
        }
      })

      manager.loadSession('project-1', [mockTool])
      await manager.sendMessage('project-1', 'Use tool', { model: 'test' })

      expect(mockTool.execute).toHaveBeenCalled()

      const session = manager.getSession('project-1')
      // User, Assistant (tool call), Tool result, Assistant (final)
      expect(session.messages).toHaveLength(4)
      expect(session.messages[2].role).toBe('tool')
      expect(session.messages[2].content).toBe('Tool result')
    })

    it('should emit generationComplete event', async () => {
      const listener = vi.fn()
      manager.on('generationComplete', listener)

      mockClient.mockStream([
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Done' }, finish_reason: null }] },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      ])

      manager.loadSession('project-1', [])
      await manager.sendMessage('project-1', 'Hello', { model: 'test' })

      expect(listener).toHaveBeenCalledWith({ projectId: 'project-1' })
    })
  })

  describe('startNewSession', () => {
    it('should clear messages and emit event', () => {
      const listener = vi.fn()
      manager.on('sessionCleared', listener)

      manager.addMessage('project-1', { role: 'user', content: 'Hello' })
      manager.startNewSession('project-1')

      const session = manager.getSession('project-1')
      expect(session.messages).toEqual([])
      expect(listener).toHaveBeenCalledWith({ projectId: 'project-1' })
    })
  })

  describe('createRalphSendMessage', () => {
    it('should create a callback that runs AI loop', async () => {
      mockClient.mockStream([
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: { content: 'Ralph response' }, finish_reason: null }] },
        { id: '1', object: 'chunk', created: 1, model: 'test', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      ])

      const sendMessage = manager.createRalphSendMessage('project-1', [])
      const result = await sendMessage('Do something')

      expect(result).toBe('Ralph response')
    })
  })
})

describe('buildSystemPrompt', () => {
  it('should include core identity', () => {
    const prompt = buildSystemPrompt({ tools: [] })
    expect(prompt).toContain('Wiggum')
    expect(prompt).toContain('AI coding assistant')
  })

  it('should include project name when provided', () => {
    const prompt = buildSystemPrompt({ tools: [], projectName: 'MyProject' })
    expect(prompt).toContain('MyProject')
  })

  it('should include working directory when provided', () => {
    const prompt = buildSystemPrompt({ tools: [], cwd: '/home/user/project' })
    expect(prompt).toContain('/home/user/project')
  })

  it('should list available tools', () => {
    const tool: Tool = {
      name: 'shell',
      description: 'Execute shell commands',
      execute: async () => ({ content: '' }),
    }
    const prompt = buildSystemPrompt({ tools: [tool] })
    expect(prompt).toContain('shell')
    expect(prompt).toContain('Execute shell commands')
  })

  it('should include ralph instructions when in ralph mode', () => {
    const prompt = buildSystemPrompt({
      tools: [],
      isRalphIteration: true,
      ralphIteration: 5,
    })
    expect(prompt).toContain('Ralph Iteration Mode')
    expect(prompt).toContain('iteration 5')
    expect(prompt).toContain('.ralph/progress.md')
  })

  it('should include additional context when provided', () => {
    const prompt = buildSystemPrompt({
      tools: [],
      additionalContext: 'This is a TypeScript project',
    })
    expect(prompt).toContain('This is a TypeScript project')
  })
})

describe('buildRalphSystemPrompt', () => {
  it('should create a minimal ralph prompt', () => {
    const prompt = buildRalphSystemPrompt(3, '/project')
    expect(prompt).toContain('iteration 3')
    expect(prompt).toContain('/project')
    expect(prompt).toContain('.ralph/task.md')
  })
})

describe('getToolDescriptions', () => {
  it('should format tool descriptions', () => {
    const tools: Tool[] = [
      { name: 'shell', description: 'Run commands', execute: async () => ({ content: '' }) },
      { name: 'read', description: 'Read files', execute: async () => ({ content: '' }) },
    ]
    const result = getToolDescriptions(tools)
    expect(result).toContain('- shell: Run commands')
    expect(result).toContain('- read: Read files')
  })
})
