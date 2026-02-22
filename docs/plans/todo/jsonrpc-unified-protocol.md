# Wiggum JSON-RPC Unified Protocol

> One wire protocol for every message boundary Wiggum controls. JSON-RPC 2.0 over postMessage, MessageChannel, and MessagePort — replacing ad-hoc message formats with a single client/server library that provides request correlation, timeouts, error handling, and notifications across all execution contexts.
>
> **Roadmap position:** Foundation utility. First built in Stage 7 (ZenFS Phase 2 preview rebuild), reused in Stages 7-8 (Chief, Hono, MCP).
> **Effort:** ~3-4 hours for core library. Zero incremental cost per additional boundary (reuse).

---

## 1. WHY ONE PROTOCOL

Wiggum has multiple execution boundaries where isolated contexts talk to each other:

- Preview iframe ↔ parent (postMessage)
- Build worker ↔ main thread (postMessage)
- Ralph execution ↔ harness (files + future real-time signals)
- Chief ↔ Ralph (coordinator, planned)
- MCP client ↔ servers (JSON-RPC by spec)
- Future: API Service Worker ↔ main thread

Each boundary currently invents its own message format: `{ type: 'build', ... }`, `{ action: 'probe', ... }`, file-based status flags. This means every boundary reimplements request/response correlation, timeout handling, error classification, and message dispatch from scratch.

JSON-RPC 2.0 solves all of these with a 4-message protocol that's been a standard since 2010. MCP already mandates it. One client class, one server class, every boundary works the same way.

### The Rule

**If a library owns the protocol, leave it alone.** ZenFS Port backend uses its own binary format over MessagePort — don't touch it. esbuild-wasm communicates with its WASM binary internally — don't touch it.

**If Wiggum owns the message boundary, use JSON-RPC.** The wrapper around esbuild, the preview bridge, Ralph↔harness signals, Chief↔Ralph coordination — these are all Wiggum code talking to Wiggum code.

---

## 2. JSON-RPC 2.0 IN 60 SECONDS

Four message shapes. That's the entire spec.

### Request — "do this thing"

```javascript
{
  jsonrpc: "2.0",
  method: "fetch",                    // what to do
  params: { url: "/dist/app.js" },    // arguments (object or array)
  id: 1                               // correlator — match response to request
}
```

### Success Response — "here's the result"

```javascript
{
  jsonrpc: "2.0",
  result: { status: 200, body: "..." },
  id: 1                               // same id as request
}
```

### Error Response — "it failed"

```javascript
{
  jsonrpc: "2.0",
  error: {
    code: -32601,                     // numeric error code
    message: "Method not found",      // human-readable
    data: { method: "nonexistent" }   // optional structured detail
  },
  id: 1
}
```

### Notification — "FYI, no response needed"

```javascript
{
  jsonrpc: "2.0",
  method: "console",
  params: { level: "error", message: "Uncaught TypeError..." }
  // NO id field — fire-and-forget
}
```

The presence or absence of `id` is what distinguishes a request (expects response) from a notification (fire-and-forget). That's the only branching logic in the protocol.

### Standard Error Codes

| Code | Meaning | When |
|------|---------|------|
| -32700 | Parse error | Message isn't valid JSON |
| -32600 | Invalid request | Missing jsonrpc/method fields |
| -32601 | Method not found | Server doesn't implement this method |
| -32602 | Invalid params | Params don't match method signature |
| -32603 | Internal error | Server-side exception |
| -32000 to -32099 | Server error (reserved) | App-specific errors |

Wiggum can define its own codes in the -32000 range for domain-specific errors (build failure, gate failure, permission denied, etc.).

---

## 3. CORE LIBRARY

### Location

```
src/lib/rpc/
├── types.ts          # Message type definitions
├── client.ts         # JSONRPCClient — send requests, receive responses
├── server.ts         # JSONRPCServer — receive requests, dispatch to handlers
├── transport.ts      # Transport adapters (postMessage, MessageChannel, MessagePort)
└── index.ts          # Barrel exports
```

~150-180 LOC total for production code. No dependencies.

### Types

```typescript
// types.ts

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown> | unknown[];
  id: number | string;
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown> | unknown[];
  // no id
}

export interface JSONRPCSuccessResponse {
  jsonrpc: "2.0";
  result: unknown;
  id: number | string;
}

export interface JSONRPCErrorResponse {
  jsonrpc: "2.0";
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number | string;
}

export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;
export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

/** Transport-agnostic send/receive interface */
export interface RPCTransport {
  send(message: JSONRPCMessage): void;
  onMessage(handler: (message: JSONRPCMessage) => void): void;
  destroy?(): void;
}
```

### Client

