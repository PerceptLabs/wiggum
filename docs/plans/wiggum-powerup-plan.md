# Wiggum Power-Up Plan
## Workbox PWA + esm.sh Patterns + Browser Tailwind + Design Intelligence

**Status:** Ready for implementation  
**Scope:** Performance, offline capability, build speed, Tailwind compilation, package discovery, design quality  
**What stays untouched:** All theme presets, color derivation logic, neobrutalist.css, esbuild-wasm as primary bundler, esmPlugin, wiggumStackPlugin, quality gates, Ralph loop architecture

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: PWA Shell (Workbox Precache)              │
│  IDE assets + esbuild.wasm + SWC WASM + oxide-wasm  │
│  → Repeat visit <500ms, offline IDE boot            │
├─────────────────────────────────────────────────────┤
│  LAYER 2: ESM Module Cache (Workbox Runtime)        │
│  CacheFirst for esm.sh URLs + precached library     │
│  + Package Registry (Orama-indexed discovery)       │
│  → Builds survive refresh, offline builds work      │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Build Intelligence                        │
│  Content-hash cache + import maps + SWC fast path   │
│  → Skip redundant rebuilds, sub-5ms hot reload      │
├─────────────────────────────────────────────────────┤
│  LAYER 4: Browser Tailwind (oxide-wasm)             │
│  Full Tailwind v4 JIT compilation in browser        │
│  → Real CSS output, custom @theme, offline          │
├─────────────────────────────────────────────────────┤
│  LAYER 5: Design Intelligence                       │
│  Component decision tree + personality briefs +     │
│  composition patterns (from Wednesday + Memoria)    │
│  → Ralph assembles UIs with design intent, not slop │
└─────────────────────────────────────────────────────┘
```

**esbuild-wasm remains the primary bundler.** All additions are either caching layers around the existing pipeline or optional fast paths for specific scenarios.

---

## Layer 1: PWA Shell Precache

### What
Workbox precaches the IDE's built assets so repeat visits load from disk, not network. This includes the 2.3MB esbuild.wasm binary that currently re-downloads every visit.

### Implementation

**Dependencies:** `vite-plugin-pwa`, `workbox-window`

**vite.config.ts additions:**
```ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    // ...existing plugins
    VitePWA({
      registerType: 'prompt',        // Show update toast, don't auto-reload
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB for esbuild.wasm
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/preview/], // Don't conflict with preview SW
      },
      manifest: {
        name: 'Wiggum IDE',
        short_name: 'Wiggum',
        display: 'standalone',
        theme_color: '#000000',
      },
    }),
  ],
})
```

**Service worker scope isolation:**
- Workbox SW at `/` → IDE shell assets
- Existing `preview/sw.js` at `/preview/` → preview files from IndexedDB

No conflict. Each SW owns its scope.

**PWAUpdatePrompt component:**
```tsx
// Uses useRegisterSW from 'virtual:pwa-register/react'
// Shows a toast when new version available: "Update available — click to refresh"
```

### Result
| Metric | Before | After |
|--------|--------|-------|
| Repeat visit cold start | 3-5s | <500ms |
| esbuild.wasm fetch | 2.3MB every visit | Cached |
| Offline IDE boot | White screen | Works |

### CC Prompt Guidance
- Add vite-plugin-pwa to package.json devDependencies
- Configure in vite.config.ts with settings above
- Create PWAUpdatePrompt component using useRegisterSW hook
- Test: hard refresh should show cached assets in Network panel

---

## Layer 2: ESM Module Runtime Cache

### What
Workbox runtime caching for esm.sh URLs using CacheFirst strategy. Modules persist in Cache Storage across page refreshes. On first IDE visit, precache the full extended library (~2.1MB) so Ralph can import any package instantly.

### Core Modules (always needed, ~1.5MB)
- react, react-dom
- lucide-react
- clsx, tailwind-merge, class-variance-authority
- recharts

### Extended Library — Behavior (~500KB)
| Package | Size | When Ralph Should Reach For It |
|---------|------|-------------------------------|
| motion (via `motion/react`) | ~80KB | Layout animations, gestures, AnimatePresence, spring physics. NOT for simple fades (CSS handles those) |
| react-hook-form + zod + @hookform/resolvers | ~90KB | Multi-field forms with validation. NOT for single input fields |
| @tanstack/react-table | ~55KB | Sorting, filtering, pagination, virtual rows. NOT for <50 row tables (native table is fine) |
| @dnd-kit/core + @dnd-kit/sortable | ~55KB | Kanban boards, reorderable lists, drag handles |
| date-fns | ~70KB | Relative time, locale formatting, date math. NOT for simple formatting (Intl.DateTimeFormat works) |
| react-markdown + remark-gfm | ~50KB | Render user content, blog posts, documentation |
| zustand | ~8KB | Persistent cross-component state when prop drilling gets painful |
| @tanstack/react-query | ~60KB | Caching, retries, optimistic updates for API-driven apps |
| @tanstack/react-virtual | ~10KB | Render 10k+ items without killing browser |
| prism-react-renderer | ~25KB | Syntax highlighting for code blocks |

### Extended Library — Visual (~150KB)
| Package | Size | When Ralph Should Reach For It |
|---------|------|-------------------------------|
| @phosphor-icons/react | ~30KB | 7,000+ icons, 6 weights (thin→fill), brand coverage beyond Lucide |
| react-type-animation | ~5KB | Typewriter effect for hero headlines |
| canvas-confetti | ~8KB | Celebration confetti (signups, completions) |
| react-countup | ~8KB | Animated number counters for stats sections |
| cmdk | ~12KB | Command palette (⌘K) |
| vaul | ~10KB | Drawer with snap points, mobile-native feel |
| embla-carousel-react | ~20KB | Smooth accessible carousels |
| react-masonry-css | ~3KB | Pinterest-style masonry grid |
| react-wrap-balancer | ~2KB | Apple-style balanced text wrapping |
| react-medium-image-zoom | ~10KB | Medium-style image zoom on click |
| react-player | ~25KB | YouTube/Vimeo/file video embedding |
| qrcode.react | ~15KB | QR code generation |

### Extended Library — Optional (Verify Before Caching)

These packages have complex dependency trees or known esm.sh edge cases. Test import in Wiggum's preview iframe before adding to MODULE_BUNDLES.

| Package | Size | Risk | Why Verify |
|---------|------|------|------------|
| @tiptap/react + @tiptap/starter-kit | ~80KB | High | ProseMirror deep transitive dependency tree, may need manual esm.sh bundle mode |

### esm.sh Compatibility Verification

Before adding any package to MODULE_BUNDLES, verify it imports correctly in Wiggum's preview iframe:

1. **Safe tier** (skip verification) — dnd-kit, react-hook-form, zod, @tanstack/react-virtual, all visual libraries. These are well-tested with esm.sh.
2. **Verify tier** — `motion` (rebranded from framer-motion, subpath `motion/react` needs testing), tiptap (ProseMirror dependency chain).
3. **Test method** — Create minimal preview project, import the package, confirm build succeeds and component renders. ~30 minutes total.

### Implementation

**Workbox runtime caching (in vite.config.ts):**
```ts
workbox: {
  runtimeCaching: [{
    urlPattern: /^https:\/\/esm\.sh\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'wiggum-esm-modules',
      expiration: {
        maxEntries: 500,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
    },
  }],
}
```

**Module pre-warmer (new file: `src/lib/module-prewarmer.ts`):**
- MODULE_BUNDLES: core, icons, charts, forms, animation, data, visual-effects
- PREWARM_PROFILES: minimal, dashboard, marketing, fullstack
- Functions: `prewarmBundle()`, `prewarmProfile()`, `getCacheStatus()`
- Fires on first IDE visit after Workbox activates
- Background fetch with `requestIdleCallback` — doesn't block UI

**Shell commands:**
- `modules status [bundle]` — show cache status per bundle
- `modules warm <profile|bundle>` — pre-fetch modules
- `modules clear` — clear esm.sh cache
- `cache-stats` — overall cache statistics

### Lockfile synergy
Lockfile pins versions → deterministic esm.sh URLs → cache hits. When lockfile changes (new dep version), new URLs naturally fetch fresh and cache. Old URLs expire after 30 days.

### Selective imports via ?exports=
The esmPlugin can append `?exports=` based on static analysis of Ralph's import statements:
```
import { format, addDays } from 'date-fns'
→ https://esm.sh/date-fns@4.1.0?exports=format,addDays
```
CDN-level tree shaking — 10-50% smaller module payloads.

### Result
| Metric | Before | After |
|--------|--------|-------|
| First build (deps) | 15-30 esm.sh fetches, 2-5s | 0 fetches if precached, <100ms |
| Rebuild after refresh | 15-30 fetches again | 0 (Cache Storage) |
| esm.sh outage | Builds break | Cached modules still work |
| Extended library access | Ralph doesn't know what's available | 25+ packages, documented, instant |
| Package discovery | Ralph guesses or ignores | `grep package "drag"` → structured result |

### CC Prompt Guidance
- Add runtimeCaching to existing VitePWA config
- Create module-prewarmer.ts with bundle definitions and profiles
- Add SW activation hook that calls prewarm on first visit
- Create extended-libraries skill documenting all packages with when-to-use
- Add modules and cache-stats shell commands
- Modify esmPlugin to append ?exports= when import specifiers are statically analyzable
- Verify `motion/react` and tiptap import compatibility before adding to precache list
- Create package registry (see Package Registry section below) and index into Orama

---

## Layer 3: Build Intelligence

Three independent improvements to the build pipeline. esbuild-wasm stays as the bundler for all of them.

### 3A. Content-Hash Build Cache

**Problem:** Every preview refresh triggers a full esbuild rebuild, even if no files changed.

**Solution:** Hash the combined source files. Store `hash → bundled output` in IndexedDB. If hash matches → serve cached bundle instantly (0ms rebuild).

```
Source files hash: abc123 → bundled JS stored in IndexedDB
Ralph edits one file → new hash: abc124 → full esbuild rebuild
Ralph undoes edit → hash: abc123 → cache hit, skip rebuild
User refreshes page → files in LightningFS unchanged → cache hit, instant preview
```

**Implementation:**
- Before calling `buildProject()`, compute SHA-256 of all source files concatenated
- Check IndexedDB `build-cache` store for matching hash
- Hit → return cached bundle, skip esbuild entirely
- Miss → run esbuild as normal, store result keyed by hash
- Cache size limit: keep last 10 builds, evict oldest

**Impact:** Page refresh goes from "rebuild everything" to "instant preview restore". Ralph's undo/redo across iterations hits cache naturally.

### 3B. Import Maps in Preview Iframe

**Problem:** esmPlugin intercepts every `import React from 'react'` at build time, rewrites to esm.sh URL. This means esbuild processes every dependency.

**Solution:** Generate an import map from the lockfile and inject it into the preview iframe's HTML. Mark external deps in esbuild so they pass through unresolved. The browser resolves them via import map.

```html
<!-- Generated from lockfile, injected into preview HTML -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19.2.0",
    "react-dom/client": "https://esm.sh/react-dom@19.2.0/client",
    "motion/react": "https://esm.sh/motion@11.15.0/react",
    "lucide-react": "https://esm.sh/lucide-react@0.300.0"
  }
}
</script>
```

**What esbuild still handles:**
- `@/` path resolution (virtual filesystem)
- `@wiggum/stack` imports (wiggumStackPlugin bundles these)
- TSX → JS transformation
- Bundling user's source files together

**What the browser handles:**
- Resolving `react`, `react-dom`, `motion/react`, etc. via import map
- Loading those modules from esm.sh (served from Workbox cache)

**Impact:** Faster builds (esbuild skips processing npm deps), simpler esmPlugin, and Workbox cached modules serve directly to the browser without esbuild as middleman.

### 3C. SWC Fast Path (Single-File Hot Reload)

**Problem:** Changing a single CSS class in one file triggers a full esbuild rebuild (~500ms even with cache).

**Solution:** For single-file edits that don't change imports, use @esm.sh/tsx (SWC WASM, ~50KB) to retranspile just that file and hot-inject into the preview.

**When SWC fast path fires:**
- Single file edited
- No new `import` statements added/removed
- No new dependencies introduced

**When full esbuild rebuild fires:**
- Import graph changed (new dependency, removed import)
- Multiple files edited simultaneously
- Ralph requests quality-gate build
- First build of a project

```
Edit padding in HeroSection.tsx
  → SWC transforms just that file (~5ms)
  → Hot-inject into preview iframe
  → No full rebuild

