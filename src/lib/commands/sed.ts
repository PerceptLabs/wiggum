import path from 'path-browserify'
import type { JSRuntimeFS } from '../fs'
import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface SedOptions {
  inPlace: boolean
  expression: string | null
}

function parseOptions(args: string[]): { options: SedOptions; paths: string[] } {
  const options: SedOptions = { inPlace: false, expression: null }
  const paths: string[] = []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '-i') {
      options.inPlace = true
    } else if (arg === '-e' && i + 1 < args.length) {
      options.expression = args[++i]
    } else if (!arg.startsWith('-')) {
      if (options.expression === null) {
        options.expression = arg
      } else {
        paths.push(arg)
      }
    }
  }

  return { options, paths }
}

interface SubstituteCommand {
  pattern: RegExp
  replacement: string
  global: boolean
}

function parseExpression(expr: string): SubstituteCommand | null {
  // Parse s/pattern/replacement/flags
  if (!expr.startsWith('s')) {
    return null
  }

  const delimiter = expr[1]
  const parts = expr.slice(2).split(delimiter)

  if (parts.length < 2) {
    return null
  }

  const pattern = parts[0]
  const replacement = parts[1]
  const flags = parts[2] || ''

  const global = flags.includes('g')
  const caseInsensitive = flags.includes('i')

  try {
    const regexFlags = caseInsensitive ? 'gi' : global ? 'g' : ''
    return {
      pattern: new RegExp(pattern, regexFlags || undefined),
      replacement,
      global,
    }
  } catch {
    return null
  }
}

/**
 * sed - stream editor for filtering and transforming text
 */
export class SedCommand implements ShellCommand {
  name = 'sed'
  description = 'Stream editor for filtering and transforming text'
  usage = "sed [-i] 's/pattern/replacement/[g]' [file...]"

  constructor(private fs: JSRuntimeFS) {}

  async execute(args: string[], cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, paths } = parseOptions(args)

    if (!options.expression) {
      return createErrorResult('sed: missing expression')
    }

    const cmd = parseExpression(options.expression)
    if (!cmd) {
      return createErrorResult(`sed: invalid expression: ${options.expression}`)
    }

    let content: string

    if (paths.length === 0) {
      if (input !== undefined) {
        content = input
      } else {
        return createErrorResult('sed: missing file operand')
      }
    } else {
      const filePath = paths[0]
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)

      try {
        content = (await this.fs.readFile(fullPath, { encoding: 'utf8' })) as string
      } catch {
        return createErrorResult(`sed: ${filePath}: No such file or directory`)
      }
    }

    // Apply substitution
    const result = content.replace(cmd.pattern, cmd.replacement)

    // In-place edit
    if (options.inPlace && paths.length > 0) {
      const filePath = paths[0]
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)
      await this.fs.writeFile(fullPath, result)
      return createSuccessResult('')
    }

    return createSuccessResult(result)
  }
}
