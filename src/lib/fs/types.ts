/**
 * Filesystem abstraction types for Wiggum
 * Similar to Node's fs.promises but simplified for browser use
 */

export interface StatResult {
  type: 'file' | 'dir'
  mode: number
  size: number
  ino: number
  mtimeMs: number
  ctimeMs?: number
  uid?: number
  gid?: number
  dev?: number
  isFile(): boolean
  isDirectory(): boolean
  isSymbolicLink(): boolean
}

export interface DirectoryEntry {
  name: string
  type: 'file' | 'dir' | 'symlink'
}

export interface ReadFileOptions {
  encoding?: 'utf8'
}

export interface WriteFileOptions {
  encoding?: 'utf8'
  mode?: number
}

export interface ReaddirOptions {
  withFileTypes?: boolean
}

export interface MkdirOptions {
  recursive?: boolean
  mode?: number
}

export interface RmdirOptions {
  recursive?: boolean
}

/**
 * JavaScript Runtime Filesystem interface
 * A simplified filesystem API for browser-based environments
 */
export interface JSRuntimeFS {
  /**
   * Read the contents of a file
   * @param path - Path to the file
   * @param options - Optional encoding options
   * @returns File contents as string (if encoding specified) or Uint8Array
   */
  readFile(path: string, options?: ReadFileOptions): Promise<string | Uint8Array>
  readFile(path: string, options: { encoding: 'utf8' }): Promise<string>
  readFile(path: string): Promise<Uint8Array>

  /**
   * Write data to a file, replacing the file if it already exists
   * @param path - Path to the file
   * @param data - Data to write (string or binary)
   * @param options - Optional write options
   */
  writeFile(
    path: string,
    data: string | Uint8Array,
    options?: WriteFileOptions
  ): Promise<void>

  /**
   * Read the contents of a directory
   * @param path - Path to the directory
   * @param options - Optional options (withFileTypes returns DirectoryEntry[])
   * @returns Array of filenames or DirectoryEntry objects
   */
  readdir(path: string, options?: ReaddirOptions): Promise<string[] | DirectoryEntry[]>
  readdir(path: string): Promise<string[]>
  readdir(path: string, options: { withFileTypes: true }): Promise<DirectoryEntry[]>
  readdir(path: string, options: { withFileTypes: false }): Promise<string[]>

  /**
   * Create a directory
   * @param path - Path to the directory
   * @param options - Optional options (recursive creates parent dirs)
   */
  mkdir(path: string, options?: MkdirOptions): Promise<void>

  /**
   * Get file/directory status
   * @param path - Path to the file or directory
   * @returns StatResult with file information
   */
  stat(path: string): Promise<StatResult>

  /**
   * Get file/directory status (does not follow symlinks)
   * @param path - Path to the file or directory
   * @returns StatResult with file information
   */
  lstat(path: string): Promise<StatResult>

  /**
   * Remove a file
   * @param path - Path to the file
   */
  unlink(path: string): Promise<void>

  /**
   * Remove a directory
   * @param path - Path to the directory
   * @param options - Optional options (recursive removes contents)
   */
  rmdir(path: string, options?: RmdirOptions): Promise<void>

  /**
   * Rename/move a file or directory
   * @param oldPath - Current path
   * @param newPath - New path
   */
  rename(oldPath: string, newPath: string): Promise<void>

  /**
   * Check if a path exists
   * @param path - Path to check
   * @returns true if path exists
   */
  exists?(path: string): Promise<boolean>

  /**
   * Read a symbolic link
   * @param path - Path to the symlink
   * @returns Target path of the symlink
   */
  readlink?(path: string): Promise<string>

  /**
   * Create a symbolic link
   * @param target - Target path
   * @param path - Symlink path
   */
  symlink?(target: string, path: string): Promise<void>
}
