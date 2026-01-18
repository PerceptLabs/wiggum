import type { ZodType } from 'zod'

/**
 * Result returned from tool execution
 */
export interface ToolResult {
  content: string
  cost?: number
}

/**
 * Generic tool interface for AI tools
 * @template TParams - Type for the tool's input parameters
 */
export interface Tool<TParams = unknown> {
  name: string
  description: string
  inputSchema?: ZodType<TParams>
  execute(params: TParams): Promise<ToolResult>
}

/**
 * Parameters for the shell tool
 */
export interface ShellToolParams {
  command: string
}

/**
 * Parsed command with its arguments
 */
export interface ParsedCommand {
  name: string
  args: string[]
  input?: string
  redirect?: {
    type: '>' | '>>'
    path: string
  }
}

/**
 * Compound command with operator connecting commands
 */
export interface CompoundCommand {
  command: ParsedCommand
  operator: '&&' | '||' | '|' | ';' | null
}