Add `import { motion } from 'motion/react'` to HeroSection.tsx
  → Import graph changed
  → Full esbuild rebuild (~300ms with import maps + cache)
```

**Implementation:**
- `@esm.sh/tsx` WASM precached with PWA shell (~50KB)
- Diff detection: compare import statements before/after edit
- If imports unchanged → SWC transform → inject via preview postMessage
- If imports changed → fall through to full esbuild pipeline

**Impact:** Sub-5ms iteration for styling/layout changes. Ralph's loop gets dramatically faster for the most common edit type (tweaking existing components).

---

## Layer 4: Browser Tailwind via oxide-wasm

> **A1.5 dependency:** Tailwind v4 CDN (`@tailwindcss/browser@4` via esm.sh) and `@theme` directive are already in place from Phase A1.5. This layer moves Tailwind compilation from runtime (CDN script in preview) to build-time (oxide-wasm in esbuild pipeline). The v4 API surface is already live — this is a performance/resilience upgrade, not a v4 introduction.

### What
Real Tailwind CSS v4 JIT compilation running in the browser via WASM. Replaces the CDN script currently used in preview with build-time compilation.

### Why This Matters
The CDN play script (`<script src="https://cdn.tailwindcss.com">`) is a runtime scanner that handles most utilities but:
- Misses edge cases and newer Tailwind v4 features
- Can't process custom `@theme` directives
- Generates CSS at runtime (FOUC risk)
- Requires network (breaks offline)

oxide-wasm gives:
- **Full Tailwind v4 feature set** — every utility, every variant, every modifier
- **JIT compilation** — only generates CSS for classes actually used
- **Custom @theme support** — connects directly to Wiggum's theme presets
- **Offline** — once precached, no network needed
- **Pre-compiled CSS** — inject at build time, no FOUC

### How It Connects to Existing Themes

**Zero theme rewrites.** oxide-wasm reads Tailwind classes and generates CSS. The CSS references your existing CSS variables:

```
Ralph writes: className="bg-primary text-primary-foreground"

