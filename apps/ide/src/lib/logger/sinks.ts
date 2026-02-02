/**
 * Custom LogTape Sinks
 *
 * fingersCrossed: Buffers logs until an error triggers, then flushes all context.
 * Perfect for giving Ralph rich context when something goes wrong.
 */
import type { LogRecord, Sink } from '@logtape/logtape'
import type { LogEntry } from '../types/observability'

export interface FingersCrossedConfig {
  bufferSize: number
  triggerLevel: 'error' | 'warning'
  onFlush?: (logs: LogEntry[]) => void
}

/**
 * Convert LogRecord to our LogEntry format
 */
function toLogEntry(record: LogRecord): LogEntry {
  return {
    level: record.level,
    category: [...record.category], // Copy to mutable array
    message:
      typeof record.message === 'string'
        ? record.message
        : record.message.map((m) => String(m)).join(' '),
    properties: record.properties,
    timestamp: Date.now(),
  }
}

/**
 * Buffers logs until an error triggers, then flushes all buffered context.
 * Perfect for giving Ralph rich context when something goes wrong.
 */
export function createFingersCrossedSink(config: FingersCrossedConfig): Sink {
  const buffer: LogEntry[] = []

  return (record: LogRecord) => {
    const entry = toLogEntry(record)

    // Add to buffer (circular)
    buffer.push(entry)
    if (buffer.length > config.bufferSize) {
      buffer.shift()
    }

    // Check if this triggers a flush
    const shouldFlush =
      (config.triggerLevel === 'error' && record.level === 'error') ||
      (config.triggerLevel === 'warning' && ['error', 'warning'].includes(record.level))

    if (shouldFlush && config.onFlush) {
      // Flush a copy of the buffer
      config.onFlush([...buffer])
      // Note: We don't clear buffer - allows continuous context
    }
  }
}

/**
 * Get a reference to the buffer for manual access
 * Returns a factory function that creates a sink and provides buffer access
 */
export function createFingersCrossedSinkWithBuffer(config: FingersCrossedConfig): {
  sink: Sink
  getBuffer: () => LogEntry[]
  clearBuffer: () => void
} {
  const buffer: LogEntry[] = []

  const sink: Sink = (record: LogRecord) => {
    const entry = toLogEntry(record)

    // Add to buffer (circular)
    buffer.push(entry)
    if (buffer.length > config.bufferSize) {
      buffer.shift()
    }

    // Check if this triggers a flush
    const shouldFlush =
      (config.triggerLevel === 'error' && record.level === 'error') ||
      (config.triggerLevel === 'warning' && ['error', 'warning'].includes(record.level))

    if (shouldFlush && config.onFlush) {
      config.onFlush([...buffer])
    }
  }

  return {
    sink,
    getBuffer: () => [...buffer],
    clearBuffer: () => {
      buffer.length = 0
    },
  }
}

/**
 * Formats buffered logs for Ralph's context
 */
export function formatLogsForRalph(logs: LogEntry[]): string {
  return logs
    .map((log) => {
      const props =
        Object.keys(log.properties).length > 0 ? ` ${JSON.stringify(log.properties)}` : ''
      return `[${log.level.toUpperCase()}] ${log.category.join('.')}: ${log.message}${props}`
    })
    .join('\n')
}
