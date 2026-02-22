# Preview Hardening Addendum — ZenFS Phase 2

> Sub-tasks for the ZenFS Phase 2 preview bridge rebuild. These items add SPA navigation tracking, Service Worker registration defense, and console capture hardening to the preview iframe infrastructure. Derived from Shakespeare competitive analysis — their preview system implements all three; Wiggum's current implementation has gaps.
>
> **Parent spec:** `zenfs-migration-plan.md` Phase 2 ("Kill preview cache")
> **Roadmap position:** Stage 7, Step 7.6
> **Effort:** +2-3 hours added to ZenFS Phase 2 (was 0.5 day, now ~1 day)

---

## 1. SPA NAVIGATION TRACKING

### Problem

Wiggum's preview iframe renders React apps with client-side routing (react-router, custom history). The parent IDE has no idea which route is active. This means:

- No URL bar showing the preview's current route
- No way to navigate the preview from outside the iframe
- No route restoration on refresh — preview always reloads to `/`
- No route-aware quality gates ("your /settings route renders nothing")

### Implementation

**File: `public/preview/client.js` (part of ZenFS Phase 2 rebuild)**

Add a `NavigationHandler` class that:

1. **Patches `history.pushState` and `history.replaceState`** — wraps both to extract the semantic path after each call and notify the parent.

2. **Listens for `popstate` and `hashchange`** — catches back/forward navigation and hash-only routing.

3. **Reports state to parent via postMessage:**
```javascript
window.parent.postMessage({
  jsonrpc: "2.0",
  method: "updateNavigationState",
  params: {
    url: semanticPath,
    canGoBack: history.length > 1,
    canGoForward: false
  }
}, "*");
```

4. **Accepts navigation commands from parent:**
```javascript
// Parent can send:
{ jsonrpc: "2.0", method: "navigate", params: { url: "/settings" } }
{ jsonrpc: "2.0", method: "refresh" }
```

5. **Persists route across refresh** using `sessionStorage`:
```javascript
// On refresh: save current path
sessionStorage.setItem('iframe_initial_path', currentSemanticPath);
// On load: restore and navigate
const stored = sessionStorage.getItem('iframe_initial_path');
if (stored) { navigate(stored); sessionStorage.removeItem('iframe_initial_path'); }
```

**~50-60 LOC.** No dependencies. Contained in the client.js rebuild.

### Parent-Side Consumer (Deferred)

The parent needs a component to display the route and send navigation commands. This is **not part of ZenFS Phase 2** — it is UI work that can ship later. The bridge sends the data regardless; the parent can ignore it until the UI exists.

Candidate future location: the preview toolbar (where reload button already lives). Add a read-only URL display showing the iframe's current route, plus back/forward buttons wired to the navigate/history messages.

### Verification

- [ ] SPA route changes in preview send `updateNavigationState` to parent
- [ ] Parent-initiated `navigate` triggers route change in iframe
- [ ] Route survives refresh via sessionStorage round-trip
- [ ] Hash-only routing (e.g., `/#/about`) is tracked correctly
- [ ] Non-SPA apps (no router) report `/` and do not error

---

## 2. SERVICE WORKER REGISTRATION BLOCKING

### Problem

If Ralph generates a PWA-style app or any code that calls `navigator.serviceWorker.register()`, the user's app could register its own Service Worker, hijacking the fetch pipeline. The platform's SW (which serves files from ZenFS) would be replaced or scoped-out. Preview breaks silently.

### Implementation

**File: `public/preview/client.js` (part of ZenFS Phase 2 rebuild)**

After the platform's SW is registered and active, replace the registration API:

```javascript
blockFutureRegistrations() {
  const platformSW = navigator.serviceWorker.controller;
  navigator.serviceWorker.register = () => {
    console.warn("[Wiggum] Blocked app ServiceWorker registration in preview");
    return Promise.resolve({
      scope: "/",
      active: platformSW,
      installing: null,
      waiting: null,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  };
}
```

The app's `register()` call succeeds (returns a fake registration object) so it does not throw errors or trigger retry loops. The platform's SW stays in control.

The `console.warn` is deliberate — captured by the console interceptor and visible in `.ralph/console.md`. If Ralph is debugging "my SW isn't working," the message explains why.

**~15 LOC.** Call once after `navigator.serviceWorker.ready` resolves.

### Verification