Tailwind generates:
  .bg-primary { background-color: hsl(var(--primary)); }
  .text-primary-foreground { color: hsl(var(--primary-foreground)); }

Your existing theme preset provides:
  --primary: 38 92% 50%;          /* Amber Glow */
  --primary-foreground: 38 92% 10%;
```

The chain is: **Ralph's Tailwind classes → oxide-wasm compiles to CSS → CSS references variables → your theme preset provides values**. Each layer is independent. Themes don't change.

### Color Derivation Logic — Untouched

The HSL derivation engine in the theming skill stays exactly as-is:
- Lightness inversion table (light L95-100% → dark L4-10%)
- Paired token rules (background ↔ foreground, primary ↔ primary-foreground)
- Token change logic ("warmer" → shift hues 20-40°, "cooler" → 200-230°)
- Variable groupings (surface, brand, utility, destructive)
- WCAG AA contrast rules (4.5:1 minimum, 50-point L% gap)
- Anti-slop color rules (never default violet, always define both :root and .dark)

Ralph reads these rules, picks a seed hue, and derives a complete theme. oxide-wasm doesn't participate in theme generation — it just compiles whatever Tailwind classes Ralph writes against whatever theme variables exist.

### Implementation

**Using tailwindcss-iso** (wraps oxide-wasm with clean API):

```ts
// In build pipeline, after esbuild bundles user source
import { generateTailwindCSS } from 'tailwindcss-iso/browser';

