import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import type { LightningFSAdapter } from '../fs/LightningFSAdapter'
import type {
  CloneOptions,
  CommitOptions,
  AddOptions,
  StatusResult,
  LogOptions,
  LogEntry,
  BranchOptions,
  CheckoutOptions,
  PushOptions,
  PullOptions,
  FetchOptions,
  RemoteInfo,
  DiffOptions,
  DiffEntry,
  GitAuthor,
} from './types'

interface GitConstructorConfig {
  fs: LightningFSAdapter
  dir: string
  corsProxy?: string
}

/**
 * Git wrapper for browser-based git operations using isomorphic-git
 */
export class Git {
  private fs: LightningFSAdapter
  private rawFs: LightningFSAdapter['rawFs']
  private dir: string
  private corsProxy?: string

  constructor(config: GitConstructorConfig) {
    this.fs = config.fs
    this.rawFs = config.fs.rawFs
    this.dir = config.dir
    this.corsProxy = config.corsProxy
  }

  /**
   * Initialize a new git repository
   */
  async init(defaultBranch = 'main'): Promise<void> {
    await git.init({
      fs: this.rawFs,
      dir: this.dir,
      defaultBranch,
    })
  }

  /**
   * Clone a repository
   */
  async clone(options: CloneOptions): Promise<void> {
    await git.clone({
      fs: this.rawFs,
      http,
      dir: this.dir,
      url: options.url,
      ref: options.ref,
      singleBranch: options.singleBranch,
      depth: options.depth,
      corsProxy: this.corsProxy,
      onProgress: options.onProgress,
      onAuth: options.onAuth,
      onAuthFailure: options.onAuthFailure,
    })
  }

  /**
   * Add file(s) to the staging area
   */
  async add(options: AddOptions | string): Promise<void> {
    const filepath = typeof options === 'string' ? options : options.filepath
    const force = typeof options === 'string' ? false : options.force

    await git.add({
      fs: this.rawFs,
      dir: this.dir,
      filepath,
      force,
    })
  }

  /**
   * Add all files to staging area
   */
  async addAll(): Promise<void> {
    const statusMatrix = await this.statusMatrix()
    for (const [filepath, head, workdir, stage] of statusMatrix) {
      if (!filepath) continue  // Guard against undefined paths from LightningFS
      // Add modified, new, or deleted files
      if (workdir !== stage || head !== stage) {
        if (workdir === 0) {
          // File was deleted
          await git.remove({
            fs: this.rawFs,
            dir: this.dir,
            filepath,
          })
        } else {
          await this.add(filepath)
        }
      }
    }
  }

  /**
   * Create a commit
   */
  async commit(options: CommitOptions): Promise<string> {
    return git.commit({
      fs: this.rawFs,
      dir: this.dir,
      message: options.message,
      author: options.author,
      committer: options.committer,
    })
  }

  /**
   * Get the status of files in the working directory
   */
  async status(filepath?: string): Promise<StatusResult | StatusResult[]> {
    if (filepath) {
      const status = await git.status({
        fs: this.rawFs,
        dir: this.dir,
        filepath,
      })
      return {
        filepath,
        head: status === 'absent' ? 0 : 1,
        workdir: status === 'absent' || status === 'deleted' ? 0 : status === 'unmodified' ? 1 : 2,
        stage: status === 'absent' ? 0 : status === '*added' ? 3 : status === 'unmodified' ? 1 : 2,
      }
    }

    const matrix = await this.statusMatrix()
    return matrix.map(([fp, head, workdir, stage]) => ({
      filepath: fp,
      head,
      workdir,
      stage,
    }))
  }

  /**
   * Get raw status matrix from isomorphic-git
   */
  async statusMatrix(): Promise<[string, number, number, number][]> {
    return git.statusMatrix({
      fs: this.rawFs,
      dir: this.dir,
    }) as Promise<[string, number, number, number][]>
  }