```typescript
// client.ts

export class JSONRPCClient {
  private nextId = 0;
  private pending = new Map<number | string, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private transport: RPCTransport;
  private defaultTimeout: number;

  constructor(transport: RPCTransport, options?: { timeout?: number }) {
    this.transport = transport;
    this.defaultTimeout = options?.timeout ?? 10_000;
    this.transport.onMessage((msg) => this.handleMessage(msg));
  }

  /** Send request, wait for response */
  async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`JSON-RPC timeout: ${method} (id=${id})`));
      }, this.defaultTimeout);

      this.pending.set(id, { resolve: resolve as (r: unknown) => void, reject, timer });
      this.transport.send({ jsonrpc: "2.0", method, params, id });
    });
  }

  /** Send notification (fire-and-forget, no response) */
  notify(method: string, params?: Record<string, unknown>): void {
    this.transport.send({ jsonrpc: "2.0", method, params });
  }

  private handleMessage(msg: JSONRPCMessage): void {
    // Only handle responses (messages with id and result/error)
    if (!("id" in msg) || !("result" in msg || "error" in msg)) return;

    const response = msg as JSONRPCResponse;
    const pending = this.pending.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(response.id);

    if ("error" in response) {
      pending.reject(new RPCError(response.error.code, response.error.message, response.error.data));
    } else {
      pending.resolve(response.result);
    }
  }

  destroy(): void {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error("JSON-RPC client destroyed"));
    }
    this.pending.clear();
    this.transport.destroy?.();
  }
}

export class RPCError extends Error {
  code: number;
  data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "RPCError";
    this.code = code;
    this.data = data;
  }
}
```

### Server

```typescript
// server.ts

type Handler = (params: Record<string, unknown> | undefined) => unknown | Promise<unknown>;
type NotificationHandler = (params: Record<string, unknown> | undefined) => void;

export class JSONRPCServer {
  private methods = new Map<string, Handler>();
  private notifications = new Map<string, NotificationHandler>();
  private transport: RPCTransport;

  constructor(transport: RPCTransport) {
    this.transport = transport;
    this.transport.onMessage((msg) => this.handleMessage(msg));
  }

  /** Register a method that returns a result */
  method(name: string, handler: Handler): void {
    this.methods.set(name, handler);
  }

  /** Register a notification handler (no response sent) */
  onNotify(name: string, handler: NotificationHandler): void {
    this.notifications.set(name, handler);
  }

  private async handleMessage(msg: JSONRPCMessage): Promise<void> {
    if (!("method" in msg)) return; // Not a request/notification

    const hasId = "id" in msg;

    // Notification (no id)
    if (!hasId) {
      const handler = this.notifications.get(msg.method);
      if (handler) handler((msg as JSONRPCNotification).params as Record<string, unknown>);
      return;
    }

    // Request (has id, expects response)
    const request = msg as JSONRPCRequest;
    const handler = this.methods.get(request.method);

    if (!handler) {
      this.transport.send({
        jsonrpc: "2.0",
        error: { code: -32601, message: `Method not found: ${request.method}` },
        id: request.id,
      });
      return;
    }

    try {
      const result = await handler(request.params as Record<string, unknown>);
      this.transport.send({ jsonrpc: "2.0", result, id: request.id });
    } catch (err) {
      this.transport.send({
        jsonrpc: "2.0",
        error: {
          code: (err as RPCError).code ?? -32603,
          message: (err as Error).message ?? "Internal error",
          data: (err as RPCError).data,
        },
        id: request.id,
      });
    }
  }

  destroy(): void {
    this.methods.clear();
    this.notifications.clear();
    this.transport.destroy?.();
  }
}
```

### Transport Adapters

```typescript
// transport.ts

import type { JSONRPCMessage, RPCTransport } from "./types";

/** postMessage between window contexts (iframe ↔ parent) */
export function windowTransport(
  target: Window,
  source: Window = window,
  origin: string = "*",
): RPCTransport {
  let handler: ((msg: JSONRPCMessage) => void) | null = null;

  const listener = (event: MessageEvent) => {
    if (event.source !== target && event.source !== source) return;
    if (event.data?.jsonrpc !== "2.0") return;
    handler?.(event.data);
  };

  source.addEventListener("message", listener);

  return {
    send: (msg) => target.postMessage(msg, origin),
    onMessage: (h) => { handler = h; },
    destroy: () => source.removeEventListener("message", listener),
  };
}

/** MessageChannel / MessagePort (worker ↔ main thread) */
export function portTransport(port: MessagePort): RPCTransport {
  let handler: ((msg: JSONRPCMessage) => void) | null = null;

  port.onmessage = (event) => {
    if (event.data?.jsonrpc !== "2.0") return;
    handler?.(event.data);
  };

  return {
    send: (msg) => port.postMessage(msg),
    onMessage: (h) => { handler = h; },
    destroy: () => { port.onmessage = null; port.close(); },
  };
}

/** Worker (wraps Worker.postMessage + onmessage) */
export function workerTransport(worker: Worker): RPCTransport {
  let handler: ((msg: JSONRPCMessage) => void) | null = null;

  const listener = (event: MessageEvent) => {
    if (event.data?.jsonrpc !== "2.0") return;
    handler?.(event.data);
  };

  worker.addEventListener("message", listener);

  return {
    send: (msg) => worker.postMessage(msg),
    onMessage: (h) => { handler = h; },
    destroy: () => worker.removeEventListener("message", listener),
  };
}
```

