/**
 * Chobitsu Bridge - Runtime error capture script injection
 *
 * Generates the script that should be injected into preview iframes to
 * capture runtime errors and console errors via Chobitsu DevTools protocol.
 */

/**
 * Generate the Chobitsu injection script
 * This script runs inside the preview iframe to capture errors
 */
export function getChobitsuInjectionScript(): string {
  return `
<script>
// Wiggum Runtime Error Capture
(function() {
  'use strict';

  // Track errors to avoid duplicates
  const seenErrors = new Set();

  function sendError(error) {
    // Deduplicate based on message + location
    const key = error.message + ':' + (error.filename || '') + ':' + (error.line || '');
    if (seenErrors.has(key)) return;
    seenErrors.add(key);

    // Post to parent window
    window.parent.postMessage({
      type: 'wiggum-runtime-error',
      error: error
    }, '*');
  }

  // Global error handler for uncaught errors
  window.addEventListener('error', function(event) {
    sendError({
      message: event.message || 'Unknown error',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error?.stack,
      timestamp: Date.now()
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    sendError({
      message: reason?.message || String(reason) || 'Unhandled Promise rejection',
      stack: reason?.stack,
      timestamp: Date.now()
    });
  });

  // Intercept console.error
  const originalConsoleError = console.error;
  console.error = function(...args) {
    originalConsoleError.apply(console, args);

    // Convert arguments to a message
    const message = args
      .map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); }
          catch { return String(arg); }
        }
        return String(arg);
      })
      .join(' ');

    sendError({
      message: 'Console error: ' + message,
      timestamp: Date.now()
    });
  };

  // Expose for debugging
  window.__wiggumErrorCapture = {
    seenErrors: seenErrors,
    sendError: sendError
  };
})();
</script>
`
}

/**
 * Inject the error capture script into HTML
 * Adds the script right after the opening <body> tag
 */
export function injectErrorCapture(html: string): string {
  const script = getChobitsuInjectionScript()

  // Try to inject after <body> tag
  const bodyMatch = html.match(/<body[^>]*>/i)
  if (bodyMatch) {
    const insertPosition = bodyMatch.index! + bodyMatch[0].length
    return html.slice(0, insertPosition) + '\n' + script + html.slice(insertPosition)
  }

  // Fallback: inject at the start of the HTML
  return script + html
}

/**
 * Check if HTML already has error capture injected
 */
export function hasErrorCapture(html: string): boolean {
  return html.includes('wiggum-runtime-error') || html.includes('__wiggumErrorCapture')
}

/**
 * Generate DOM structure capture script
 * Captures semantic structure after page loads and sends via postMessage
 */
export function getStructureCaptureScript(): string {
  return `
<script>
// Wiggum DOM Structure Capture
(function() {
  'use strict';

  function captureStructure(element, depth = 0) {
    if (depth > 10) return null;
    if (!element || element.nodeType !== 1) return null;

    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'noscript'].includes(tag)) return null;

    const result = { tag };

    if (element.id) result.id = element.id;
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.startsWith('_'));
      if (classes.length > 0) result.classes = classes.slice(0, 5);
    }

    if (['h1','h2','h3','h4','h5','h6','button','a','label','p'].includes(tag)) {
      const text = element.textContent?.trim().slice(0, 50);
      if (text) result.text = text;
    }

    if (tag === 'a' && element.href) {
      result.href = element.href.slice(0, 100);
    }

    const children = [];
    for (const child of element.children) {
      const childResult = captureStructure(child, depth + 1);
      if (childResult) children.push(childResult);
    }
    if (children.length > 0) result.children = children;

    return result;
  }

  function sendStructure() {
    const root = document.getElementById('root') || document.body;
    const structure = captureStructure(root);
    window.parent.postMessage({
      type: 'wiggum-dom-structure',
      structure: structure,
      timestamp: Date.now()
    }, '*');
  }

  if (document.readyState === 'complete') {
    setTimeout(sendStructure, 500);
  } else {
    window.addEventListener('load', () => setTimeout(sendStructure, 500));
  }

  window.__wiggumCaptureStructure = sendStructure;
})();
</script>
`;
}

/**
 * Inject both error capture and structure capture into HTML
 */
export function injectAllCapture(html: string): string {
  const scripts = getChobitsuInjectionScript() + getStructureCaptureScript();
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (bodyMatch) {
    const insertPosition = bodyMatch.index! + bodyMatch[0].length;
    return html.slice(0, insertPosition) + '\n' + scripts + html.slice(insertPosition);
  }
  return scripts + html;
}