  /**
   * Get commit log
   */
  async log(options?: LogOptions): Promise<LogEntry[]> {
    const commits = await git.log({
      fs: this.rawFs,
      dir: this.dir,
      ref: options?.ref,
      depth: options?.depth,
      since: options?.since,
    })

    return commits.map((entry) => ({
      oid: entry.oid,
      commit: {
        message: entry.commit.message,
        author: entry.commit.author as GitAuthor,
        committer: entry.commit.committer as GitAuthor,
        parent: entry.commit.parent,
        tree: entry.commit.tree,
      },
      payload: entry.payload,
    }))
  }

  /**
   * Create a new branch
   */
  async branch(options: BranchOptions): Promise<void> {
    await git.branch({
      fs: this.rawFs,
      dir: this.dir,
      ref: options.ref,
      checkout: options.checkout,
      force: options.force,
    })
  }

  /**
   * List all branches
   */
  async listBranches(remote?: string): Promise<string[]> {
    return git.listBranches({
      fs: this.rawFs,
      dir: this.dir,
      remote,
    })
  }

  /**
   * Get current branch name
   */
  async currentBranch(): Promise<string | undefined> {
    return git.currentBranch({
      fs: this.rawFs,
      dir: this.dir,
      fullname: false,
    }) as Promise<string | undefined>
  }

  /**
   * Delete a branch
   */
  async deleteBranch(ref: string): Promise<void> {
    await git.deleteBranch({
      fs: this.rawFs,
      dir: this.dir,
      ref,
    })
  }

  /**
   * Checkout a branch or commit
   */
  async checkout(options: CheckoutOptions): Promise<void> {
    await git.checkout({
      fs: this.rawFs,
      dir: this.dir,
      ref: options.ref,
      force: options.force,
      filepaths: options.filepaths,
      onProgress: options.onProgress,
    })
  }

  /**
   * Push to remote
   */
  async push(options?: PushOptions): Promise<void> {
    await git.push({
      fs: this.rawFs,
      http,
      dir: this.dir,
      remote: options?.remote ?? 'origin',
      ref: options?.ref,
      force: options?.force,
      corsProxy: this.corsProxy,
      onProgress: options?.onProgress,
      onAuth: options?.onAuth,
      onAuthFailure: options?.onAuthFailure,
    })
  }

  /**
   * Pull from remote
   */
  async pull(options?: PullOptions): Promise<void> {
    await git.pull({
      fs: this.rawFs,
      http,
      dir: this.dir,
      remote: options?.remote ?? 'origin',
      ref: options?.ref,
      singleBranch: options?.singleBranch,
      author: options?.author,
      corsProxy: this.corsProxy,
      onProgress: options?.onProgress,
      onAuth: options?.onAuth,
      onAuthFailure: options?.onAuthFailure,
    })
  }

  /**
   * Fetch from remote
   */
  async fetch(options?: FetchOptions): Promise<void> {
    await git.fetch({
      fs: this.rawFs,
      http,
      dir: this.dir,
      remote: options?.remote ?? 'origin',
      ref: options?.ref,
      singleBranch: options?.singleBranch,
      depth: options?.depth,
      corsProxy: this.corsProxy,
      onProgress: options?.onProgress,
      onAuth: options?.onAuth,
      onAuthFailure: options?.onAuthFailure,
    })
  }

  /**
   * Add a remote
   */
  async addRemote(name: string, url: string): Promise<void> {
    await git.addRemote({
      fs: this.rawFs,
      dir: this.dir,
      remote: name,
      url,
    })
  }

  /**
   * Delete a remote
   */
  async deleteRemote(name: string): Promise<void> {
    await git.deleteRemote({
      fs: this.rawFs,
      dir: this.dir,
      remote: name,
    })
  }

  /**
   * List remotes
   */
  async listRemotes(): Promise<RemoteInfo[]> {
    const remotes = await git.listRemotes({
      fs: this.rawFs,
      dir: this.dir,
    })
    return remotes.map((r: { remote: string; url: string }) => ({
      remote: r.remote,
      url: r.url,
    }))
  }

