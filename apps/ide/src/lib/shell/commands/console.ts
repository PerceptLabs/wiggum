import type { ShellCommand, ShellOptions, ShellResult } from '../types'
import {
  getConsoleMessages,
  getConsoleMessagesByLevel,
  formatConsoleMessages,
  clearConsoleMessages,
  type ConsoleMessage,
} from '../../preview/console-store'

/**
 * console - View console output from the preview iframe
 *
 * Usage:
 *   console              - Show all console messages
 *   console error        - Show only error messages
 *   console warn         - Show only warnings
 *   console log          - Show only log messages
 *   console --limit 10   - Show last 10 messages
 *   console clear        - Clear console history
 */
export class ConsoleCommand implements ShellCommand {
  name = 'console'
  description = `View console output from preview. Usage:
  console              - all messages
  console error        - errors only
  console warn         - warnings only
  console --limit 10   - last N messages
  console clear        - clear history`

  async execute(args: string[], _options: ShellOptions): Promise<ShellResult> {
    // Parse args
    let filterLevel: ConsoleMessage['level'] | undefined
    let limit: number | undefined
    let shouldClear = false

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]

      if (arg === 'clear') {
        shouldClear = true
      } else if (arg === 'error' || arg === 'errors') {
        filterLevel = 'error'
      } else if (arg === 'warn' || arg === 'warning' || arg === 'warnings') {
        filterLevel = 'warn'
      } else if (arg === 'log' || arg === 'logs') {
        filterLevel = 'log'
      } else if (arg === 'info') {
        filterLevel = 'info'
      } else if (arg === 'debug') {
        filterLevel = 'debug'
      } else if (arg === '--limit' || arg === '-n') {
        const nextArg = args[i + 1]
        if (nextArg && !isNaN(parseInt(nextArg, 10))) {
          limit = parseInt(nextArg, 10)
          i++ // Skip next arg
        }
      } else if (arg.startsWith('--limit=')) {
        const value = arg.split('=')[1]
        if (value && !isNaN(parseInt(value, 10))) {
          limit = parseInt(value, 10)
        }
      }
    }

    // Handle clear command
    if (shouldClear) {
      clearConsoleMessages()
      return { exitCode: 0, stdout: 'Console cleared\n', stderr: '' }
    }

    // Get messages
    const messages = filterLevel
      ? getConsoleMessagesByLevel(filterLevel)
      : getConsoleMessages()

    if (messages.length === 0) {
      const filterMsg = filterLevel ? ` (filter: ${filterLevel})` : ''
      return {
        exitCode: 0,
        stdout: `(no console output${filterMsg})\n`,
        stderr: '',
      }
    }

    // Format output
    const output = formatConsoleMessages(messages, {
      limit,
      showTimestamp: true,
    })

    // Add summary
    const total = messages.length
    const shown = limit ? Math.min(limit, total) : total
    const summary = limit && total > limit ? `\n\n--- Showing ${shown} of ${total} messages ---` : ''

    return {
      exitCode: 0,
      stdout: output + summary + '\n',
      stderr: '',
    }
  }
}
