/**
 * Console Store - Global storage for console messages from preview iframe
 *
 * This module provides a global store for console messages that can be:
 * - Written to by the console collector (when preview runs)
 * - Read from by the `ralph console` shell command
 */

export interface ConsoleMessage {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
}

// Global console message store
let messages: ConsoleMessage[] = []
const MAX_MESSAGES = 500

/**
 * Add a message to the console store
 */
export function addConsoleMessage(message: ConsoleMessage): void {
  messages.push(message)
  // Keep buffer under max size
  while (messages.length > MAX_MESSAGES) {
    messages.shift()
  }
}

/**
 * Get all console messages
 */
export function getConsoleMessages(): ConsoleMessage[] {
  return [...messages]
}

/**
 * Get console messages filtered by level
 */
export function getConsoleMessagesByLevel(
  level: ConsoleMessage['level'] | ConsoleMessage['level'][]
): ConsoleMessage[] {
  const levels = Array.isArray(level) ? level : [level]
  return messages.filter((m) => levels.includes(m.level))
}

/**
 * Clear all console messages
 */
export function clearConsoleMessages(): void {
  messages = []
}

/**
 * Format console messages for display
 */
export function formatConsoleMessages(
  msgs: ConsoleMessage[],
  options?: { limit?: number; showTimestamp?: boolean }
): string {
  if (msgs.length === 0) {
    return '(no console output)'
  }

  const limit = options?.limit ?? msgs.length
  const showTimestamp = options?.showTimestamp ?? true

  const displayMessages = msgs.slice(-limit)

  return displayMessages
    .map((msg) => {
      const levelIcon =
        {
          error: '❌',
          warn: '⚠️',
          info: 'ℹ️',
          log: '📝',
          debug: '🔍',
        }[msg.level] || '📝'

      const timestamp = showTimestamp
        ? `[${new Date(msg.timestamp).toLocaleTimeString()}] `
        : ''

      return `${timestamp}${levelIcon} ${msg.message}`
    })
    .join('\n')
}
