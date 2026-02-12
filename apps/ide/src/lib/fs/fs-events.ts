/**
 * FSEventBus — Module-level singleton for filesystem change notifications.
 *
 * Shell commands emit events here after writing files.
 * UI hooks (useFileTree, usePreviewWithWatch) subscribe to react.
 */

export type FSEventType = 'create' | 'modify' | 'delete'
export type FSEventListener = (path: string, type: FSEventType) => void

class FSEventBus {
  private listeners = new Set<FSEventListener>()

  subscribe(listener: FSEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(path: string, type: FSEventType): void {
    for (const listener of this.listeners) {
      try {
        listener(path, type)
      } catch {
        // Don't let listener errors break the emitter
      }
    }
  }

  /** Convenience: emit a file change event */
  fileChanged(path: string, type: FSEventType = 'modify'): void {
    this.emit(path, type)
  }
}

/** Singleton instance — import this in executor.ts and UI hooks */
export const fsEvents = new FSEventBus()
