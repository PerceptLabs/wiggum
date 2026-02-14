# WIGGUM HONO FULL-STACK PLAN

> Extend Wiggum from a frontend-only AI IDE into a full-stack development studio. Ralph generates React + Hono apps using a progressive architecture: frontend-only by default, backend added when needed. `@wiggum/api` defines conventions for routes, validation, and shared schemas. In free mode, Hono runs **inside the browser** via Service Worker for live preview. In Pro mode, Wiggum's own Hono backend handles deployment, database provisioning, auth, and hosted API execution. Same framework top to bottom — Ralph learns one pattern, it works everywhere.

---

## TABLE OF CONTENTS

1. [Why Hono](#1-why-hono)
2. [Architecture Overview](#2-architecture-overview)
3. [The Progressive Stack Model](#3-the-progressive-stack-model)
4. [Free Mode: Browser-Native Full-Stack Preview](#4-free-mode-browser-native-full-stack-preview)
5. [Pro Mode: Wiggum's Hono Backend](#5-pro-mode-wiggums-hono-backend)
6. [@wiggum/api Package Design](#6-wiggumapi-package-design)
7. [Implementation Phases](#7-implementation-phases)
8. [Shell & Build System Changes](#8-shell--build-system-changes)
9. [Skills & Quality Gates](#9-skills--quality-gates)
10. [File Change Index](#10-file-change-index)
11. [CC Prompt Strategy](#11-cc-prompt-strategy)
12. [Risk Assessment](#12-risk-assessment)
13. [Relationship to Other Plans](#13-relationship-to-other-plans)

---

## 1. WHY HONO

### The Problem

Wiggum builds beautiful frontend apps. But most real applications need persistence, authentication, and APIs. Today when a user says "build me a recipe tracker where I can save and share recipes," Ralph can only build a localStorage-backed frontend. The moment the user wants multiple users, shared data, or real persistence, they've outgrown what Wiggum can do.

Every other AI builder (Bolt, Lovable, v0) already generates full-stack apps. Wiggum's frontend quality is superior (theme generator, design enforcement, component library), but the lack of backend is the single biggest capability gap.

### Why Hono Specifically

| Requirement | Hono | Express | Next.js API Routes | TanStack Start |
|-------------|------|---------|-------------------|----------------|
| Explicit over magic | ✅ Explicit routes, no hidden middleware | ⚠️ Middleware order matters implicitly | ❌ File-based routing, RSC magic | ⚠️ Server functions auto-wire |
| Browser-native | ✅ Official Service Worker adapter (`hono/service-worker`) | ❌ Node-only | ❌ Requires Node server | ❌ Requires Vite+Nitro |
| Bundle size | ~18KB | ~200KB+ with deps | N/A (framework) | N/A (framework) |
| AI readability | ✅ request → validate → respond, every line visible | ⚠️ Hidden middleware chains | ❌ RSC/caching/revalidation invisible | ⚠️ createServerFn abstracts wiring |
| Type-safe RPC | ✅ `hono/client` with `hc<AppType>()` | ❌ Manual typing | ❌ Manual typing | ✅ Built-in |
| Zod integration | ✅ `@hono/zod-validator` first-class | ⚠️ Manual | ⚠️ Manual | ✅ Built-in |
| Deploy targets | Cloudflare Workers, Deno, Bun, Node, Lambda, browser SW | Node only | Vercel (primarily) | Nitro (various) |
| DB agnostic | ✅ Zero opinions — plug any DB | ✅ | ⚠️ Prisma conventions | ✅ |
| Wiggum philosophy fit | ✅ Same code runs in preview (SW) and production (edge) | ❌ | ❌ | ❌ |

**The killer feature for Wiggum:** Hono's Service Worker adapter means Ralph's generated API code runs *inside the browser preview* with zero modifications. The exact same `app.get('/api/recipes', ...)` code that runs in the preview Service Worker deploys to Cloudflare Workers in production. No mock layer, no API simulation — real Hono, real routing, real Zod validation, all in the browser.

### Hono Key Facts

- **License:** MIT ✅
- **Size:** ~18KB (comparable to adding one Radix primitive)
- **npm:** `hono` — 6M+ weekly downloads, 28K+ GitHub stars
- **Ecosystem:** `@hono/zod-validator`, `@hono/zod-openapi`, `hono/client` (RPC), `hono/service-worker`, adapters for every runtime
- **Creator:** Yusuke Wada (Cloudflare), actively maintained, stable API
- **Wiggum import:** Via esm.sh like everything else — `import { Hono } from 'https://esm.sh/hono'`

---

## 2. ARCHITECTURE OVERVIEW

### The Two Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                     WIGGUM IDE (Browser)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Ralph Loop (unchanged)                                   │  │
│  │  → Generates React frontend (existing)                    │  │
│  │  → Generates Hono backend (NEW — when task needs it)      │  │
│  │  → Generates shared Zod schemas (NEW — the glue)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                    │             │                              │
│              ┌─────▼─────┐ ┌────▼─────┐                       │
│              │  esbuild   │ │ esbuild  │                       │
│              │  (frontend)│ │ (backend)│                       │
│              └─────┬─────┘ └────┬─────┘                       │
│                    │            │                              │
│              ┌─────▼────────────▼─────┐                       │
│              │    Preview System       │                       │
│              │                         │                       │
│              │  ┌───────────────────┐  │                       │
│              │  │ Preview iframe    │  │                       │
│              │  │ (React app)       │  │                       │
│              │  │   fetch('/api/…') │  │                       │
│              │  └────────┬──────────┘  │                       │
│              │           │ intercept   │                       │
│              │  ┌────────▼──────────┐  │                       │
│              │  │ API Service Worker│  │                       │
│              │  │ (Hono app via     │  │                       │
│              │  │  hono/service-    │  │                       │
│              │  │  worker adapter)  │  │                       │
│              │  └───────────────────┘  │                       │
│              └─────────────────────────┘                       │
│                                                                 │
│  FREE MODE: Everything above runs in the browser. Export code. │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  PRO MODE (paid)   │
                    │                    │
                    │  Wiggum Pro API    │
                    │  (Hono backend)    │
                    │  ┌──────────────┐  │
                    │  │ Deploy pipe  │  │
                    │  │ DB provision │  │
                    │  │ Auth service │  │
                    │  │ App hosting  │  │
                    │  │ LLM proxy    │  │
                    │  │ Asset CDN    │  │
                    │  └──────────────┘  │
                    └────────────────────┘
```

### Data Flow (Full-Stack App in Free Mode)

```
1. User: "Build a recipe tracker with user accounts"
2. Chief plans: frontend (React + stack), backend (Hono + Zod), shared schemas
3. Ralph generates:
   ├── src/app/         → React components (existing pattern)
   ├── src/api/         → Hono routes (NEW)
   ├── src/shared/      → Zod schemas (NEW)
   └── src/index.css    → Theme (existing)
4. Build system:
   ├── esbuild pass 1 → bundles frontend (App.tsx → app.js)
   ├── esbuild pass 2 → bundles backend (api/index.ts → api.js)
   └── Both go to preview-cache / ZenFS
5. Preview:
   ├── Preview iframe loads app.js (React renders)
   ├── API Service Worker loads api.js (Hono handles /api/*)
   ├── Frontend fetch('/api/recipes') → intercepted by SW → Hono routes
   └── Data stored in IndexedDB (via API handlers)
6. Export: User gets a zip with deployable frontend + backend
```

---

## 3. THE PROGRESSIVE STACK MODEL

### One Stack, Optional Layers

The fundamental principle: **every Wiggum app starts as frontend-only. Backend is an additive layer, not a mode switch.** Ralph doesn't decide "this is a full-stack app" upfront — Ralph builds the frontend first, then adds backend routes when the task requires persistence, auth, or multi-user features.

### Project Structure

**Frontend-only app (current, unchanged):**
```
src/
├── App.tsx              # React entry
├── index.css            # Theme variables
└── components/          # UI components
```

**Full-stack app (new):**
```
src/
├── app/                 # Frontend (React)
│   ├── App.tsx          # React entry (moved, aliased)
│   ├── components/      # UI components
│   ├── hooks/           # Custom hooks (including useAPI)
│   └── pages/           # Route-based pages (optional)
│
├── api/                 # Backend (Hono) — OPTIONAL
│   ├── index.ts         # Hono app entry, registers all routes
│   ├── routes/          # One file per resource
│   │   ├── recipes.ts   # /api/recipes CRUD
│   │   ├── users.ts     # /api/users auth
│   │   └── health.ts    # /api/health
│   └── middleware/       # Custom middleware (optional)
│       ├── auth.ts      # Auth check
│       └── cors.ts      # CORS config
│
├── shared/              # The glue — OPTIONAL (exists when api/ exists)
│   ├── schemas/         # Zod schemas (single source of truth)
│   │   ├── recipe.ts    # RecipeSchema, CreateRecipeSchema
│   │   └── user.ts      # UserSchema, LoginSchema
│   └── types.ts         # Derived TypeScript types
│
└── index.css            # Theme (stays at root)
```

### The Scaffold Detection Rule

Ralph follows a simple rule:

| Task mentions... | Ralph generates... |
|-----------------|-------------------|
| Landing page, portfolio, dashboard (display-only) | `src/App.tsx` (frontend-only, existing) |
| "save", "store", "persist", "accounts", "login", "share", "database", "API" | `src/app/` + `src/api/` + `src/shared/` (full-stack) |
| Started frontend-only, user later asks for persistence | Refactor: move `App.tsx` → `src/app/App.tsx`, add `src/api/` + `src/shared/` |

The refactor path is important — Ralph shouldn't have to rebuild from scratch when a user adds backend requirements to an existing frontend-only app.

### Shared Schemas: The Contract

The key architectural insight: **Zod schemas in `src/shared/` are the single source of truth.** Both frontend and backend import from the same files.

```typescript
// src/shared/schemas/recipe.ts
import { z } from 'zod'

export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  ingredients: z.array(z.string()),
  instructions: z.string(),
  authorId: z.string(),
  createdAt: z.string().datetime(),
})

export const CreateRecipeSchema = RecipeSchema.omit({
  id: true,
  createdAt: true,
})

export type Recipe = z.infer<typeof RecipeSchema>
export type CreateRecipe = z.infer<typeof CreateRecipeSchema>
```

**Backend uses it for validation:**
```typescript
// src/api/routes/recipes.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateRecipeSchema } from '../../shared/schemas/recipe'

const recipes = new Hono()

recipes.post('/', zValidator('json', CreateRecipeSchema), async (c) => {
  const data = c.req.valid('json') // Fully typed
  // ... store in DB
  return c.json({ id: '1', ...data, createdAt: new Date().toISOString() }, 201)
})

export { recipes }
```

**Frontend uses it for form validation:**
```typescript
// src/app/components/RecipeForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateRecipeSchema, type CreateRecipe } from '../../shared/schemas/recipe'

export function RecipeForm() {
  const form = useForm<CreateRecipe>({
    resolver: zodResolver(CreateRecipeSchema),
  })
  // ... form UI
}
```

**Same schema, two consumers, zero drift.**

---

## 4. FREE MODE: BROWSER-NATIVE FULL-STACK PREVIEW

### How It Works

The breakthrough: Hono has an official Service Worker adapter (`hono/service-worker`) that lets a Hono app intercept fetch requests inside the browser. This means Ralph's generated backend code runs **unmodified** in the preview system.

### Preview Architecture (Current vs. Full-Stack)

**Current (frontend-only):**
```
Preview iframe
  └── Loads compiled React app
  └── Served by existing preview SW (static file serving)
```

**Full-stack:**
```
Preview iframe
  ├── Loads compiled React app (same as today)
  └── fetch('/api/...') requests intercepted by:
      └── API Service Worker
          ├── Hono app (compiled from src/api/)
          ├── hono/service-worker adapter (handle/fire)
          └── IndexedDB for data persistence
```

### API Service Worker Design

The API SW is separate from the existing preview SW. It runs Hono with the `service-worker` adapter and intercepts only `/api/*` requests.

**Generated `api-sw.js` (output of esbuild backend pass):**
```typescript
// This is what esbuild produces from src/api/index.ts
import { Hono } from 'hono'
import { handle } from 'hono/service-worker'
import { recipes } from './routes/recipes'
import { users } from './routes/users'

const app = new Hono().basePath('/api')
app.route('/recipes', recipes)
app.route('/users', users)

// Service Worker lifecycle
self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()))
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', handle(app))
```

**Key details:**
- The API SW is registered at `/api/` scope — it ONLY intercepts `/api/*` requests
- The existing preview SW continues to serve static files (`.js`, `.css`, `.html`)
- Non-`/api/` requests pass through to the existing preview SW
- When app has no `src/api/`, no API SW is registered (zero overhead for frontend-only apps)

### Data Persistence in Free Mode

Without a real database, free-mode full-stack apps use **IndexedDB as the storage layer** within the API Service Worker. Ralph generates a thin data access layer:

```typescript
// src/api/lib/store.ts (generated by Ralph)
// Simple key-value store backed by IndexedDB
// Used in API route handlers for persistence

const DB_NAME = 'wiggum-app-data'
const STORE_NAME = 'records'

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getAll(collection: string): Promise<any[]> { /* ... */ }
export async function getById(collection: string, id: string): Promise<any> { /* ... */ }
export async function create(collection: string, data: any): Promise<any> { /* ... */ }
export async function update(collection: string, id: string, data: any): Promise<any> { /* ... */ }
export async function remove(collection: string, id: string): Promise<void> { /* ... */ }
```

This is intentionally simple — it's a development preview, not a production database. The data persists across page refreshes (IndexedDB is durable) but doesn't survive clearing site data.

**For Pro mode, this store layer gets swapped for real database calls — same API routes, different data layer.**

### Build Pipeline Changes

esbuild currently runs one pass (frontend). Full-stack apps need two:

```
Pass 1: Frontend bundle (existing)
  entry: src/app/App.tsx
  output: dist/app.js
  externals: react, @wiggum/stack, etc. (esm.sh)
  plugins: esmPlugin, wiggumStackPlugin, fsPlugin (existing)

Pass 2: Backend bundle (NEW)
  entry: src/api/index.ts
  output: dist/api-sw.js
  externals: hono, zod (esm.sh)
  format: iife (Service Worker can't use ESM in all browsers)
  plugins: esmPlugin, fsPlugin
  banner: Service Worker lifecycle events
  define: { 'process.env.NODE_ENV': '"production"' }
```

**When pass 2 runs:**
- ONLY when `src/api/index.ts` exists (detection via fs.stat)
- After pass 1 completes (frontend first, backend second)
- On failure, only the backend build fails — frontend still previews

### Export (Free Mode)

When the user clicks Export, the zip contains:

```
my-app/
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── index.css
│   └── package.json    (react, @wiggum/stack deps)
│
├── backend/
│   ├── src/
│   │   ├── index.ts    (Hono app entry)
│   │   └── routes/     (route files)
│   ├── package.json    (hono, @hono/zod-validator, zod)
│   └── wrangler.toml   (Cloudflare Workers config, optional)
│
├── shared/
│   └── schemas/        (Zod schemas, imported by both)
│
└── README.md           (deploy instructions for CF Workers, Deno, Bun, Node)
```

The README includes deployment instructions for multiple targets. The user owns the code completely.

---

## 5. PRO MODE: WIGGUM'S HONO BACKEND

### What Pro Adds

Pro is NOT about giving users features they can't get in free mode. It's about **removing friction**. Free users get the same generated code — they just deploy it themselves.

Pro users click a button and their app is live.

### Wiggum Pro API (Hono-Powered)

Wiggum's own infrastructure runs on Hono. Same framework Ralph generates for user apps.

```
Wiggum Pro API (Hono on Cloudflare Workers)
├── /auth/              — User auth (sign up, login, sessions)
├── /projects/          — Project CRUD (metadata, not files)
├── /deploy/            — Deploy user apps
│   ├── POST /deploy/:projectId         — Trigger deploy
│   ├── GET  /deploy/:projectId/status  — Deploy status
│   └── DELETE /deploy/:projectId       — Tear down
├── /db/                — Database provisioning
│   ├── POST /db/:projectId/provision   — Create D1/Turso instance
│   ├── GET  /db/:projectId/connection  — Get connection string
│   └── POST /db/:projectId/migrate     — Run migrations
├── /hosting/           — Hosted app backends
│   └── /*              — Proxy to user's deployed Hono app
├── /assets/            — File/image upload + CDN
├── /llm/               — LLM proxy (for users without their own keys)
└── /billing/           — Stripe integration
```

### Deploy Pipeline

```
1. User clicks "Deploy" in Wiggum IDE
2. IDE sends project files to Pro API: POST /deploy/:projectId
   - Frontend files (compiled)
   - Backend source (Hono routes)
   - Shared schemas
   - Theme CSS
3. Pro API:
   a. Compiles backend with Wrangler/esbuild for Cloudflare Workers target
   b. Uploads frontend to Workers Static Assets or R2
   c. Creates a D1 database if one doesn't exist
   d. Runs migrations from shared/schemas (auto-generated from Zod → SQL)
   e. Deploys Worker with bindings to D1, R2, KV
   f. Assigns subdomain: {project-slug}.wiggum.app
4. Returns deployed URL to IDE
5. User's app is live at {project-slug}.wiggum.app
   - Frontend served from CDN
   - API routes run on Cloudflare Workers
   - Database on D1 (SQLite at edge)
```

### Database Provisioning

Pro automatically manages databases. The user never configures anything.

**Schema-to-SQL derivation:**
Ralph generates Zod schemas in `src/shared/schemas/`. The deploy pipeline derives SQL migrations from these schemas. No ORM, no Prisma — just Zod → CREATE TABLE mapping.

```typescript
// src/shared/schemas/recipe.ts
export const RecipeSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  ingredients: z.array(z.string()),  // stored as JSON
  authorId: z.string(),
  createdAt: z.string().datetime(),
})

// Derived migration:
// CREATE TABLE recipes (
//   id TEXT PRIMARY KEY,
//   title TEXT NOT NULL,
//   ingredients TEXT NOT NULL,  -- JSON array
//   author_id TEXT NOT NULL,
//   created_at TEXT NOT NULL
// );
```

**Supported databases (Pro provisions):**
- **Cloudflare D1** — default, SQLite at edge, zero config
- **Turso** — libSQL, if user needs multi-region or branching
- **Neon** — Postgres, for users who need relational features beyond SQLite

### Auth Service (Pro)

Instead of Ralph generating auth from scratch (complex, error-prone), Pro provides auth as a service:

```typescript
// In user's Hono app, Ralph adds:
import { authMiddleware } from '@wiggum/api/auth'

app.use('/api/*', authMiddleware())

// authMiddleware() checks session token against Wiggum Pro's auth service
// Returns 401 if not authenticated, adds c.get('user') if authenticated
```

The auth UI (login, signup, password reset) comes from `@wiggum/stack` components + `@wiggum/api` auth hooks. Ralph generates the pages, Pro handles the backend.

### Hosted vs. Self-Hosted

**Pro-deployed apps can be "ejected" at any time.** The deploy pipeline produces a standard Cloudflare Workers project. User can download it, run `wrangler deploy` themselves, and leave Wiggum Pro. No lock-in — the generated code is always portable.

---

## 6. @WIGGUM/API PACKAGE DESIGN

### What It Is

`@wiggum/api` is a **conventions package**, not a framework. It provides:
1. Pre-configured Hono app factory with sensible defaults
2. Standard middleware (CORS, error handling, request logging)
3. Data access utilities (IndexedDB for preview, D1/Turso/Neon for production)
4. Auth helpers (Pro integration)
5. Type-safe client factory (wraps `hono/client`)
6. Zod → SQL migration helpers (Pro deploy)

### Package Structure

```
packages/api/
├── src/
│   ├── index.ts            # Barrel exports
│   ├── app.ts              # createApp() — Hono factory with defaults
│   ├── middleware/
│   │   ├── cors.ts         # CORS middleware (configurable)
│   │   ├── error.ts        # Global error handler → JSON responses
│   │   ├── logger.ts       # Request logging (dev only)
│   │   └── auth.ts         # Auth middleware (Pro, no-op in free)
│   ├── store/
│   │   ├── types.ts        # Store interface
│   │   ├── idb-store.ts    # IndexedDB implementation (free/preview)
│   │   ├── d1-store.ts     # D1 implementation (Pro/Cloudflare)
│   │   └── memory-store.ts # In-memory (testing)
│   ├── client/
│   │   └── index.ts        # createClient<T>() wrapper around hc
│   ├── migrate/
│   │   └── zod-to-sql.ts   # Schema → SQL derivation (Pro deploy)
│   └── utils/
│       ├── id.ts           # nanoid generation
│       └── time.ts         # ISO timestamp helpers
├── SKILL.md                # Ralph's API skill documentation
├── package.json
└── tsconfig.json
```

### API Conventions (What Ralph Learns)

**Route file pattern:**
```typescript
// src/api/routes/{resource}.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { CreateRecipeSchema, RecipeSchema } from '../../shared/schemas/recipe'
import { store } from '../lib/store'

const recipes = new Hono()

// GET /api/recipes — list all
recipes.get('/', async (c) => {
  const items = await store.getAll('recipes')
  return c.json(items)
})

// GET /api/recipes/:id — get one
recipes.get('/:id', async (c) => {
  const item = await store.getById('recipes', c.req.param('id'))
  if (!item) return c.json({ error: 'Not found' }, 404)
  return c.json(item)
})

// POST /api/recipes — create
recipes.post('/', zValidator('json', CreateRecipeSchema), async (c) => {
  const data = c.req.valid('json')
  const item = await store.create('recipes', data)
  return c.json(item, 201)
})

// PUT /api/recipes/:id — update
recipes.put('/:id', zValidator('json', CreateRecipeSchema.partial()), async (c) => {
  const data = c.req.valid('json')
  const item = await store.update('recipes', c.req.param('id'), data)
  return c.json(item)
})

// DELETE /api/recipes/:id — delete
recipes.delete('/:id', async (c) => {
  await store.remove('recipes', c.req.param('id'))
  return c.json({ ok: true })
})

export { recipes }
```

**App entry pattern:**
```typescript
// src/api/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { recipes } from './routes/recipes'
import { users } from './routes/users'

const app = new Hono().basePath('/api')

// Middleware
app.use('*', cors())
app.get('/health', (c) => c.json({ status: 'ok' }))

// Routes
app.route('/recipes', recipes)
app.route('/users', users)

export default app
export type AppType = typeof app
```

**Client usage pattern:**
```typescript
// src/app/hooks/useAPI.ts
import { hc } from 'hono/client'
import type { AppType } from '../../api/index'

const client = hc<AppType>('/') // Base URL — SW intercepts in preview, real server in prod

export function useRecipes() {
  // type-safe API calls
  const getAll = () => client.api.recipes.$get()
  const create = (data) => client.api.recipes.$post({ json: data })
  const remove = (id) => client.api.recipes[':id'].$delete({ param: { id } })
  return { getAll, create, remove }
}
```

### Pre-Bundling Strategy

Like `@wiggum/stack`, `@wiggum/api` is pre-bundled by a build script and provided to esbuild via a plugin:

```
scripts/bundle-api.ts → packages/api/dist/wiggum-api.js
                       → wiggumApiPlugin for esbuild (resolves '@wiggum/api/*')
```

Hono itself and `@hono/zod-validator` are resolved via esm.sh (external dependencies).

---

## 7. IMPLEMENTATION PHASES

### Phase 0: Spike — Hono in Service Worker (1-2 hours)

**Goal:** Validate that Hono runs in Wiggum's preview system Service Worker context, intercepting `/api/*` fetch requests from the preview iframe.

**Spike steps:**
1. Create a minimal Hono app with one GET route
2. Compile it with esbuild targeting the Service Worker format
3. Register it as a second SW scoped to `/api/` in the preview system
4. Verify that `fetch('/api/hello')` from the preview iframe returns the Hono response
5. Verify no conflicts with existing preview SW at `/`

**Success criteria:**
- [ ] Hono app compiles with esbuild (no Node.js-only APIs)
- [ ] SW registration succeeds alongside existing preview SW
- [ ] fetch('/api/hello') returns `{ message: "Hello from Hono" }`
- [ ] Existing preview (static file serving) still works
- [ ] No console errors from SW lifecycle conflicts

**Kill signal:** If dual-SW architecture causes unresolvable scope conflicts, fall back to running Hono in a Web Worker with a MessageChannel relay (less elegant but functional).

---

### Phase 1: @wiggum/api Package + Backend Build Pass (6-8 hours)

**Goal:** Create the `@wiggum/api` package with core conventions, add a second esbuild pass for backend code, and wire up the API Service Worker in the preview system.

**What gets built:**

**1a. @wiggum/api package**

Create `packages/api/` with:
- `createApp()` factory — returns a Hono instance with default middleware (CORS, error handling)
- `idb-store.ts` — IndexedDB-backed data store for free/preview mode
- `memory-store.ts` — In-memory store for testing
- `store/types.ts` — Store interface: `getAll`, `getById`, `create`, `update`, `remove`
- `client/index.ts` — `createClient<T>()` wrapping `hc` from `hono/client`
- `utils/id.ts` — nanoid for record IDs
- `utils/time.ts` — ISO timestamp helpers
- `SKILL.md` — Ralph's API skill (conventions, patterns, anti-patterns)
- Build script: `scripts/bundle-api.ts` (mirrors `bundle-stack.ts`)

**1b. Backend esbuild pass**

Edit `src/lib/build/compiler.ts` (or equivalent):
- After frontend build, check if `src/api/index.ts` exists
- If yes: run second esbuild pass with backend config:
  - Entry: `src/api/index.ts`
  - Output: `dist/api-sw.js`
  - Format: `iife` (SW compatibility)
  - Banner: SW lifecycle events (install, activate, fetch handler)
  - Externals: `hono`, `zod` → esm.sh
  - Plugin: `wiggumApiPlugin` (resolves `@wiggum/api/*`)
- Backend build errors reported separately from frontend errors
- Backend build failure does NOT block frontend preview

**1c. API Service Worker registration**

Edit preview system:
- When backend build output exists (`dist/api-sw.js`):
  - Register API SW at scope `/api/`
  - Existing preview SW continues at scope `/`
  - API SW intercepts `/api/*`, everything else passes through
- When no backend build output:
  - No API SW registered (frontend-only, zero overhead)
- SW lifecycle: skipWaiting + clients.claim for instant activation

**Verification:**
- [ ] `@wiggum/api` package builds successfully
- [ ] `scripts/bundle-api.ts` produces `wiggum-api.js`
- [ ] Backend esbuild pass compiles a Hono app with routes
- [ ] API SW registers and intercepts `/api/*` in preview
- [ ] Frontend preview still works for frontend-only apps
- [ ] IndexedDB store persists data across page refreshes in preview
- [ ] Full CRUD cycle works: create → read → update → delete via fetch

---

### Phase 2: Shell Commands + Project Scaffolding (4-5 hours)

**Goal:** Add shell commands for Ralph to scaffold and manage full-stack projects. Update write guards and quality gates for the new project structure.

**New shell commands:**

**`api` command:**
```
api init                    — Scaffold src/api/ + src/shared/ + move App.tsx to src/app/
api route <name>            — Generate a new route file with CRUD boilerplate
api schema <name> [fields]  — Generate a Zod schema in src/shared/schemas/
api client                  — Generate src/app/hooks/useAPI.ts from route types
api status                  — Show detected routes, schemas, and health
```

**How `api init` works:**
1. Creates `src/api/index.ts` (Hono app entry with health route)
2. Creates `src/api/routes/` directory
3. Creates `src/shared/schemas/` directory
4. Creates `src/api/lib/store.ts` (IndexedDB store instance)
5. If `src/App.tsx` exists (frontend-only project being upgraded):
   - Creates `src/app/` directory
   - Moves `src/App.tsx` → `src/app/App.tsx`
   - Updates the frontend entry point reference
6. Creates `src/app/hooks/useAPI.ts` (Hono client)

**How `api route recipes` works:**
1. Creates `src/api/routes/recipes.ts` with CRUD boilerplate
2. Creates `src/shared/schemas/recipe.ts` with base schema
3. Adds import and `.route()` call to `src/api/index.ts`
4. Output: "Created route: /api/recipes (GET, POST, PUT, DELETE)"

**How `api schema recipe title:string ingredients:string[] authorId:string` works:**
1. Generates Zod schema from field definitions
2. Creates `Create*Schema` (omits id, createdAt)
3. Exports types via `z.infer<>`
4. Output: "Created schema: RecipeSchema with 5 fields"

**Write guard updates:**
- Allow `.ts` files in `src/api/` and `src/shared/` (currently only `src/` for .tsx/.ts)
- Allow `src/api/lib/` subdirectory
- Block direct `indexedDB` usage in `src/app/` (should go through API)

**Quality gate updates:**
- New gate: **api-routes-valid** — If `src/api/index.ts` exists, verify it exports a Hono app and all route imports resolve
- New gate: **schemas-used** — If `src/shared/` has schemas, verify they're imported by at least one route file
- Existing gates still work: `app-exists` checks for `src/App.tsx` OR `src/app/App.tsx`

**Files to create:**
- `src/lib/shell/commands/api.ts` — The `api` command with subcommands
- Update `src/lib/shell/executor.ts` — Register `api` command
- Update `src/lib/ralph/gates.ts` — New quality gates

**Files to edit:**
- `src/lib/shell/write-guard.ts` — Allow new paths
- `src/lib/ralph/gates.ts` — Add `api-routes-valid`, `schemas-used`
- `src/lib/shell/executor.ts` — Register command

**Verification:**
- [ ] `api init` scaffolds correct structure
- [ ] `api route` generates valid Hono route with Zod validation
- [ ] `api schema` generates valid Zod schemas with derived types
- [ ] `api client` generates type-safe Hono client hook
- [ ] Write guards allow new file locations
- [ ] Quality gates pass for valid full-stack app
- [ ] Quality gates fail for broken route imports
- [ ] Refactor path works (frontend-only → full-stack via `api init`)

---

### Phase 3: Skills + Ralph Prompting (3-4 hours)

**Goal:** Create the API skill so Ralph knows when and how to generate full-stack apps, and update existing skills for full-stack awareness.

**Create `apps/ide/src/skills/ralph/api/SKILL.md`:**

Contents (key sections):
- **When to go full-stack** — Decision tree: does the task need persistence/auth/multi-user? If yes → `api init`. If no → frontend-only.
- **Route conventions** — One file per resource, CRUD pattern, Zod validation on every write endpoint, always return JSON
- **Schema-first development** — Define schemas in `shared/` before writing routes or components. Schemas are the contract.
- **Client usage** — Always use the generated `useAPI` hook, never raw `fetch()` for API calls
- **Store pattern** — Use `store.getAll()`, `store.create()`, etc. Never access IndexedDB directly from route handlers.
- **Error handling** — Return `{ error: string }` with appropriate status codes. Frontend checks `res.ok`.
- **Anti-patterns:**
  - ❌ Don't put business logic in frontend — validation and data transformation belong in API routes
  - ❌ Don't use `localStorage` for app data when API exists — use the API
  - ❌ Don't import from `src/api/` in `src/app/` (except types) — use the client
  - ❌ Don't write raw SQL — use the store abstraction
  - ❌ Don't skip Zod validation — every write endpoint validates input
  - ❌ Don't hardcode `/api/` URLs — use the Hono client
- **Composition with @wiggum/stack** — Forms use `react-hook-form` + `zodResolver` with shared schemas. Tables use `@tanstack/react-table`. Loading states use `Skeleton`. Errors use `Alert`.

**Update existing skills:**
- `frontend-design/SKILL.md` — Add note: "If the app has an API, data flows through hooks, not direct state"
- `stack/SKILL.md` — Add section on Form + API integration pattern
- `code-quality/SKILL.md` — Add full-stack code quality rules

**Register in Orama index:**
- Add `api` skill to the skills loader so `grep skill "hono"`, `grep skill "api route"`, `grep skill "zod schema"` all return relevant guidance

**Verification:**
- [ ] `grep skill "api"` returns relevant sections from the API skill
- [ ] `grep skill "route pattern"` returns the CRUD convention
- [ ] `grep skill "schema"` returns schema-first development guidance
- [ ] Ralph generates correct full-stack structure when prompted with persistence tasks
- [ ] Ralph correctly stays frontend-only for display-only tasks

---

### Phase 4: Export System (3-4 hours)

**Goal:** Update the export system to produce a deployable full-stack project with separate frontend and backend packages.

**Export output structure:**
```
my-app/
├── frontend/
│   ├── src/
│   │   ├── App.tsx         (or app/ directory)
│   │   ├── components/
│   │   └── hooks/
│   ├── index.html
│   ├── index.css
│   ├── package.json        { "dependencies": { "react": "^19", ... } }
│   ├── vite.config.ts      (generated — standard Vite React config)
│   └── tsconfig.json
│
├── backend/
│   ├── src/
│   │   ├── index.ts        (Hono app — SW adapter removed, standard export)
│   │   ├── routes/
│   │   └── lib/
│   │       └── store.ts    (D1 adapter instead of IndexedDB)
│   ├── package.json        { "dependencies": { "hono": "^4", "zod": "^3", ... } }
│   ├── wrangler.toml       (Cloudflare Workers config)
│   └── tsconfig.json
│
├── shared/
│   ├── schemas/
│   └── types.ts
│
├── package.json            (workspace root — pnpm workspaces)
├── README.md               (deploy instructions)
└── .gitignore
```

**Key export transformations:**
1. Strip Service Worker adapter from backend entry — replace `handle(app)` with `export default app`
2. Replace `idb-store` import with `d1-store` (Cloudflare D1) in backend
3. Generate `wrangler.toml` with D1 binding and static asset config
4. Generate root `package.json` with workspace config
5. Generate `README.md` with deployment instructions for:
   - Cloudflare Workers (primary — `wrangler deploy`)
   - Deno (`deno serve`)
   - Bun (`bun run`)
   - Node.js (`@hono/node-server`)
6. Generate `vite.config.ts` for frontend (standard Vite React setup)

**Frontend-only export (unchanged):**
- No `backend/` directory
- No `shared/` directory
- No workspace config
- Same as current export behavior

**Files to create:**
- `src/lib/export/fullstack.ts` — Full-stack export logic
- `src/lib/export/templates/` — Template files (wrangler.toml, README.md, package.json variants)

**Files to edit:**
- `src/components/preview/ExportButton.tsx` — Detect full-stack, use new export
- `src/lib/export/` (existing export logic) — Add full-stack path

**Verification:**
- [ ] Frontend-only export unchanged
- [ ] Full-stack export produces valid workspace
- [ ] `wrangler.toml` has correct D1 binding
- [ ] Backend entry uses `export default app` (not SW adapter)
- [ ] Store import swapped to D1 adapter
- [ ] README.md includes multi-target deploy instructions
- [ ] Exported project runs with `wrangler dev` locally

---

### Phase 5: Pro Backend Infrastructure (8-12 hours)

**Goal:** Build Wiggum Pro's Hono-powered backend for project hosting, deploy, database provisioning, and auth.

> **This phase is separate from the IDE codebase.** It's a standalone Hono application deployed to Cloudflare Workers. It interacts with the IDE via API calls when the user is logged into Pro.

**5a. Pro API Core (3-4 hours)**

Create the Wiggum Pro API:
```
wiggum-pro/
├── src/
│   ├── index.ts            # Hono app entry
│   ├── routes/
│   │   ├── auth.ts         # Sign up, login, session management
│   │   ├── projects.ts     # Project CRUD (metadata)
│   │   ├── deploy.ts       # Deploy pipeline
│   │   ├── db.ts           # Database provisioning
│   │   └── health.ts       # Health check
│   ├── middleware/
│   │   ├── auth.ts         # Session validation
│   │   └── rate-limit.ts   # Rate limiting per user
│   ├── lib/
│   │   ├── deploy.ts       # Wrangler API integration
│   │   ├── db-provision.ts # D1 database creation
│   │   └── storage.ts      # R2 file storage
│   └── types.ts
├── wrangler.toml
└── package.json
```

**5b. Deploy Pipeline (3-4 hours)**

The deploy route receives project files, compiles them for Cloudflare Workers, and deploys:
1. Receive project archive from IDE
2. Transform backend entry (SW adapter → standard export)
3. Replace store implementation (IndexedDB → D1)
4. Compile with Wrangler
5. Deploy to user's subdomain
6. Provision D1 database if needed
7. Run schema migrations
8. Return deployed URL

**5c. IDE Pro Integration (2-4 hours)**

Update the IDE to connect to Pro when user is authenticated:
- Auth state management (login/logout, session tokens)
- "Deploy" button in preview panel (replaces/augments Export)
- Project sync (save to cloud, load from cloud)
- Status indicators (deployed URL, last deploy time, database status)
- Settings page for Pro account management

**Files to create (in IDE):**
- `src/lib/pro/client.ts` — Pro API client
- `src/lib/pro/auth.ts` — Auth state management
- `src/components/pro/DeployButton.tsx` — Deploy UI
- `src/components/pro/ProStatusBar.tsx` — Status indicators
- `src/contexts/ProContext.tsx` — Pro auth + state context

**Verification:**
- [ ] Pro API deploys to Cloudflare Workers
- [ ] Auth flow works (sign up → login → session)
- [ ] Deploy pipeline compiles and deploys user projects
- [ ] D1 database auto-provisioned on first deploy
- [ ] Schema migrations run from Zod schemas
- [ ] Deployed app accessible at subdomain
- [ ] IDE shows deploy status and URL
- [ ] Free mode works identically without Pro connection

---

## 8. SHELL & BUILD SYSTEM CHANGES

### New Shell Commands

| Command | Subcommands | Description |
|---------|-------------|-------------|
| `api` | `init`, `route`, `schema`, `client`, `status` | Full-stack project management |

### Modified Commands

| Command | Change |
|---------|--------|
| `preview` | Triggers backend build pass if `src/api/` exists, registers API SW |
| `cat @wiggum/api` | Lists available API utilities and patterns (like `cat @wiggum/stack`) |
| `tree` | Shows `src/api/` and `src/shared/` directories correctly |
| `paths` | Shows new writable directories: `src/api/`, `src/shared/` |

### Build System Changes

| Component | Change |
|-----------|--------|
| `compiler.ts` | Add `buildBackend()` function, call after `buildFrontend()` when `src/api/` exists |
| `esmPlugin` | Add `hono`, `@hono/zod-validator`, `zod` to esm.sh resolution |
| New: `wiggumApiPlugin` | Resolve `@wiggum/api/*` imports to pre-bundled API package |
| `preview-cache.ts` (or ZenFS) | Store `api-sw.js` output alongside frontend files |
| Preview SW registration | Conditional API SW registration based on backend build output |

### Write Guard Changes

| Rule | Current | After |
|------|---------|-------|
| Allowed directories | `src/` | `src/`, `src/app/`, `src/api/`, `src/shared/` |
| Allowed extensions in `src/api/` | N/A | `.ts`, `.json` |
| Allowed extensions in `src/shared/` | N/A | `.ts` |
| `App.tsx` location | Must be `src/App.tsx` | `src/App.tsx` OR `src/app/App.tsx` |

---

## 9. SKILLS & QUALITY GATES

### New Quality Gates

| Gate | When | Check | Auto-fix |
|------|------|-------|----------|
| `api-routes-valid` | `src/api/index.ts` exists | All route imports resolve, app exports correctly | No |
| `schemas-used` | `src/shared/` has `.ts` files | Each schema imported by ≥1 route or component | No (informational warning) |
| `api-health` | Backend build succeeds | `GET /api/health` returns 200 in preview | No |

### Modified Quality Gates

| Gate | Change |
|------|--------|
| `app-exists` | Accept `src/App.tsx` OR `src/app/App.tsx` |
| `build-succeeds` | Report frontend and backend build results separately |
| `css-has-variables` | Check `src/index.css` (root level, not moved) |

### API Skill Structure

```
apps/ide/src/skills/ralph/api/
├── SKILL.md              # Main skill file (Orama-indexed)
├── sections/
│   ├── when-fullstack.md  # Decision tree
│   ├── route-patterns.md  # CRUD conventions
│   ├── schema-first.md    # Schema-first development
│   ├── client-usage.md    # Hono RPC client patterns
│   ├── store-patterns.md  # Data access layer
│   └── anti-patterns.md   # What NOT to do
```

**Skill priority:** `api` should be priority 2 (after frontend-design and stack, before code-quality). Ralph should reach for API patterns only when the task requires persistence.

---

## 10. FILE CHANGE INDEX

### Phase 0 (Spike)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `spike/hono-sw-test.ts` | CREATE (temporary) | ~30 |
| Preview system test harness | EDIT (temporary) | ~20 |

**Phase 0 total:** Throwaway spike, no permanent changes

### Phase 1 (Package + Build)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `packages/api/src/index.ts` | CREATE | ~20 |
| `packages/api/src/app.ts` | CREATE | ~40 |
| `packages/api/src/middleware/cors.ts` | CREATE | ~15 |
| `packages/api/src/middleware/error.ts` | CREATE | ~30 |
| `packages/api/src/middleware/logger.ts` | CREATE | ~20 |
| `packages/api/src/store/types.ts` | CREATE | ~25 |
| `packages/api/src/store/idb-store.ts` | CREATE | ~100 |
| `packages/api/src/store/memory-store.ts` | CREATE | ~50 |
| `packages/api/src/client/index.ts` | CREATE | ~20 |
| `packages/api/src/utils/id.ts` | CREATE | ~10 |
| `packages/api/src/utils/time.ts` | CREATE | ~10 |
| `packages/api/package.json` | CREATE | ~20 |
| `packages/api/tsconfig.json` | CREATE | ~15 |
| `scripts/bundle-api.ts` | CREATE | ~80 |
| `src/lib/build/compiler.ts` | EDIT | ~60 lines added |
| `src/lib/build/plugins/wiggumApiPlugin.ts` | CREATE | ~40 |
| `src/lib/preview/` (SW registration) | EDIT | ~40 lines added |

**Phase 1 total:** 14 creates, 2 edits, ~595 LOC

### Phase 2 (Shell Commands)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `src/lib/shell/commands/api.ts` | CREATE | ~250 |
| `src/lib/shell/executor.ts` | EDIT | ~5 lines added |
| `src/lib/shell/write-guard.ts` | EDIT | ~15 lines changed |
| `src/lib/ralph/gates.ts` | EDIT | ~60 lines added |

**Phase 2 total:** 1 create, 3 edits, ~330 LOC

### Phase 3 (Skills)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `src/skills/ralph/api/SKILL.md` | CREATE | ~300 |
| `src/skills/ralph/frontend-design/SKILL.md` | EDIT | ~10 lines added |
| `src/skills/ralph/stack/SKILL.md` | EDIT | ~15 lines added |
| `src/skills/ralph/code-quality/SKILL.md` | EDIT | ~10 lines added |
| Skills loader (Orama registration) | EDIT | ~5 lines added |

**Phase 3 total:** 1 create, 4 edits, ~340 LOC

### Phase 4 (Export)

| File | Action | LOC (est.) |
|------|--------|-----------|
| `src/lib/export/fullstack.ts` | CREATE | ~200 |
| `src/lib/export/templates/wrangler.toml.ts` | CREATE | ~30 |
| `src/lib/export/templates/readme.ts` | CREATE | ~80 |
| `src/lib/export/templates/package-json.ts` | CREATE | ~40 |
| `src/lib/export/templates/vite-config.ts` | CREATE | ~25 |
| `src/components/preview/ExportButton.tsx` | EDIT | ~30 lines changed |

**Phase 4 total:** 5 creates, 1 edit, ~405 LOC

### Phase 5 (Pro — separate repo)

| File | Action | LOC (est.) |
|------|--------|-----------|
| Pro API (entire new project) | CREATE | ~1500 |
| IDE: `src/lib/pro/client.ts` | CREATE | ~60 |
| IDE: `src/lib/pro/auth.ts` | CREATE | ~80 |
| IDE: `src/components/pro/DeployButton.tsx` | CREATE | ~60 |
| IDE: `src/components/pro/ProStatusBar.tsx` | CREATE | ~40 |
| IDE: `src/contexts/ProContext.tsx` | CREATE | ~50 |

**Phase 5 total:** ~1790 LOC (including Pro API project)

### Overall

- **Creates:** 28 new files (IDE) + Pro API project
- **Edits:** 10 files modified
- **Deletes:** 0 (purely additive)
- **Estimated total new code:** ~3,460 LOC (IDE: ~1,670, Pro API: ~1,500, skills: ~300)
- **New dependencies:** `hono`, `@hono/zod-validator` (esm.sh, not bundled with IDE)

---

## 11. CC PROMPT STRATEGY

Each prompt describes patterns, concepts, and files to edit — not copied code. Claude Code implements fresh from guidance (clean room approach).

### Prompt 1: @wiggum/api Package

```
Create the @wiggum/api package for Wiggum's full-stack conventions.

Location: packages/api/

This is a conventions package (like @wiggum/stack) that provides:

1. createApp() factory in app.ts:
   - Returns a new Hono() instance with basePath('/api')
   - Pre-applies CORS middleware (hono/cors) and error handler
   - The error handler catches thrown errors and returns JSON:
     { error: string, status: number }

2. Store abstraction in store/types.ts:
   - Interface: Store with methods:
     getAll(collection: string): Promise<any[]>
     getById(collection: string, id: string): Promise<any | null>
     create(collection: string, data: any): Promise<any>
     update(collection: string, id: string, data: Partial<any>): Promise<any>
     remove(collection: string, id: string): Promise<void>
   - Each method works with a "collection" (like a table name)
   - create() auto-generates an ID (nanoid) and createdAt timestamp

3. IndexedDB store in store/idb-store.ts:
   - Implements Store interface using IndexedDB
   - One IndexedDB database: 'wiggum-app-data'
   - One object store per collection (created on demand via versionchange)
   - getAll returns all records from the collection's object store
   - This is the FREE MODE / PREVIEW store — runs in Service Worker

4. Memory store in store/memory-store.ts:
   - Implements Store interface using a Map<string, Map<string, any>>
   - For testing only

5. Client wrapper in client/index.ts:
   - Re-exports hc from 'hono/client' with a convenience wrapper
   - createClient<T>(baseUrl?: string) returns hc<T>(baseUrl || '/')

6. Utils:
   - utils/id.ts: generateId() using crypto.randomUUID() or nanoid fallback
   - utils/time.ts: now() returning ISO 8601 string

Create the build script at scripts/bundle-api.ts:
- Mirror the pattern in scripts/bundle-stack.ts
- Use esbuild to bundle packages/api/src/index.ts
- Output to packages/api/dist/wiggum-api.js
- External: hono, @hono/zod-validator, zod (resolved by esm.sh at runtime)

Create packages/api/package.json with name "@wiggum/api",
peerDependencies on hono and zod.

Pattern reference: Look at packages/stack/ for the package structure,
and scripts/bundle-stack.ts for the build script pattern.

DO NOT modify any existing files.
```

### Prompt 2: Backend Build Pass + Preview Integration

```
Add a second esbuild pass for backend code and wire up the API
Service Worker in Wiggum's preview system.

The backend build compiles src/api/index.ts into a Service Worker
that runs Hono inside the browser.

1. Edit src/lib/build/compiler.ts (or the main build function):
   - After the existing frontend build, check if src/api/index.ts
     exists in the virtual filesystem
   - If it exists, run a second esbuild pass:
     - Entry: src/api/index.ts
     - Output format: iife (Service Workers don't support ESM in all browsers)
     - External deps: hono, @hono/zod-validator, zod → resolve via esm.sh
     - Add wiggumApiPlugin for @wiggum/api/* imports
     - The output file should have a banner that adds SW lifecycle:
       self.addEventListener('install', (e) => e.waitUntil(self.skipWaiting()))
       self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
     - And a footer that registers the Hono fetch handler:
       import { handle } from 'hono/service-worker'
       self.addEventListener('fetch', handle(app))
     - Actually, this should be handled by having the user's api/index.ts
       already include these lines (via the api init scaffold), so the build
       just compiles it. The scaffold generates the SW-ready entry.
   - Report backend build errors separately — frontend build should still
     succeed even if backend fails
   - Store the output in the same location as frontend builds

2. Create src/lib/build/plugins/wiggumApiPlugin.ts:
   - esbuild plugin that resolves '@wiggum/api' and '@wiggum/api/*'
   - Same pattern as wiggumStackPlugin — loads from pre-bundled output
   - Reads from the bundle-api.ts output

3. Edit the preview system (find the SW registration code):
   - After frontend files are written to preview storage, check if
     api-sw.js (or however the backend output is named) exists
   - If yes: register a second Service Worker scoped to /api/
     navigator.serviceWorker.register('/api-sw.js', { scope: '/api/' })
   - If no: do not register (frontend-only app)
   - Handle SW updates: when backend is rebuilt, post skipWaiting message

Pattern reference: Look at the existing esbuild compilation flow in
compiler.ts for the plugin pattern, external resolution, and output
handling. The backend pass is structurally identical but with different
entry point and output format.

Look at how the existing preview SW is registered for the registration
pattern. The API SW follows the same lifecycle but with a narrower scope.

The key insight: Hono's official hono/service-worker adapter provides
handle() and fire() functions specifically for this use case. The
generated api/index.ts will use these. The build system just needs to
compile and serve the output.
```

### Prompt 3: Shell Command — `api`

```
Create the `api` shell command for Wiggum that scaffolds and manages
full-stack project structure.

Location: src/lib/shell/commands/api.ts

The api command has 5 subcommands:

1. api init:
   - Creates src/api/index.ts with:
     - Hono app with basePath('/api')
     - CORS middleware
     - Health route at GET /api/health
     - SW lifecycle events (install, activate)
     - Fetch handler via hono/service-worker handle()
     - Export of app and AppType
   - Creates src/api/routes/ directory
   - Creates src/api/lib/store.ts that imports and instantiates idb-store
   - Creates src/shared/schemas/ directory
   - Creates src/app/hooks/useAPI.ts with Hono client factory
   - If src/App.tsx exists (upgrading frontend-only):
     - Creates src/app/ directory
     - Reads src/App.tsx content, writes to src/app/App.tsx
     - Deletes src/App.tsx
     - Note: the build system needs to detect App.tsx in either location
   - Returns summary of created files

2. api route <name>:
   - Creates src/api/routes/<name>.ts with CRUD boilerplate:
     - GET / (list all)
     - GET /:id (get one)
     - POST / with zValidator (create)
     - PUT /:id with zValidator (update)
     - DELETE /:id (remove)
     - All using store.getAll/getById/create/update/remove
   - Creates src/shared/schemas/<name>.ts with base schema:
     - id: z.string()
     - createdAt: z.string().datetime()
     - (additional fields if provided as args)
     - Exports Schema, CreateSchema, type, CreateType
   - Appends route import and .route() to src/api/index.ts
   - Returns: "Created route: /api/<name> (GET, POST, PUT, DELETE)"

3. api schema <name> [field:type ...]:
   - Creates src/shared/schemas/<name>.ts
   - Parses field definitions: "title:string" "count:number" "tags:string[]"
   - Generates Zod schema with z.string(), z.number(), z.array(z.string())
   - Always adds id and createdAt
   - Generates Create variant (omits id, createdAt)
   - Exports types via z.infer<>

4. api client:
   - Regenerates src/app/hooks/useAPI.ts
   - Reads src/api/index.ts to find the AppType export
   - Generates typed client: hc<AppType>('/')

5. api status:
   - Lists detected routes (from src/api/routes/*.ts files)
   - Lists detected schemas (from src/shared/schemas/*.ts files)
   - Shows whether API SW would be registered (src/api/index.ts exists)

Register the command in src/lib/shell/executor.ts.

Update src/lib/shell/write-guard.ts:
- Allow .ts files in src/api/ and src/shared/
- Allow src/api/lib/ subdirectory
- Accept App.tsx at src/app/App.tsx (not just src/App.tsx)

Pattern reference: Look at existing shell commands in src/lib/shell/commands/
for the class structure. Each command extends a base class (check which one)
and implements execute(). The api command uses subcommand dispatch similar
to how git handles subcommands.

For file generation, use heredoc-style string building — the generated
files should be clean, readable TypeScript that follows Wiggum conventions.
```

### Prompt 4: API Skill

```
Create the API skill for Ralph that teaches full-stack development
conventions in Wiggum.

Location: apps/ide/src/skills/ralph/api/SKILL.md

This skill follows the same format as existing skills (check the
frontend-design and stack skills for structure). It will be indexed
by Orama and searchable via grep skill "api", grep skill "route",
grep skill "schema", etc.

Key sections to include:

WHEN TO GO FULL-STACK:
A decision tree. If task mentions save/store/persist/accounts/login/
share/database/API → use api init. Otherwise stay frontend-only.
Never add a backend "just in case."

SCHEMA-FIRST DEVELOPMENT:
Always define Zod schemas in src/shared/schemas/ BEFORE writing routes
or components. The schema is the contract. Frontend and backend both
import from shared/. Never duplicate type definitions.

ROUTE CONVENTIONS:
One file per resource in src/api/routes/. Always use zValidator for
write endpoints (POST, PUT). Return JSON for everything. Use proper
HTTP status codes (201 for create, 404 for not found, 400 for
validation errors). Import store from ../lib/store for data access.

CLIENT USAGE:
Always use the generated useAPI hook from src/app/hooks/useAPI.ts.
Never use raw fetch('/api/...') — the Hono client provides type safety.
Handle loading/error states in the UI using @wiggum/stack components.

STORE PATTERNS:
Use the store abstraction for all data access. Never call IndexedDB
directly. The store interface is the same in preview (IndexedDB) and
production (D1/Turso) — Ralph's code doesn't change between environments.

FORM + API INTEGRATION:
Use react-hook-form with zodResolver and the SAME schema from shared/.
On submit, call the API client. Show validation errors inline using
the Form component from @wiggum/stack.

ANTI-PATTERNS (critical for grep skill results):
- Don't put business logic in frontend components
- Don't use localStorage when an API exists
- Don't import route handlers in frontend (only types)
- Don't skip Zod validation on write endpoints
- Don't hardcode API URLs
- Don't access IndexedDB directly in route handlers
- Don't create schemas that aren't used by any route or component

Register this skill in the skills loader (find where skills are imported
and added to the Orama index). Set priority to 2 (after frontend-design
at 0 and stack at 1, before code-quality at 2 — shift code-quality to 3).

Also add brief references in existing skills:
- frontend-design: "For apps with APIs, data flows through hooks, not
  direct state manipulation"
- stack: Add a section on Form + useAPI integration patterns
- code-quality: Add full-stack rules (no cross-boundary imports, etc.)
```

### Prompt 5: Export System

```
Update Wiggum's export system to support full-stack projects.

Currently the export produces a single-page app. When src/api/ exists,
the export should produce a deployable full-stack project.

1. Create src/lib/export/fullstack.ts:
   - Detect full-stack: check if src/api/index.ts exists in filesystem
   - If frontend-only: use existing export logic (unchanged)
   - If full-stack: generate a workspace project:

   a. Frontend directory:
      - All files from src/app/ (or src/ if no src/app/)
      - index.html, index.css
      - Generated package.json with react deps
      - Generated vite.config.ts (standard Vite React config)
      - Generated tsconfig.json

   b. Backend directory:
      - All files from src/api/
      - TRANSFORM the entry point: replace SW adapter imports with
        standard Hono export (remove hono/service-worker, add
        export default app)
      - TRANSFORM the store import: replace idb-store with a
        placeholder d1-store or configurable store
      - Generated package.json with hono, zod, @hono/zod-validator deps
      - Generated wrangler.toml with D1 binding
      - Generated tsconfig.json

   c. Shared directory:
      - All files from src/shared/ (copied as-is)

   d. Root:
      - Generated package.json with pnpm workspaces config
      - Generated README.md with deploy instructions for:
        Cloudflare Workers, Deno, Bun, Node.js
      - Generated .gitignore

2. Create template generators in src/lib/export/templates/:
   - wrangler-toml.ts: generates wrangler.toml string
   - readme.ts: generates README.md with project name and routes
   - package-json.ts: generates various package.json files
   - vite-config.ts: generates frontend vite.config.ts

3. Edit ExportButton.tsx:
   - Import fullstack export logic
   - Detect whether project is full-stack
   - Use appropriate export path
   - Zip file structure changes for full-stack

The key transformation in the export: the backend code that runs in a
Service Worker during preview (using hono/service-worker handle()) needs
to become a standard Hono app (export default app) for production
deployment. This is a string replacement in the entry file.

Pattern reference: Look at the existing export logic (ExportButton.tsx
and any export utilities) for the current flow. The full-stack export
wraps it with additional files and transformations.
```

### Prompt 6: Pro Integration (Phase 5 — Future)

```
[DEFERRED — write this prompt when Phases 1-4 are stable]

This prompt will cover:
- ProContext.tsx for auth state
- Pro API client (Hono RPC to wiggum-pro backend)
- DeployButton.tsx (one-click deploy to wiggum.app subdomain)
- ProStatusBar.tsx (deploy status, database status, app URL)
- The Wiggum Pro API itself (separate Hono project on CF Workers)

Dependencies: Stable IDE with full-stack generation (Phases 1-4),
Pro API designed and hosted, billing integration decided.
```

---

## 12. RISK ASSESSMENT

### Low Risk

| Risk | Mitigation |
|------|-----------|
| Bundle size | Hono is ~18KB, Zod is ~13KB — resolved via esm.sh, not bundled with IDE |
| @wiggum/api package | Same pattern as @wiggum/stack — proven architecture |
| Skill integration | Orama indexing is established — adding one more skill is routine |
| Export system | Purely additive — frontend-only export unchanged |
| Shell command | One new command (`api`) with subcommands — fits existing executor pattern |

### Medium Risk

| Risk | Mitigation |
|------|-----------|
| Dual Service Worker conflicts | Spike (Phase 0) validates this before any permanent work. Fallback: single SW with path-based routing (Hono handles /api/*, passthrough for everything else). |
| Backend build errors confuse Ralph | Report frontend and backend errors separately. Backend failure doesn't block frontend preview. Ralph sees "Backend build failed: [error]" as distinct feedback. |
| IndexedDB in Service Worker | IndexedDB is available in SW context (Web standard). If specific browser issues arise, fall back to in-memory store for preview (data doesn't persist across refreshes but CRUD still works). |
| Ralph generates bad API code | Quality gates catch broken imports, zValidator catches invalid schemas, store interface limits what Ralph can do wrong. Same harness philosophy as frontend. |
| Full-stack project structure confuses Ralph | `api init` scaffolds everything — Ralph doesn't build the structure from scratch. Skills document the conventions explicitly. The api command is the guardrail. |
| esbuild iife format for SW | Hono is designed for this — Cloudflare Workers use a similar bundling approach. If iife causes issues with esm.sh imports, try ESM format with importScripts fallback. |

### High Risk (but unlikely)

| Risk | Mitigation |
|------|-----------|
| Hono major version breaking change | Pin to Hono v4.x via esm.sh version specifier. Hono has excellent backward compatibility (creator's philosophy). |
| Service Worker scope conflicts with ZenFS migration | ZenFS Port backend uses MessageChannel (not fetch interception). API SW uses fetch events for /api/*. No overlap. Validate during Phase 0 spike. |
| Pro deploy pipeline complexity | Phase 5 is deliberately separate and deferred. Ship free-mode full-stack first. Pro is infrastructure work, not IDE work. |
| Users expect real database in free mode | IndexedDB store is clearly documented as "preview persistence." Data persists across refreshes but is browser-local. Export README explains real database setup. |

---

## 13. RELATIONSHIP TO OTHER PLANS

### Theme Generator

**No conflicts.** The theme generator produces CSS variables in `src/index.css`. Full-stack apps keep `index.css` at the root (not inside `src/app/`). Theme applies to the frontend — backend has no visual output.

**Synergy:** When Ralph generates a full-stack app, it should call `theme preset` first (for the frontend), then `api init` (for the backend). The theme generator runs before API scaffolding.

### Power-Up Plan

**Layer 1 (PWA):** Minor coordination needed — the API Service Worker must coexist with Workbox's precache SW. Workbox handles static assets, API SW handles `/api/*`. Use Workbox's `navigateFallback` to exclude `/api/*` from SPA routing.

**Layer 2 (ESM caching):** Beneficial — `hono` and `@hono/zod-validator` are esm.sh packages that benefit from Workbox runtime caching. First build fetches from esm.sh, subsequent builds hit cache.

**Layer 3 (Build intelligence):** Content-hash cache benefits backend builds too. If `src/api/` hasn't changed, skip the backend build pass entirely.

**Layer 4 (Browser Tailwind):** No interaction — Tailwind runs on frontend CSS, not backend code.

**Layer 5 (Design intelligence):** Component decision tree helps Ralph choose the right UI components for API-connected interfaces (forms, tables, loading states).

### ZenFS Migration

**No conflicts.** The backend build reads source files from the virtual filesystem via `JSRuntimeFS` — same interface regardless of LightningFS or ZenFS underneath. Backend build output goes to the same preview storage.

**Synergy:** ZenFS Phase 2 (kill preview-cache with Port backend) benefits the API SW — if preview files are served from ZenFS directly, the API SW only needs to handle `/api/*` without any file-serving concerns.

**Execution order:**
```
1. Hono Phase 0 (spike)              ← validates SW architecture
2. ZenFS Phase 0-1 (adapter swap)    ← cleaner foundation
3. Hono Phase 1 (package + build)    ← uses JSRuntimeFS
4. Hono Phase 2 (shell commands)     ← uses JSRuntimeFS
5. ZenFS Phase 2 (kill preview-cache) ← simplifies preview for both
6. Hono Phase 3-4 (skills + export)  ← independent of FS layer
```

### Chief Implementation Plan

**Synergy, no conflicts.** Chief becomes even more valuable with full-stack apps:

- Chief helps plan the data model ("What entities do you need? What fields?")
- Chief scaffolds schemas via `api schema` before sending to Ralph
- Chief writes `.chief/prompt.md` that includes both frontend design AND API structure
- Chief reviews Ralph's output: "The recipes API is working, but the form doesn't validate ingredients correctly — let me refine the prompt"

**Dependencies:** Chief doesn't depend on Hono, and Hono doesn't depend on Chief. They enhance each other but can be built independently.

---

## APPENDIX A: FULL-STACK PROJECT SCAFFOLD

What `api init` generates for a new project:

```
src/
├── app/
│   ├── App.tsx
│   │   import { useRecipes } from './hooks/useAPI'
│   │   // React app entry — fetches from /api/
│   │
│   └── hooks/
│       └── useAPI.ts
│           import { hc } from 'hono/client'
│           import type { AppType } from '../../api/index'
│           const client = hc<AppType>('/')
│           export function useRecipes() { /* typed methods */ }
│
├── api/
│   ├── index.ts
│   │   import { Hono } from 'hono'
│   │   import { cors } from 'hono/cors'
│   │   import { handle } from 'hono/service-worker'
│   │   const app = new Hono().basePath('/api')
│   │   app.use('*', cors())
│   │   app.get('/health', (c) => c.json({ status: 'ok' }))
│   │   // route imports added by `api route` command
│   │   self.addEventListener('install', ...)
│   │   self.addEventListener('activate', ...)
│   │   self.addEventListener('fetch', handle(app))
│   │   export default app
│   │   export type AppType = typeof app
│   │
│   ├── routes/
│   │   └── (empty — populated by `api route <name>`)
│   │
│   └── lib/
│       └── store.ts
│           import { IDBStore } from '@wiggum/api/store/idb-store'
│           export const store = new IDBStore()
│
├── shared/
│   └── schemas/
│       └── (empty — populated by `api route <name>` or `api schema <name>`)
│
└── index.css
    (theme variables — generated by theme command)
```

---

## APPENDIX B: HONO IMPORT MAP (esm.sh)

Packages resolved via esm.sh for both IDE preview and exported apps:

| Package | esm.sh URL | Size | Purpose |
|---------|-----------|------|---------|
| `hono` | `https://esm.sh/hono@4` | ~18KB | HTTP framework |
| `hono/service-worker` | `https://esm.sh/hono@4/service-worker` | ~2KB | SW adapter |
| `hono/client` | `https://esm.sh/hono@4/client` | ~5KB | RPC client (hc) |
| `hono/cors` | `https://esm.sh/hono@4/cors` | ~3KB | CORS middleware |
| `@hono/zod-validator` | `https://esm.sh/@hono/zod-validator` | ~3KB | Zod integration |
| `zod` | `https://esm.sh/zod@3` | ~13KB | Schema validation |

**Total backend overhead:** ~44KB (esm.sh cached after first load)

All resolvable by the existing `esmPlugin` — no new plugin infrastructure needed for these packages.

---

## APPENDIX C: DECISION LOG

| Decision | Options | Chosen | Why |
|----------|---------|--------|-----|
| Backend framework | Hono, Express, TanStack Start | Hono | Explicit over magic. SW adapter for browser preview. ~18KB. Deploys everywhere. |
| Backend runtime | Service Worker, Web Worker, Main thread | Service Worker | Real HTTP interception (fetch events). Same code deploys to production. Hono has official adapter. |
| Data store (free) | localStorage, IndexedDB, in-memory | IndexedDB via store abstraction | Durable across refreshes. Available in SW. Store abstraction swappable for production DB. |
| Project structure | Two stacks, one progressive stack | One progressive stack | Frontend-only by default, backend additive. Ralph doesn't mode-switch. |
| Shared code | Zod schemas, TypeScript interfaces, GraphQL schema | Zod schemas | Runtime validation + static types from one source. Used by both Hono (zValidator) and React (zodResolver). |
| Package placement | In @wiggum/stack, separate @wiggum/api | Separate @wiggum/api | Clean separation. Stack is UI. API is backend conventions. Different consumers. |
| Export target | Cloudflare only, multi-target | Multi-target (CF primary) | Hono runs everywhere. README includes CF, Deno, Bun, Node instructions. No lock-in. |
| Pro infrastructure | Separate API, embedded in IDE, serverless functions | Separate Hono API on CF Workers | Clean boundary. Same framework (Hono) for dogfooding. Independent scaling. |
| Pro database | Managed Postgres, D1, Turso, Firebase | D1 (default) + Turso/Neon (optional) | D1 is zero-config on CF. SQLite fits Wiggum's simplicity philosophy. Upgrade path available. |
| Auth (Pro) | Roll own, Clerk, Auth0, BetterAuth | Roll own (Hono middleware) | Full control. No third-party dependency. Simple session-based auth. |
| Zod → SQL | Drizzle, Prisma, manual | Custom lightweight mapper | No ORM magic. Simple Zod object → CREATE TABLE. Wiggum philosophy: explicit. |

---

## APPENDIX D: ESTIMATED TIMELINE

| Phase | Description | Est. Hours | Dependencies |
|-------|-------------|-----------|--------------|
| 0 | Spike: Hono in Service Worker | 1-2h | None |
| 1 | @wiggum/api + backend build + preview | 6-8h | Phase 0 validates |
| 2 | Shell commands + project scaffolding | 4-5h | Phase 1 |
| 3 | Skills + Ralph prompting | 3-4h | Phase 1 (can parallel with 2) |
| 4 | Export system | 3-4h | Phase 2 |
| 5 | Pro backend infrastructure | 8-12h | Phases 1-4 stable |

**Total: 25-35 hours**

- Phases 0-4 (free mode full-stack): 17-23 hours
- Phase 5 (Pro mode): 8-12 hours (can be built independently once IDE is stable)

---

## APPENDIX E: WHAT THIS MAKES WIGGUM

After this plan, the competitive landscape changes:

| Capability | Bolt/Lovable | Cursor | Wiggum (after Hono) |
|------------|-------------|--------|---------------------|
| Full-stack generation | ✅ (Next.js + Supabase) | ❌ (code only) | ✅ (React + Hono) |
| Runs in browser | ❌ (cloud) | ❌ (desktop) | ✅ (frontend AND backend) |
| Design enforcement | ❌ (LLM freestyle) | ❌ | ✅ (theme generator + gates) |
| Export & deploy anywhere | ❌ (their cloud) | N/A | ✅ (CF, Deno, Bun, Node) |
| Database agnostic | ❌ (Supabase/Prisma) | N/A | ✅ (D1, Turso, Neon, any) |
| Two-agent planning | ❌ | ❌ | ✅ (Chief + Ralph) |
| Model agnostic | ❌ | ❌ | ✅ (any OpenAI-compatible) |
| Offline capable | ❌ | ❌ | ✅ (PWA + cached deps) |
| Pro hosting | ✅ | N/A | ✅ (Wiggum Pro) |
| Free tier power | Limited | N/A | Full IDE + full-stack + export |

**The one-sentence pitch becomes:**
*Wiggum is the only AI builder where you can create, preview, and export full-stack apps entirely in your browser — with mathematically enforced design quality, model-agnostic AI, and zero vendor lock-in.*
