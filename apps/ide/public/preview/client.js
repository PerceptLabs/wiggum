// preview/client.js - Bridge between Service Worker and Parent Window
// Uses DOM manipulation instead of document.write() to preserve execution context

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

    // Re-inject scripts (they don't execute when inserted via innerHTML)
    const scripts = doc.querySelectorAll('script')
    for (const oldScript of scripts) {
      const newScript = document.createElement('script')
      // Copy attributes
      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value)
      }
      // Copy inline content
      if (!oldScript.src && oldScript.textContent) {
        newScript.textContent = oldScript.textContent
      }
      document.body.appendChild(newScript)
    }
  } catch (err) {
    document.getElementById('app').textContent = 'Load error: ' + err.message
  }
})()
