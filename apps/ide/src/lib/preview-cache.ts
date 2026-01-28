/**
 * Simple IndexedDB cache for preview files
 * 
 * This allows the Service Worker to read files directly without postMessage.
 * The build process writes here alongside LightningFS, enabling:
 * - Iframe preview (SW reads directly)
 * - "Open in new tab" (SW reads directly - no parent window needed!)
 * 
 * Structure:
 * - DB: "wiggum-preview-cache"
 * - Store: "files"
 * - Keys: "{projectId}:{path}" e.g. "proj123:/index.html"
 * - Values: { content: Uint8Array | string, contentType: string }
 */

const DB_NAME = 'wiggum-preview-cache'
const DB_VERSION = 1
const STORE_NAME = 'files'

interface CachedFile {
  content: Uint8Array | string
  contentType: string
  timestamp: number
}

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
        db.createObjectStore(STORE_NAME)
      }
    }
  })

  return dbPromise
}

function makeKey(projectId: string, path: string): string {
  // Normalize path to always start with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${projectId}:${normalizedPath}`
}

/**
 * Write a file to the preview cache
 */
export async function writePreviewFile(
  projectId: string,
  path: string,
  content: Uint8Array | string,
  contentType: string
): Promise<void> {
  const db = await openDB()
  const key = makeKey(projectId, path)
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    
    const file: CachedFile = {
      content,
      contentType,
      timestamp: Date.now(),
    }
    
    const request = store.put(file, key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

/**
 * Read a file from the preview cache
 */
export async function readPreviewFile(
  projectId: string,
  path: string
): Promise<CachedFile | null> {
  const db = await openDB()
  const key = makeKey(projectId, path)
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    
    const request = store.get(key)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || null)
  })
}

/**
 * Clear all preview files for a project
 */
export async function clearPreviewCache(projectId: string): Promise<void> {
  const db = await openDB()
  const prefix = `${projectId}:`
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
          cursor.delete()
        }
        cursor.continue()
      } else {
        resolve()
      }
    }
  })
}

/**
 * List all files in the preview cache for a project
 */
export async function listPreviewFiles(projectId: string): Promise<string[]> {
  const db = await openDB()
  const prefix = `${projectId}:`
  const paths: string[] = []
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.openCursor()
    
    request.onerror = () => reject(request.error)
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
          // Extract path from key
          paths.push(cursor.key.substring(prefix.length))
        }
        cursor.continue()
      } else {
        resolve(paths)
      }
    }
  })
}