const css = await generateTailwindCSS({
  content: bundledHTML + bundledJS, // scan for Tailwind classes
  css: `
    @import "tailwindcss";
    @theme {
      --color-primary: hsl(var(--primary));
      --color-primary-foreground: hsl(var(--primary-foreground));
      /* ... map all CSS variables to Tailwind color tokens */
    }
  `,
});

// Inject compiled CSS into preview iframe
// No CDN play script needed
```

**Precache:** oxide-wasm WASM binary (~200KB) included in Workbox precache alongside esbuild.wasm.

**Build pipeline integration:**
1. esbuild bundles user's TSX → JS (existing pipeline)
2. oxide-wasm scans bundled output for Tailwind classes
3. Generates minimal CSS for only those classes
4. CSS injected into preview iframe's `<style>` tag
5. No CDN script tag needed in preview HTML

**Cache integration:** Tailwind CSS output cached alongside build hash (Layer 3A). Same source + same theme → same CSS → cache hit.

### Result
| Metric | Before | After |
|--------|--------|-------|
| Tailwind support | CDN play script (subset) | Full v4 JIT |
| Custom @theme | Not supported | Works |
| Offline Tailwind | Breaks | Works |
| CSS generation | Runtime in preview (FOUC) | Build time (no FOUC) |
| Edge case coverage | Partial | Complete |

### CC Prompt Guidance
- Install tailwindcss-iso as dependency
- Create tailwind-compiler.ts that wraps generateTailwindCSS
- Map existing CSS variables to Tailwind @theme tokens
- Integrate into buildProject() pipeline: esbuild → tailwind compile → inject
- Remove CDN play script from preview HTML template
- Test: offline builds should generate correct Tailwind CSS

---

## Package Registry

A structured, Orama-indexed catalog of every npm package Ralph can discover and import. This is the machine-readable source of truth that connects MODULE_BUNDLES (caching), Orama (search), and skills (guidance).

**Location:** `apps/ide/src/lib/packages/registry.ts`

### Structure

```ts
export interface PackageEntry {
  description: string
  category: 'behavior' | 'visual' | 'data' | 'utility'
  version: string
  subpath?: string                // e.g. 'motion/react' for motion
  imports: { named: string[] }    // e.g. ['motion', 'AnimatePresence']
  peerDeps?: string[]
  relatedPackages?: string[]      // e.g. ['@dnd-kit/sortable'] for @dnd-kit/core
  esm: { verified: boolean }
  useWhen: string[]               // Orama search keywords
  notWhen: string[]               // Anti-pattern triggers
  bundleSize: string
}

