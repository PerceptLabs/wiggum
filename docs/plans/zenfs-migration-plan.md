# WIGGUM FILESYSTEM MIGRATION PLAN: LightningFS → ZenFS

> Migrate Wiggum's virtual filesystem from LightningFS (IndexedDB-only, polling mutex, no SW access) to ZenFS (pluggable backends, Node fs API, OPFS-ready). Eliminates the preview-cache dual-storage hack via ZenFS's Port backend for Service Worker direct filesystem access.

---

## TABLE OF CONTENTS

1. [Why Migrate](#1-why-migrate)
2. [What Is ZenFS](#2-what-is-zenfs)
3. [Current Architecture](#3-current-architecture)
4. [Target Architecture](#4-target-architecture)
5. [Migration Phases](#5-migration-phases)
6. [File Change Index](#6-file-change-index)
7. [Risk Assessment](#7-risk-assessment)
8. [Rollback Strategy](#8-rollback-strategy)
9. [Relationship to Mega Plan](#9-relationship-to-mega-plan)

---

## 1. WHY MIGRATE

### LightningFS Pain Points

LightningFS was purpose-built for isomorphic-git and served Wiggum well initially, but its limitations are now blocking progress:

**Polling-based mutex.** Multi-tab/worker filesystem access is bottlenecked by a polling mutex with 500ms debounce. Only one thread can hold the lock. If Ralph is writing files rapidly, the preview system starves.

**No Service Worker access.** LightningFS maintains an in-memory cache that's invisible to the Service Worker. This forced the creation of `preview-cache.ts` — a *second* IndexedDB store (`wiggum-preview-cache`) that duplicates every built file just so the SW can read them. Two stores, two writes per file, two potential sources of divergence.

**No OPFS path.** The browser's Origin Private File System offers 3-4x faster I/O than IndexedDB and native filesystem semantics, but LightningFS is IndexedDB-only with no pluggable backend system.

**IndexedDB-only persistence.** No way to mount different storage strategies for different paths (e.g., in-memory for `/tmp`, persistent for `/projects`).

**Abandoned upstream.** LightningFS hasn't had meaningful updates since it achieved its narrow goal of supporting isomorphic-git. The README itself now recommends ZenFS as "the most complete option."

### What Migration Solves

| Problem | LightningFS | After ZenFS |
|---------|------------|-------------|
| Preview cache duplication | Two IndexedDB stores | Single fs, SW reads via Port backend over MessageChannel |
| Service Worker file access | postMessage relay chain | Port backend — full fs.readFileSync() in SW context |
| OPFS performance | Not possible | WebAccess backend swap (config change) |
| Multi-mount (tmp vs persist) | Single flat store | `configure({ mounts: {...} })` |
| isomorphic-git compatibility | Custom adapter (194 LOC) | Direct `fs` pass-through (0 LOC) |
| Sync operations | Not supported | All backends support sync |
| Future: SharedArrayBuffer | Not supported | SingleBuffer backend |

---

## 2. WHAT IS ZENFS

ZenFS is the maintained evolution of BrowserFS — a cross-platform library that emulates the Node.js `fs` API with pluggable storage backends. It's the isomorphic-git team's recommended filesystem for browser use.

### Key Facts

- **License:** LGPL-3.0 (safe for linking — only modifications to ZenFS itself must be shared)
- **Packages:** `@zenfs/core` (engine + built-in backends) + `@zenfs/dom` (IndexedDB, WebAccess/OPFS, WebStorage, XML)
- **Activity:** Core updated Jan 26, 2026. @zenfs/dom updated Jan 19, 2026. Actively maintained.
- **Stars:** 355+ on core repo
- **isomorphic-git:** Official docs show ZenFS as the recommended option with working examples

### Relevant Backends

| Backend | Package | What It Does | Wiggum Use |
|---------|---------|-------------|------------|
| `InMemory` | `@zenfs/core` | RAM-only, cleared on reload | `/tmp`, build scratch space |
| `IndexedDB` | `@zenfs/dom` | Persists to IndexedDB | Safe first migration target |
| `WebAccess` | `@zenfs/dom` | File System Access API / OPFS | Future persistent storage |
| `Port` | `@zenfs/core` | MessagePort-based remote fs | Service Worker ↔ main thread |
| `CopyOnWrite` | `@zenfs/core` | Read-only base + writable overlay | Template/starter projects |
| `Fetch` | `@zenfs/core` | HTTP GET read-only | Could serve skill files from CDN |
| `SingleBuffer` | `@zenfs/core` | SharedArrayBuffer-based | Future multi-thread esbuild |

### API Surface

```typescript
import { fs, configure } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

// Configure once at boot
await configure({
  mounts: {
    '/': { backend: IndexedDB },
    '/tmp': InMemory,
  }
});

// Standard Node fs API — works everywhere
fs.writeFileSync('/test.txt', 'hello');
const data = fs.readFileSync('/test.txt', 'utf8');
await fs.promises.readdir('/projects');

// Pass directly to isomorphic-git
import git from 'isomorphic-git';
await git.init({ fs, dir: '/projects/my-app' });
```

No adapter class. No `rawFs` indirection. No `pfs` wrapper. Just `fs`.

---

## 3. CURRENT ARCHITECTURE

### Filesystem Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ Main Thread                                              │
│                                                          │
│  FSContext.tsx                                            │
│    └─ new LightningFSAdapter('wiggum-fs')               │
│         └─ IndexedDB: "wiggum-fs"                        │
│                                                          │
│  Shell commands ──→ JSRuntimeFS interface ──→ LFS adapter │
│  Ralph loop ────→ JSRuntimeFS interface ──→ LFS adapter  │
│  isomorphic-git ─→ adapter.rawFs (raw LightningFS)       │
│                                                          │
│  Build (esbuild) ──→ reads via JSRuntimeFS               │
│    └─ writes built files to:                             │
│         1. LightningFS (wiggum-fs IndexedDB)             │
│         2. preview-cache.ts (wiggum-preview-cache IDB)   │  ← DUPLICATION
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Service Worker (sw.js)                                   │
│                                                          │
│  fetch event ──→ readFromPreviewCache()                  │
│    └─ reads from IndexedDB: "wiggum-preview-cache"       │
│    └─ fallback: postMessage relay → parent → LFS read    │
│                                                          │
│  ⚠ CANNOT access LightningFS directly                    │
│  ⚠ Relies on separate IndexedDB store being in sync     │
└─────────────────────────────────────────────────────────┘
```

### Files Involved

| File | Role | LOC |
|------|------|-----|
| `src/lib/fs/types.ts` | `JSRuntimeFS` interface definition | 141 |
| `src/lib/fs/LightningFSAdapter.ts` | Wraps LightningFS → JSRuntimeFS | 194 |
| `src/lib/fs/LightningFSAdapter.test.ts` | Adapter tests | 187 |
| `src/lib/fs/index.ts` | Barrel exports | 16 |
| `src/contexts/FSContext.tsx` | React context, creates adapter instance | 42 |
| `src/lib/git/Git.ts` | isomorphic-git wrapper, typed to `LightningFSAdapter` | ~250 |
| `src/lib/preview-cache.ts` | Duplicate IndexedDB store for SW access | 130 |
| `public/preview/sw.js` | Service Worker, reads from preview-cache | ~170 |
| `public/preview/client.js` | Relay bridge between SW and parent window | ~170 |
| `src/hooks/usePreview.ts` | Build trigger, writes to both LFS + preview-cache | ~300 |
| `src/lib/build/plugins/fsPlugin.ts` | esbuild plugin, reads via JSRuntimeFS | ~80 |
| `src/lib/shell/commands/*.ts` | 19 shell commands, all use JSRuntimeFS | varies |

### Key Observation: The JSRuntimeFS Interface

Wiggum already has an abstraction layer (`JSRuntimeFS` in `types.ts`). Every shell command, the build system, and Ralph's loop talk to this interface — not to LightningFS directly. The *only* places that touch the actual LightningFS API are:

1. **`LightningFSAdapter.ts`** — the adapter itself
2. **`Git.ts`** — passes `adapter.rawFs` to isomorphic-git (because ig needs the raw object, not promises-only)
3. **`FSContext.tsx`** — constructs the adapter
4. **`preview-cache.ts`** — the duplicate store

This means migration is mostly about replacing the adapter + fixing the Git.ts type, not rewriting consumers.

---

## 4. TARGET ARCHITECTURE

### After Migration

```
┌─────────────────────────────────────────────────────────┐
│ Main Thread                                              │
│                                                          │
│  FSContext.tsx                                            │
│    └─ configure({ backend: IndexedDB })                  │
│    └─ exposes { fs } from '@zenfs/core'                  │
│                                                          │
│  Shell commands ──→ JSRuntimeFS interface ──→ ZenFS fs   │
│  Ralph loop ────→ JSRuntimeFS interface ──→ ZenFS fs     │
│  isomorphic-git ─→ fs (directly, no rawFs needed)        │
│                                                          │
│  Build (esbuild) ──→ reads via JSRuntimeFS               │
│    └─ writes built files to ZenFS (single store)         │
│    └─ NO separate preview-cache write                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Service Worker (sw.js)                                   │
│                                                          │
│  Port backend (Phase 2):                                 │
│    └─ Main thread creates MessageChannel                 │
│    └─ Passes one port to SW via postMessage              │
│    └─ SW configures ZenFS with Port backend              │
│    └─ Full fs.readFileSync() access in SW context        │
│    └─ No custom IDB code, no relay chain                 │
│                                                          │
│  ⚠ Direct IDB read RULED OUT — see "IDB Schema Finding" │
│  postMessage relay chain: DELETED                        │
└─────────────────────────────────────────────────────────┘
```

### What Gets Deleted

| File | Action | Why |
|------|--------|-----|
| `src/lib/fs/LightningFSAdapter.ts` | DELETE | Replaced by thin ZenFS wrapper or direct use |
| `src/lib/fs/LightningFSAdapter.test.ts` | DELETE | Tests rewritten for ZenFS adapter |
| `src/lib/preview-cache.ts` | DELETE (Phase 2) | No longer needed — single store |
| `package.json` | REMOVE `@isomorphic-git/lightning-fs` | Replaced by `@zenfs/core` + `@zenfs/dom` |

### What Gets Simplified

| File | Change |
|------|--------|
| `Git.ts` | Type `fs: LightningFSAdapter` → `fs: typeof import('@zenfs/core').fs`. Remove `rawFs` indirection — pass `fs` directly. |
| `usePreview.ts` | Remove all `writePreviewFile()` calls from build pipeline. SW reads from same store. |
| `sw.js` | Phase 2: use Port backend for full fs access. Delete `openCacheDB()` and all custom IDB code. |
| `client.js` | Simplify or delete the postMessage relay chain. |

---

## 5. MIGRATION PHASES

### Phase 0: Spike / Proof of Concept (1-2 hours)

**Goal:** Verify ZenFS + isomorphic-git + esm.sh work together in Wiggum's environment before committing to migration.

**Tasks:**
1. Create a throwaway branch
2. `pnpm add @zenfs/core @zenfs/dom` in `apps/ide`
3. Create `src/lib/fs/zenfs-spike.ts`:
   ```typescript
   import { configure, fs } from '@zenfs/core';
   import { IndexedDB } from '@zenfs/dom';
   import git from 'isomorphic-git';

   export async function spikeTest() {
     await configure({ mounts: { '/': { backend: IndexedDB } } });

     // Test basic fs ops
     await fs.promises.writeFile('/test.txt', 'hello zenfs');
     const content = await fs.promises.readFile('/test.txt', 'utf8');
     console.log('ZenFS read:', content);

     // Test isomorphic-git compatibility
     await git.init({ fs, dir: '/spike-repo' });
     const files = await git.listFiles({ fs, dir: '/spike-repo' });
     console.log('Git files:', files);

     // Test that existing LightningFS data is still readable
     // (it won't be — different IDB store — but confirms clean separation)
   }
   ```
4. Call `spikeTest()` from a dev button or console
5. Verify: no build errors, no runtime errors, git operations work

**Verification checklist:**
- [ ] `@zenfs/core` and `@zenfs/dom` resolve via pnpm / Vite
- [ ] `fs.promises.writeFile` + `readFile` round-trips correctly
- [ ] `git.init({ fs })` works without adapter wrapping
- [ ] No conflicts with existing LightningFS instance (separate IDB stores)
- [ ] Bundle size delta is acceptable (check with `pnpm build`)

**Exit criteria:** If spike passes, proceed. If ZenFS has import issues with Vite/esm.sh or breaks isomorphic-git, stop and reassess.

---

### Phase 1: ZenFS Adapter — Drop-in Replacement (Half day)

**Goal:** Replace LightningFSAdapter with a ZenFSAdapter that implements the same `JSRuntimeFS` interface, backed by ZenFS's IndexedDB backend. Zero consumer changes.

**Why not delete JSRuntimeFS?** It's the seam that makes this migration safe. Every shell command, the build system, Ralph's loop — they all talk to `JSRuntimeFS`. By keeping the interface and swapping the implementation, nothing downstream breaks. We can delete the interface later if we want, but there's no rush.

#### 1a. Create ZenFSAdapter

**File: `src/lib/fs/ZenFSAdapter.ts` (CREATE)**

A new adapter class that implements `JSRuntimeFS` using ZenFS. Much thinner than the LightningFS version because ZenFS's API is already very close to Node's `fs`.

Key implementation notes:
- Constructor calls `configureSingle({ backend: IndexedDB })` (async, returns promise)
- Expose a static async factory: `ZenFSAdapter.create()` since configure is async
- `readFile`, `writeFile`, `readdir`, `mkdir`, `stat`, `lstat`, `unlink`, `rmdir`, `rename` all delegate to `fs.promises.*` from `@zenfs/core`
- `readdir` with `withFileTypes` — ZenFS supports this natively (unlike LightningFS which needed manual stat calls)
- `exists` — try/catch on `stat` (same pattern)
- Expose `get rawFs()` that returns the ZenFS `fs` object for isomorphic-git

#### 1b. Update FSContext

**File: `src/contexts/FSContext.tsx` (EDIT)**

```typescript
// Before
import { LightningFSAdapter } from '@/lib/fs'
const fs = new LightningFSAdapter(FS_NAME)

// After
import { ZenFSAdapter } from '@/lib/fs'
const fs = await ZenFSAdapter.create(FS_NAME)
```

Since `configure()` is async, FSContext's initialization moves from sync construction in `useEffect` to an async init pattern. The `isReady` / `error` state already handles this.

#### 1c. Update Git.ts Types

**File: `src/lib/git/Git.ts` (EDIT)**

```typescript
// Before
import type { LightningFSAdapter } from '../fs/LightningFSAdapter'
interface GitConstructorConfig {
  fs: LightningFSAdapter
  ...
}
this.rawFs = config.fs.rawFs  // LightningFS instance

// After
import type { ZenFSAdapter } from '../fs/ZenFSAdapter'
interface GitConstructorConfig {
  fs: ZenFSAdapter
  ...
}
this.rawFs = config.fs.rawFs  // ZenFS fs object
```

All `git.*()` calls already use `this.rawFs` — which was `LightningFS` and is now `fs` from `@zenfs/core`. isomorphic-git accepts both.

#### 1d. Update Barrel Exports

**File: `src/lib/fs/index.ts` (EDIT)**

```typescript
// Before
export { LightningFSAdapter } from './LightningFSAdapter'
export type { JSRuntimeFS, ... } from './types'

// After
export { ZenFSAdapter } from './ZenFSAdapter'
export type { JSRuntimeFS, ... } from './types'
```

#### 1e. Rewrite Tests

**File: `src/lib/fs/ZenFSAdapter.test.ts` (CREATE)**

Port existing `LightningFSAdapter.test.ts` tests to use `ZenFSAdapter`. Same test cases, different import. Should be nearly identical since both implement `JSRuntimeFS`.

#### 1f. Remove LightningFS

**File: `package.json` (EDIT)**
- Remove: `@isomorphic-git/lightning-fs`
- Add: `@zenfs/core`, `@zenfs/dom`

**Files to DELETE:**
- `src/lib/fs/LightningFSAdapter.ts`
- `src/lib/fs/LightningFSAdapter.test.ts`

**Verification:**
- [ ] `pnpm dev` starts clean, no import errors
- [ ] Create a new project in Wiggum → files persist across reload
- [ ] Ralph can write files via shell commands
- [ ] `git init` / `git add` / `git commit` work
- [ ] esbuild can read project files and produce build output
- [ ] Preview loads (still using preview-cache path for now)
- [ ] All existing test cases pass with ZenFSAdapter

**Data Migration Note:** Existing projects stored in LightningFS's IndexedDB (`wiggum-fs`) will NOT be accessible through ZenFS's IndexedDB (different store schema). Options:
- Accept the clean break (projects are ephemeral in current state)
- Or write a one-time migration script that reads from old IDB and writes to new (only if users have important saved projects)

---

### Phase 2: Kill the Preview Cache (Half day)

**Goal:** Eliminate the dual-storage pattern. The Service Worker uses ZenFS's `Port` backend to access the filesystem over a `MessageChannel`, deleting `preview-cache.ts` and all custom IDB code in `sw.js`.

#### IDB Schema Finding (Decision Locked)

Investigation of the `@zenfs/dom` source (`src/IndexedDB.ts`, v1.2.7) revealed that ZenFS uses a **block-level storage format**, not a path-keyed store:

```
createDB(name):
  - Opens IDB database named `name` (default: 'zenfs')
  - Creates single object store, also named `name`
  - Keys are NUMERIC IDs (not file paths)
  - Values are Uint8Array blocks (inodes, directory entries, file data)
  - Internal StoreFS layer maps paths → inode IDs → blocks
```

This means **the SW cannot open ZenFS's IndexedDB and read files by path**. The numeric key space represents low-level filesystem structures (superblock, inodes, data blocks) that require the full `StoreFS` deserialization layer to interpret. Direct IDB read is not viable.

**Decision: Use the `Port` backend.** This is a first-class `@zenfs/core` feature designed exactly for this scenario — giving a worker/SW full `fs` access over a `MessagePort`.

#### 2a. Set Up Port Backend Bridge

**File: `src/hooks/usePreview.ts` (EDIT)**

After ZenFS initializes in the main thread, create a `MessageChannel` and pass one port to the SW:

```typescript
// Main thread: after ZenFS configure() completes
const channel = new MessageChannel();

// SW receives port and configures ZenFS Port backend
navigator.serviceWorker.controller?.postMessage(
  { type: 'zenfs-port', port: channel.port2 },
  [channel.port2]
);

// Main thread keeps channel.port1 — ZenFS core handles the rest
// The Port backend on the SW side sends fs operations over the channel
// and the main thread's ZenFS instance resolves them
```

**File: `public/preview/sw.js` (EDIT)**

Replace the entire custom IDB layer with Port backend initialization:

```javascript
import { configure, fs } from '@zenfs/core';
import { Port } from '@zenfs/core';  // built-in, no extra package

let fsReady = false;

self.addEventListener('message', async (event) => {
  if (event.data?.type === 'zenfs-port') {
    await configure({
      mounts: {
        '/': { backend: Port, port: event.data.port }
      }
    });
    fsReady = true;
  }
});

// In fetch handler:
// const content = fs.readFileSync(filePath);
// return new Response(content, { headers: { ... } });
```

This gives the SW full synchronous `fs` access — `readFileSync`, `statSync`, `readdirSync` — all routed through the `MessagePort` to the main thread's ZenFS instance. No custom IDB code, no polling, no cache divergence.

#### 2b. Remove Preview Cache

**File: `src/lib/preview-cache.ts` (DELETE)**

**File: `src/hooks/usePreview.ts` (EDIT)**

Remove all `writePreviewFile()` and `clearPreviewFiles()` calls from the build pipeline. The build writes to ZenFS only. The SW reads via Port backend.

**File: `public/preview/client.js` (EDIT)**

Delete the postMessage relay chain entirely. The Port backend replaces it with a proper `MessageChannel` — no more custom JSON-RPC over `window.postMessage`.

**Verification:**
- [ ] Build a project → preview loads without `writePreviewFile` calls
- [ ] "Open in new tab" still works (SW reads via Port → main thread ZenFS)
- [ ] No `wiggum-preview-cache` IndexedDB store created
- [ ] Network tab shows SW intercepting and serving files
- [ ] Hot reload after Ralph writes a file → preview updates
- [ ] Port backend initialization completes before first fetch event fires

**Known consideration:** The Port backend requires the main thread to be alive for the SW to resolve fs operations. If the main thread tab is closed while the SW is still serving cached requests, reads will fail. This is the same limitation as the current postMessage relay, so it's not a regression.

---

### Phase 3: Multi-Mount Architecture (Optional, future)

**Goal:** Use ZenFS's mount system to separate concerns.

```typescript
await configure({
  mounts: {
    '/projects': { backend: IndexedDB },  // persistent project files
    '/tmp': InMemory,                      // build artifacts, scratch
    // Future: '/projects' → WebAccess (OPFS) for 3-4x speed
  }
});
```

This is not required for the migration but showcases ZenFS's power. The config change is trivial once Phase 1 is complete.

#### Future OPFS Upgrade

When ready to move from IndexedDB to OPFS for the performance boost:

```typescript
import { WebAccess } from '@zenfs/dom';

await configure({
  mounts: {
    '/projects': { backend: WebAccess },  // OPFS-backed
    '/tmp': InMemory,
  }
});
```

One config line changes. All consumers (shell, Ralph, git, build) are unaffected.

---

### Phase 4: Cleanup & Optimization (Optional, future)

**Tasks:**
- Consider whether `JSRuntimeFS` interface is still needed or if code can use `@zenfs/core`'s `fs` directly
- Remove `ZenFSAdapter` class entirely if direct `fs` use works everywhere
- Explore `SingleBuffer` backend for SharedArrayBuffer-based esbuild acceleration
- Explore `CopyOnWrite` for template/starter projects (read-only base + user writes)

---

## 6. FILE CHANGE INDEX

### Phase 0 (Spike)

| File | Action |
|------|--------|
| `src/lib/fs/zenfs-spike.ts` | CREATE (temporary, delete after) |

### Phase 1 (Drop-in Replacement)

| File | Action |
|------|--------|
| `src/lib/fs/ZenFSAdapter.ts` | CREATE |
| `src/lib/fs/ZenFSAdapter.test.ts` | CREATE |
| `src/lib/fs/index.ts` | EDIT (swap exports) |
| `src/contexts/FSContext.tsx` | EDIT (async init, new import) |
| `src/lib/git/Git.ts` | EDIT (type change, remove rawFs indirection) |
| `src/lib/fs/LightningFSAdapter.ts` | DELETE |
| `src/lib/fs/LightningFSAdapter.test.ts` | DELETE |
| `apps/ide/package.json` | EDIT (swap dependencies) |

### Phase 2 (Kill Preview Cache)

| File | Action |
|------|--------|
| `src/lib/preview-cache.ts` | DELETE |
| `public/preview/sw.js` | EDIT (replace custom IDB with Port backend init) |
| `public/preview/client.js` | EDIT (delete postMessage relay, replace with MessageChannel setup) |
| `src/hooks/usePreview.ts` | EDIT (remove preview-cache writes, add MessageChannel creation) |

### Total

- **Phase 1:** 2 creates, 3 edits, 2 deletes
- **Phase 2:** 1 delete, 3 edits
- **Overall:** 2 creates, 6 edits, 3 deletes = **11 file operations**

---

## 7. RISK ASSESSMENT

### Low Risk

| Risk | Mitigation |
|------|-----------|
| ZenFS API doesn't match JSRuntimeFS | ZenFS emulates Node `fs` — our interface is a strict subset of that |
| Bundle size increase | ZenFS core is ~30KB min+gz. We remove LightningFS (~8KB). Net +22KB. Acceptable. |
| Test compatibility | Same interface, same test cases. Port tests mechanically. |

### Medium Risk

| Risk | Mitigation |
|------|-----------|
| Port backend latency (SW → main thread round-trip) | Port uses MessageChannel (faster than postMessage relay). Benchmark in Phase 2. If too slow, consider pre-caching built files in a simple SW cache. |
| Async initialization (configure is async) | FSContext already has `isReady` state. Just await in the useEffect. |
| Existing project data loss | Accept clean break (projects are ephemeral) or write migration script. |
| esm.sh import compatibility | Phase 0 spike validates this before any production changes. |
| SW fetch fires before Port is initialized | Add a `fsReady` gate in the SW fetch handler. Queue or fallback pending requests until Port backend completes setup. |

### High Risk (but unlikely)

| Risk | Mitigation |
|------|-----------|
| isomorphic-git incompatible with ZenFS fs object | isomorphic-git docs explicitly recommend ZenFS. Their own examples use it. If it breaks, it's a ig bug, not ours. |
| ZenFS abandoned | LGPL means we can fork. But 355 stars, active commits in Jan 2026, and corporate sponsor (deco.cx) suggest this won't happen soon. |

---

## 8. ROLLBACK STRATEGY

### Phase 0 (Spike)

Throwaway branch. Just delete it.

### Phase 1 (Drop-in Replacement)

Git revert. The JSRuntimeFS interface means consumers don't change — reverting the adapter swap and FSContext change restores LightningFS. Keep the deleted LightningFSAdapter files in git history.

### Phase 2 (Kill Preview Cache)

Harder to revert because `preview-cache.ts` is deleted and `usePreview.ts` is modified. Recommend:
- Tag the commit before Phase 2 starts
- Keep `preview-cache.ts` in a `_deprecated/` folder for one release cycle before final deletion
- Or just rely on git history

---

## 9. RELATIONSHIP TO MEGA PLAN

The ZenFS migration is **independent of** but **complementary to** the existing 14-step Mega Plan. Here's how they interact:

### No Conflicts

The Mega Plan covers:
- WS1: Frontend design skill → no fs changes
- WS2: Theme presets → no fs changes
- WS3: Sacred geometry → no fs changes
- WS4: Composition intelligence → no fs changes
- WS5: Write-time slop detection → reads files via JSRuntimeFS (unaffected by backend swap)
- WS6: Shell parser fixes → shell commands use JSRuntimeFS (unaffected)
- WS7: Preview system fixes → **OVERLAPS** with Phase 2

### WS7 Overlap

The Mega Plan's WS7 includes:
1. Fix Tailwind race condition in `client.js`
2. Add skills discovery to HEARTBEAT
3. Add dark mode examples to theming skill

Items 2 and 3 are unaffected. Item 1 (Tailwind race condition) is about script load ordering in `client.js`, which is orthogonal to the storage layer change. However, since Phase 2 of the ZenFS migration also modifies `client.js` (to simplify the relay), these changes should be **coordinated**:

**Recommendation:** Do WS7 Fix 1 (Tailwind race) first during Mega Plan execution. Then do ZenFS Phase 2 after, which modifies `client.js` further. This avoids merge conflicts.

### Execution Order

```
1. Mega Plan Phase 1 (skills, themes, preview fixes)  ← includes WS7
2. ZenFS Phase 0 (spike)
3. ZenFS Phase 1 (adapter swap)
4. Mega Plan Phase 2 (shell fixes, composition)
5. ZenFS Phase 2 (kill preview cache)
6. Mega Plan Phase 3+ (tree-sitter, advanced)
7. ZenFS Phase 3+ (multi-mount, OPFS)
```

This interleaving ensures the Mega Plan's preview fixes land first, then ZenFS simplifies the storage layer, then subsequent Mega Plan work benefits from the cleaner architecture.

---

## APPENDIX A: CC PROMPT STRATEGY

For Claude Code implementation, this migration would require **3 prompts**:

### Prompt 1: Phase 0 Spike
> "Create a spike test for ZenFS in Wiggum. Install `@zenfs/core` and `@zenfs/dom`. Create `src/lib/fs/zenfs-spike.ts` that configures ZenFS with IndexedDB backend, writes/reads a file, and runs `git.init` with isomorphic-git using the ZenFS `fs` object directly. Wire it to a temporary dev button. Verify no build errors."

### Prompt 2: Phase 1 Adapter Swap
> "Replace LightningFSAdapter with ZenFSAdapter. The new adapter implements the existing `JSRuntimeFS` interface using `@zenfs/core` and `@zenfs/dom`'s IndexedDB backend. Update FSContext.tsx for async initialization, update Git.ts types, port tests, remove LightningFS dependency. All shell commands and the build system use JSRuntimeFS so they should not change."

### Prompt 3: Phase 2 Kill Preview Cache
> "Replace the preview-cache dual-storage pattern with ZenFS's Port backend. In the main thread (usePreview.ts), after ZenFS configures, create a MessageChannel and send one port to the SW. In sw.js, receive the port and configure ZenFS with the Port backend — this gives the SW full `fs.readFileSync()` access. Remove `preview-cache.ts`, all `writePreviewFile()` calls, and the postMessage relay chain in `client.js`. The SW should serve preview files by reading from the Port-backed ZenFS instance. Note: ZenFS IndexedDB uses block-level storage (numeric inode IDs, not path keys) so direct IDB read is not an option — the Port backend is required."

---

## APPENDIX B: DECISION LOG

| Decision | Options Considered | Chosen | Why |
|----------|-------------------|--------|-----|
| Migration target | Raw OPFS, RxDB, ZenFS | ZenFS | Node fs compat, isomorphic-git recommended, pluggable backends, LGPL license, active maintenance |
| Keep JSRuntimeFS interface? | Keep / Delete | Keep (for now) | Provides safe migration seam. Can delete later. |
| IndexedDB or OPFS first? | IndexedDB → OPFS, OPFS directly | IndexedDB first | Safer migration — same storage tech as LightningFS. OPFS is a config swap later. |
| SW access strategy | Direct IDB read, Port backend, keep postMessage | Port backend | Source analysis of `@zenfs/dom` IndexedDB.ts revealed block-level storage (numeric inode IDs, not path keys). SW cannot interpret StoreFS format without full core library. Port backend is the designed solution for cross-context fs access. |
| Existing data migration | Migration script, clean break | Clean break | Projects are ephemeral in current Wiggum state. No users depending on persistence yet. |
