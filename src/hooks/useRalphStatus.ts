import * as React from 'react'
import { useSession } from '@/contexts'

export type RalphStatus = 'idle' | 'running' | 'waiting' | 'complete' | 'error'

export interface RalphState {
  status: RalphStatus
  iteration: number
  maxIterations: number
  currentTask?: string
  error?: string
}

/**
 * Hook for tracking ralph autonomous loop status
 */
export function useRalphStatus() {
  const { session } = useSession()
  const [state, setState] = React.useState<RalphState>({
    status: 'idle',
    iteration: 0,
    maxIterations: 0,
  })

  React.useEffect(() => {
    if (!session) return

    const handleRalphStart = (data: { maxIterations: number; task: string }) => {
      setState({
        status: 'running',
        iteration: 0,
        maxIterations: data.maxIterations,
        currentTask: data.task,
      })
    }

    const handleRalphIteration = (data: { iteration: number; task?: string }) => {
      setState((prev) => ({
        ...prev,
        status: 'running',
        iteration: data.iteration,
        currentTask: data.task || prev.currentTask,
      }))
    }

    const handleRalphWaiting = (data: { reason: string }) => {
      setState((prev) => ({
        ...prev,
        status: 'waiting',
        currentTask: data.reason,
      }))
    }

    const handleRalphComplete = () => {
      setState((prev) => ({
        ...prev,
        status: 'complete',
      }))
    }

    const handleRalphError = (data: { error: string }) => {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: data.error,
      }))
    }

    const handleRalphStop = () => {
      setState((prev) => ({
        ...prev,
        status: 'idle',
      }))
    }

    session.on('ralph_start', handleRalphStart)
    session.on('ralph_iteration', handleRalphIteration)
    session.on('ralph_waiting', handleRalphWaiting)
    session.on('ralph_complete', handleRalphComplete)
    session.on('ralph_error', handleRalphError)
    session.on('ralph_stop', handleRalphStop)

    return () => {
      session.off('ralph_start', handleRalphStart)
      session.off('ralph_iteration', handleRalphIteration)
      session.off('ralph_waiting', handleRalphWaiting)
      session.off('ralph_complete', handleRalphComplete)
      session.off('ralph_error', handleRalphError)
      session.off('ralph_stop', handleRalphStop)
    }
  }, [session])

  // Start ralph loop
  const startRalph = React.useCallback(
    async (task: string, maxIterations = 10) => {
      if (!session) return

      setState({
        status: 'running',
        iteration: 0,
        maxIterations,
        currentTask: task,
      })

      try {
        await session.ralph(task, { maxIterations })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Ralph failed',
        }))
      }
    },
    [session]
  )

  // Stop ralph loop
  const stopRalph = React.useCallback(() => {
    session?.stopRalph()
    setState((prev) => ({
      ...prev,
      status: 'idle',
    }))
  }, [session])

  // Reset state
  const reset = React.useCallback(() => {
    setState({
      status: 'idle',
      iteration: 0,
      maxIterations: 0,
    })
  }, [])

  return {
    ...state,
    isRunning: state.status === 'running' || state.status === 'waiting',
    progress: state.maxIterations > 0 ? state.iteration / state.maxIterations : 0,
    startRalph,
    stopRalph,
    reset,
  }
}
