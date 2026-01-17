import type { ShellCommand, ShellCommandResult } from './ShellCommand'
import { createSuccessResult, createErrorResult } from './ShellCommand'

interface TrOptions {
  delete: boolean
  squeeze: boolean
}

function parseOptions(args: string[]): { options: TrOptions; sets: string[] } {
  const options: TrOptions = { delete: false, squeeze: false }
  const sets: string[] = []

  for (const arg of args) {
    if (arg === '-d') {
      options.delete = true
    } else if (arg === '-s') {
      options.squeeze = true
    } else if (!arg.startsWith('-')) {
      sets.push(arg)
    }
  }

  return { options, sets }
}

function expandSet(set: string): string {
  let result = ''
  let i = 0

  while (i < set.length) {
    if (i + 2 < set.length && set[i + 1] === '-') {
      // Range like a-z
      const start = set.charCodeAt(i)
      const end = set.charCodeAt(i + 2)
      for (let c = start; c <= end; c++) {
        result += String.fromCharCode(c)
      }
      i += 3
    } else if (set[i] === '\\' && i + 1 < set.length) {
      // Escape sequence
      const next = set[i + 1]
      switch (next) {
        case 'n':
          result += '\n'
          break
        case 't':
          result += '\t'
          break
        case 'r':
          result += '\r'
          break
        case '\\':
          result += '\\'
          break
        default:
          result += next
      }
      i += 2
    } else {
      result += set[i]
      i++
    }
  }

  return result
}

/**
 * tr - translate or delete characters
 */
export class TrCommand implements ShellCommand {
  name = 'tr'
  description = 'Translate or delete characters'
  usage = 'tr [-ds] SET1 [SET2]'

  async execute(args: string[], _cwd: string, input?: string): Promise<ShellCommandResult> {
    const { options, sets } = parseOptions(args)

    if (sets.length === 0) {
      return createErrorResult('tr: missing operand')
    }

    if (input === undefined) {
      return createErrorResult('tr: requires input from pipe')
    }

    const set1 = expandSet(sets[0])
    const set2 = sets.length > 1 ? expandSet(sets[1]) : ''

    let result = input

    if (options.delete) {
      // Delete characters in set1
      const deleteChars = new Set(set1.split(''))
      result = result
        .split('')
        .filter((c) => !deleteChars.has(c))
        .join('')
    } else if (set2) {
      // Translate characters
      const map = new Map<string, string>()
      for (let i = 0; i < set1.length; i++) {
        const replacement = i < set2.length ? set2[i] : set2[set2.length - 1]
        map.set(set1[i], replacement)
      }
      result = result
        .split('')
        .map((c) => map.get(c) ?? c)
        .join('')
    }

    if (options.squeeze && set2) {
      // Squeeze repeated characters in set2
      const squeezeChars = new Set(set2.split(''))
      let squeezed = ''
      let prevChar = ''
      for (const c of result) {
        if (c === prevChar && squeezeChars.has(c)) {
          continue
        }
        squeezed += c
        prevChar = c
      }
      result = squeezed
    }

    return createSuccessResult(result)
  }
}