export const PACKAGE_REGISTRY: Record<string, PackageEntry> = {
  'motion': {
    description: 'Animation orchestration, spring physics, gesture interactions',
    category: 'behavior',
    version: '11.15.0',
    subpath: 'motion/react',
    imports: { named: ['motion', 'AnimatePresence', 'useMotionValue', 'useSpring'] },
    peerDeps: ['react'],
    esm: { verified: true },
    useWhen: ['animation', 'transition', 'gesture', 'spring', 'layout animation', 'exit animation'],
    notWhen: ['simple fade', 'opacity change', 'CSS transition'],
    bundleSize: '~80KB',
  },
  '@dnd-kit/core': {
    description: 'Drag and drop behaviors',
    category: 'behavior',
    version: '6.1.0',
    imports: { named: ['DndContext', 'useDraggable', 'useDroppable', 'closestCenter'] },
    relatedPackages: ['@dnd-kit/sortable', '@dnd-kit/utilities'],
    esm: { verified: true },
    useWhen: ['kanban', 'sortable list', 'drag and drop', 'reorder', 'drag handle'],
    notWhen: ['dropdown menu', 'select input'],
    bundleSize: '~55KB',
  },
  'react-hook-form': {
    description: 'Form state management with validation',
    category: 'behavior',
    version: '7.54.0',
    imports: { named: ['useForm', 'useFieldArray', 'Controller', 'FormProvider'] },
    relatedPackages: ['zod', '@hookform/resolvers'],
    esm: { verified: true },
    useWhen: ['form', 'validation', 'multi-step', 'field array', 'form wizard'],
    notWhen: ['single input', 'search bar', 'simple toggle'],
    bundleSize: '~90KB (with zod + resolvers)',
  },
  '@tanstack/react-virtual': {
    description: 'Virtualized rendering for large lists',
    category: 'behavior',
    version: '3.10.0',
    imports: { named: ['useVirtualizer'] },
    esm: { verified: true },
    useWhen: ['large list', 'virtual scroll', '1000+ items', 'infinite scroll', 'log viewer'],
    notWhen: ['small list', 'under 100 items'],
    bundleSize: '~10KB',
  },
  // ... all 25+ packages follow same shape
}
```

### Integration Points

- **Orama index** — Registry entries indexed at startup alongside skills. `useWhen` keywords are the primary search field.
- **grep command** — New semantic mode: `grep package "drag and drop"` → returns @dnd-kit/core with version, imports, usage guidance.
- **MODULE_BUNDLES** — Bundle definitions reference registry entries, single source of truth for versions and package names.
- **Extended libraries skill** — Human-readable prose generated from / aligned with registry data.
- **Shell tool descriptions** — Updated so Ralph knows `grep package` exists.

### CC Prompt Guidance
- Create `src/lib/packages/registry.ts` with all package metadata
- Index registry entries into Orama at startup (alongside skills)
- Add `grep package "<query>"` semantic mode to grep command
- Update SHELL_TOOL description so Ralph knows `grep package` exists

---

## New Skills

### Extended Libraries Skill

A skill file documenting every precached package Ralph can import.

**Location:** `apps/ide/src/skills/ralph/extended-libraries/SKILL.md`

**Structure:**
```markdown
## Behavior Libraries
### motion (formerly framer-motion)
- **When:** Layout animations, page transitions, gesture interactions
- **Not when:** Simple fades or slides (CSS handles those)
- **Import:** `import { motion, AnimatePresence } from 'motion/react'`
- **Key patterns:** motion.div, layout prop, exit animations, useSpring

