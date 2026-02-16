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

  // ---- Iframe Probe: respond to parent layout/theme queries ----
  var THEME_VARS = [
    'background','foreground','primary','primary-foreground','secondary','secondary-foreground',
    'muted','muted-foreground','accent','accent-foreground','destructive','destructive-foreground',
    'card','card-foreground','popover','popover-foreground','border','input','ring',
    'sidebar-background','sidebar-foreground','sidebar-primary','sidebar-primary-foreground',
    'sidebar-accent','sidebar-accent-foreground','sidebar-border','sidebar-ring',
    'chart-1','chart-2','chart-3','chart-4','chart-5'
  ];

  window.addEventListener('message', function(event) {
    if (!event.data || event.data.type !== 'wiggum-probe-request') return;
    var probeId = event.data.id;
    try {
      var computedTheme = {};
      var rootStyle = getComputedStyle(document.documentElement);
      for (var v = 0; v < THEME_VARS.length; v++) {
        var val = rootStyle.getPropertyValue('--' + THEME_VARS[v]).trim();
        if (val) computedTheme[THEME_VARS[v]] = val;
      }

      var sections = [];
      var semanticEls = document.querySelectorAll('main,section,header,footer,nav,article,aside');
      for (var s = 0; s < semanticEls.length; s++) {
        var el = semanticEls[s];
        var rect = el.getBoundingClientRect();
        sections.push({
          tag: el.tagName.toLowerCase(), id: el.id || undefined,
          className: el.className ? String(el.className).substring(0, 100) : undefined,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          childCount: el.children.length
        });
      }

      var interEls = document.querySelectorAll('button,a[href],input,select,textarea,[role="button"]');
      var interactions = [];
      for (var i = 0; i < interEls.length; i++) {
        var ie = interEls[i];
        interactions.push({
          tag: ie.tagName.toLowerCase(), type: ie.getAttribute('type') || ie.tagName.toLowerCase(),
          text: (ie.textContent || '').trim().substring(0, 50) || undefined,
          hasHandler: ie.onclick !== null
        });
      }

      var layoutIssues = [];
      if (document.body.scrollWidth > window.innerWidth + 2) {
        layoutIssues.push({ type: 'overflow', element: 'body', details: 'horizontal scroll (' + document.body.scrollWidth + 'px > ' + window.innerWidth + 'px)' });
      }
      for (var z = 0; z < sections.length; z++) {
        if (sections[z].rect.width === 0 || sections[z].rect.height === 0) {
          layoutIssues.push({ type: 'zero-size', element: sections[z].tag + (sections[z].id ? '#' + sections[z].id : ''), details: sections[z].rect.width + 'x' + sections[z].rect.height });
        }
      }
      var root = document.getElementById('root') || document.body;
      var flowChildren = [];
      for (var fc = 0; fc < root.children.length; fc++) {
        var cs = getComputedStyle(root.children[fc]);
        if (cs.position !== 'absolute' && cs.position !== 'fixed' && cs.position !== 'sticky') flowChildren.push(root.children[fc]);
      }
      for (var a = 0; a < flowChildren.length; a++) {
        var rA = flowChildren[a].getBoundingClientRect();
        for (var b = a + 1; b < flowChildren.length; b++) {
          var rB = flowChildren[b].getBoundingClientRect();
          if (rA.bottom > rB.top + 1 && rA.top < rB.bottom - 1 && rA.right > rB.left + 1 && rA.left < rB.right - 1) {
            layoutIssues.push({ type: 'overlap', element: flowChildren[a].tagName.toLowerCase() + ' + ' + flowChildren[b].tagName.toLowerCase(), details: 'flow siblings overlap' });
          }
        }
      }

      window.parent.postMessage({ type: 'wiggum-probe-result', id: probeId, result: {
        rendered: true, sections: sections, interactions: interactions, layoutIssues: layoutIssues, computedTheme: computedTheme
      }}, '*');
    } catch (probeErr) {
      window.parent.postMessage({ type: 'wiggum-probe-result', id: probeId, result: {
        rendered: false, sections: [], interactions: [], layoutIssues: [], computedTheme: {}
      }}, '*');
    }
  });
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