---

## 4. BOUNDARY MAP

Which boundaries use JSON-RPC, and which are off-limits.

### Wiggum-Owned (use JSON-RPC)

| Boundary | Transport | Stage | Methods | Notifications |
|----------|-----------|-------|---------|---------------|
| **Preview iframe ↔ parent** | `windowTransport` | 7 (ZenFS Ph 2) | `fetch`, `navigate`, `refresh` | `console`, `updateNavigationState`, `error` |
| **Build worker ↔ main thread** | `workerTransport` | 7-8 | `build`, `buildBackend` | `buildProgress`, `buildWarning` |
| **Ralph ↔ harness** | `portTransport` | 7 (Chief Ph 1+) | `requestPermission`, `askUser` | `progress`, `gateResult`, `iterationStart` |
| **Chief ↔ Ralph** | `portTransport` | 7 (Chief Ph 1) | `sendTask`, `cancelTask` | `progress`, `gateResult`, `complete` |
| **MCP client ↔ servers** | Per MCP spec (HTTP/SSE) | 6 (MCP Ph 1) | Per MCP server capabilities | Per MCP server |

### Library-Owned (do not replace)

| Boundary | Owner | Protocol | Why |
|----------|-------|----------|-----|
| ZenFS Port backend (SW ↔ main) | `@zenfs/core` | ZenFS binary format | Internal to ZenFS. Port backend owns serialization of fs operations. Replacing means reimplementing the backend. |
| esbuild-wasm ↔ WASM binary | `esbuild-wasm` | esbuild internal | Communication between the JS wrapper and the compiled Go WASM. Not exposed or customizable. |
| isomorphic-git internals | `isomorphic-git` | Direct fs calls | Git operations call fs methods directly. No message passing involved. |

### Coexistence Pattern

When Wiggum JSON-RPC and a library protocol share the same context (e.g., the Service Worker has both ZenFS Port backend and Wiggum JSON-RPC), use **separate channels**:

```
Main thread ←── MessageChannel A ──→ SW  (ZenFS Port, ZenFS's protocol)
Main thread ←── MessageChannel B ──→ SW  (Wiggum JSON-RPC, custom operations)
```

The `jsonrpc: "2.0"` field acts as a discriminator. Any message listener can check `event.data?.jsonrpc === "2.0"` to filter JSON-RPC messages from non-JSON-RPC traffic. Transport adapters already do this check.

---

## 5. DOMAIN ERROR CODES

Standard JSON-RPC error codes cover protocol-level issues (-32700 to -32603). Wiggum defines domain-specific codes in the -32000 range:

| Code | Name | Boundary | Meaning |
|------|------|----------|---------|
| -32001 | `BUILD_FAILED` | Build worker | esbuild compilation failed. `data` contains diagnostics array. |
| -32002 | `GATE_FAILED` | Ralph ↔ harness | Quality gate did not pass. `data` contains gate name + findings. |
| -32003 | `PERMISSION_DENIED` | Ralph ↔ harness | User denied a permission request. |
| -32004 | `TASK_CANCELLED` | Chief ↔ Ralph | Task was cancelled by user or Chief. |
| -32005 | `PREVIEW_LOAD_FAILED` | Preview iframe | Index.html could not be loaded or parsed. |
| -32006 | `NAVIGATION_FAILED` | Preview iframe | SPA route navigation failed (invalid URL, cross-origin). |
| -32007 | `MCP_SERVER_ERROR` | MCP client | Upstream MCP server returned an error. `data` contains server response. |
| -32008 | `CONTEXT_OVERFLOW` | Ralph ↔ harness | Request would exceed model context window. |

New codes are added as boundaries are implemented. The range -32000 to -32099 is reserved by the JSON-RPC spec for application-defined server errors.

---

## 6. IMPLEMENTATION SEQUENCE

### When Each Boundary Ships

The core library (`src/lib/rpc/`) is built once during the first boundary implementation and reused everywhere after.

