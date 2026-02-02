/**
 * Error Collector - Aggregates runtime errors from preview iframe with debouncing
 *
 * Listens for 'wiggum-runtime-error' postMessage events from the Chobitsu-instrumented
 * preview iframe. Provides a stable API for quality gates to check for errors.
 */
import type { RuntimeError, ErrorCollector } from '../types/observability'

export interface ErrorCollectorConfig {
  timeout: number // Max time to wait for errors (ms)
  stableTime: number // Time with no errors = stable (ms)
  onError?: (error: RuntimeError) => void
}

/**
 * Default configuration for error collection
 */
export const DEFAULT_ERROR_COLLECTOR_CONFIG: ErrorCollectorConfig = {
  timeout: 3000, // 3s max wait
  stableTime: 1000, // 1s stable = done
}

/**
 * Collects runtime errors from preview iframe with debouncing.
 * Used by quality gates to check if code crashes.
 */
export function createErrorCollector(
  config: ErrorCollectorConfig = DEFAULT_ERROR_COLLECTOR_CONFIG
): ErrorCollector {
  const errors: RuntimeError[] = []
  let listening = false
  let stableTimeout: ReturnType<typeof setTimeout> | null = null
  let maxTimeout: ReturnType<typeof setTimeout> | null = null
  let currentOnError = config.onError

  function handleMessage(event: MessageEvent) {
    if (event.data?.type === 'wiggum-runtime-error') {
      const error = event.data.error as RuntimeError
      errors.push(error)
      currentOnError?.(error)

      // Reset stable timer on each error
      if (stableTimeout) {
        clearTimeout(stableTimeout)
        stableTimeout = null
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
      if (stableTimeout) clearTimeout(stableTimeout)
      if (maxTimeout) clearTimeout(maxTimeout)
      stableTimeout = null
      maxTimeout = null
    },

    waitForStable(): Promise<RuntimeError[]> {
      return new Promise((resolve) => {
        // Max timeout - resolve after this regardless
        maxTimeout = setTimeout(() => {
          if (stableTimeout) clearTimeout(stableTimeout)
          resolve([...errors])
        }, config.timeout)

        // Stable timeout - resolve if no errors for stableTime
        const checkStable = () => {
          stableTimeout = setTimeout(() => {
            if (maxTimeout) clearTimeout(maxTimeout)
            resolve([...errors])
          }, config.stableTime)
        }

        // Start stable check immediately
        checkStable()

        // Re-check on each error
        const originalOnError = currentOnError
        currentOnError = (error) => {
          originalOnError?.(error)
          if (stableTimeout) clearTimeout(stableTimeout)
          checkStable()
        }
      })
    },

    getErrors: () => [...errors],
    clear: () => {
      errors.length = 0
    },
  }
}

/**
 * Format runtime errors for display in feedback
 */
export function formatRuntimeErrors(errors: RuntimeError[]): string {
  if (errors.length === 0) return ''

  const formatted = errors
    .map((err) => {
      let msg = `Error: ${err.message}`
      if (err.filename && err.line) {
        msg += `\n  at ${err.filename}:${err.line}`
        if (err.column) msg += `:${err.column}`
      }
      if (err.stack) {
        msg += `\n${err.stack}`
      }
      return msg
    })
    .join('\n\n')

  return `Runtime errors detected in preview:\n\n${formatted}\n\nFix these errors before marking complete.`
}
