import type { AIMessage, AIToolCall } from '../ai'
import type { Tool } from '../tools'

/**
 * Session state for a project
 */
export interface SessionState {
  /** Project identifier */
  projectId: string
  /** Conversation messages */
  messages: AIMessage[]
  /** Whether AI is currently generating */
  isLoading: boolean
  /** Available tools for this session */
  tools: Tool[]
  /** Current streaming message content */
  streamingContent?: string
  /** Pending tool calls being processed */
  pendingToolCalls?: AIToolCall[]
  /** Abort controller for cancelling generation */
  abortController?: AbortController
  /** Current model being used */
  model?: string
  /** Error from last generation */
  error?: string
}

/**
 * Session event types
 */
export type SessionEventType =
  | 'messageAdded'
  | 'messageUpdated'
  | 'streamingUpdate'
  | 'loadingChanged'
  | 'toolCallStarted'
  | 'toolCallCompleted'
  | 'generationComplete'
  | 'generationError'
  | 'sessionCleared'

/**
 * Session event payloads
 */
export interface SessionEvents {
  messageAdded: { projectId: string; message: AIMessage }
  messageUpdated: { projectId: string; index: number; message: AIMessage }
  streamingUpdate: { projectId: string; content: string }
  loadingChanged: { projectId: string; isLoading: boolean }
  toolCallStarted: { projectId: string; toolCall: AIToolCall }
  toolCallCompleted: { projectId: string; toolCall: AIToolCall; result: string }
  generationComplete: { projectId: string }
  generationError: { projectId: string; error: string }
  sessionCleared: { projectId: string }
}

/**
 * Session event listener
 */
export type SessionEventListener<T extends SessionEventType> = (
  payload: SessionEvents[T]
) => void

/**
 * Session configuration options
 */
export interface SessionConfig {
  /** Maximum number of tool call iterations */
  maxToolIterations: number
  /** Maximum conversation history to send */
  maxHistoryMessages: number
  /** Whether to include system prompt */
  includeSystemPrompt: boolean
  /** Temperature for AI generation */
  temperature?: number
  /** Max tokens for response */
  maxTokens?: number
}

/**
 * Default session configuration
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  maxToolIterations: 10,
  maxHistoryMessages: 50,
  includeSystemPrompt: true,
  temperature: 0.7,
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolCallId: string
  name: string
  result: string
  error?: string
}

/**
 * Generation options
 */
export interface GenerationOptions {
  model: string
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

/**
 * Session manager options
 */
export interface SessionManagerOptions {
  /** Session configuration */
  config?: Partial<SessionConfig>
  /** Callback when tool is executed */
  onToolExecution?: (name: string, args: unknown, result: string) => void
  /** Callback when content is streamed */
  onStreamContent?: (projectId: string, content: string) => void
}