### react-hook-form + zod
- **When:** 3+ fields, validation rules, multi-step flows
- **Not when:** Single input, simple search bar
...

## Visual Libraries
### @phosphor-icons/react
- **When:** Need weight variants (thin/light/regular/bold/fill/duotone)
- **Not when:** Lucide has the icon you need (use Lucide first)
...

## Anti-Patterns
- Don't import motion for a single fade (CSS: opacity transition 300ms)
- Don't use @tanstack/react-table for <50 rows (native <table> is fine)
- Don't import date-fns for Intl.DateTimeFormat use cases
- Don't add zustand for state that lives in one component (useState is fine)
```

This skill is searchable via `grep skill "form validation"` → finds react-hook-form + zod section.

### Composition Patterns Skill

Teaches Ralph assembly recipes for common UI patterns using existing @wiggum/stack components. Combines Memoria's composition specificity with Wednesday's layout wireframes.

**Location:** `apps/ide/src/skills/ralph/composition-patterns/SKILL.md`

**Patterns:**

| Pattern | Stack Components Used | esm.sh Packages (if any) |
|---------|----------------------|--------------------------|
| Hero Section | Card, Button, Badge + CSS grid | — |
| Stat Dashboard | Card, CardContent + text sizing from design brief | react-countup (optional) |
| Empty State | Card, Button + centered flex | — |
| Step/Process Flow | Card, Separator, Badge | — |
| Comparison Section | Card + strikethrough/highlight patterns | — |
| Data List/Feed | Card, Avatar, Separator + motion | motion/react |
| Sidebar + Content | Sheet/sidebar + CSS grid | — |
| Form Wizard | Tabs (hidden list), Input, Label, Button | react-hook-form + zod |
| Pricing Grid | Card, Badge, Button, Separator + CSS grid | — |
| Timeline | Separator, Card + flex column | — |
| Kanban Board | CSS grid + Card + dnd-kit DndContext | @dnd-kit/core + sortable |
| Feature Card Grid | Card, CardContent + CSS grid responsive | — |

Each pattern includes: which @wiggum/stack components, which esm.sh packages from the registry (by name), CSS variable hooks the theme controls, animation timing from the personality brief, and a minimal code skeleton (~15-20 lines showing the composition).

Searchable via `grep pattern "dashboard"` → finds Stat Dashboard recipe.

---

## Precache Budget

| Asset | Size | Layer |
|-------|------|-------|
| IDE shell (JS/CSS/HTML) | ~500KB | L1 Precache |
| esbuild.wasm | ~2.3MB | L1 Precache |
| @esm.sh/tsx SWC WASM | ~50KB | L1 Precache |
| oxide-wasm (Tailwind) | ~200KB | L1 Precache |
| Core modules (react, lucide, etc.) | ~1.5MB | L2 Runtime |
| Behavior libraries | ~500KB | L2 Runtime |
| Visual libraries | ~150KB | L2 Runtime |
| **Total** | **~5.2MB** | First visit |

After first visit: everything cached. Subsequent visits: <500ms boot, instant builds, offline capable.

For context: 5.2MB is less than a single hero image on most marketing sites.

Note: tiptap (~80KB) not included in budget until esm.sh compatibility verified. If verified, total rises to ~5.3MB.

---

## Implementation Phases

### Phase 1: PWA Precache (~2 hours)
Layer 1 only. Biggest single impact.

1. Add vite-plugin-pwa + workbox-window to package.json
2. Configure VitePWA in vite.config.ts
3. Create PWAUpdatePrompt component
4. Verify preview SW scope isolation
5. Test: repeat visit loads from cache, offline IDE boots

### Phase 2: ESM Module Cache + Package Registry (~6-7 hours)
Layer 2 + shell commands + registry + skill.

**Phase 2A — Caching (~4 hours):**
1. Add Workbox runtimeCaching for esm.sh in vite.config.ts
2. Create module-prewarmer.ts with bundles and profiles
3. Add SW activation hook for background precaching
4. Add modules + cache-stats shell commands
5. Verify `motion/react` and tiptap imports in preview iframe before adding to precache
6. Test: second build uses cached modules, offline build works

**Phase 2B — Discovery (~2-3 hours):**
1. Create `src/lib/packages/registry.ts` with all package metadata
2. Index registry entries into Orama at startup
3. Add `grep package "<query>"` semantic mode
4. Update shell tool descriptions so Ralph knows `grep package` exists
5. Create extended-libraries skill (aligned with registry data)
6. Test: `grep package "animation"` returns motion with correct import path

### Phase 3: Build Intelligence (~4 hours)
Layer 3 — all three improvements.

1. Content-hash build cache (IndexedDB)
2. Import map generation from lockfile → inject into preview HTML
3. Modify esmPlugin to mark npm deps as external (browser resolves via import map)
4. SWC fast path: install @esm.sh/tsx, add import-diff detection, hot-inject path
5. Test: refresh preserves instant preview, single-file edit <10ms

### Phase 4: Browser Tailwind (~3 hours)
Layer 4 — oxide-wasm integration. Assumes v4 CDN already in place from A1.5 — this phase moves compilation from runtime to build-time.

1. Install tailwindcss-iso
2. Create tailwind-compiler.ts
3. Verify existing `@theme` mappings (from A1.5) work with oxide-wasm input format
4. Integrate into buildProject() pipeline
5. Remove CDN play script from preview template (esm.sh `@tailwindcss/browser` tag)
6. Test: Tailwind classes compile offline, custom themes work, no FOUC

### Phase 5: Design Intelligence (~5-6 hours)
Layer 5 — skills and theme output that make Ralph design with intent. No new dependencies, no build changes — pure knowledge.

Draws from two reference documents: **Wednesday Design Skill** (component enforcement patterns, layout wireframes, decision tree) and **Memoria Design System** (personality-driven design language, animation timing, typography hierarchy, "Allowed vs Not Allowed" format).

**Phase 5A — Component Decision Tree (~30 min):**

Adapt Wednesday's "STOP! Ask yourself" enforcement pattern into the wiggum-stack skill. Ralph currently knows *what* components exist but has no decision framework for *when to compose vs use directly*.

Update `apps/ide/src/skills/wiggum-stack/SKILL.md` with:

```
┌─────────────────────────────────────────────────────────────┐
│  STOP! Before writing ANY component:                        │
│                                                             │
│  1. Does this exist in @wiggum/stack?                       │
│     └─> YES: Import and use it. STOP here.                  │
│     └─> NO: Continue to step 2                              │
│                                                             │
│  2. Can I compose 2-3 stack components to achieve this?     │
│     └─> YES: Compose them. STOP here.                       │
│     └─> NO: Continue to step 3                              │
│                                                             │
│  3. Can I extend a stack component's styles via CSS vars?   │
│     └─> YES: Extend styles using theme variables. STOP.     │
│     └─> NO: Check extended libraries (grep package)         │
│                                                             │
│  ❌ NEVER create a component from scratch                   │
│  ❌ NEVER hardcode colors, shadows, or radius values        │
└─────────────────────────────────────────────────────────────┘
```

Add a "Quick Lookup by Need" table (Wednesday's format, Wiggum's components):

| I need... | Use this | From |
|-----------|----------|------|
| Stat display | Card + CardContent + text hierarchy | @wiggum/stack composition |
| Empty state | Card + centered flex + Button CTA | @wiggum/stack composition |
| Sidebar layout | Sheet + CSS grid | @wiggum/stack + CSS |
| Sortable list | Card + DndContext | @wiggum/stack + @dnd-kit |
| Form wizard | Tabs (hidden list) + Input + Button | @wiggum/stack + react-hook-form |
| Data table | Table + @tanstack/react-table | @wiggum/stack + registry package |
| Timeline | Separator + Card + flex column | @wiggum/stack composition |
| Command palette | Dialog + Command (cmdk) | @wiggum/stack + registry package |

**Phase 5B — Personality Brief System (~3-4 hours):**

Extend the `theme` command output to include a **personality brief** — a mini design system document (Memoria's format) that tells Ralph how to *use* components, not just what colors they are.

Each personality brief contains:
- **Philosophy** — one sentence capturing the mood. Memoria's "Numbers are heroes, labels are whispers" is the gold standard.
- **Typography hierarchy** — specific size/weight/color/tracking per element role:
  | Element | Size | Weight | Color | Tracking |
  |---------|------|--------|-------|----------|
  | Hero numbers | 3xl-6xl | light | white | tight |
  | Page titles | lg-xl | light | white | normal |
  | Section labels | xs | medium | muted-foreground | widest, uppercase |
  | Body text | sm | normal | foreground | normal |
- **Animation timing** — duration and easing per interaction type:
  | Type | Duration | Easing |
  |------|----------|--------|
  | Micro-interactions | 100-150ms | ease |
  | Hover states | 200-300ms | spring |
  | Card transitions | 300ms | easeOutCubic |
  | Page transitions | 400-500ms | easeInOutQuart |
  | Scroll reveals | 500-800ms | easeOutQuart |
- **Spacing rhythm** — base grid unit, section spacing, card padding
- **Interaction patterns** — hover/press/focus behavior per element type
- **Strict rules** — Memoria-style "Allowed vs Not Allowed" list specific to the mood. Industrial: "no rounded corners over 4px, no spring animations." Organic: "no sharp corners, no linear easing."
- **Quality checklist** — 8-10 yes/no checks before considering the design done

Implementation:
- Create personality brief templates in `apps/ide/src/lib/theme-generator/personalities/` — start with 5-6 moods (minimal, premium, playful, industrial, organic, editorial)
- Each personality is a typed TypeScript object matching the structure above
- The `theme` command gains a `--mood` flag: `theme generate --seed 152 --pattern golden-ratio --mood premium`
- Output written to `.ralph/design-brief.md` — Ralph reads this before creating any src/ files
- Add to system prompt: "Before creating src/ files, read .ralph/design-brief.md if it exists"

**NOTE:** Phase 5B depends on the theme generator from `cc-theme-generator.md` being built first (or built simultaneously), since personality briefs extend its output.

**Phase 5C — Composition Patterns Skill (~1-2 hours):**

Create `apps/ide/src/skills/ralph/composition-patterns/SKILL.md` with all 12 patterns from the table above. Each pattern includes:
- Which @wiggum/stack components
- Which esm.sh packages from the registry (by name)
- CSS variable hooks the theme controls
- Animation timing from the personality brief
- Minimal code skeleton (~15-20 lines)

Index into Orama so `grep pattern "dashboard"` → finds Stat Dashboard recipe.

### Sequencing
Phase 1 first (immediate, visible value). Phase 2 second (builds on SW from Phase 1; 2A and 2B can be parallelized). Phase 3 can overlap with Phase 2 (independent). Phase 4 last in the build chain (depends on build pipeline from Phase 3). Phase 5A is independent — can ship immediately, even before Phase 1. Phase 5B depends on theme generator being built. Phase 5C depends on 5A (decision tree) being in place but is otherwise independent.

**Total estimate:** ~20-22 hours across 5 phases.

---

## What Does NOT Change

- **Theme presets** — all 10+ presets stay as-is, HSL values untouched
- **Color derivation logic** — lightness inversion, paired tokens, anti-slop rules, WCAG checks
- **neobrutalist.css** — neobrutalist theme with Simpsons Yellow untouched
- **esbuild-wasm** — still the primary bundler, handles virtual FS, @wiggum/stack, TSX
- **esmPlugin** — still resolves esm.sh URLs (with optional ?exports= enhancement)
- **wiggumStackPlugin** — still bundles 60+ components as embedded constant
- **preview/sw.js** — existing preview service worker stays in its scope
- **LightningFS** — filesystem persistence unchanged
- **Lockfile resolver** — version pinning unchanged
- **Quality gates** — build + runtime validation unchanged
- **Ralph loop** — fresh context, one action per iteration, discriminated unions
- **Skills system** — grep-searchable, on-demand lookup, same format (new skills add to it, don't change architecture)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Repeat visit load | <500ms (from >3s) |
| Build with cached deps | <300ms (from >2s) |
| Single-file hot reload | <10ms (from ~500ms) |
| Offline IDE boot | ✅ Works |
| Offline build (cached deps) | ✅ Works |
| Tailwind compilation | Full v4 JIT (from CDN subset) |
| Module cache hit rate | >95% for common deps |
| Cache Storage footprint | <10MB |
| PWA Lighthouse score | >90 |
| Package discovery (`grep package`) | <200ms, relevant results |
| Component reuse (no custom primitives) | Decision tree enforced in skill |
| Design consistency (personality brief) | Brief read before any src/ file creation |
| Composition pattern coverage | 12+ common UI patterns documented |
