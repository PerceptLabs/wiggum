/**
 * Git operation types for Wiggum
 */

export interface GitConfig {
  fs: unknown // JSRuntimeFS - using unknown to avoid circular imports
  dir: string
  corsProxy?: string
}

export interface GitAuthor {
  name: string
  email: string
  timestamp?: number
  timezoneOffset?: number
}

export interface CloneOptions {
  url: string
  ref?: string
  singleBranch?: boolean
  depth?: number
  onProgress?: (progress: GitProgress) => void
  onAuth?: () => GitAuth | Promise<GitAuth>
  onAuthFailure?: () => GitAuth | Promise<GitAuth>
}

export interface GitAuth {
  username?: string
  password?: string
  token?: string
  oauth2format?: 'github' | 'gitlab' | 'bitbucket'
}

export interface GitProgress {
  phase: string
  loaded: number
  total: number
}

export interface CommitOptions {
  message: string
  author?: GitAuthor
  committer?: GitAuthor
}

export interface AddOptions {
  filepath: string
  force?: boolean
}

export interface StatusResult {
  filepath: string
  head: number // 0 = absent, 1 = present
  workdir: number // 0 = absent, 1 = identical, 2 = modified
  stage: number // 0 = absent, 1 = identical, 2 = modified, 3 = added
}

export interface LogOptions {
  ref?: string
  depth?: number
  since?: Date
}

export interface LogEntry {
  oid: string
  commit: {
    message: string
    author: GitAuthor
    committer: GitAuthor
    parent: string[]
    tree: string
  }
  payload: string
}

export interface BranchOptions {
  ref: string
  checkout?: boolean
  force?: boolean
}

export interface CheckoutOptions {
  ref: string
  force?: boolean
  filepaths?: string[]
  onProgress?: (progress: GitProgress) => void
}

export interface PushOptions {
  remote?: string
  ref?: string
  force?: boolean
  onProgress?: (progress: GitProgress) => void
  onAuth?: () => GitAuth | Promise<GitAuth>
  onAuthFailure?: () => GitAuth | Promise<GitAuth>
}

export interface PullOptions {
  remote?: string
  ref?: string
  singleBranch?: boolean
  author?: GitAuthor
  onProgress?: (progress: GitProgress) => void
  onAuth?: () => GitAuth | Promise<GitAuth>
  onAuthFailure?: () => GitAuth | Promise<GitAuth>
}

export interface FetchOptions {
  remote?: string
  ref?: string
  singleBranch?: boolean
  depth?: number
  onProgress?: (progress: GitProgress) => void
  onAuth?: () => GitAuth | Promise<GitAuth>
  onAuthFailure?: () => GitAuth | Promise<GitAuth>
}

export interface RemoteInfo {
  remote: string
  url: string
}

export interface DiffOptions {
  ref1?: string
  ref2?: string
  filepath?: string
}

export interface DiffEntry {
  filepath: string
  type: 'add' | 'remove' | 'modify' | 'equal'
}

export interface StashOptions {
  message?: string
}

export interface StashEntry {
  index: number
  message: string
  oid: string
}
