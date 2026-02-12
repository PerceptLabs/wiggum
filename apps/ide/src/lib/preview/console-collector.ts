/**
 * Console Collector - Aggregates console output from preview iframe
 *
 * Listens for postMessage events from the preview iframe:
 * - wiggum-console-message: errors and warnings (Tier 1 + 2)
 * - wiggum-console-context: log breadcrumbs flushed on error (Tier 3)
 * - wiggum-console-warn-counts: dedup warning counts (Tier 2 aggregation)
 */

import { addConsoleMessage, type ConsoleMessage } from './console-store'

// Re-export the type for convenience
export type { ConsoleMessage } from './console-store'

export interface FormattedConsoleOutput {
  errors: Array<{ message: string; source?: string }>
  warnings: Array<{ message: string; count: number }>
  context: Array<{ level: string; message: string }> // breadcrumbs
  hasContent: boolean
}

export interface ConsoleCollector {
  start: () => void
  stop: () => void
  getMessages: () => ConsoleMessage[]
  getMessagesByLevel: (level: ConsoleMessage['level']) => ConsoleMessage[]
  getFormattedOutput: () => FormattedConsoleOutput
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

  // Tier 2: dedup warning counts from bridge aggregation
  const warnCounts: Map<string, number> = new Map()

  // Tier 3: breadcrumb context (log/info/debug flushed on error)
  let contextEntries: Array<{ level: string; message: string }> = []

  function handleMessage(event: MessageEvent) {
    const data = event.data
    if (!data?.type) return

    // Tier 1 + 2: console messages (errors and warnings)
    if (data.type === 'wiggum-console-message') {
      const msg: ConsoleMessage = {
        level: data.level || 'log',
        message: data.message || '',
        timestamp: data.timestamp || Date.now(),
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

    // Tier 3: breadcrumb context flushed on error
    if (data.type === 'wiggum-console-context') {
      const entries = data.entries
      if (Array.isArray(entries)) {
        contextEntries = entries.map((e: { level?: string; message?: string }) => ({
          level: e.level || 'log',
          message: e.message || '',
        }))
      }
    }

    // Tier 2 aggregation: warning dedup counts
    if (data.type === 'wiggum-console-warn-counts') {
      const counts = data.counts
      if (counts && typeof counts === 'object') {
        for (const [key, count] of Object.entries(counts)) {
          warnCounts.set(key, count as number)
        }
      }
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

    getFormattedOutput(): FormattedConsoleOutput {
      const errors: FormattedConsoleOutput['errors'] = []
      const warningMap = new Map<string, { message: string; count: number }>()

      for (const msg of messages) {
        if (msg.level === 'error') {
          errors.push({ message: msg.message })
        } else if (msg.level === 'warn') {
          const dedupKey = msg.message.slice(0, 100)
          const existing = warningMap.get(dedupKey)
          const count = warnCounts.get(dedupKey) || 1
          if (!existing) {
            warningMap.set(dedupKey, { message: msg.message, count })
          } else {
            existing.count = Math.max(existing.count, count)
          }
        }
      }

      const warnings = Array.from(warningMap.values())
      const context = [...contextEntries]

      return {
        errors,
        warnings,
        context,
        hasContent: errors.length > 0 || warnings.length > 0 || context.length > 0,
      }
    },

    clear: () => {
      messages.length = 0
      warnCounts.clear()
      contextEntries = []
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
