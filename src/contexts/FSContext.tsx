import * as React from 'react'
import { LightningFSAdapter } from '@/lib/fs'
import type { JSRuntimeFS } from '@/lib/fs'

interface FSContextValue {
  fs: JSRuntimeFS | null
  isReady: boolean
  error: string | null
}

const FSContext = React.createContext<FSContextValue | null>(null)

const FS_NAME = 'wiggum-fs'

export function FSProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<FSContextValue>({
    fs: null,
    isReady: false,
    error: null,
  })

  React.useEffect(() => {
    try {
      const fs = new LightningFSAdapter(FS_NAME)
      setState({ fs, isReady: true, error: null })
    } catch (err) {
      setState({ fs: null, isReady: false, error: (err as Error).message })
    }
  }, [])

  return <FSContext.Provider value={state}>{children}</FSContext.Provider>
}

export function useFS(): FSContextValue {
  const context = React.useContext(FSContext)
  if (!context) {
    throw new Error('useFS must be used within an FSProvider')
  }
  return context
}

export { FSContext }
