// preview/client.js - Bridge between Service Worker and Parent Window
// Uses DOM manipulation instead of document.write() to preserve execution context

// ============================================================================
// CONSOLE CAPTURE - Intercept and forward console output to parent window
// ============================================================================
;(function setupConsoleCapture() {
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console),
  }

  function formatArgs(args) {
    return args
      .map((arg) => {
        if (arg === null) return 'null'
        if (arg === undefined) return 'undefined'
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2)
          } catch {
            return String(arg)
          }
        }
        return String(arg)
      })
      .join(' ')
  }

  function createCapture(level) {
    return function (...args) {
      // Call original console method
      originalConsole[level](...args)

      // Send to parent window
      try {
        window.parent.postMessage(
          {
            type: 'wiggum-console-message',
            level,
            message: formatArgs(args),
            timestamp: Date.now(),
          },
          '*'
        )
      } catch {
        // Ignore postMessage errors
      }
    }
  }

  console.log = createCapture('log')
  console.warn = createCapture('warn')
  console.error = createCapture('error')
  console.info = createCapture('info')
  console.debug = createCapture('debug')
})()

;(async function () {
  // Extract project ID from URL
  const urlParams = new URLSearchParams(window.location.search)
  const projectId = urlParams.get('project')

  // Register Service Worker
  if (!navigator.serviceWorker) {
    document.getElementById('app').textContent = 'Service Workers not supported'
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/preview/sw.js', {
      scope: '/preview/',
    })

    // Wait for SW to be ready
    await navigator.serviceWorker.ready

    // If no controller yet, wait for one
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true })
      })
    }

    // Send project ID to SW (enables direct IndexedDB cache reads)
    if (projectId) {
      navigator.serviceWorker.controller.postMessage({
        method: 'setProjectId',
        params: { projectId },
      })
    }
  } catch (err) {
    document.getElementById('app').textContent = 'SW registration failed: ' + err.message
    return
  }

  // Relay: SW messages → Parent window
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { jsonrpc, id, method, params } = event.data || {}
    if (jsonrpc === '2.0' && method === 'fetch') {
      window.parent.postMessage({ jsonrpc: '2.0', id, method: 'fetch', params }, '*')
    }
  })

  // Relay: Parent window messages → SW
  window.addEventListener('message', (event) => {
    const { jsonrpc, id, result, error } = event.data || {}
    if (jsonrpc === '2.0' && (result !== undefined || error !== undefined)) {
      navigator.serviceWorker.controller?.postMessage({ jsonrpc: '2.0', id, result, error })
    }
  })

  // Now fetch the actual index.html content via SW
  try {
    const response = await fetch('/preview/index.html')
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.status}`)
    }
    const html = await response.text()

    // Parse and replace DOM (NOT document.write!)
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // Replace head content
    document.head.innerHTML = doc.head.innerHTML

    // Replace body content
    document.body.innerHTML = doc.body.innerHTML

    // Re-inject scripts with proper load order
    // External scripts must finish loading before inline scripts execute
    const scripts = doc.querySelectorAll('script')
    const externalScripts = []
    const inlineScripts = []

    for (const oldScript of scripts) {
      const newScript = document.createElement('script')
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value)
      }
      if (oldScript.src) {
        externalScripts.push(newScript)
      } else if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent
        inlineScripts.push(newScript)
      }
    }

    // Load external scripts first, wait for each to complete
    for (const script of externalScripts) {
      await new Promise((resolve) => {
        script.onload = resolve
        script.onerror = () => resolve() // Don't block on CDN failure
        document.body.appendChild(script)
      })
    }

    // Then run inline scripts (now safe to reference globals like `tailwind`)
    for (const script of inlineScripts) {
      document.body.appendChild(script)
    }
  } catch (err) {
    document.getElementById('app').textContent = 'Load error: ' + err.message
  }
})()
