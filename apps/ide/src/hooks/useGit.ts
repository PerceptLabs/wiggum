import * as React from 'react'
import { Git } from '@/lib/git'
import { useFS } from '@/contexts'
import type { LightningFSAdapter } from '@/lib/fs'

/**
 * Hook for Git operations on a project
 */
export function useGit(projectPath: string | null) {
  const { fs, isReady } = useFS()
  const [git, setGit] = React.useState<Git | null>(null)
  const [isRepo, setIsRepo] = React.useState(false)

  // Create Git instance when project changes
  React.useEffect(() => {
    if (fs && isReady && projectPath) {
      const gitInstance = new Git({
        fs: fs as LightningFSAdapter,
        dir: projectPath,
      })

      // Check if it's a git repo
      gitInstance.isRepo().then(setIsRepo).catch(() => setIsRepo(false))

      setGit(gitInstance)
    } else {
      setGit(null)
      setIsRepo(false)
    }
  }, [fs, isReady, projectPath])

  const init = React.useCallback(async () => {
    if (git) {
      await git.init()
      setIsRepo(true)
    }
  }, [git])

  const add = React.useCallback(
    async (filepath: string) => {
      if (git) {
        await git.add(filepath)
      }
    },
    [git]
  )

  const addAll = React.useCallback(async () => {
    if (git) {
      await git.addAll()
    }
  }, [git])

  const commit = React.useCallback(
    async (message: string, author?: { name: string; email: string }) => {
      if (git) {
        return git.commit({
          message,
          author: author || { name: 'Wiggum User', email: 'user@wiggum.local' },
        })
      }
      return null
    },
    [git]
  )

  const status = React.useCallback(async () => {
    if (git) {
      return git.status()
    }
    return []
  }, [git])

  const log = React.useCallback(
    async (depth?: number) => {
      if (git) {
        return git.log({ depth })
      }
      return []
    },
    [git]
  )

  const currentBranch = React.useCallback(async () => {
    if (git) {
      return git.currentBranch()
    }
    return undefined
  }, [git])

  const listBranches = React.useCallback(async () => {
    if (git) {
      return git.listBranches()
    }
    return []
  }, [git])

  const checkout = React.useCallback(
    async (ref: string, create = false) => {
      if (git) {
        if (create) {
          await git.branch({ ref })
        }
        await git.checkout({ ref })
      }
    },
    [git]
  )

  const diff = React.useCallback(async () => {
    if (git) {
      return git.diff()
    }
    return []
  }, [git])

  return {
    git,
    isRepo,
    init,
    add,
    addAll,
    commit,
    status,
    log,
    currentBranch,
    listBranches,
    checkout,
    diff,
  }
}