  /**
   * Get diff between two refs or working directory
   */
  async diff(options?: DiffOptions): Promise<DiffEntry[]> {
    const ref1 = options?.ref1 ?? 'HEAD'
    const ref2 = options?.ref2

    // If comparing with working directory (no ref2), use statusMatrix for reliability
    if (!ref2) {
      const matrix = await this.statusMatrix()
      const entries: DiffEntry[] = []

      for (const [filepath, head, workdir] of matrix) {
        // Filter by filepath if specified
        if (options?.filepath && !filepath.startsWith(options.filepath)) {
          continue
        }

        // HEAD=0: not in HEAD, HEAD=1: in HEAD
        // workdir=0: deleted, workdir=1: unchanged, workdir=2: modified
        if (head === 0 && workdir === 2) {
          entries.push({ filepath, type: 'add' })
        } else if (head === 1 && workdir === 0) {
          entries.push({ filepath, type: 'remove' })
        } else if (head === 1 && workdir === 2) {
          entries.push({ filepath, type: 'modify' })
        }
      }

      return entries
    }

    // For comparing two refs, use git.walk
    const trees = [git.TREE({ ref: ref1 }), git.TREE({ ref: ref2 })]

    const results = (await git.walk({
      fs: this.rawFs,
      dir: this.dir,
      trees,
      map: async (filepath, [A, B]) => {
        // isomorphic-git walk: returning falsy for a directory skips its children.
        // Return a truthy non-DiffEntry for directories so they get traversed.
        if (filepath === '.') return 'root'

        // Filter by filepath if specified
        if (options?.filepath && !filepath.startsWith(options.filepath)) {
          return 'skip'
        }

        // Skip directory entries — only report file-level diffs.
        // Directories must return truthy to allow child traversal.
        const aType = A ? await A.type() : undefined
        const bType = B ? await B.type() : undefined
        if (aType === 'tree' || bType === 'tree') return 'dir'

        const aOid = A ? await A.oid() : undefined
        const bOid = B ? await B.oid() : undefined

        if (aOid === bOid) {
          return 'equal'
        }

        let type: DiffEntry['type']
        if (!aOid && bOid) {
          type = 'add'
        } else if (aOid && !bOid) {
          type = 'remove'
        } else {
          type = 'modify'
        }

        return { filepath, type }
      },
    })) as (DiffEntry | string)[]

    return results.filter((r): r is DiffEntry => typeof r === 'object' && r !== null)
  }

  /**
   * Resolve a ref to an oid
   */
  async resolveRef(ref: string): Promise<string> {
    return git.resolveRef({
      fs: this.rawFs,
      dir: this.dir,
      ref,
    })
  }

  /**
   * Read a file at a specific commit
   */
  async readFileAtCommit(filepath: string, oid: string): Promise<Uint8Array> {
    const { blob } = await git.readBlob({
      fs: this.rawFs,
      dir: this.dir,
      oid,
      filepath,
    })
    return blob
  }

  /**
   * Get file history
   */
  async fileLog(filepath: string, options?: { depth?: number }): Promise<LogEntry[]> {
    const commits = await git.log({
      fs: this.rawFs,
      dir: this.dir,
      depth: options?.depth,
    })

    // Filter commits that touched this file
    const fileCommits: LogEntry[] = []
    let prevOid: string | undefined

    for (const entry of commits) {
      try {
        const { oid } = await git.readBlob({
          fs: this.rawFs,
          dir: this.dir,
          oid: entry.oid,
          filepath,
        })

        if (oid !== prevOid) {
          fileCommits.push({
            oid: entry.oid,
            commit: {
              message: entry.commit.message,
              author: entry.commit.author as GitAuthor,
              committer: entry.commit.committer as GitAuthor,
              parent: entry.commit.parent,
              tree: entry.commit.tree,
            },
            payload: entry.payload,
          })
          prevOid = oid
        }
      } catch {
        // File doesn't exist in this commit
        if (prevOid !== undefined) {
          prevOid = undefined
        }
      }
    }

    return fileCommits
  }

