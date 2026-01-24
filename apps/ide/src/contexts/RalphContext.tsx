import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { runRalphLoop, type RalphCallbacks, type RalphResult } from '../lib/ralph'
import type { LLMProvider } from '../lib/llm'
import type { ShellExecutor } from '../lib/shell'
import type { JSRuntimeFS } from '../lib/fs'
import type { Git } from '../lib/git'

interface RalphState {
  isRunning: boolean
  currentIteration: number
  status: 'idle' | 'running' | 'complete' | 'waiting' | 'error'
  lastCommand: string | null
  lastResult: string | null
  error: string | null
}

interface RalphContextValue {
  state: RalphState
  startRalph: (task: string) => Promise<RalphResult>
  stopRalph: () => void
}

const RalphContext = createContext<RalphContextValue | null>(null)

interface RalphProviderProps {
  children: React.ReactNode
  provider: LLMProvider
  fs: JSRuntimeFS
  shell: ShellExecutor
  git: Git
  cwd: string
}

const initialState: RalphState = {
  isRunning: false,
  currentIteration: 0,
  status: 'idle',
  lastCommand: null,
  lastResult: null,
  error: null,
}

export function RalphProvider({ children, provider, fs, shell, git, cwd }: RalphProviderProps) {
  const [state, setState] = useState<RalphState>(initialState)
  const abortRef = useRef<boolean>(false)
  const runningRef = useRef<boolean>(false)

  const stopRalph = useCallback(() => {
    abortRef.current = true
    setState(prev => ({
      ...prev,
      isRunning: false,
      status: 'idle',
    }))
  }, [])

  const startRalph = useCallback(async (task: string): Promise<RalphResult> => {
    // Prevent multiple concurrent runs
    if (runningRef.current) {
      return {
        success: false,
        iterations: 0,
        finalMessage: 'Ralph is already running',
      }
    }

    // Reset state for new run
    abortRef.current = false
    runningRef.current = true
    setState({
      isRunning: true,
      currentIteration: 0,
      status: 'running',
      lastCommand: null,
      lastResult: null,
      error: null,
    })

    const callbacks: RalphCallbacks = {
      onIteration: (iteration: number) => {
        if (abortRef.current) return
        setState(prev => ({
          ...prev,
          currentIteration: iteration,
          status: 'running',
        }))
      },
      onToolCall: (tool: string, args: Record<string, unknown>) => {
        if (abortRef.current) return
        const commandStr = `${tool}: ${JSON.stringify(args)}`
        setState(prev => ({
          ...prev,
          lastCommand: commandStr,
          status: 'running',
        }))
      },
      onToolResult: (tool: string, result: string) => {
        if (abortRef.current) return
        setState(prev => ({
          ...prev,
          lastResult: result,
        }))
      },
      onWaiting: () => {
        if (abortRef.current) return
        setState(prev => ({
          ...prev,
          status: 'waiting',
        }))
      },
      shouldAbort: () => abortRef.current,
    }

    try {
      const result = await runRalphLoop({
        task,
        provider,
        fs,
        shell,
        git,
        cwd,
        callbacks,
      })

      setState(prev => ({
        ...prev,
        isRunning: false,
        status: result.success ? 'complete' : 'error',
        error: result.success ? null : result.finalMessage,
      }))

      runningRef.current = false
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        isRunning: false,
        status: 'error',
        error: errorMessage,
      }))

      runningRef.current = false
      return {
        success: false,
        iterations: state.currentIteration,
        finalMessage: errorMessage,
      }
    }
  }, [provider, fs, shell, git, cwd])

  const value: RalphContextValue = {
    state,
    startRalph,
    stopRalph,
  }

  return (
    <RalphContext.Provider value={value}>
      {children}
    </RalphContext.Provider>
  )
}

export function useRalph() {
  const context = useContext(RalphContext)
  if (!context) {
    throw new Error('useRalph must be used within RalphProvider')
  }
  return context
}
