# MCP the Wiggum Way

> How Wiggum integrates the Model Context Protocol into a browser-native AI IDE — giving Ralph and Chief access to external tools, APIs, and context without leaving the browser.

---

## TABLE OF CONTENTS

1. [Why MCP](#1-why-mcp)
2. [Constraints — Browser-Native Reality](#2-constraints--browser-native-reality)
3. [Architecture Overview](#3-architecture-overview)
4. [The Pipeline: Discover → Namespace → Convert → Dispatch](#4-the-pipeline-discover--namespace--convert--dispatch)
5. [MCP Client — Clean Room Design](#5-mcp-client--clean-room-design)
6. [Tool Registry Integration](#6-tool-registry-integration)
7. [Ralph's MCP Tools](#7-ralphs-mcp-tools)
8. [Chief's MCP Tools](#8-chiefs-mcp-tools)
9. [Configuration & Settings UI](#9-configuration--settings-ui)
10. [Connection Lifecycle & Health](#10-connection-lifecycle--health)
11. [CORS & Transport](#11-cors--transport)
12. [Security Model](#12-security-model)
13. [Implementation Phases](#13-implementation-phases)
14. [File Change Index](#14-file-change-index)
15. [CC Prompt Strategy](#15-cc-prompt-strategy)
16. [Relationship to Other Plans](#16-relationship-to-other-plans)

---

## 1. WHY MCP

Ralph builds React apps. He reads files, writes code, runs shell commands, checks quality gates. But his world ends at the virtual filesystem boundary. He can't query a database, call a third-party API, fetch context from Notion, or search a codebase on GitHub.

Chief plans projects. He helps users refine ideas, reads project files, searches skills. But he can't pull requirements from Jira, check deployment status, or look up documentation from external sources.

MCP solves this. It's a standard protocol that lets any client (Ralph, Chief) discover and call tools exposed by remote servers — databases, APIs, knowledge bases, dev tools — through a uniform interface. The model doesn't know or care whether a tool is built-in or MCP. It sees functions with names, descriptions, and schemas. It calls them.

**What MCP gives Wiggum:**

- **Ralph** → database access (query/mutate via MCP), API integrations (Stripe, GitHub, Supabase), external search, deployment triggers
- **Chief** → context retrieval (Notion pages, Google Docs, Confluence), project management (Jira tickets, Linear issues), documentation lookup
- **Users** → plug-and-play extensibility. Add an MCP server URL in settings, get new tools instantly. No code changes, no plugin system, no marketplace. Just a URL.

---

## 2. CONSTRAINTS — BROWSER-NATIVE REALITY

Wiggum runs entirely in the browser. This shapes everything about our MCP implementation.

### What We Can Do

**StreamableHTTP transport works in browsers.** The MCP TypeScript SDK's `StreamableHTTPClientTransport` uses `fetch()` and `EventSource` — both are Web APIs. No Node.js dependencies. No stdio. No subprocess spawning. This is the only transport that matters for us.

**The MCP SDK (`@modelcontextprotocol/sdk`) is MIT/Apache-2.0 licensed.** We can import it via esm.sh like any other dependency. No bundling, no build step.

### What We Can't Do

**stdio transport is impossible.** Browsers can't spawn processes. Every MCP tutorial that starts with `npx mcp-server-xyz` is irrelevant to us. Our users connect to *remote* MCP servers only.

**CORS is a blocker for many MCP servers.** An MCP server at `https://mcp.example.com/mcp` needs to send `Access-Control-Allow-Origin` headers for browser clients. Many servers (especially those designed for desktop use via Claude Desktop or VS Code) don't. Solution: our CORS proxy (see §11).

**OAuth flows are complex in-browser.** MCP servers that require OAuth need redirect-based auth flows. Phase 1 uses static auth headers (API keys, tokens). OAuth is Phase 3.

### The Wiggum Advantage

Unlike desktop MCP clients that manage persistent connections and subprocess lifecycles, Wiggum's browser-native architecture means:

- **No process management** — just HTTP connections
- **Natural cleanup** — connections close when the tab closes
- **No PATH, no env vars, no config files** — just URLs and optional headers in settings
- **esm.sh resolution** — `@modelcontextprotocol/sdk` loads like any other import, zero bundler config

---

## 3. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│ Wiggum IDE (Browser)                                            │
│                                                                 │
│  ┌──────────┐     ┌──────────┐                                  │
│  │  Chief    │     │  Ralph   │                                  │
│  │  (chat)   │     │  (loop)  │                                  │
│  └────┬─────┘     └────┬─────┘                                  │
│       │                │                                        │
│       └───────┬────────┘                                        │
│               ▼                                                 │
│  ┌────────────────────────────┐                                 │
│  │  Unified Tool Registry     │                                 │
│  │                            │                                 │
│  │  Built-in:  shell, theme,  │                                 │
│  │    cat, write, grep, ...   │                                 │
│  │                            │                                 │
│  │  MCP:  github__search,     │                                 │
│  │    supabase__query,        │                                 │
│  │    notion__get_page, ...   │                                 │
│  └────────────┬───────────────┘                                 │
│               │                                                 │
│    ┌──────────┼──────────┐                                      │
│    ▼          ▼          ▼                                      │
│  ┌──────┐  ┌──────┐  ┌──────┐                                  │
│  │Shell │  │MCP   │  │MCP   │                                   │
│  │Exec  │  │Client│  │Client│                                   │
│  │      │  │(gh)  │  │(supa)│                                   │
│  └──────┘  └──┬───┘  └──┬───┘                                  │
│               │          │                                      │
│ ──────────────┼──────────┼───── browser boundary ────────────── │
│               ▼          ▼                                      │
│         ┌──────────┐ ┌──────────┐                               │
│         │ CORS     │ │ Direct   │                               │
│         │ Proxy    │ │ (if CORS │                               │
│         │ (CF)     │ │ headers) │                               │
│         └────┬─────┘ └────┬─────┘                               │
└──────────────┼────────────┼─────────────────────────────────────┘
               ▼            ▼
         ┌──────────┐ ┌──────────┐
         │ MCP      │ │ MCP      │
         │ Server   │ │ Server   │
         │ (github) │ │ (supa)   │
         └──────────┘ └──────────┘
```

**Key insight:** The model sees one flat list of tools. It doesn't know `github__search_repos` is remote and `cat` is local. The tool registry is the merge point — built-in commands from the shell and MCP tools from remote servers become one unified toolset.

---

## 4. THE PIPELINE: DISCOVER → NAMESPACE → CONVERT → DISPATCH

MCP integration is a four-stage pipeline. Each stage is a pure function with clear inputs and outputs.

### Stage 1: Discover

Connect to each configured MCP server and call `listTools()` to get available tools with their JSON Schema definitions.

```
Input:  MCPServerConfig[] (from settings)
Output: Map<serverName, MCPToolDefinition[]>
```

Each `MCPToolDefinition` has: `name`, `description`, `inputSchema` (JSON Schema object).

Discovery happens once at startup and can be re-triggered manually (settings change, reconnect button). It's async and failure-tolerant — if one server fails, the others still work.

### Stage 2: Namespace

Prefix each tool name with its server name to prevent collisions. Two MCP servers might both expose a `search` tool — namespacing makes them `github__search` and `notion__search`.

```
Input:  Map<serverName, MCPToolDefinition[]>
Output: Map<namespacedName, { definition: MCPToolDefinition, serverName: string }>
```

Convention: `{serverName}__{toolName}` (double underscore separator). The model sees the full namespaced name. The description gets a `[serverName]` prefix for additional clarity.

### Stage 3: Convert

Transform MCP tool definitions into Wiggum's tool format (OpenAI function calling schema). MCP schemas are already JSON Schema objects, so this is mostly renaming fields.

```
Input:  Map<namespacedName, MCPToolDefinition>
Output: Tool[] (Wiggum's OpenAI-compatible tool format)
```

The conversion is:
```typescript
{
  type: 'function',
  function: {
    name: namespacedName,           // e.g. "github__search_repos"
    description: `[github] ${original.description}`,
    parameters: original.inputSchema // JSON Schema, already compatible
  }
}
```

### Stage 4: Dispatch

When the model calls an MCP tool, route the call to the correct client.

```
Input:  toolCall { name: "github__search_repos", arguments: {...} }
Output: string (tool result text)
```

The dispatcher:
1. Splits `namespacedName` on `__` to get `serverName` and `originalToolName`
2. Looks up the `MCPClient` instance for that server
3. Calls `client.callTool(originalToolName, arguments)`
4. Returns the text content from the MCP response

**Error handling:** MCP responses can be `isError: true`. The dispatcher converts these to error strings that the model can reason about, same as a shell command returning exit code 1.

---

## 5. MCP CLIENT — CLEAN ROOM DESIGN

Our MCP client wraps the official `@modelcontextprotocol/sdk` (MIT/Apache-2.0). We write a thin adapter that handles connection lifecycle, reconnection, and Wiggum-specific concerns.

### MCPConnection Class

```typescript
// src/lib/mcp/connection.ts
// Manages a single connection to one MCP server

interface MCPServerConfig {
  url: string
  headers?: Record<string, string>  // Static auth headers (API keys, tokens)
  proxy?: boolean                    // Route through CORS proxy
}

interface MCPConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  toolCount: number
  lastError?: string
  lastConnected?: number
}
```

**Responsibilities:**
- Creates `Client` + `StreamableHTTPClientTransport` from `@modelcontextprotocol/sdk`
- Lazy connection: connects on first `listTools()` or `callTool()`, not at construction
- Connection guard: auto-reconnects if disconnected
- Tracks connection state for UI display
- Graceful close on cleanup

### MCPRegistry Class

```typescript
// src/lib/mcp/registry.ts
// Manages all MCP connections and provides unified tool discovery

interface MCPRegistryState {
  servers: Map<string, MCPConnection>
  tools: Map<string, MCPToolEntry>  // namespacedName → { def, serverName, connection }
  status: 'idle' | 'discovering' | 'ready' | 'partial'  // partial = some servers failed
}
```

**Responsibilities:**
- Holds all `MCPConnection` instances, keyed by server name
- Runs the full discover → namespace → convert pipeline
- Maintains a `Map<namespacedName, MCPToolEntry>` for O(1) dispatch lookup
- Exposes `getTools(): Tool[]` for merging into the unified tool registry
- Exposes `dispatch(name, args): Promise<string>` for tool execution
- Handles server add/remove without disrupting existing connections
- Emits state changes for React consumption

### Why Not Use `@ai-sdk/mcp`?

Vercel's AI SDK has an MCP package (`@ai-sdk/mcp`). We don't use it because:

1. **We don't use the AI SDK.** Wiggum's LLM client is a plain `fetch` wrapper. Adding `@ai-sdk/mcp` would pull in `ai` as a peer dependency — the entire SDK we deliberately avoided.
2. **We need control over the tool format.** The AI SDK converts MCP tools to its own `ToolSet` type. We need OpenAI function calling format.
3. **It's a thin wrapper anyway.** Under the hood, `@ai-sdk/mcp` just calls `@modelcontextprotocol/sdk`. We skip the middleman.

### Import Strategy

```typescript
// Via esm.sh — no npm install needed in the browser
import { Client } from 'https://esm.sh/@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from 'https://esm.sh/@modelcontextprotocol/sdk/client/streamableHttp.js'
```

**Peer dependency:** The MCP SDK requires `zod`. We already plan to use Zod for Toolkit 2.0 schemas and Hono validation. Single shared dependency.

---

## 6. TOOL REGISTRY INTEGRATION

This is where MCP meets the rest of Wiggum's tool system.

### Current State

Today, Ralph has one tool: `shell`. Everything goes through the shell executor — `cat`, `write`, `theme`, `grep`, `build`, etc. The model calls `shell` with a command string, the executor parses and routes it.

Chief (planned) will have its own tools: `read_file`, `list_files`, `search_skills`, `write_plan`, `send_to_ralph`.

### With MCP

MCP tools join the tool arrays that get passed to `chat()`:

```typescript
// In Ralph's loop (loop.ts)
const tools: Tool[] = [
  SHELL_TOOL,                    // The built-in shell tool
  ...mcpRegistry.getTools()      // All discovered MCP tools
]

// In Chief's chat (useChiefChat.ts)
const tools: Tool[] = [
  ...CHIEF_TOOLS,                // read_file, list_files, etc.
  ...mcpRegistry.getTools()      // Same MCP tools
]
```

**Dispatch routing:** When a tool call comes back from the model:

```typescript
if (toolCall.function.name === 'shell') {
  // Route to ShellExecutor (existing path)
  result = await shellExecutor.execute(toolCall.function.arguments.command)
} else if (mcpRegistry.has(toolCall.function.name)) {
  // Route to MCP dispatch
  result = await mcpRegistry.dispatch(toolCall.function.name, JSON.parse(toolCall.function.arguments))
} else if (CHIEF_TOOLS_MAP[toolCall.function.name]) {
  // Route to Chief's inline dispatch
  result = await dispatchChiefTool(toolCall, fs, cwd, coordinator)
}
```

This fits cleanly into the existing `if/else` dispatch in `loop.ts` (Ralph) and the while-loop dispatch in `useChiefChat.ts` (Chief).

### Tool Count Budget

Models have limits on how many tools they handle well. GPT-4o works fine with 20-30 tools. Claude handles 50+. Smaller models start struggling past 10-15.

MCP servers can expose dozens of tools each. Unbounded tool discovery would blow the budget for weaker models.

**Mitigation strategies (Phase 2+):**

1. **Server-level toggle** — Users can enable/disable entire servers per project
2. **Tool selection** — After discovery, users can check/uncheck individual tools
3. **Smart filtering** — Chief could select relevant MCP tools per-task before invoking Ralph
4. **Description optimization** — Compress tool descriptions via LLM API 3.0's tool output optimization (§8)

Phase 1 keeps it simple: all discovered tools are included. The user manages the budget by choosing which servers to configure.

---

## 7. RALPH'S MCP TOOLS

Ralph operates in an autonomous loop — fresh context per iteration, one action per turn, up to 20 iterations. MCP tools extend what Ralph can do in each iteration.

### Use Cases

**Database access** — Ralph builds a CRUD app and wants to verify data actually persists:
```
Model calls: supabase__query({ sql: "SELECT * FROM recipes LIMIT 5" })
Result: "[{id: 1, title: 'Pasta'}, ...]"
```

**GitHub integration** — Ralph scaffolds a project based on an existing repo's structure:
```
Model calls: github__get_repo_tree({ owner: "user", repo: "template", path: "src" })
Result: "src/App.tsx, src/components/..., src/hooks/..."
```

**API testing** — Ralph calls a live endpoint to verify the API he built:
```
Model calls: httpbin__post({ url: "/api/recipes", body: {...} })
Result: "201 Created: {id: 'abc', ...}"
```

### How It Fits the Loop

MCP tool calls are just another action type in Ralph's iteration. The model decides whether to use `shell` (file ops, build, preview) or an MCP tool (external access) based on what it's trying to accomplish.

```
Iteration 1: shell → "write src/App.tsx ..."       (write code)
Iteration 2: shell → "build"                       (compile)
Iteration 3: shell → "preview check"               (verify)
Iteration 4: supabase__query → "SELECT ..."         (check data)
Iteration 5: shell → "complete"                     (done)
```

No special handling needed. The loop already processes tool calls generically — it sends the tool result back as a message and continues to the next iteration.

### State Serialization

MCP tool results are strings. They serialize naturally into `.ralph/` state files just like shell output. Ralph's fresh-context-per-iteration design means MCP connections don't need to persist state between iterations — the MCPRegistry stays alive in the React hook layer while Ralph's loop creates fresh message arrays each time.

---

## 8. CHIEF'S MCP TOOLS

Chief is conversational — multi-turn dialogue with the user. MCP tools give Chief access to external context during planning.

### Use Cases

**Pull requirements from Jira:**
```
User: "Build the dashboard from ticket PROJ-123"
Chief calls: jira__get_issue({ key: "PROJ-123" })
Result: "Title: User Dashboard... Acceptance criteria: 1. Show user stats..."
Chief: "I found the ticket. Here's what I'm thinking for the dashboard layout..."
```

**Fetch design docs from Notion:**
```
User: "Follow the design spec we wrote last week"
Chief calls: notion__search({ query: "dashboard design spec" })
Result: "Page: Dashboard Design Spec v2 — Color scheme: blue/gray, Layout: sidebar + main..."
Chief: "Got it. The spec calls for a sidebar layout with blue/gray theming. Want me to have Ralph use the ocean mood?"
```

**Check deployment status:**
```
User: "Is the latest version deployed?"
Chief calls: vercel__get_deployment({ project: "my-app" })
Result: "Status: READY, URL: my-app.vercel.app, Commit: abc123"
Chief: "Yes, it's live at my-app.vercel.app."
```

### Chief as Tool Curator

In future phases, Chief becomes a smart filter between MCP tools and Ralph. When the user says "build it," Chief doesn't just pass all 30 MCP tools to Ralph. It selects the relevant ones:

```
User: "Build a recipe app with Supabase storage"
Chief: [selects supabase__query, supabase__insert, supabase__schema]
Chief → Ralph prompt: "Build a recipe CRUD app. You have access to these tools: [3 Supabase tools]"
```

This keeps Ralph's tool budget lean and focused. Phase 2+ feature.

---

## 9. CONFIGURATION & SETTINGS UI

### Data Model

```typescript
interface MCPServerConfig {
  url: string                              // MCP endpoint URL
  headers?: Record<string, string>         // Static auth (Authorization, x-api-key, etc.)
  proxy?: boolean                          // Route through CORS proxy (default: false)
  enabled?: boolean                        // Toggle without deleting (default: true)
}

// In Wiggum's settings (stored in localStorage)
interface WiggumSettings {
  // ... existing settings ...
  mcpServers?: Record<string, MCPServerConfig>  // keyed by user-chosen server name
}
```

### Settings UI

The MCP section in settings follows the existing provider settings pattern:

```
┌─────────────────────────────────────────────┐
│ MCP Servers                                  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ ● github                      [✕]    │   │
│  │   https://mcp.github.com/mcp         │   │
│  │   Status: Connected (12 tools)       │   │
│  │   ▸ Headers  ▸ Advanced              │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ ○ supabase                    [✕]    │   │
│  │   https://mcp.supabase.io/mcp        │   │
│  │   Status: Error — 403 Forbidden      │   │
│  │   ▸ Headers  ▸ Advanced              │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [+ Add Server]                              │
│                                              │
│  Server Name: ___________                    │
│  URL:         ___________                    │
│  [Add]                                       │
└─────────────────────────────────────────────┘
```

**Status indicators:**
- `●` Green = connected, tools discovered
- `◐` Yellow = connecting / discovering
- `○` Red = error (with message)
- `◌` Gray = disabled

**Expandable sections:**
- **Headers** — key/value pairs for `Authorization`, custom headers
- **Advanced** — proxy toggle, enable/disable

### Persistence

Server configs persist in localStorage alongside other Wiggum settings. They're per-user, not per-project (you want your GitHub MCP server available across all projects).

Exception: project-specific servers (like a Supabase instance for one app) could be stored in `.wiggum/mcp.json` in the virtual filesystem. Phase 2 feature.

---

## 10. CONNECTION LIFECYCLE & HEALTH

### Lifecycle

```
User adds server in settings
    ↓
MCPRegistry.addServer(name, config)
    ↓
MCPConnection created (status: 'disconnected')
    ↓
First tool discovery triggers connect()
    ↓
StreamableHTTPClientTransport → POST /mcp (initialize)
    ↓
listTools() → discover available tools
    ↓
Tools registered in MCPRegistry (status: 'connected')
    ↓
... tools available for Ralph/Chief ...
    ↓
User removes server OR tab closes
    ↓
MCPConnection.close() → transport.close()
```

### Reconnection

The MCP SDK's `StreamableHTTPClientTransport` handles HTTP naturally — each `callTool()` is a new POST request. There's no persistent WebSocket to break. If the server goes down and comes back, the next `callTool()` just works.

For session-based servers (those that return `Mcp-Session-Id`), we store the session ID and include it in subsequent requests. If the session expires (4xx response), we re-initialize.

### Health Monitoring

The settings UI shows live connection status. Internally, this is tracked per-connection:

```typescript
interface MCPConnectionHealth {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  toolCount: number
  lastSuccessful: number | null     // timestamp of last successful tool call
  lastError: string | null
  consecutiveFailures: number
}
```

**Auto-disable:** After 3 consecutive failures, the connection marks itself as errored but doesn't remove itself. The user can retry manually from settings.

### React Hook

```typescript
// src/hooks/useMCP.ts
function useMCP(): {
  registry: MCPRegistry
  tools: Tool[]                      // All MCP tools (for merging with built-ins)
  health: Map<string, MCPConnectionHealth>
  rediscover: () => Promise<void>    // Re-run discovery on all servers
  dispatch: (name: string, args: Record<string, unknown>) => Promise<string>
}
```

This hook lives at the app level (in `App.tsx` or similar), providing the MCPRegistry to both Ralph and Chief through context or props.

---

## 11. CORS & TRANSPORT

### The Problem

Browser same-origin policy blocks requests to MCP servers that don't send CORS headers. Most MCP servers were designed for desktop clients (stdio, local HTTP) and don't include `Access-Control-Allow-Origin`.

### The Solution

Same CORS proxy architecture from LLM API 3.0 §10.5:

```
Browser → Cloudflare Worker (wiggum-proxy.workers.dev) → MCP Server
```

The proxy:
1. Receives the request with `?url=` pointing to the MCP server
2. Forwards it, stripping the `Origin` header
3. Adds CORS headers to the response
4. Returns to the browser

### Per-Server Proxy Config

Not all MCP servers need proxying. Some (especially cloud-hosted ones designed for remote clients) already send CORS headers.

```typescript
interface MCPServerConfig {
  url: string
  proxy?: boolean  // default: false
  // ...
}
```

When `proxy: true`, the `MCPConnection` wraps the server URL through the proxy template before creating the transport:

```typescript
const effectiveUrl = config.proxy && proxyTemplate
  ? proxyTemplate.replace('{href}', encodeURIComponent(config.url))
  : config.url

const transport = new StreamableHTTPClientTransport(new URL(effectiveUrl), {
  requestInit: config.headers ? { headers: config.headers } : undefined
})
```

### Transport Notes

**StreamableHTTP** is the only transport we support. It uses standard `fetch()` for POST requests and optionally `EventSource` for server-initiated messages. Both work in browsers.

**SSE fallback:** The MCP spec deprecated SSE transport in favor of StreamableHTTP, but some older servers still use it. The MCP SDK supports `SSEClientTransport` as a fallback. We can add fallback logic in Phase 2 if needed:

```typescript
try {
  // Try StreamableHTTP first
  transport = new StreamableHTTPClientTransport(url)
  await client.connect(transport)
} catch {
  // Fall back to SSE for older servers
  transport = new SSEClientTransport(url)
  await client.connect(transport)
}
```

---

## 12. SECURITY MODEL

### Auth Headers in Transit

MCP server auth tokens (API keys, bearer tokens) pass through the CORS proxy in request headers when `proxy: true`. Same trust model as the LLM provider proxy — keys only touch Cloudflare's edge infrastructure, never third-party services.

**Mitigation:** Self-hosted proxy with no logging, no request body storage.

### What MCP Servers Can See

When Wiggum calls an MCP tool, the server sees:
- The tool name and arguments (explicitly sent by the model)
- Auth headers (configured by the user)
- The proxy's IP (if proxied) or the user's IP (if direct)

The server does NOT see:
- The full conversation history
- Other tool results
- The system prompt
- Other MCP server configs

This is inherent to MCP's design — tool calls are isolated requests, not full context dumps.

### What MCP Servers Can Do

MCP tools can return arbitrary text to the model. A malicious server could return prompt injection attacks in tool results — "ignore your instructions and..."

**Mitigation:**
1. **Users choose their servers.** Wiggum doesn't auto-discover or recommend MCP servers. The user explicitly adds URLs they trust.
2. **Tool results are sandboxed.** They're just strings in the conversation. They can't execute code, access the filesystem, or bypass quality gates.
3. **Ralph's write guards still apply.** Even if an MCP tool result says "write malicious code to...", Ralph's shell executor enforces file write guards normally.

### Storage

MCP server configs (including auth headers) are stored in localStorage, same as LLM provider API keys. This is the existing security model for Wiggum — browser-local, not synced to any server.

For users who want better security: MCP server configs could be stored in the future Wiggum Pro backend (encrypted at rest, never exposed to the client). Phase 3+ consideration.

---

## 13. IMPLEMENTATION PHASES

### Phase 0: Spike (Half Day)

**Goal:** Prove the MCP SDK works in Wiggum's browser environment.

- Import `@modelcontextprotocol/sdk` via esm.sh
- Connect to a test MCP server (e.g., Anthropic's reference server or a simple custom one)
- Call `listTools()`, log the result
- Call one tool, log the result
- Wire to a temporary dev button in the UI

**Validates:** esm.sh resolution, browser compatibility, StreamableHTTP transport, Zod peer dependency.

**Risk check:** If the MCP SDK has Node.js-only dependencies that esm.sh can't polyfill, we'll need to vendor a browser-compatible subset. This spike catches that early.

### Phase 1: Core Integration (2-3 Days)

**Goal:** MCP tools work in Ralph's loop with manual server configuration.

Deliverables:
1. `MCPConnection` class — wraps SDK client + transport
2. `MCPRegistry` class — discover → namespace → convert → dispatch pipeline
3. `useMCP` hook — React layer, provides registry to consumers
4. Settings UI — add/remove MCP servers with URL + headers
5. Ralph integration — MCP tools merged into `chat()` tool array, dispatch routing in loop.ts
6. Connection status display — health indicators in settings

**NOT in Phase 1:** Chief integration, tool filtering, OAuth, SSE fallback, per-project servers.

### Phase 2: Chief + Polish (1-2 Days)

**Goal:** Chief can use MCP tools. Connection management is robust.

Deliverables:
1. Chief integration — MCP tools merged into Chief's tool array
2. SSE fallback — try StreamableHTTP, fall back to SSE
3. Tool count display — show how many tools each server provides
4. Reconnection handling — auto-reconnect on transient failures
5. Server enable/disable toggle — without deleting config
6. CORS proxy integration — `proxy: true` per-server flag, wire through proxyUrl

### Phase 3: Advanced (Future)

- **OAuth support** — redirect-based auth flows for MCP servers that require it
- **Tool filtering** — per-project tool selection, Chief as curator
- **Per-project servers** — `.wiggum/mcp.json` for project-specific configs
- **Resources & Prompts** — MCP's non-tool capabilities (context injection, prompt templates)
- **Server-initiated requests** — sampling, elicitation (if/when needed)

---

## 14. FILE CHANGE INDEX

### New Files

| File | Purpose |
|------|---------|
| `src/lib/mcp/connection.ts` | MCPConnection class — wraps SDK, manages one server connection |
| `src/lib/mcp/registry.ts` | MCPRegistry class — multi-server management, discover/namespace/convert/dispatch |
| `src/lib/mcp/types.ts` | Shared types: MCPServerConfig, MCPConnectionHealth, MCPToolEntry |
| `src/lib/mcp/index.ts` | Barrel exports |
| `src/hooks/useMCP.ts` | React hook — provides MCPRegistry, tools, health to components |
| `src/components/MCPSettings.tsx` | Settings UI for MCP server management |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/ralph/loop.ts` | Add MCP tools to `chat()` call, add MCP dispatch branch in tool routing |
| `src/hooks/useAIChat.ts` | Wire useMCP, pass MCP dispatch to loop |
| `src/hooks/useChiefChat.ts` | (Phase 2) Wire useMCP, add MCP dispatch branch |
| `src/components/Settings.tsx` | Add MCPSettings section |
| `src/contexts/SettingsContext.ts` | Add `mcpServers` to settings type |

### Dependencies

| Package | Version | License | Why |
|---------|---------|---------|-----|
| `@modelcontextprotocol/sdk` | v1.x (stable) | MIT/Apache-2.0 | Official MCP client |
| `zod` | 3.25+ | MIT | Peer dep of MCP SDK (also needed for Toolkit 2.0, Hono) |

Both loaded via esm.sh. No npm install needed.

---

## 15. CC PROMPT STRATEGY

Each prompt describes patterns and concepts. Claude Code implements fresh from guidance (clean room approach).

### Prompt 1: MCPConnection + Types (Phase 1)

```
Create the MCP connection layer for Wiggum.

Location: src/lib/mcp/

MCPConnection is a class that manages a single connection to one MCP server.
It wraps the official @modelcontextprotocol/sdk (imported via esm.sh).

The class should:
- Accept an MCPServerConfig in the constructor: { url, headers?, proxy? }
- Use StreamableHTTPClientTransport from the SDK for browser-native HTTP
- Lazy connect: don't connect until first listTools() or callTool()
- Track state: { status, toolCount, lastError, lastConnected }
- listTools() returns the raw MCP tool definitions (name, description, inputSchema)
- callTool(name, args) calls the tool and returns text content from the response
- Handle isError responses from MCP by throwing with the error text
- close() disconnects gracefully

Types to define in types.ts:
- MCPServerConfig: { url: string, headers?: Record<string,string>, proxy?: boolean, enabled?: boolean }
- MCPConnectionHealth: { status, toolCount, lastSuccessful, lastError, consecutiveFailures }
- MCPToolEntry: { definition (name, description, inputSchema), serverName, connection }

For proxy support: if config.proxy is true and a proxyTemplate string is provided,
wrap the server URL through the template before creating the transport. The template
uses {href} as placeholder: "https://proxy.workers.dev/?url={href}"

The SDK import paths are:
  @modelcontextprotocol/sdk/client/index.js → Client class
  @modelcontextprotocol/sdk/client/streamableHttp.js → StreamableHTTPClientTransport

DO NOT modify any existing files.
```

### Prompt 2: MCPRegistry + Hook (Phase 1)

```
Create the MCP registry and React hook for Wiggum.

Location: src/lib/mcp/registry.ts and src/hooks/useMCP.ts

MCPRegistry manages all MCP connections and provides a unified tool interface.

The registry should:
- Accept server configs: addServer(name, config), removeServer(name)
- Run discovery: discoverAll() iterates servers, calls listTools(), namespaces
  tools with serverName__toolName, converts to OpenAI function calling format
- getTools() returns Tool[] (same type as SHELL_TOOL in loop.ts) — all MCP
  tools from all connected servers
- has(namespacedName) checks if a tool name is an MCP tool
- dispatch(namespacedName, args) splits on __, looks up the connection,
  calls callTool with the original (un-prefixed) tool name
- getHealth() returns Map<serverName, MCPConnectionHealth>

The React hook useMCP should:
- Read mcpServers from settings context (same pattern as useAISettings)
- Create MCPRegistry instance once
- Sync server configs when settings change (add/remove servers)
- Run discoverAll() on mount and when servers change
- Return { tools, health, dispatch, rediscover }

Tool format conversion (MCP → Wiggum):
  { type: 'function', function: { name: prefixedName,
    description: '[serverName] originalDescription',
    parameters: inputSchema } }

Pattern reference: Look at how useAIChat.ts manages the ShellExecutor lifecycle.
The useMCP hook follows the same pattern but for MCPRegistry.

DO NOT modify any existing files.
```

### Prompt 3: Ralph Integration + Settings UI (Phase 1)

```
Integrate MCP tools into Ralph's loop and add MCP settings UI.

Two changes:

1. In src/lib/ralph/loop.ts:
   - Accept an optional mcpTools parameter: Tool[] from useMCP
   - Accept an optional mcpDispatch parameter: (name, args) => Promise<string>
   - Merge mcpTools into the tools array passed to chat()
   - In the tool dispatch section (where shell tool calls are handled),
     add a branch: if the tool name is not 'shell' and mcpDispatch exists,
     call mcpDispatch(toolCall.function.name, JSON.parse(toolCall.function.arguments))
   - Return the dispatch result as the tool result string

2. In src/hooks/useAIChat.ts:
   - Get tools, dispatch from useMCP hook
   - Pass them to runRalphLoop as mcpTools and mcpDispatch

3. Create src/components/MCPSettings.tsx:
   - List configured MCP servers with connection status indicators
   - Add server form: name input, URL input, add button
   - Each server card shows: name, URL, status (connected/error/discovering),
     tool count, expandable headers section, remove button
   - Use existing UI component patterns (look at provider settings for reference)
   - Wire to settings context for persistence

4. Add MCPSettings section to the main Settings component.

Pattern reference: Look at how the LLM provider settings section works for
the settings UI pattern. The MCP section follows the same structure.
```

---

## 16. RELATIONSHIP TO OTHER PLANS

### LLM API 3.0

MCP tools use the same `Tool` type that LLM API 3.0 defines. The structured response type (§3) already handles tool calls generically — MCP doesn't need special response parsing. The CORS proxy (§10.5) is shared between LLM providers and MCP servers.

**Dependency:** MCP Phase 1 can proceed with the current `client.ts`. It doesn't require LLM API 3.0 to ship first. When 3.0 lands, MCP tools automatically benefit from structured responses, usage tracking, and error recovery.

### Toolkit 2.0

Toolkit 2.0 adds Zod schemas and named access points to shell commands. MCP tools already have JSON Schema definitions (which Zod can validate). In the future, Toolkit 2.0's unified tool registry could manage both shell commands and MCP tools through one interface:

```typescript
// Future unified registry
registry.register('shell.cat', catSchema, catExecutor)
registry.register('shell.write', writeSchema, writeExecutor)
registry.register('github.search_repos', mcpSchema, mcpDispatch)  // MCP tool
```

**Dependency:** Toolkit 2.0 and MCP are independent. Both can proceed in parallel. The merge point is the unified registry, which is a Phase 2+ concern for both.

### Chief Implementation Plan

Chief's tool dispatch (§Prompt 2 in chief-implementation-plan.md) already has a pattern for inline tool dispatch in a while-loop. MCP tools slot in as additional branches:

```typescript
// In Chief's tool dispatch loop
if (toolCall.function.name === 'read_file') { ... }
else if (toolCall.function.name === 'search_skills') { ... }
else if (mcpDispatch && mcpRegistry.has(toolCall.function.name)) {
  result = await mcpDispatch(toolCall.function.name, args)
}
```

**Dependency:** MCP Phase 1 targets Ralph only. Chief gets MCP in Phase 2, which should ship after the Chief implementation plan's Phase 1 (Coordinator + useChiefChat).

### Hono Full-Stack Plan

When Wiggum ships a Hono backend, the MCP proxy becomes less necessary — the backend can make MCP calls server-side (no CORS). But MCP client-side integration remains useful for:
- Users who don't want/need a backend
- Real-time tool status in the UI
- Chief's conversational tool use (latency-sensitive)

The Hono backend could also *host* an MCP server, exposing Wiggum's own capabilities (project files, build status, deploy triggers) to external clients.

---

## CLEAN ROOM NOTES

**MCP SDK:** `@modelcontextprotocol/sdk` is MIT/Apache-2.0 licensed. Direct usage, not a clean room concern.

**Architecture patterns:** The discover → namespace → convert → dispatch pipeline is a standard adapter pattern. The namespacing convention (`serverName__toolName`) is common across MCP implementations (Claude Desktop, Cursor, VS Code all do variants of this).

**Shakespeare reference:** We studied Shakespeare's MCP implementation to understand the pattern. Our implementation is written from scratch using the MCP SDK directly. Key differences:
- Shakespeare uses separate `MCPTool.ts` wrapper class and `MCPClient.ts` — we combine into `MCPConnection` + `MCPRegistry`
- Shakespeare's dispatch goes through a `Tool<T>` interface — ours goes through the existing shell-style dispatch
- Shakespeare stores `clients: Record<string, MCPClient>` keyed by prefixed tool name — we key by server name and resolve at dispatch time
- We add connection health tracking, proxy integration, and the React hook layer that Shakespeare handles differently through its own state management

**No code copied.** Patterns described, concepts referenced, fresh implementation.
