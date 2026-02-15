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
// Wiggum Runtime Error Capture — Tiered Console System
(function() {
  'use strict';

  // ---- Noise blocklist (filtered from all tiers) ----
  const NOISE_PATTERNS = [
    'Download the React DevTools',
    '[vite] connecting',
    '[vite] connected',
    'LogTape loggers are configured',
    'Note that LogTape itself uses the meta logger',
    'react-devtools',
  ];

  function isNoise(message) {
    for (let i = 0; i < NOISE_PATTERNS.length; i++) {
      if (message.indexOf(NOISE_PATTERNS[i]) !== -1) return true;
    }
    return false;
  }

  function argsToMessage(args) {
    return args.map(function(arg) {
      if (arg instanceof Error) return arg.message;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); }
        catch(e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
  }

  // ---- Tier 1: Errors (always capture, post immediately) ----
  var seenErrors = new Set();

  function sendError(error) {
    var key = error.message + ':' + (error.filename || '') + ':' + (error.line || '');
    if (seenErrors.has(key)) return;
    seenErrors.add(key);

    // Deduplicate with client.js early error capture to avoid double-posting
    if (window.__wiggum_errors__ && window.__wiggum_errors__.some(function(e) {
      return (e.message + ':' + (e.source || '') + ':' + (e.lineno || '')) === key;
    })) return;

    window.parent.postMessage({ type: 'wiggum-runtime-error', error: error }, '*');

    // Also send as console message so collector has full picture
    window.parent.postMessage({
      type: 'wiggum-console-message',
      level: 'error',
      message: error.message,
      timestamp: error.timestamp || Date.now()
    }, '*');

    // Flush Tier 3 ringbuffer as breadcrumb context
    if (logRingBuffer.length > 0) {
      window.parent.postMessage({
        type: 'wiggum-console-context',
        entries: logRingBuffer.slice(),
        timestamp: Date.now()
      }, '*');
      logRingBuffer.length = 0;
    }
  }

  window.addEventListener('error', function(event) {
    sendError({
      message: event.message || 'Unknown error',
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error ? event.error.stack : undefined,
      timestamp: Date.now()
    });
  });

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    sendError({
      message: (reason && reason.message) ? reason.message : (String(reason) || 'Unhandled Promise rejection'),
      stack: reason ? reason.stack : undefined,
      timestamp: Date.now()
    });
  });

  var originalConsoleError = console.error;
  console.error = function() {
    originalConsoleError.apply(console, arguments);
    var msg = argsToMessage(Array.from(arguments));
    if (isNoise(msg)) return;
    sendError({ message: 'Console error: ' + msg, timestamp: Date.now() });
  };

  // ---- Tier 2: Warnings (dedup by first 100 chars, noise-filtered) ----
  var warnSeen = {};

  var originalConsoleWarn = console.warn;
  console.warn = function() {
    originalConsoleWarn.apply(console, arguments);
    var msg = argsToMessage(Array.from(arguments));
    if (isNoise(msg)) return;

    var dedupKey = msg.slice(0, 100);
    warnSeen[dedupKey] = (warnSeen[dedupKey] || 0) + 1;

    // Only send first occurrence immediately
    if (warnSeen[dedupKey] === 1) {
      window.parent.postMessage({
        type: 'wiggum-console-message',
        level: 'warn',
        message: msg,
        timestamp: Date.now()
      }, '*');
    }
  };

  // Post aggregated warn counts every 5 seconds
  setInterval(function() {
    var hasCounts = false;
    for (var k in warnSeen) { if (warnSeen[k] > 1) { hasCounts = true; break; } }
    if (!hasCounts) return;
    window.parent.postMessage({
      type: 'wiggum-console-warn-counts',
      counts: Object.assign({}, warnSeen),
      timestamp: Date.now()
    }, '*');
  }, 5000);

  // ---- Tier 3: Logs/Info/Debug (ringbuffer, flushed on error) ----
  var logRingBuffer = [];
  var RING_SIZE = 20;

  function captureToRing(level, args) {
    var msg = argsToMessage(Array.from(args));
    if (isNoise(msg)) return;
    logRingBuffer.push({ level: level, message: msg, timestamp: Date.now() });
    while (logRingBuffer.length > RING_SIZE) logRingBuffer.shift();
  }

  var originalConsoleLog = console.log;
  console.log = function() {
    originalConsoleLog.apply(console, arguments);
    captureToRing('log', arguments);
  };

  var originalConsoleInfo = console.info;
  console.info = function() {
    originalConsoleInfo.apply(console, arguments);
    captureToRing('info', arguments);
  };

  var originalConsoleDebug = console.debug;
  console.debug = function() {
    originalConsoleDebug.apply(console, arguments);
    captureToRing('debug', arguments);
  };

  // Expose for debugging
  window.__wiggumErrorCapture = {
    seenErrors: seenErrors,
    sendError: sendError,
    warnSeen: warnSeen,
    logRingBuffer: logRingBuffer
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

