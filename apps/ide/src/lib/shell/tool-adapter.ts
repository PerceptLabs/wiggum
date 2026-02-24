/**
 * Tool adapter — converts schema-enabled ShellCommands into LLM tool definitions.
 *
 * toolFromCommand() produces an OpenAI-compatible tool definition from a
 * ShellCommand that has an argsSchema. The schema's toJSONSchema() output
 * becomes the tool's parameters field.
 */

import type { Tool } from '../llm/client'
import type { ArgsSchema, ShellCommand } from './types'

/**
 * Convert a schema-enabled ShellCommand into an OpenAI-compatible tool definition.
 * Throws if the command has no argsSchema.
 */
export function toolFromCommand(cmd: ShellCommand<any>): Tool {
  if (!cmd.argsSchema) {
    throw new Error(`Cannot create discrete tool from ${cmd.name}: no argsSchema`)
  }

  return {
    type: 'function',
    function: {
      name: cmd.name,
      description: buildToolDescription(cmd),
      parameters: cmd.argsSchema.toJSONSchema(),
    },
  }
}

/**
 * Convert an additionalTools entry into an OpenAI-compatible tool definition.
 */
export function toolFromEntry(entry: {
  name: string
  description: string
  argsSchema: ArgsSchema<any>
  examples?: string[]
}): Tool {
  let desc = entry.description
  if (entry.examples?.length) {
    desc += '\n\nExamples:\n' + entry.examples.map(e => `  ${e}`).join('\n')
  }

  return {
    type: 'function',
    function: {
      name: entry.name,
      description: desc,
      parameters: entry.argsSchema.toJSONSchema(),
    },
  }
}

/**
 * Build a description string for a tool definition.
 * Includes the command's description and any examples.
 */
export function buildToolDescription(cmd: ShellCommand<any>): string {
  let desc = cmd.description

  if (cmd.examples?.length) {
    desc += '\n\nExamples:\n' + cmd.examples.map(e => `  ${e}`).join('\n')
  }

  return desc
}
