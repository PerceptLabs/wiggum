/**
 * LogTape Setup for Wiggum
 *
 * Structured logging with category-based filtering and fingersCrossed context buffering.
 * All logging is OFF by default until setupLogging() is called.
 */
import { configure, getConsoleSink, getLogger } from '@logtape/logtape'
import { createFingersCrossedSinkWithBuffer } from './sinks'
import type { LogEntry } from '../types/observability'

let configured = false
let logBuffer: { getBuffer: () => LogEntry[]; clearBuffer: () => void } | null = null

export interface LoggerConfig {
  enableFingersCrossed?: boolean
  bufferSize?: number
  onErrorFlush?: (logs: LogEntry[]) => void
}

/**
 * Initialize the logging system
 * Safe to call multiple times - only configures once
 */
export async function setupLogging(config: LoggerConfig = {}): Promise<void> {
  if (configured) return

  const sinks: Record<string, ReturnType<typeof getConsoleSink>> = {
    console: getConsoleSink(),
  }

  if (config.enableFingersCrossed) {
    const { sink, getBuffer, clearBuffer } = createFingersCrossedSinkWithBuffer({
      bufferSize: config.bufferSize ?? 50,
      triggerLevel: 'error',
      onFlush: config.onErrorFlush,
    })
    sinks.fingersCrossed = sink
    logBuffer = { getBuffer, clearBuffer }
  }

  await configure({
    sinks,
    loggers: [
      {
        category: ['wiggum', 'ralph'],
        lowestLevel: 'debug',
        sinks: config.enableFingersCrossed ? ['console', 'fingersCrossed'] : ['console'],
      },
      {
        category: ['wiggum', 'build'],
        lowestLevel: 'info',
        sinks: ['console'],
      },
      {
        category: ['wiggum', 'preview'],
        lowestLevel: 'debug',
        sinks: config.enableFingersCrossed ? ['console', 'fingersCrossed'] : ['console'],
      },
      {
        category: ['wiggum', 'shell'],
        lowestLevel: 'info',
        sinks: ['console'],
      },
    ],
  })

  configured = true
}

/**
 * Check if logging has been configured
 */
export function isLoggingConfigured(): boolean {
  return configured
}

/**
 * Get the log buffer (if fingersCrossed is enabled)
 */
export function getLogBuffer(): LogEntry[] {
  return logBuffer?.getBuffer() ?? []
}

/**
 * Clear the log buffer
 */
export function clearLogBuffer(): void {
  logBuffer?.clearBuffer()
}

// Re-export getLogger for convenience
export { getLogger }

// Convenience logger factories with typed categories
export const getRalphLogger = () => getLogger(['wiggum', 'ralph'])
export const getBuildLogger = () => getLogger(['wiggum', 'build'])
export const getPreviewLogger = () => getLogger(['wiggum', 'preview'])
export const getShellLogger = () => getLogger(['wiggum', 'shell'])
