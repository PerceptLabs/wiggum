// AI SDK Native Tools (preferred)
export { createTools, type WiggumTools, type CreateToolsOptions } from './create-tools'
export { ShellExecutor, type ShellExecutorOptions } from './shell-executor'

// Legacy exports (for backwards compatibility)
export type { Tool, ToolResult, ShellToolParams, ParsedCommand, CompoundCommand } from './types'
export { ShellTool } from './ShellTool'
export { SkillTool } from './SkillTool'
export type { SkillToolParams } from './SkillTool'
export { createSendMessage, createSendMessageStreaming } from './createSendMessage'
export type {
  AIClient,
  CreateSendMessageOptions,
  Message,
  ToolCall,
  ToolDefinition,
  ChatCompletion,
  ChatCompletionChunk,
} from './createSendMessage'
