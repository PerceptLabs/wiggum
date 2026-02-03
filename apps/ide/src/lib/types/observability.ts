/**
 * Observability Types - Shared types for Ralph's feedback system
 *
 * Used across: ralph/, preview/, logger/
 */

/**
 * Records when Ralph tries a command that doesn't exist
 */
export interface GapRecord {
  command: string
  args: string[]
  error: string
  context: string // Task description (from .ralph/task.md)
  reasoning?: string // Why LLM tried this (if available)
  taskId: string
  timestamp: number
}

/**
 * Aggregated gap statistics for reporting
 */
export interface GapAggregate {
  command: string
  count: number
  contexts: string[]
  reasoning: string[]
  lastSeen: number
}

/**
 * Tracks a single command attempt during a Ralph task
 */
export interface CommandAttempt {
  command: string
  args: string[]
  success: boolean
  error?: string
  timestamp: number
}

/**
 * Runtime error captured by Chobitsu from preview iframe
 */
export interface RuntimeError {
  message: string
  stack?: string
  filename?: string
  line?: number
  column?: number
  timestamp: number
}

/**
 * Captured DOM structure from preview
 */
export interface DOMStructure {
  tag: string
  id?: string
  classes?: string[]
  text?: string
  href?: string
  children?: DOMStructure[]
}

/**
 * Structure collector interface
 */
export interface StructureCollector {
  start: () => void
  stop: () => void
  waitForStructure: () => Promise<DOMStructure | null>
  getStructure: () => DOMStructure | null
  clear: () => void
}

/**
 * Post-task reflection from the LLM about harness experience
 */
export interface HarnessReflection {
  taskId: string
  timestamp: number

  difficulty: {
    overall: number // 1-5
    findingCommands: number
    fileOperations: number
    debugging: number
  }

  friction: Array<{
    command: string
    expected: string
    actual: string
    suggestion: string
  }>

  wishedFor: string[]
  confusingParts: string[]
  workarounds: string[]

  runtimeErrors: RuntimeError[]

  wouldRecommend: boolean
  oneSentenceSummary: string
  freeformComments?: string
}

/**
 * Log entry for fingersCrossed sink buffer
 */
export interface LogEntry {
  level: string
  category: string[]
  message: string
  properties: Record<string, unknown>
  timestamp: number
}

/**
 * Configuration for observability system - all features OFF by default
 */
export interface ObservabilityConfig {
  // Gap tracking
  trackGaps?: boolean // default: false

  // Reflection
  captureReflection?: boolean // default: false
  minIterationsForReflection?: number // default: 2

  // Runtime errors
  captureRuntimeErrors?: boolean // default: false
  runtimeErrorTimeout?: number // default: 3000ms
  runtimeErrorStableTime?: number // default: 1000ms

  // Logging
  enableStructuredLogging?: boolean // default: false
  logBufferSize?: number // default: 50
}

/**
 * Error collector interface used by quality gates
 */
export interface ErrorCollector {
  start: () => void
  stop: () => void
  waitForStable: () => Promise<RuntimeError[]>
  getErrors: () => RuntimeError[]
  clear: () => void
}

/**
 * Context passed to quality gates
 */
export interface GateContext {
  errorCollector?: ErrorCollector
  structureCollector?: StructureCollector
  logBuffer?: LogEntry[]
}
