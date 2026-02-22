/**
 * Structured error responses for schema validation failures.
 *
 * When a command has an argsSchema and validation fails, this produces
 * a JSON error the LLM can parse and recover from — instead of ad-hoc
 * English error strings.
 */

import type { ShellCommand, ShellResult, SafeParseResult } from './types'

/**
 * Build a ShellResult with a structured JSON error in stderr.
 *
 * The JSON payload includes:
 * - error: 'invalid_arguments'
 * - command: the command name
 * - issues: array of { path, code, message } from the schema validation
 * - examples: the command's examples (if any) for recovery guidance
 */
export function structuredError(
  cmd: ShellCommand<any>,
  parseResult: SafeParseResult<unknown>
): ShellResult {
  if (parseResult.success) {
    throw new Error('structuredError called with successful parse result')
  }

  const payload = {
    error: 'invalid_arguments',
    command: cmd.name,
    issues: parseResult.error.issues.map(i => ({
      path: i.path.join('.'),
      code: i.code,
      message: i.message,
    })),
    examples: cmd.examples ?? [],
  }

  return {
    exitCode: 1,
    stdout: '',
    stderr: JSON.stringify(payload, null, 2),
  }
}
