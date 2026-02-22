# n0de0 Gateway 1.0 — CORS Proxy & Browser Egress Infrastructure

> The n0de0 Gateway is a self-hosted Cloudflare Worker that gives browser `fetch()` access to external APIs that don't send CORS headers. Zero dependencies, plain Web APIs, ~50 lines of code. It's shared infrastructure for all n0de0 tools — Wiggum is the first consumer, but any browser-native app under `*.n0de0.com` gets CORS proxying for free.
>
> **Supersedes:** LLM API 3.2 §10 CORS Proxy section. This document is the canonical reference for proxy architecture, deployment, scaling, and security. The LLM API spec covers client-side integration (`applyProxy()`, `ProviderConfig.proxy`, `AppConfig.corsProxy`).

---

## TABLE OF CONTENTS

1. [Why a Gateway](#1-why-a-gateway)
2. [What It Unlocks](#2-what-it-unlocks)
3. [Architecture](#3-architecture)
4. [The Worker](#4-the-worker)
5. [Security](#5-security)
6. [Client-Side Integration](#6-client-side-integration)
7. [Deployment](#7-deployment)
8. [Scaling](#8-scaling)
9. [Monitoring & Health](#9-monitoring--health)
10. [Future: When the Gateway Goes Away](#10-future-when-the-gateway-goes-away)

---

## 1. WHY A GATEWAY

Browser `fetch()` enforces same-origin policy. If the server doesn't respond with `Access-Control-Allow-Origin`, the browser blocks the response. The user's JavaScript never sees it.

Most LLM providers built their APIs for server-to-server communication. They don't send CORS headers because they never expected a browser to call them directly. Wiggum is browser-native — there is no server. The Gateway bridges this gap.

**Design constraints:**
- Zero dependencies — standard Web APIs only (`Request`, `Response`, `fetch`, `URL`)
- No Hono, no Express, no framework — maximum portability, minimum surface area
- Pure pass-through — never inspects, transforms, logs, or caches request/response bodies
- Streams everything — LLM SSE responses pipe through without buffering
- Self-hosted — API keys only touch infrastructure you control

---

## 2. WHAT IT UNLOCKS

### Needs Proxy

| Target | Why CORS Blocks It | Use in Wiggum |
|--------|-------------------|---------------|
| `api.openai.com` | No CORS headers | Ralph & Chief LLM calls (GPT-4o, o-series) |
| `api.anthropic.com` | No CORS headers | Ralph & Chief LLM calls (Claude) |
| MCP servers (external) | Arbitrary HTTP endpoints, no CORS | Future: external tool integration |
| `api.together.ai` | No CORS headers | Alternative model provider |
| `api.mistral.ai` | No CORS headers | Alternative model provider |
| `api.deepseek.com` | No CORS headers | Alternative model provider |

### Doesn't Need Proxy

| Target | Why It's Fine |
|--------|--------------|
| Ollama (`localhost`) | Local — no CORS restriction |
| OpenRouter (`openrouter.ai`) | Sends permissive CORS headers |
| esm.sh | CDN with CORS headers |
| User's own endpoints | They control their CORS config |

### Decision Rule

Default: `proxy: false`. The Gateway is opt-in per provider. Known providers that need it are flagged in Wiggum's provider config. Users can override per-provider in settings.

---

## 3. ARCHITECTURE

```
Browser (Wiggum PWA)              Cloudflare Edge (Gateway)           Provider
────────────────────              ───────────────────────             ────────

1. Build target URL
2. fetch(gateway.n0de0.com
     ?url=api.openai.com/v1/...)
                            ───→  3. Validate Origin header
                                  4. Decode ?url= param
                                  5. Clone request → target
                                  6. Set Origin = target origin
                                  7. Forward to provider    ───→  api.openai.com
                                                                        │
                                  8. Receive response       ←───────────┘
                                  9. Add CORS headers
                                  10. Stream body through
                            ←───
11. Consume response
    (JSON batch or SSE stream)
```

**Key properties:**
- The Gateway never buffers the full response body — it pipes `response.body` (a `ReadableStream`) straight back to the browser
- SSE streams for Chief's streaming mode work without modification — they're just bytes flowing through
- The `Authorization` header passes through untouched — the user's API key reaches the provider
- Request method is preserved (GET, POST, OPTIONS, etc.)
- Request body is forwarded as-is — no parsing, no transformation

---

## 4. THE WORKER

### Project Structure

```
n0de0-gateway/
├── src/
│   └── index.ts       # The entire Worker — ~50 lines
├── wrangler.toml      # Cloudflare config + environment variables
├── package.json       # No dependencies — just wrangler for deployment
├── tsconfig.json      # TypeScript config
└── README.md
```

### `src/index.ts`

```typescript
// n0de0 Gateway — CORS proxy for browser-native LLM access
// Zero dependencies. Standard Web APIs only.

interface Env {
  ALLOWED_ORIGINS: string; // Comma-separated origin allowlist
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // --- Health check ---
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response('ok', { status: 200 });
    }

    // --- Origin validation ---
    const origin = request.headers.get('Origin');
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);

    if (!origin || !isOriginAllowed(origin, allowed)) {
      return new Response('Forbidden', { status: 403 });
    }

    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return handlePreflight(request, origin);
    }

    // --- Proxy ---
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(targetUrl);
      new URL(decoded); // Validate it's a real URL
    } catch {
      return new Response('Invalid target URL', { status: 400 });
    }

    // Clone the request pointed at the target
    const proxyRequest = new Request(decoded, {
      method: request.method,
      headers: stripHopByHopHeaders(request.headers),
      body: request.body,
      // @ts-expect-error — duplex is needed for streaming request bodies
      duplex: 'half',
    });

    // Set Origin to target's origin so the API thinks it's same-site
    proxyRequest.headers.set('Origin', new URL(decoded).origin);
    // Remove the Host header — Cloudflare will set it to the target
    proxyRequest.headers.delete('Host');

    try {
      const response = await fetch(proxyRequest);

      // Stream the response back with CORS headers
      const proxyResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

      // CORS headers — use specific origin, not wildcard
      proxyResponse.headers.set('Access-Control-Allow-Origin', origin);
      proxyResponse.headers.set('Vary', 'Origin');
      // Expose headers the client needs to read
      proxyResponse.headers.set(
        'Access-Control-Expose-Headers',
        'Content-Type, X-Request-Id, Retry-After'
      );

      return proxyResponse;
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Gateway error', message: (err as Error).message }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

// --- Helpers ---

function parseAllowedOrigins(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  for (const pattern of allowed) {
    if (pattern === origin) return true;
    // Wildcard subdomain matching: *.n0de0.com matches app.n0de0.com
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2); // "n0de0.com"
      if (origin.endsWith(domain) && origin.includes('://')) return true;
    }
  }
  return false;
}

function handlePreflight(request: Request, origin: string): Response {
  const requestHeaders = request.headers.get('Access-Control-Request-Headers');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': requestHeaders || 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
      'Vary': 'Origin',
    },
  });
}

function stripHopByHopHeaders(headers: Headers): Headers {
  const clean = new Headers(headers);
  // These headers are connection-specific and shouldn't be forwarded
  for (const h of ['Host', 'Connection', 'Keep-Alive', 'Transfer-Encoding',
                     'TE', 'Trailer', 'Upgrade', 'Proxy-Authorization',
                     'Proxy-Connection']) {
    clean.delete(h);
  }
  return clean;
}
```

### What the code does, step by step

1. **Health check** — `GET /health` returns `ok`. Used by monitoring and Wiggum's client-side health probe.
2. **Origin validation** — Reads the `Origin` header and checks against the allowlist in `env.ALLOWED_ORIGINS`. If no origin or not allowed → 403. Can't be faked from browser JS.
3. **Preflight** — `OPTIONS` requests get a proper CORS preflight response with the requesting origin (not `*`), allowed methods, and allowed headers. The `Access-Control-Max-Age: 86400` means browsers cache this for 24 hours — one preflight per origin per day.
4. **URL extraction** — The target URL comes from `?url=` query parameter, URL-decoded and validated.
5. **Request cloning** — Creates a new `Request` pointed at the target, forwarding method, headers, and body. Strips hop-by-hop headers that shouldn't cross proxy boundaries. Sets `Origin` to the target's origin.
6. **Forwarding** — Standard `fetch()` to the target. Cloudflare's edge network handles DNS, TLS, connection pooling.
7. **Response streaming** — The response body (`ReadableStream`) pipes through without buffering. CORS headers are added. `Vary: Origin` ensures browsers cache per-origin correctly.
8. **Error handling** — If the upstream fetch fails (DNS, timeout, connection refused), return a 502 with a JSON error body.

### What it does NOT do

- **Buffer bodies** — Request and response bodies stream through. A 30-second SSE stream from Claude works without the Worker holding anything in memory.
- **Parse JSON** — The Worker never reads or interprets request/response content. It doesn't know if it's proxying an LLM call, an MCP request, or anything else.
- **Log content** — No request/response body logging. Prompts, completions, and API keys never touch a log.
- **Cache** — LLM responses are unique per request. Caching would be wrong.
- **Transform** — No payload modification. What goes in comes out.
- **Authenticate** — The user's API key in the `Authorization` header passes through to the provider. The Gateway doesn't need its own auth.

---

## 5. SECURITY

### Origin Allowlisting

The primary defense. Browser `fetch()` always sends an `Origin` header — it cannot be suppressed or faked by JavaScript. The Gateway checks this against `env.ALLOWED_ORIGINS` and rejects unknown origins with 403.

```toml
# wrangler.toml — production
[vars]
ALLOWED_ORIGINS = "https://n0de0.com,https://app.n0de0.com,https://*.n0de0.com"

# wrangler.toml — development
[env.dev.vars]
ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
```

Adding new projects: add their origin to the comma-separated list. No code change, no redeploy — `wrangler secret put ALLOWED_ORIGINS` updates it live. (Or use `[vars]` for non-sensitive config that deploys with the code.)

### API Keys in Transit

The user's provider API key travels in the `Authorization` header:

```
Browser → (HTTPS) → Cloudflare Edge → (HTTPS) → Provider
```

Both hops are TLS-encrypted. The key exists in memory on Cloudflare's edge for the duration of the request — same trust model as any HTTPS CDN or reverse proxy. No different than Cloudflare proxying a normal website.

**Never route API keys through a third-party proxy service** (corsproxy.io, cors-anywhere, etc.). Those services see your keys in plaintext.

### What About Non-Browser Clients?

`curl`, Node scripts, and other non-browser HTTP clients don't send an `Origin` header. The Gateway rejects these with 403 (no origin = no access).

If someone deliberately adds an `Origin` header to a non-browser request to bypass the check — they could do this. But there's nothing valuable behind the Gateway itself. It's a pass-through. The only sensitive data is the API key, and that comes from the *caller's* own request, not from the Gateway. An attacker spoofing the Origin header would need to also supply a valid API key, which they already have — making the proxy irrelevant to the attack.

If abuse becomes a concern (someone using the Gateway as a generic CORS proxy), add **Cloudflare Rate Limiting** bindings:

```toml
# wrangler.toml — optional rate limiting
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "n0de0-gateway"
simple = { limit = 100, period = 60 }  # 100 req/min per IP
```

### Target URL Validation

The Gateway currently accepts any target URL. For tighter lockdown, you could restrict to known API domains:

```typescript
const ALLOWED_TARGETS = [
  'api.openai.com',
  'api.anthropic.com',
  'api.together.ai',
  'api.mistral.ai',
  'api.deepseek.com',
  'generativelanguage.googleapis.com',
];

function isTargetAllowed(url: URL): boolean {
  return ALLOWED_TARGETS.includes(url.hostname);
}
```

**Recommendation:** Don't restrict targets initially. MCP servers will be arbitrary domains, and users may have custom endpoints. Add target restrictions only if the proxy is abused as an open relay. The origin allowlist is the primary control.

---

## 6. CLIENT-SIDE INTEGRATION

Defined in LLM API 3.2 §10. Summarized here for completeness.

### AppConfig

```typescript
interface AppConfig {
  // ... existing fields
  /** Gateway URL template. {href} is replaced with the encoded target URL. */
  corsProxy: string;
}

// Defaults
const DEFAULT_CONFIG: AppConfig = {
  corsProxy: 'https://gateway.n0de0.com/?url={href}',
};
```

Users can override this in settings to point at their own Gateway deployment or clear it entirely if they don't need proxying.

### Provider Config

```typescript
interface ProviderConfig {
  id: string;
  baseURL: string;
  model: string;
  apiKey?: string;
  /** Whether this provider needs the Gateway for CORS */
  proxy?: boolean;
}
```

### URL Rewriting

In the LLM client's normalization layer, before every `fetch()`:

```typescript
function applyProxy(url: string, provider: ProviderConfig, config: AppConfig): string {
  if (!provider.proxy || !config.corsProxy) return url;
  return config.corsProxy.replace('{href}', encodeURIComponent(url));
}
```

### Provider CORS Matrix (built-in defaults)

```typescript
const PROVIDER_DEFAULTS: Record<string, { proxy: boolean }> = {
  ollama:      { proxy: false },  // localhost
  openrouter:  { proxy: false },  // sends CORS headers
  openai:      { proxy: true },
  anthropic:   { proxy: true },
  together:    { proxy: true },
  mistral:     { proxy: true },
  deepseek:    { proxy: true },
  custom:      { proxy: false },  // user decides
};
```

### Health Probe

Before the first LLM call in a session, Wiggum can probe the Gateway:

```typescript
async function checkGatewayHealth(proxyUrl: string): Promise<boolean> {
  try {
    const healthUrl = new URL(proxyUrl).origin + '/health';
    const response = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}
```

If the probe fails, Wiggum can warn the user that providers requiring CORS proxying won't work, and suggest checking their Gateway URL or switching to OpenRouter/Ollama.

---

## 7. DEPLOYMENT

### Prerequisites

- Cloudflare account (free tier works, paid $5/mo recommended for PWA scale)
- `wrangler` CLI (`npm install -g wrangler`)
- `wrangler login` (one-time auth)

### `wrangler.toml`

```toml
name = "n0de0-gateway"
main = "src/index.ts"
compatibility_date = "2025-12-01"

# Production environment
[vars]
ALLOWED_ORIGINS = "https://n0de0.com,https://app.n0de0.com,https://*.n0de0.com"

# Custom domain (optional — otherwise uses *.workers.dev)
# routes = [{ pattern = "gateway.n0de0.com", custom_domain = true }]

# Development environment
[env.dev]
name = "n0de0-gateway-dev"
[env.dev.vars]
ALLOWED_ORIGINS = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
```

### `package.json`

```json
{
  "name": "n0de0-gateway",
  "private": true,
  "scripts": {
    "dev": "wrangler dev --env dev",
    "deploy": "wrangler deploy",
    "deploy:dev": "wrangler deploy --env dev"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Zero runtime dependencies. `wrangler` and types are dev-only.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

### Deploy Commands

```bash
# Local dev (runs on http://localhost:8787)
npm run dev

# Deploy to production
npm run deploy

# Update origins without redeploying code
wrangler secret put ALLOWED_ORIGINS
# paste: https://n0de0.com,https://app.n0de0.com,https://newproject.dev

# Check deployment
curl https://n0de0-gateway.<your-subdomain>.workers.dev/health
# → "ok"
```

### Custom Domain

To use `gateway.n0de0.com` instead of `*.workers.dev`:

1. Add the domain to your Cloudflare DNS (A/CNAME record)
2. Uncomment the `routes` line in `wrangler.toml`
3. Redeploy

---

## 8. SCALING

### Cost Model

Cloudflare Workers paid tier ($5/mo):
- 10M requests/month included
- $0.50 per additional million
- Zero bandwidth charges (egress is free)
- 30ms CPU per request (proxy uses <1ms)
- No body size limit for streaming (500MB max for buffered)

### Per-User Footprint

A typical Wiggum session:

| Activity | Proxy requests |
|----------|---------------|
| Ralph task (15-20 iterations) | ~20 |
| Chief conversation (back and forth) | ~30 |
| MCP tool calls (future) | ~10 |
| **Total per heavy session** | **~60** |

A heavy daily user doing 3-4 sessions: **~200-250 requests/day**.

### Scaling Table

| Active daily users | Requests/month | Monthly cost | Notes |
|-------------------|---------------|-------------|-------|
| 1 (just you) | ~7.5K | $5 | 0.075% of quota |
| 10 | ~75K | $5 | 0.75% |
| 100 | ~750K | $5 | 7.5% |
| 500 | ~3.75M | $5 | 37.5% |
| 1,000 | ~7.5M | $5 | 75% — comfortable |
| 1,300 | ~10M | $5 | 100% — ceiling of included |
| 2,000 | ~15M | $5 + $2.50 = $7.50 | |
| 5,000 | ~37.5M | $5 + $13.75 = ~$19 | |
| 10,000 | ~75M | $5 + $32.50 = ~$38 | |
| 50,000 | ~375M | $5 + $182.50 = ~$188 | |
| 100,000 | ~750M | $5 + $370 = ~$375 | |

**The proxy cost is negligible relative to LLM API spend.** At 10K daily users, the Gateway costs $38/mo while those users are collectively spending tens of thousands on API keys. The Gateway will never be the cost bottleneck.

### PWA Considerations

When Wiggum ships as a PWA that people can install:

- **Burst traffic** — Product Hunt launch, viral tweet. Cloudflare handles burst natively — Workers run on 300+ edge locations worldwide with automatic scaling. No provisioning needed.
- **Geographic distribution** — The Worker runs on the edge closest to the user, not in a single region. A user in Tokyo hits the Tokyo edge, which proxies to the provider's nearest endpoint. Latency is minimal.
- **Cold starts** — Workers have ~0ms cold start (V8 isolates, not containers). Every request is fast, even after idle periods.

### When to Consider Alternatives

| Threshold | Action |
|-----------|--------|
| >10M requests/month | Still fine on Workers paid — just costs a bit more |
| >100M requests/month | Consider Workers Enterprise for committed-use discounts |
| Users requesting data residency | Add region-specific Workers or move to Durable Objects |
| Full-stack backend ships | Gateway becomes unnecessary — LLM calls move server-side |

---

## 9. MONITORING & HEALTH

### Health Endpoint

`GET /health` → `200 ok`

Used by:
- Wiggum client-side health probe (§6)
- External uptime monitoring (Cloudflare's own monitoring, Uptime Robot, etc.)
- CI/CD post-deploy verification

### Cloudflare Analytics (Built-in, Free)

Workers dashboard provides:
- Requests per second / minute / hour / day
- Error rate (4xx, 5xx)
- CPU time distribution
- Request duration distribution
- Subrequest count (upstream fetches)
- Geographic distribution

No code needed — this is automatic for every deployed Worker.

### Optional: Structured Logging

If debugging is needed, add minimal metadata logging (never content):

```typescript
// Optional — only if debugging is needed
console.log(JSON.stringify({
  ts: Date.now(),
  origin: origin,
  target: new URL(decoded).hostname,  // hostname only, not full URL
  method: request.method,
  status: response.status,
}));
```

Cloudflare Workers logs are viewable in the dashboard or via `wrangler tail` during development. They're ephemeral — not stored permanently unless you pipe to a log drain.

**Never log:** Full target URLs (contain paths with potentially sensitive info), request/response bodies (contain prompts, completions, API keys in headers).

### Alert Conditions

Set up in Cloudflare dashboard or via API:

| Condition | Alert | Action |
|-----------|-------|--------|
| Error rate > 5% for 5 minutes | Email/webhook | Check upstream provider status |
| 403 spike (origin rejections) | Email/webhook | Someone may be probing the proxy |
| Requests > 80% of quota | Email/webhook | Approaching limit, consider scaling |
| Health endpoint fails | Uptime monitor | Check Worker deployment |

---

## 10. FUTURE: WHEN THE GATEWAY GOES AWAY

The Gateway is a bridge for Wiggum's current browser-only architecture. It has a planned sunset path.

### Phase 1: Browser-Only (Current)

```
Wiggum PWA → Gateway (Worker) → LLM Provider
```

The Gateway is the only path to providers without CORS headers.

### Phase 2: Full-Stack Backend (Hono on Workers)

```
Wiggum PWA → Wiggum Backend (Worker) → LLM Provider
                                      → MCP Servers
                                      → Database
```

When the Hono full-stack layer ships (see hono-fullstack-plan.md), LLM calls move server-side. The backend Worker calls providers directly — no CORS restriction because it's server-to-server. The Gateway becomes redundant for LLM calls.

### Phase 3: Gateway Sunset

The Gateway URL stays in `AppConfig.corsProxy` as a configurable setting. When users migrate to full-stack mode, they remove the proxy URL. The Gateway Worker can stay deployed for users who haven't migrated, or be decommissioned.

**The client-side `applyProxy()` logic costs nothing when `corsProxy` is empty** — it's a no-op. No code to remove, just a config change.

### Why Build It Now If It Goes Away?

Because the full-stack backend is months away and Wiggum needs to work today. The Gateway takes an afternoon to build and deploy, costs $5/mo, and unblocks direct OpenAI/Anthropic access immediately. It's the fastest path to a working multi-provider browser-native IDE.

The Gateway's design (stateless, zero-dependency, pure pass-through) means it has no maintenance burden while it exists and no cleanup burden when it's retired.

---

## APPENDIX: REFERENCE

### Cloudflare's CORS Proxy Example

Cloudflare publishes a CORS proxy Worker example in their docs. The Wiggum Gateway follows the same pattern (clone request, forward, add CORS headers, stream response) but differs in:

- No demo page or HTML rendering
- Dynamic target URL via `?url=` parameter (not hardcoded)
- Origin allowlisting (not open to all origins)
- No framework dependency
- Health check endpoint
- Environment-based configuration

Reference: https://developers.cloudflare.com/workers/examples/cors-header-proxy/

### Clean Room Note

The Gateway is written from scratch using standard Web APIs (`Request`, `Response`, `fetch`, `URL`, `Headers`, `ReadableStream`). The concept of a CORS proxy on Cloudflare Workers is a well-documented public pattern. No code from Hono, Shakespeare, corsproxy.io, or any other implementation is used.

### Related Documents

- **LLM API 3.2** — Client-side integration: `applyProxy()`, `ProviderConfig.proxy`, `AppConfig.corsProxy`, provider CORS matrix
- **Hono Full-Stack Plan** — The backend that eventually replaces the Gateway for LLM calls
- **Wiggum Master** — Overall architecture context

### CC Prompt

```
Create the n0de0 Gateway — a Cloudflare Worker CORS proxy.

Location: n0de0-gateway/ (separate repo/directory from the main IDE)

This is a standalone Cloudflare Worker with zero runtime dependencies.
It proxies browser fetch() requests to external APIs that don't send
CORS headers, enabling n0de0's browser-native tools to reach
LLM providers like OpenAI and Anthropic directly.

Create these files:
- src/index.ts — The full Worker (~50 lines). Handles:
  - GET /health → 200 "ok"
  - OPTIONS → CORS preflight response with requesting origin
  - GET/POST/PUT/DELETE with ?url= param → proxy to target
  - Origin validation against env.ALLOWED_ORIGINS
  - Strips hop-by-hop headers before forwarding
  - Streams response.body through without buffering
  - Returns 403 for unknown origins, 400 for missing/invalid URL, 502 for upstream errors
- wrangler.toml — Worker config with ALLOWED_ORIGINS var, dev environment
- package.json — Zero dependencies, just wrangler + types as devDeps
- tsconfig.json — ES2022, strict, @cloudflare/workers-types

Key implementation details:
- Use specific origin in Access-Control-Allow-Origin (not wildcard *)
- Include Vary: Origin on every proxied response
- Access-Control-Max-Age: 86400 on preflight (cache 24h)
- Set Origin header on proxy request to target's origin
- request body forwarding needs duplex: 'half' for streaming
- Error responses should be JSON: { error: string, message: string }
- The ?url= param value is URL-encoded — decode before using

Pattern reference: Cloudflare's CORS header proxy example at
developers.cloudflare.com/workers/examples/cors-header-proxy/
for the core Request cloning + CORS header pattern. But strip
the demo page, use dynamic ?url= targeting, and add origin validation.

DO NOT add any dependencies. Standard Web APIs only.
```