| Stage | Boundary | Work |
|-------|----------|------|
| **7 — ZenFS Ph 2** | Preview iframe ↔ parent | Build core library (types, client, server, transports). Implement preview bridge using `windowTransport`. First consumer. |
| **7 — Chief Ph 1** | Chief ↔ Ralph | Reuse core library. Add `portTransport` for MessageChannel between coordinator and Ralph worker. Notifications for progress/gateResult. |
| **7 — Chief Ph 1** | Ralph ↔ harness | Reuse core library. Add `requestPermission` and `askUser` methods for interactive Ralph. |
| **8 — Hono Ph 1** | Build worker (backend) | Reuse core library. Wrap backend esbuild pass in `workerTransport`. `build` and `buildBackend` as separate methods with request correlation. |
| **6 — MCP Ph 1** | MCP client ↔ servers | MCP spec mandates JSON-RPC 2.0. Core library provides types and error handling. Transport adapter depends on MCP connection type (HTTP POST or SSE). |

### CC Prompt for Core Library (ZenFS Phase 2)

```
BEFORE rebuilding public/preview/client.js:

Create src/lib/rpc/ with:
- types.ts: JSONRPCRequest, JSONRPCNotification, JSONRPCSuccessResponse,
  JSONRPCErrorResponse, JSONRPCMessage, RPCTransport interface
- client.ts: JSONRPCClient class — request() returns Promise (with timeout),
  notify() is fire-and-forget, tracks pending requests by id, RPCError class
- server.ts: JSONRPCServer class — method() registers request handlers,
  onNotify() registers notification handlers, dispatches incoming messages
- transport.ts: windowTransport (iframe ↔ parent postMessage),
  portTransport (MessagePort/MessageChannel), workerTransport (Worker)
- index.ts: barrel exports

The client/server are transport-agnostic — they take an RPCTransport and
don't know whether they're talking over postMessage, MessageChannel, or
MessagePort. The transport adapters handle that.

Test: create a simple test where client sends request via windowTransport
mock, server dispatches to handler, response correlates back to client.

THEN rebuild client.js using the new JSONRPCClient with windowTransport.
This replaces all ad-hoc postMessage calls with typed JSON-RPC methods.
```

---

## 7. MIGRATION PATTERN

### Converting an Existing Ad-Hoc Boundary

When upgrading an existing postMessage boundary to JSON-RPC:

**Before (ad-hoc):**
```javascript
// Sender
worker.postMessage({ type: 'build', entry: 'src/App.tsx', config: {...} });

// Receiver
worker.onmessage = (event) => {
  if (event.data.type === 'result') { /* ... */ }
  if (event.data.type === 'error') { /* ... */ }
};
```

**After (JSON-RPC):**
```javascript
// Sender
const client = new JSONRPCClient(workerTransport(worker));
const result = await client.request('build', { entry: 'src/App.tsx', config: {...} });

// Receiver
const server = new JSONRPCServer(selfTransport());
server.method('build', async (params) => {
  const output = await esbuild.build(params.config);
  return { output: output.outputFiles, warnings: output.warnings };
  // Errors thrown here automatically become JSON-RPC error responses
});
```

The `await client.request()` pattern replaces manual event listener setup, response matching, and timeout tracking. Errors thrown in server handlers automatically become JSON-RPC error responses with the correct `id` correlation.

### Backward Compatibility

During migration, a boundary can support both ad-hoc and JSON-RPC messages. The transport adapters check `event.data?.jsonrpc === "2.0"` — non-JSON-RPC messages pass through untouched. This allows incremental migration without a big-bang switchover.

---

## 8. RELATIONSHIP TO OTHER PLANS

| Plan | Relationship |
|------|-------------|
| **ZenFS Migration** | Phase 2 preview rebuild is the first consumer. Core library built here. ZenFS Port backend itself is NOT converted — it keeps its own protocol. |
| **Preview Hardening** | NavigationHandler and console interceptor use JSON-RPC notifications (`updateNavigationState`, `console`, `error`). SW registration blocking is independent of JSON-RPC. |
| **Hono Full-Stack** | Backend build pass uses JSON-RPC over workerTransport. API Service Worker communicates via separate MessageChannel from ZenFS. |
| **Chief Implementation** | Chief ↔ Ralph coordination uses JSON-RPC over portTransport. Progress notifications, task commands, gate results all flow as typed messages. |
| **MCP** | MCP spec mandates JSON-RPC 2.0. Core library types and RPCError class are reused. Transport adapter is MCP-specific (HTTP POST for Streamable HTTP, SSE for legacy). |
| **LLM API 3.2** | Not directly related. LLM calls use HTTP fetch, not JSON-RPC. But error classification patterns (RPCError with code/message/data) mirror the LLMError hierarchy. |
| **Toolkit 2.0** | Shell commands stay as direct function calls, not RPC. JSON-RPC is for cross-context boundaries, not same-context dispatch. |
