/**
 * Console Collector - Aggregates console output from preview iframe
 *
 * Listens for 'wiggum-console-message' postMessage events from the preview iframe.
 * Provides a way for Ralph to access console output via `ralph console` command.
 */

import { addConsoleMessage, type ConsoleMessage } from './console-store'

// Re-export the type for convenience
export type { ConsoleMessage } from './console-store'

export interface ConsoleCollector {
  start: () => void
  stop: () => void
  getMessages: () => ConsoleMessage[]
  getMessagesByLevel: (level: ConsoleMessage['level']) => ConsoleMessage[]
  clear: () => void
}

export interface ConsoleCollectorConfig {
  maxMessages?: number // Max messages to keep in buffer (default 500)
  onMessage?: (message: ConsoleMessage) => void
}

export const DEFAULT_CONSOLE_COLLECTOR_CONFIG: ConsoleCollectorConfig = {
  maxMessages: 500,
}

/**
 * Creates a console collector that listens for console messages from the preview iframe
 */
export function createConsoleCollector(
  config: ConsoleCollectorConfig = DEFAULT_CONSOLE_COLLECTOR_CONFIG
): ConsoleCollector {
  const messages: ConsoleMessage[] = []
  const maxMessages = config.maxMessages ?? 500
  let listening = false

  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'wiggum-console-message') {
      const msg: ConsoleMessage = {
        level: event.data.level || 'log',
        message: event.data.message || '',
        timestamp: event.data.timestamp || Date.now(),
      }

      messages.push(msg)

      // Keep buffer under max size
      while (messages.length > maxMessages) {
        messages.shift()
      }

      // Also add to global store for `ralph console` command
      addConsoleMessage(msg)

      config.onMessage?.(msg)
    }
  }

  return {
    start() {
      if (listening) return
      window.addEventListener('message', handleMessage)
      listening = true
    },

    stop() {
      window.removeEventListener('message', handleMessage)
      listening = false
    },

    getMessages: () => [...messages],

    getMessagesByLevel: (level: ConsoleMessage['level']) =>
      messages.filter((m) => m.level === level),

    clear: () => {
      messages.length = 0
    },
  }
}

/**
 * Format console messages for display in shell output
 */
export function formatConsoleMessages(
  messages: ConsoleMessage[],
  options?: { limit?: number; includeTimestamp?: boolean }
): string {
  if (messages.length === 0) {
    return '(no console output)'
  }

  const limit = options?.limit ?? messages.length
  const includeTimestamp = options?.includeTimestamp ?? true

  const displayMessages = messages.slice(-limit)

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

      const timestamp = includeTimestamp
        ? `[${new Date(msg.timestamp).toLocaleTimeString()}] `
        : ''

      return `${timestamp}${levelIcon} ${msg.message}`
    })
    .join('\n')
}