  /**
   * Stash changes (simple implementation using refs)
   * Note: This is a simplified stash that creates a commit on a special ref
   */
  async stash(message?: string): Promise<string> {
    // Get current status
    const statusList = await this.status()
    if (!Array.isArray(statusList) || statusList.length === 0) {
      throw new Error('No changes to stash')
    }

    // Stage all changes
    await this.addAll()

    // Create a stash commit
    const stashMessage = message ?? `WIP on ${await this.currentBranch()}`
    const oid = await git.commit({
      fs: this.rawFs,
      dir: this.dir,
      message: `stash: ${stashMessage}`,
      author: {
        name: 'Wiggum Stash',
        email: 'stash@wiggum.local',
      },
      noUpdateBranch: true,
    })

    // Save stash ref
    const stashIndex = await this.getNextStashIndex()
    await git.writeRef({
      fs: this.rawFs,
      dir: this.dir,
      ref: `refs/stash/${stashIndex}`,
      value: oid,
    })

    // Reset working directory to HEAD
    await this.checkout({ ref: 'HEAD', force: true })

    return oid
  }

  /**
   * Pop the latest stash
   */
  async stashPop(): Promise<void> {
    const stashes = await this.stashList()
    if (stashes.length === 0) {
      throw new Error('No stash entries')
    }

    const latest = stashes[0]

    // Apply the stash commit changes
    const diff = await this.diff({ ref1: 'HEAD', ref2: latest.oid })
    for (const entry of diff) {
      if (entry.type === 'add' || entry.type === 'modify') {
        const content = await this.readFileAtCommit(entry.filepath, latest.oid)
        await this.fs.writeFile(`${this.dir}/${entry.filepath}`, content)
      } else if (entry.type === 'remove') {
        await this.fs.unlink(`${this.dir}/${entry.filepath}`)
      }
    }

    // Delete the stash ref
    await git.deleteRef({
      fs: this.rawFs,
      dir: this.dir,
      ref: `refs/stash/${latest.index}`,
    })
  }

  /**
   * List stash entries by reading refs/stash directory
   */
  async stashList(): Promise<{ index: number; message: string; oid: string }[]> {
    try {
      const stashDir = `${this.dir}/.git/refs/stash`
      const exists = await this.fs.exists(stashDir)
      if (!exists) {
        return []
      }

      const entries = await this.fs.readdir(stashDir)
      const stashes: { index: number; message: string; oid: string }[] = []

      for (const entry of entries as string[]) {
        const index = parseInt(entry, 10)
        if (isNaN(index)) continue

        try {
          const oid = await git.resolveRef({
            fs: this.rawFs,
            dir: this.dir,
            ref: `refs/stash/${entry}`,
          })
          const [commit] = await git.log({
            fs: this.rawFs,
            dir: this.dir,
            ref: oid,
            depth: 1,
          })
          stashes.push({
            index,
            message: commit.commit.message.replace('stash: ', ''),
            oid,
          })
        } catch {
          // Skip invalid stash refs
        }
      }

      return stashes.sort((a, b) => b.index - a.index)
    } catch {
      return []
    }
  }

  private async getNextStashIndex(): Promise<number> {
    const stashes = await this.stashList()
    if (stashes.length === 0) return 0
    return Math.max(...stashes.map((s) => s.index)) + 1
  }

  /**
   * List all tags in the repository
   */
  async listTags(): Promise<string[]> {
    return git.listTags({
      fs: this.rawFs,
      dir: this.dir,
    })
  }

  /**
   * Create a lightweight tag at HEAD (or specified oid)
   */
  async tag(ref: string, object?: string): Promise<void> {
    await git.tag({
      fs: this.rawFs,
      dir: this.dir,
      ref,
      object,
    })
  }

  /**
   * Check if directory is a git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      await git.resolveRef({
        fs: this.rawFs,
        dir: this.dir,
        ref: 'HEAD',
      })
      return true
    } catch {
      return false
    }
  }

  /**
   * Get config value
   */
  async getConfig(path: string): Promise<string | undefined> {
    try {
      return await git.getConfig({
        fs: this.rawFs,
        dir: this.dir,
        path,
      })
    } catch {
      return undefined
    }
  }

  /**
   * Set config value
   */
  async setConfig(path: string, value: string): Promise<void> {
    await git.setConfig({
      fs: this.rawFs,
      dir: this.dir,
      path,
      value,
    })
  }
}
