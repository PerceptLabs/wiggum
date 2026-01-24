import { parse } from 'shell-quote'
import type { ParsedCommand } from './types'

/**
 * Parse heredoc syntax and convert to a write command
 * Matches: cat > filename << 'EOF' ... EOF
 */
function parseHeredoc(input: string): ParsedCommand[] | null {
  // Match heredoc pattern: cat > filename << 'DELIMITER' or cat > filename << DELIMITER
  const heredocMatch = input.match(/cat\s*>\s*([^\s<]+)\s*<<\s*'?(\w+)'?\s*\n([\s\S]*?)\n\2\s*$/m)

  if (heredocMatch) {
    const filename = heredocMatch[1]
    const content = heredocMatch[3]

    // Return as internal write command
    return [{
      name: '__write__',
      args: [filename, content],
    }]
  }

  return null
}

/**
 * Normalize paths - convert /tmp/ and absolute paths to project-relative
 */
export function normalizePath(path: string, projectRoot: string): string {
  // Remove leading /tmp/ and make project-relative
  if (path.startsWith('/tmp/')) {
    return path.replace('/tmp/', '')
  }

  // If absolute path doesn't start with project root, make it relative
  if (path.startsWith('/') && !path.startsWith(projectRoot)) {
    // Strip leading slash to make relative
    return path.substring(1)
  }

  return path
}

/**
 * Split command line by && operator (respecting quotes)
 */
function splitByAndAnd(input: string): string[] {
  const parts: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let i = 0

  while (i < input.length) {
    const char = input[i]

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      current += char
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      current += char
    } else if (char === '&' && input[i + 1] === '&' && !inSingleQuote && !inDoubleQuote) {
      parts.push(current.trim())
      current = ''
      i += 2 // Skip both &
      continue
    } else {
      current += char
    }
    i++
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

/**
 * Parse a single command (no && chaining) into ParsedCommand array (for pipes)
 */
function parseSingleCommand(input: string): ParsedCommand[] {
  const tokens = parse(input)

  if (tokens.length === 0) {
    return []
  }

  const pipelines: ParsedCommand[] = []
  let currentCmd: ParsedCommand | null = null
  let expectingRedirectTarget = false
  let redirectType: '>' | '>>' | null = null

  for (const token of tokens) {
    // Handle string tokens (command name or arguments)
    if (typeof token === 'string') {
      if (expectingRedirectTarget) {
        // This token is the redirect target
        if (currentCmd && redirectType) {
          currentCmd.redirect = { type: redirectType, target: token }
        }
        expectingRedirectTarget = false
        redirectType = null
        continue
      }

      if (!currentCmd) {
        // First token is the command name
        currentCmd = { name: token, args: [] }
      } else {
        // Subsequent tokens are arguments
        currentCmd.args.push(token)
      }
      continue
    }

    // Handle operator tokens (pipes, redirects, etc.)
    if (typeof token === 'object' && 'op' in token) {
      const op = token.op

      // Handle pipe: |
      if (op === '|') {
        if (currentCmd) {
          pipelines.push(currentCmd)
          currentCmd = null
        }
        continue
      }

      // Handle redirect: > or >>
      if (op === '>' || op === '>>') {
        redirectType = op
        expectingRedirectTarget = true
        continue
      }

      // Stop at other operators (we handle && at higher level)
      if (op === '&&' || op === '||' || op === ';') {
        break
      }
    }
  }

  // Add the last command if any
  if (currentCmd) {
    pipelines.push(currentCmd)
  }

  return pipelines
}

/**
 * Parse a shell command string into an array of commands
 * Handles: pipes (|), redirects (>, >>), command chaining (&&), and heredocs
 *
 * Returns array of command sequences. Each sequence is an array of piped commands.
 */
export function parseCommandLine(input: string): ParsedCommand[] {
  // First, check for heredoc syntax
  const heredocResult = parseHeredoc(input)
  if (heredocResult) {
    return heredocResult
  }

  // Split by && and process each part
  const chainedCommands = splitByAndAnd(input)

  // For now, return all commands flattened (executor handles them sequentially)
  const allCommands: ParsedCommand[] = []

  for (const cmd of chainedCommands) {
    const parsed = parseSingleCommand(cmd)
    allCommands.push(...parsed)
  }

  return allCommands
}

/**
 * Parse command line with && chaining support
 * Returns array of command chains - each chain should be executed sequentially,
 * stopping if any command fails
 */
export function parseCommandLineChained(input: string): ParsedCommand[][] {
  // First, check for heredoc syntax
  const heredocResult = parseHeredoc(input)
  if (heredocResult) {
    return [heredocResult]
  }

  // Split by && and process each part
  const chainedCommands = splitByAndAnd(input)

  return chainedCommands.map(cmd => parseSingleCommand(cmd))
}
