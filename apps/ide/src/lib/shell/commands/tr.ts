import type { ShellCommand, ShellOptions, ShellResult } from '../types'

/**
 * tr - Translate or delete characters
 * Usage: tr [-d] [-s] SET1 [SET2]
 * Reads from stdin only
 */
export class TrCommand implements ShellCommand {
  name = 'tr'
  description = 'Translate or delete characters'

  async execute(args: string[], options: ShellOptions): Promise<ShellResult> {
    const { stdin } = options

    if (stdin === undefined) {
      return { exitCode: 1, stdout: '', stderr: 'tr: no input (reads from stdin only)' }
    }

    let deleteMode = false
    let squeezeMode = false
    const positional: string[] = []

    for (const arg of args) {
      if (arg === '-d') deleteMode = true
      else if (arg === '-s') squeezeMode = true
      else if (arg === '-ds' || arg === '-sd') {
        deleteMode = true
        squeezeMode = true
      } else positional.push(arg)
    }

    if (positional.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'tr: missing operand' }
    }

    const set1 = expandSet(positional[0])
    const set2 = positional[1] ? expandSet(positional[1]) : ''

    let result = stdin

    if (deleteMode) {
      // Delete characters in set1
      const deleteChars = new Set(set1.split(''))
      result = result.split('').filter((c) => !deleteChars.has(c)).join('')
    } else if (set2) {
      // Translate set1 -> set2
      result = translate(result, set1, set2)
    }

    if (squeezeMode) {
      // Squeeze repeated characters in set2 (or set1 if no set2)
      const squeezeSet = set2 || set1
      result = squeeze(result, squeezeSet)
    }

    return { exitCode: 0, stdout: result, stderr: '' }
  }
}

/**
 * Expand POSIX character classes and ranges
 */
function expandSet(set: string): string {
  let result = set

  // POSIX classes
  result = result.replace(/\[:upper:]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  result = result.replace(/\[:lower:]/g, 'abcdefghijklmnopqrstuvwxyz')
  result = result.replace(/\[:digit:]/g, '0123456789')
  result = result.replace(/\[:alpha:]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')
  result = result.replace(/\[:alnum:]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')
  result = result.replace(/\[:space:]/g, ' \t\n\r\f\v')

  // Character ranges like a-z
  result = result.replace(/(.)-(.)/g, (_match, start: string, end: string) => {
    const s = start.charCodeAt(0)
    const e = end.charCodeAt(0)
    if (s > e) return start + '-' + end
    let chars = ''
    for (let i = s; i <= e; i++) chars += String.fromCharCode(i)
    return chars
  })

  return result
}

function translate(input: string, from: string, to: string): string {
  const map = new Map<string, string>()
  for (let i = 0; i < from.length; i++) {
    // If to is shorter, use last char of to for remaining
    map.set(from[i], to[Math.min(i, to.length - 1)])
  }
  return input.split('').map((c) => map.get(c) ?? c).join('')
}

function squeeze(input: string, chars: string): string {
  const squeezeSet = new Set(chars.split(''))
  let result = ''
  let lastChar = ''
  for (const c of input) {
    if (squeezeSet.has(c) && c === lastChar) continue
    result += c
    lastChar = c
  }
  return result
}