- [ ] App code calling `navigator.serviceWorker.register('/my-sw.js')` does not replace platform SW
- [ ] The fake registration object does not throw when the app accesses `.active` or `.scope`
- [ ] Console warning appears in `.ralph/console.md`
- [ ] Platform SW continues serving files from ZenFS after blocked registration attempt
- [ ] PWA manifest detection in app code does not crash

---

## 3. CONSOLE CAPTURE HARDENING

### Problem

Wiggum's console capture (quality gate #8, `console-capture`) forwards console output to `.ralph/console.md`. Comparing against Shakespeare's implementation reveals potential gaps:

- **Error object serialization** — `String(error)` loses the stack trace. Should extract `name`, `message`, `stack` before serializing.
- **Unhandled promise rejections** — The most common failure in React apps (forgotten `.catch()` on fetch, async handlers that throw). If only `window.onerror` is captured, unhandled rejections are silent.
- **postMessage failure resilience** — If the iframe is mid-teardown when a console message fires, `postMessage` can throw. Should catch and retry once.

### Implementation

**File: existing console capture mechanism (verify during ZenFS Phase 2)**

This is a **review task**, not new code. During the ZenFS Phase 2 rebuild of `client.js`, verify the console interceptor handles:

1. **Error serialization:**
```javascript
if (arg instanceof Error) {
  return JSON.stringify({ name: arg.name, message: arg.message, stack: arg.stack });
}
```

2. **Unhandled rejection capture:**
```javascript
window.addEventListener('unhandledrejection', (event) => {
  sendToParent({
    level: "error",
    message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
    stack: event.reason?.stack
  });
});
```

3. **postMessage retry:**
```javascript
try {
  window.parent.postMessage(payload, "*");
} catch {
  setTimeout(() => {
    try { window.parent.postMessage(payload, "*"); } catch { /* give up */ }
  }, 100);
}
```

If the existing implementation already handles all three — no changes needed. If not, fix during the `client.js` rebuild. **Do not create a separate task for this.**

### Verification

- [ ] `throw new Error("test")` in preview app shows full stack trace in `.ralph/console.md`
- [ ] `fetch('/bad').then(r => r.json())` without `.catch()` captured as unhandled rejection
- [ ] Console messages during iframe teardown do not cause uncaught exceptions in the bridge

---

## 4. RELATIONSHIP TO EXISTING PLANS

| Item | Parent Plan | Phase | Impact |
|------|-------------|-------|--------|
| SPA navigation tracking | ZenFS Migration | Phase 2 | Adds ~50 LOC to client.js rebuild |
| SW registration blocking | ZenFS Migration | Phase 2 | Adds ~15 LOC to client.js rebuild |
| Console capture hardening | wiggum-master (gate #8) | Review during ZenFS Ph 2 | Fix-if-needed, 0-20 LOC |
| Hono full-stack plan | hono-fullstack-plan.md | Phase 1c | SW blocking prevents app SW from conflicting with API SW |
| Visual review plan | wiggum-visual-review-plan.md | Phase 1 | Navigation tracking enables route-aware visual probes (future) |

### What This Does NOT Cover

- **Parent-side URL bar UI** — deferred to a future UI task. The bridge sends data; consuming it is separate work.
- **Route-aware quality gates** — requires planning language integration (which routes exist in plan.tsx). Deferred to Stage 6+.
- **Preview "open in new tab"** — already works via SW. Navigation tracking improves it (restores route) but core mechanism is ZenFS Phase 2 Port backend.

---

## 5. CC PROMPT INTEGRATION

These items fold into the existing ZenFS Phase 2 CC prompt. Add to the prompt:

```
ADDITIONAL: While rebuilding public/preview/client.js for the Port backend:

1. Add NavigationHandler class:
   - Patch history.pushState and history.replaceState
   - Listen for popstate and hashchange
   - Report route changes to parent via postMessage (jsonrpc "updateNavigationState")
   - Accept "navigate" and "refresh" commands from parent
   - Persist route across refresh via sessionStorage

2. Add blockFutureRegistrations():
   - After platform SW is ready, replace navigator.serviceWorker.register with no-op
   - Return fake registration object so app code does not throw
   - console.warn to explain the block (captured by console interceptor)

3. Verify console interceptor:
   - Error objects serialized with name/message/stack (not just String())
   - window unhandledrejection listener present
   - postMessage wrapped in try/catch with single retry

These are sub-tasks of the client.js rebuild, not separate phases.
```
