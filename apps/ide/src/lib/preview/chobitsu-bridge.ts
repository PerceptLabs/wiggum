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
