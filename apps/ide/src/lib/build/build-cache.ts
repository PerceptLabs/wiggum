/**
 * Content-hash build cache — IndexedDB-backed
 *
 * Hashes all source files + lockfile to produce a SHA-256 key.
 * Stores the build output (js, css, warnings) keyed by hash.
 * Keeps at most MAX_ENTRIES builds, evicting oldest by timestamp.
 */

import type { JSRuntimeFS } from '../fs/types'
import type { BuildWarning } from './types'

const DB_NAME = 'wiggum-build-cache'
const DB_VERSION = 1
const STORE_NAME = 'builds'
const MAX_ENTRIES = 10

export interface CachedBuild {
  hash: string
  js: string
  css: string | null
  tailwindCss: string | null
  warnings: BuildWarning[]
  timestamp: number
}

// ============================================================================
// IndexedDB helpers (same pattern as preview-cache.ts)
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })

  return dbPromise
}

// ============================================================================
// Source hashing
// ============================================================================

const SOURCE_EXTENSIONS = /\.(tsx?|css|json)$/

/**
 * Walk a directory recursively and collect file contents
 */
async function walkSourceFiles(
  fs: JSRuntimeFS,
  dirPath: string,
  parts: string[]
): Promise<void> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries as Array<{ name: string; type: string }>) {
      const fullPath = `${dirPath}/${entry.name}`
      if (entry.type === 'dir') {
        await walkSourceFiles(fs, fullPath, parts)
      } else if (SOURCE_EXTENSIONS.test(entry.name)) {
        try {
          const data = await fs.readFile(fullPath, { encoding: 'utf8' })
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
          parts.push(fullPath + '\0' + text)
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Skip unreadable directories
  }
}

/**
 * Simple djb2 hash fallback for environments without crypto.subtle (tests)
 */
function djb2Hash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * Compute a content hash of all source files + lockfile.
 * Returns a hex SHA-256 string (or djb2 fallback in tests).
 */
export async function computeSourceHash(
  fs: JSRuntimeFS,
  projectPath: string
): Promise<string> {
  const parts: string[] = []

  // Walk src/ directory
  await walkSourceFiles(fs, `${projectPath}/src`, parts)

  // Include lockfile content (affects build output via dependency versions)
  for (const lockfileName of ['package-lock.json', 'yarn.lock']) {
    try {
      const data = await fs.readFile(`${projectPath}/${lockfileName}`, { encoding: 'utf8' })
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
      parts.push(`__lockfile__:${lockfileName}\0${text}`)
      break // Only need one lockfile
    } catch {
      // Lockfile not present — continue
    }
  }

  // Include index.html (affects output HTML structure)
  try {
    const data = await fs.readFile(`${projectPath}/index.html`, { encoding: 'utf8' })
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array)
    parts.push(`__root__:index.html\0${text}`)
  } catch {
    // No index.html — fine
  }

  // Sort for determinism
  parts.sort()
  const concatenated = parts.join('\n')

  // Use crypto.subtle when available, djb2 fallback for tests
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const encoder = new TextEncoder()
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(concatenated))
    const bytes = new Uint8Array(buffer)
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  return djb2Hash(concatenated)
}

// ============================================================================
// Cache operations
// ============================================================================

/**
 * Get a cached build result by hash
 */
export async function getCachedBuild(hash: string): Promise<CachedBuild | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(hash)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  } catch {
    return null // DB unavailable — skip cache
  }
}

/**
 * Store a build result, then evict oldest entries if over MAX_ENTRIES
 */
export async function setCachedBuild(hash: string, build: CachedBuild): Promise<void> {
  try {
    const db = await openDB()

    // Put the entry
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(build)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })

    // Evict oldest if over limit
    await evictOldest(db)
  } catch {
    // Cache write failure is non-fatal
  }
}

async function evictOldest(db: IDBDatabase): Promise<void> {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const countRequest = store.count()

    countRequest.onsuccess = () => {
      const count = countRequest.result
      if (count <= MAX_ENTRIES) {
        resolve()
        return
      }

      const toDelete = count - MAX_ENTRIES
      const index = store.index('timestamp')
      const cursor = index.openCursor()
      let deleted = 0

      cursor.onsuccess = (event) => {
        const c = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (c && deleted < toDelete) {
          c.delete()
          deleted++
          c.continue()
        } else {
          resolve()
        }
      }
      cursor.onerror = () => resolve()
    }
    countRequest.onerror = () => resolve()
  })
}

/**
 * Clear the entire build cache. Returns number of entries cleared.
 */
export async function clearBuildCache(): Promise<number> {
  try {
    const db = await openDB()

    // Count first
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.count()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })

    // Clear
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const request = store.clear()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })

    return count
  } catch {
    return 0
  }
}

/**
 * List all cached builds (for shell command display)
 */
export async function listBuildCache(): Promise<Array<{ hash: string; timestamp: number }>> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const entries = (request.result as CachedBuild[]).map((e) => ({
          hash: e.hash,
          timestamp: e.timestamp,
        }))
        entries.sort((a, b) => b.timestamp - a.timestamp)
        resolve(entries)
      }
    })
  } catch {
    return []
  }
}
