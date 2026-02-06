import { parse } from 'shell-quote'
import type { ParsedCommand } from './types'

/**
 * Parse heredoc syntax and convert to a write command
 * Matches: cat > filename << 'EOF' ... EOF  (overwrite)
 * Matches: cat >> filename << 'EOF' ... EOF (append)
 */
function parseHeredoc(input: string): ParsedCommand[] | null {
  // Match heredoc pattern: cat >/>> filename << 'DELIMITER' or cat >/>> filename << DELIMITER
  const heredocMatch = input.match(/cat\s*(>>?)\s*([^\s<]+)\s*<<\s*'?(\w+)'?\s*\n([\s\S]*?)\n\3\s*$/m)

  if (heredocMatch) {
    const mode = heredocMatch[1]     // '>' or '>>'
    const filename = heredocMatch[2]
    const content = heredocMatch[4]

    // Return as internal write command (mode passed as 3rd arg)
    return [{
      name: '__write__',
      args: [filename, content, mode],
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
 * Parsed command chain with operator connecting to next segment
 */
export interface ParsedChain {
  commands: ParsedCommand[]
  nextOp?: '&&' | '||'
}

/**
 * Split command line by && and || operators (respecting quotes)
 * Returns segments with their connecting operators
 */
function splitByChainOperators(input: string): Array<{ segment: string; nextOp?: '&&' | '||' }> {
  const results: Array<{ segment: string; nextOp?: '&&' | '||' }> = []
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
    } else if (!inSingleQuote && !inDoubleQuote) {
      // Check for && or ||
      if (char === '&' && input[i + 1] === '&') {
        results.push({ segment: current.trim(), nextOp: '&&' })
        current = ''
        i += 2
        continue
      }
      if (char === '|' && input[i + 1] === '|') {
        results.push({ segment: current.trim(), nextOp: '||' })
        current = ''
        i += 2
        continue
      }
      current += char
    } else {
      current += char
    }
    i++
  }

  if (current.trim()) {
    results.push({ segment: current.trim() })
  }

  return results
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
 * Parse command line with && and || chaining support
 * Returns array of command chains - each chain has commands and an operator to the next
 */
export function parseCommandLineWithChaining(input: string): ParsedChain[] {
  // First, check for heredoc syntax
  const heredocResult = parseHeredoc(input)
  if (heredocResult) {
    return [{ commands: heredocResult }]
  }

  const segments = splitByChainOperators(input)
  return segments.map(({ segment, nextOp }) => ({
    commands: parseSingleCommand(segment),
    nextOp,
  }))
}

/**
 * Parse a shell command string into an array of commands
 * Handles: pipes (|), redirects (>, >>), command chaining (&&, ||), and heredocs
 *
 * Returns flat array of commands (for backwards compatibility)
 */
export function parseCommandLine(input: string): ParsedCommand[] {
  const chains = parseCommandLineWithChaining(input)
  return chains.flatMap((c) => c.commands)
}

/**
 * Parse command line with && chaining support (legacy, use parseCommandLineWithChaining)
 * Returns array of command chains - each chain should be executed sequentially,
 * stopping if any command fails
 */
export function parseCommandLineChained(input: string): ParsedCommand[][] {
  const chains = parseCommandLineWithChaining(input)
  return chains.map((c) => c.commands)
}
