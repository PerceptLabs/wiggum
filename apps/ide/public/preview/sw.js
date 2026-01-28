// preview/sw.js - Service Worker for Preview Virtual Server
// Intercepts fetch requests and routes them through:
// 1. Preview cache (IndexedDB) - direct read, works in new tabs!
// 2. Parent window via postMessage - fallback for backward compatibility

// Preview cache constants (must match preview-cache.ts)
const CACHE_DB_NAME = 'wiggum-preview-cache'
const CACHE_DB_VERSION = 1
const CACHE_STORE_NAME = 'files'

let messageId = 0
const pendingRequests = new Map()

// Current project ID (set via message from parent)
let currentProjectId = null

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Only handle /preview/* requests
  if (!url.pathname.startsWith('/preview/')) {
    return
  }

  // Strip /preview prefix for virtual path
  const virtualPath = url.pathname.replace(/^\/preview/, '') || '/'

  // Infrastructure files - pass through to Vite
  if (virtualPath === '/sw.js' || virtualPath === '/client.js') {
    return
  }

  // Bootstrap navigation - pass through to Vite (lets client.js load first)
  if (event.request.mode === 'navigate' && (virtualPath === '/' || virtualPath === '/index.html')) {
    return
  }

  event.respondWith(handleFetch(event.request, virtualPath + url.search))
})

async function handleFetch(request, virtualPath) {
  // Try reading from preview cache first (works in new tabs!)
  if (currentProjectId) {
    const cacheResult = await readFromPreviewCache(currentProjectId, virtualPath)
    if (cacheResult) {
      return cacheResult
    }
  }

  // Fall back to postMessage (requires parent window)
  return handleFetchViaPostMessage(request, virtualPath)
}

/**
 * Read file directly from IndexedDB preview cache
 * This enables "Open in new tab" to work without parent window!
 */
async function readFromPreviewCache(projectId, virtualPath) {
  try {
    const db = await openCacheDB()
    const key = `${projectId}:${virtualPath}`

    return new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE_NAME, 'readonly')
      const store = tx.objectStore(CACHE_STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        const file = request.result
        if (!file) {
          resolve(null) // Not in cache, try postMessage
          return
        }

        const { content, contentType } = file
        let body

        if (typeof content === 'string') {
          body = content
        } else if (content instanceof Uint8Array) {
          body = content
        } else {
          resolve(null)
          return
        }

        const headers = new Headers({
          'Content-Type': contentType || 'text/plain',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        })

        resolve(new Response(body, { status: 200, headers }))
      }

      request.onerror = () => {
        resolve(null) // Error reading cache, try postMessage
      }
    })
  } catch {
    return null // IndexedDB error, try postMessage
  }
}

let cacheDBPromise = null

function openCacheDB() {
  if (cacheDBPromise) return cacheDBPromise

  cacheDBPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME)
      }
    }
  })

  return cacheDBPromise
}

async function handleFetchViaPostMessage(request, virtualPath) {
  const id = ++messageId

  // Create promise for response
  const responsePromise = new Promise((resolve) => {
    pendingRequests.set(id, resolve)
  })

  // Post to all clients
  const allClients = await self.clients.matchAll()
  if (allClients.length === 0) {
    return new Response('No clients available', { status: 503 })
  }

  allClients.forEach((client) => {
    client.postMessage({
      jsonrpc: '2.0',
      id,
      method: 'fetch',
      params: { url: virtualPath, method: request.method },
    })
  })

  // Wait for response with timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), 30000)
  })

  let result
  try {
    result = await Promise.race([responsePromise, timeoutPromise])
  } catch (err) {
    return new Response(`Service Worker Error: ${err.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  // Decode body
  let body = null
  if (result.body) {
    const contentType = result.headers?.['Content-Type'] || ''
    const isBinary = /^(image|audio|video|font|application\/octet)/.test(contentType)

    if (isBinary) {
      // Binary: base64 → Uint8Array
      const binaryStr = atob(result.body)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      body = bytes
    } else {
      // Text: decode with UTF-8 support
      try {
        body = decodeURIComponent(escape(atob(result.body)))
      } catch {
        try {
          body = atob(result.body)
        } catch {
          body = result.body
        }
      }
    }
  }

  const headers = new Headers(result.headers || {})
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

  return new Response(body, {
    status: result.status || 200,
    headers,
  })
}

// Receive messages from bridge
self.addEventListener('message', (event) => {
  const { jsonrpc, id, result, error, method, params } = event.data || {}

  // Handle setProjectId message
  if (method === 'setProjectId' && params?.projectId) {
    currentProjectId = params.projectId
    return
  }

  // Handle fetch responses
  if (jsonrpc === '2.0' && pendingRequests.has(id)) {
    const resolve = pendingRequests.get(id)
    pendingRequests.delete(id)

    if (error) {
      resolve({
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
        body: btoa(error.message || 'Unknown error'),
      })
    } else {
      resolve(result)
    }
  }
})
