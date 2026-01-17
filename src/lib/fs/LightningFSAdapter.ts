import LightningFS from '@isomorphic-git/lightning-fs'
import type {
  JSRuntimeFS,
  StatResult,
  DirectoryEntry,
  ReadFileOptions,
  WriteFileOptions,
  ReaddirOptions,
  MkdirOptions,
  RmdirOptions,
} from './types'

/**
 * Adapter that wraps @isomorphic-git/lightning-fs to implement JSRuntimeFS
 * LightningFS provides an IndexedDB-backed filesystem for browser environments
 */
export class LightningFSAdapter implements JSRuntimeFS {
  private fs: LightningFS
  private pfs: LightningFS.PromisifiedFS

  /**
   * Create a new LightningFS adapter
   * @param dbName - Name of the IndexedDB database to use
   * @param options - Optional LightningFS options
   */
  constructor(dbName: string, options?: { wipe?: boolean }) {
    this.fs = new LightningFS(dbName, options)
    this.pfs = this.fs.promises
  }

  /**
   * Get the underlying LightningFS instance
   * Useful for passing to isomorphic-git
   */
  get rawFs(): LightningFS {
    return this.fs
  }

  async readFile(path: string, options?: ReadFileOptions): Promise<string | Uint8Array> {
    const result = await this.pfs.readFile(path, options)
    // LightningFS returns string with encoding, Uint8Array without
    return result as string | Uint8Array
  }

  async writeFile(
    path: string,
    data: string | Uint8Array,
    options?: WriteFileOptions
  ): Promise<void> {
    await this.pfs.writeFile(path, data, options)
  }

  async readdir(path: string, options?: ReaddirOptions): Promise<string[] | DirectoryEntry[]> {
    if (options?.withFileTypes) {
      // LightningFS doesn't support withFileTypes directly,
      // so we need to stat each entry
      const names = await this.pfs.readdir(path)
      const entries: DirectoryEntry[] = await Promise.all(
        names.map(async (name) => {
          const fullPath = path.endsWith('/') ? `${path}${name}` : `${path}/${name}`
          try {
            const stat = await this.lstat(fullPath)
            let type: 'file' | 'dir' | 'symlink' = 'file'
            if (stat.isDirectory()) {
              type = 'dir'
            } else if (stat.isSymbolicLink()) {
              type = 'symlink'
            }
            return { name, type }
          } catch {
            // If stat fails, assume it's a file
            return { name, type: 'file' as const }
          }
        })
      )
      return entries
    }
    return this.pfs.readdir(path) as Promise<string[]>
  }

  async mkdir(path: string, options?: MkdirOptions): Promise<void> {
    if (options?.recursive) {
      await this.mkdirRecursive(path, options.mode)
    } else {
      await this.pfs.mkdir(path, options?.mode)
    }
  }

  private async mkdirRecursive(path: string, mode?: number): Promise<void> {
    const parts = path.split('/').filter(Boolean)
    let currentPath = path.startsWith('/') ? '' : ''

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`
      try {
        await this.pfs.mkdir(currentPath, mode)
      } catch (err) {
        // Ignore EEXIST errors when creating recursively
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw err
        }
      }
    }
  }

  async stat(path: string): Promise<StatResult> {
    const stat = await this.pfs.stat(path)
    return this.wrapStat(stat)
  }

  async lstat(path: string): Promise<StatResult> {
    const stat = await this.pfs.lstat(path)
    return this.wrapStat(stat)
  }

  private wrapStat(stat: LightningFS.Stats): StatResult {
    const isDir = stat.isDirectory()
    const isSymlink = stat.isSymbolicLink()

    return {
      type: isDir ? 'dir' : 'file',
      mode: stat.mode,
      size: stat.size,
      ino: stat.ino,
      mtimeMs: stat.mtimeMs,
      ctimeMs: stat.ctimeMs,
      uid: stat.uid,
      gid: stat.gid,
      dev: stat.dev,
      isFile: () => stat.isFile(),
      isDirectory: () => isDir,
      isSymbolicLink: () => isSymlink,
    }
  }

  async unlink(path: string): Promise<void> {
    await this.pfs.unlink(path)
  }

  async rmdir(path: string, options?: RmdirOptions): Promise<void> {
    if (options?.recursive) {
      await this.rmdirRecursive(path)
    } else {
      await this.pfs.rmdir(path)
    }
  }

  private async rmdirRecursive(path: string): Promise<void> {
    const entries = await this.readdir(path, { withFileTypes: true }) as DirectoryEntry[]

    for (const entry of entries) {
      const fullPath = path.endsWith('/') ? `${path}${entry.name}` : `${path}/${entry.name}`
      if (entry.type === 'dir') {
        await this.rmdirRecursive(fullPath)
      } else {
        await this.unlink(fullPath)
      }
    }

    await this.pfs.rmdir(path)
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.pfs.rename(oldPath, newPath)
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path)
      return true
    } catch {
      return false
    }
  }

  async readlink(path: string): Promise<string> {
    return this.pfs.readlink(path) as Promise<string>
  }

  async symlink(target: string, path: string): Promise<void> {
    await this.pfs.symlink(target, path)
  }
}
