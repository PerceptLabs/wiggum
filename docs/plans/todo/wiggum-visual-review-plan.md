# WIGGUM VISUAL REVIEW — Structure Plus & Ralph's Eyes

> Two-tier visual feedback system for Ralph. **Tier 1 (Structure Plus):** Deterministic heuristic analysis of rendered DOM — spacing, contrast, typography, layout, balance — always on, zero cost, zero config. **Tier 2 (Ralph's Eyes):** Optional LLM vision provider that captures a screenshot and returns aesthetic judgment — the "taste" layer. Both produce the same output: `.ralph/visual-review.md`, read by Ralph's coding model on the next iteration.
>
> **Zero external dependencies.** No axe-core (300KB, 90+ rules we don't need), no screenshot MCP (server-side), no Puppeteer. Everything runs in-browser through the existing postMessage probe bridge.

---

## TABLE OF CONTENTS

1. [Context & What Exists](#1-context--what-exists)
2. [Architecture Overview](#2-architecture-overview)
3. [Tier 1: Structure Plus (Heuristic Analysis)](#3-tier-1-structure-plus)
4. [Tier 2: Ralph's Eyes (Vision Provider)](#4-tier-2-ralphs-eyes)
5. [Output Format](#5-output-format)
6. [Integration with Ralph Loop](#6-integration-with-ralph-loop)
7. [Implementation Phases](#7-implementation-phases)
8. [File Change Index](#8-file-change-index)
9. [CC Prompt Strategy](#9-cc-prompt-strategy)
10. [Why Not axe-core](#10-why-not-axe-core)
11. [Relationship to Other Plans](#11-relationship-to-other-plans)

---

## 1. CONTEXT & WHAT EXISTS

### Current Snapshot System (Three Layers)

`src/lib/snapshot/snapshot.ts` — ~565 lines, three independent layers:

**Layer 1 (Theme):** Reads `.ralph/tokens.json` or falls back to `src/index.css`. Outputs palette tables, contrast pairs, WCAG summary, font info, shadow character, spacing tokens, mood personality. Pure filesystem read — no DOM involved.

**Layer 2 (Structure):** Reads `src/App.tsx` source, extracts imports, Tailwind class categories, JSX component inventory, build metadata (module count, bundle size, deps, warnings). Static analysis — no rendering involved.

**Layer 3 (Render):** From iframe probe via postMessage. Currently collects:
- `rendered: boolean` — did the iframe paint?
- `sections: SectionInfo[]` — tag, id, className, rect (x/y/width/height), childCount
- `interactions: InteractionInfo[]` — tag, type, text, hasHandler
- `layoutIssues: LayoutIssue[]` — overlap, overflow, zero-size (three types only)
- `computedTheme: Record<string, string>` — resolved CSS variables

**What Layer 3 is missing:**

Layer 3 collects basic layout geometry and three issue types. It does not measure:
- Spacing between siblings (gaps, variance, rhythm)
- Typography metrics (font sizes in use, line height ratios, line lengths, heading hierarchy)
- Color contrast on rendered elements (only theme-level WCAG from Layer 1 tokens)
- Touch target dimensions
- Visual weight distribution
- Alignment consistency
- Interactive element states (cursor, pointer-events)
- Container relationships (flex/grid direction, gap values)

Structure Plus extends Layer 3's probe to collect this data, then applies heuristic checks to produce actionable findings.

### What Nothing in the Ecosystem Does

Surveyed existing tools:

| Tool | What it does | Why it doesn't fit |
|------|-------------|-------------------|
| **axe-core** (Deque) | WCAG a11y audit — contrast, ARIA, labels, landmarks, heading order | 300KB, 90+ rules (we need ~4), verbose output format, scope mismatch |
| **Stylelint / CSS Lint / ESLint CSS** | Static CSS source analysis — syntax, conventions, vendor prefixes | Source-level, never sees rendered DOM, can't detect layout issues |
| **Chromatic / Percy** | Visual regression via screenshot diff against baseline | Requires server-side headless browser + reference image. No baseline for new apps |
| **Lighthouse** | Performance + a11y + SEO + best practices | Server-side, massive scope, not embeddable in iframe |
| **Sa11y** | In-page a11y checker overlay | Close but a11y-only, no layout/spacing/typography/balance |

**The gap:** Nobody has built a "layout quality linter" that runs deterministic heuristic checks on rendered DOM for spacing consistency, typography proliferation, visual balance, alignment regularity, and whitespace analysis. This is novel.

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│  TIER 1: Structure Plus (always on)                     │
│                                                         │
│  ┌──────────────┐    postMessage    ┌────────────────┐  │
│  │ Preview      │ ──────────────→  │ Parent (IDE)   │  │
│  │ Iframe       │                   │                │  │
│  │              │  VisualProbe      │ VisualAnalyzer │  │
│  │ DOM walking  │  Result JSON      │ 17 heuristic   │  │
│  │ getComputed  │ ←────────────── │ checks         │  │
│  │ Style reads  │                   │ Pure functions │  │
│  └──────────────┘                   └───────┬────────┘  │
│                                             │           │
│                                     ┌───────▼────────┐  │
│                                     │ visual-review  │  │
│                                     │ .md            │  │
│                                     └───────┬────────┘  │
├─────────────────────────────────────────────┼───────────┤
│  TIER 2: Ralph's Eyes (optional)            │           │
│                                             │           │
│  ┌──────────────┐  html-to-image   ┌───────▼────────┐  │
│  │ Preview      │ ──→ base64 PNG → │ Vision LLM     │  │
│  │ Iframe       │                   │ (2nd provider) │  │
│  │ canvas       │                   │ "Review this"  │  │
│  │ toDataURL    │                   │                │  │
│  └──────────────┘                   └───────┬────────┘  │
│                                             │           │
│                                     ┌───────▼────────┐  │
│                                     │ Appends to     │  │
│                                     │ visual-review  │  │
│                                     │ .md            │  │
│                                     └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                  ┌───────▼────────┐
                  │ Ralph's next   │
                  │ iteration      │
                  │ reads .ralph/  │
                  │ visual-review  │
                  │ .md            │
                  └────────────────┘
```

**Key principle:** Ralph's coding model never sees an image. Both tiers produce text. The coding model (GLM-5, DeepSeek-Coder, Claude, whatever) reads markdown describing what's wrong. The vision model in Tier 2 is a translator: pixels → words.

---

## 3. TIER 1: STRUCTURE PLUS

### 3.1 Enhanced Probe (iframe-side)

The probe runs inside the preview iframe, triggered via `postMessage('probe-visual')`. It walks the DOM, collects measurements using `getBoundingClientRect()` and `getComputedStyle()`, and returns structured JSON back to the parent.

**New types (extend existing `IframeProbeResult`):**

```typescript
// ── Probe output ──────────────────────────────────────────

export interface VisualProbeResult extends IframeProbeResult {
  // Existing fields unchanged: rendered, sections, interactions,
  // layoutIssues, computedTheme

  /** Per-element measurements. Capped at 60 elements. */
  elements: ElementMeasurement[]

  /** Flex/grid containers with 2+ children. Capped at 20. */
  containers: ContainerMeasurement[]

  /** Viewport dimensions. */
  viewport: { width: number; height: number; scrollHeight: number }
}

export interface ElementMeasurement {
  /** Minimal unique selector for human-readable reports. */
  selector: string
  tag: string
  rect: { x: number; y: number; width: number; height: number }

  // Typography
  fontSize: number
  fontWeight: number
  lineHeight: number
  color: string              // Computed — browser resolves oklch→rgb
  letterSpacing: number
  /** Character count of innerText. Only for text-bearing elements. */
  textLength?: number
  /** Estimated line count: Math.round(height / lineHeight). */
  lineCount?: number

  // Background
  backgroundColor: string    // Computed — resolved to rgb/rgba
  backgroundImage: string    // 'none' or present

  // Box model (parsed from computed, in px)
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number

  // Interactive
  isInteractive: boolean     // a, button, [role=button], input, select, textarea
  cursor: string
  hasPointerEvents: boolean  // pointer-events !== 'none'
}

export interface ContainerMeasurement {
  selector: string
  display: string            // 'flex' | 'grid' | 'inline-flex' | 'inline-grid'
  flexDirection: string      // 'row' | 'column' | 'row-reverse' | 'column-reverse'
  gap: number                // Parsed gap value (px)
  /** Ordered child bounding rects. */
  childRects: Array<{ x: number; y: number; width: number; height: number }>
  /** Measured pixel gaps between adjacent siblings along the main axis. */
  childGaps: number[]
}
```

**DOM walking rules:**

1. Start from `document.body`, depth-first.
2. Skip: `<script>`, `<style>`, `<meta>`, `<link>`, `<noscript>`, `<template>`, `[hidden]`, `display: none`.
3. Skip elements where both `width === 0` and `height === 0` and `childElementCount === 0`.
4. Cap `elements` at 60 entries. If DOM exceeds 60 meaningful elements, take first 60 in document order. (Ralph builds small apps — 60 is generous.)
5. For `containers`: collect any element with `display` matching `flex|grid|inline-flex|inline-grid` that has ≥2 visible children. Cap at 20.
6. `childGaps` calculation: for each adjacent pair of children, measure the gap along the main axis. For `flex-direction: row`, gap = `child[i+1].left - child[i].right`. For `column`, gap = `child[i+1].top - child[i].bottom`. Negative values indicate overlap.

**Selector generation:**

Minimal unique selectors for human readability — not CSS-selector-engine robustness. Priority:
1. `#id` if element has an id
2. `.className:nth-child(n)` if it has a class
3. `tag:nth-child(n)` fallback
4. Prepend parent selector if needed for uniqueness, max 2 levels deep

**Computed style parsing:**

`getComputedStyle()` returns strings. Parse to numbers:
```typescript
function px(value: string): number {
  return parseFloat(value) || 0
}
// fontSize: px(cs.fontSize)      → e.g. 16
// lineHeight: px(cs.lineHeight)  → e.g. 24 (browsers resolve 'normal' to px)
// gap: px(cs.gap)                → e.g. 16
```

Color strings come back as `rgb(r, g, b)` or `rgba(r, g, b, a)` — browsers resolve all color formats (oklch, hsl, hex) to rgb in computed style. No oklch parsing needed.

### 3.2 Heuristic Analyzer (parent-side)

Pure functions. Takes `VisualProbeResult` in, returns `VisualFinding[]` out. No DOM access. Fully testable with fixture data.

```typescript
// ── Analyzer output ───────────────────────────────────────

export type Severity = 'critical' | 'warning' | 'pass'

export interface VisualFinding {
  severity: Severity
  category: VisualCategory
  check: string              // Machine-readable check ID
  message: string            // Human-readable description
  element?: string           // Selector of offending element, if applicable
}

export type VisualCategory =
  | 'layout'
  | 'spacing'
  | 'typography'
  | 'contrast'
  | 'interaction'
  | 'balance'
```

### 3.3 The 17 Checks

#### Category 1: Layout Health (4 checks)

**L1 — Sibling Overlap**
```
For each container's childRects:
  For each adjacent pair (i, i+1):
    Compute intersection area
    IF intersection > 4px² → critical
    Report: "‹selector A› overlaps ‹selector B› by Npx"
```

**L2 — Content Overflow**
```
For each container:
  For each child rect:
    IF child.right > container.right + 2 OR child.bottom > container.bottom + 2 → critical
    Report: "‹child› overflows ‹container› by Npx horizontally/vertically"
Also check: viewport.scrollHeight > viewport.height * 5 → warning ("page extremely long")
```

**L3 — Zero-Size with Children**
```
For each element:
  IF (rect.width === 0 OR rect.height === 0) AND has children in elements list → critical
  Report: "‹selector› has zero width/height but contains content"
```
(Extends existing `LayoutIssue` type `zero-size` with children awareness.)

**L4 — Trapped Whitespace**
```
Sort all element rects by Y position.
For each gap between consecutive elements:
  IF gap > 200px AND elements exist on both sides → warning
  Report: "200px+ empty gap between ‹A› and ‹B›"
```

#### Category 2: Spacing Consistency (4 checks)

**S1 — Gap Variance**
```
For each container with childGaps.length ≥ 3:
  Calculate mean and standard deviation of childGaps
  IF stddev > 4px → warning
  Report: "‹container› gaps vary [N,N,N,N]px (σ=N, expect ≤4)"
```

**S2 — Gap-to-Token Alignment**
```
Read spacing scale from computedTheme (--spacing or common 4/8/12/16/20/24/32/40/48/64 scale).
For each container's childGaps:
  For each gap value:
    IF not within 2px of any token value → warning
    Report: "‹container› gap Npx doesn't match spacing scale"
Limit: report max 3 off-scale gaps per container.
```

**S3 — Horizontal Margin Balance**
```
For each top-level section (direct children of body or main container):
  IF |marginLeft - marginRight| > 8px → warning
  Report: "‹section› margins unbalanced: Npx left vs Npx right"
```

**S4 — Section Rhythm**
```
Collect vertical gaps between top-level sections (same set as S3).
IF gaps.length ≥ 3:
  Calculate stddev
  IF stddev > 12px → warning
  Report: "Section spacing irregular: gaps [N,N,N]px (σ=N)"
```

#### Category 3: Typography (4 checks)

**T1 — Font Size Proliferation**
```
Collect distinct fontSize values (rounded to nearest 0.5px) across all elements.
IF distinctCount > 6 → warning
Report: "N distinct font sizes (recommend ≤6): Npx, Npx, ..."
```

**T2 — Heading Hierarchy**
```
Collect elements where tag matches h1-h6.
Sort by heading level.
For each adjacent pair (h_n, h_m where n < m):
  IF h_n.fontSize ≤ h_m.fontSize → critical
  Report: "‹h2› (Npx) is not smaller than ‹h1› (Npx)"
```

**T3 — Line Length**
```
For each element where:
  tag is p, li, span, div
  AND textLength > 0
  AND fontSize ≤ 18 (body text, not headings)
  AND lineCount ≥ 2 (multi-line):
    charsPerLine = textLength / lineCount
    IF charsPerLine > 80 → warning
    Report: "‹selector› ~N chars/line (recommend ≤80)"
Limit: report max 3 elements.
```

**T4 — Line Height Ratio**
```
For each element where:
  fontSize ≤ 18 (body text)
  AND textLength > 20 (meaningful text):
    ratio = lineHeight / fontSize
    IF ratio < 1.3 → warning
    Report: "‹selector› line-height ratio N (recommend ≥1.4)"
```

#### Category 4: Contrast (2 checks)

**C1 — Text Contrast Ratio**
```
For each element with textLength > 0:
  fgColor = parse(color) → [r, g, b, a]
  bgColor = effectiveBackground(element) → [r, g, b]
  ratio = contrastRatio(relativeLuminance(fg), relativeLuminance(bg))

  IF fontSize ≥ 18 OR (fontSize ≥ 14 AND fontWeight ≥ 700):  // "large text"
    threshold = 3.0
  ELSE:
    threshold = 4.5

  IF ratio < threshold → critical
  Report: "‹selector› contrast N:1 against background — fails WCAG AA (need N:1)"
Limit: report max 5 failing elements.
```

**Effective background resolution:**
```typescript
function effectiveBackground(el: ElementMeasurement, allElements: ElementMeasurement[]): [number, number, number] {
  // 1. Parse el.backgroundColor → [r, g, b, a]
  // 2. If a >= 0.95, return [r, g, b] (opaque enough)
  // 3. Walk up the DOM — find the nearest ancestor in allElements
  //    whose rect contains el.rect and has opaque backgroundColor
  // 4. Alpha-composite el.backgroundColor over ancestor's backgroundColor
  // 5. Fallback: assume white [255, 255, 255]
  //
  // This handles Ralph's typical output: solid color backgrounds,
  // occasional rgba overlays. Does NOT handle gradients or
  // background-image — that's what Tier 2 vision is for.
}
```

**C2 — Text on Image**
```
For each element with textLength > 0:
  Walk ancestors (or self) to find backgroundImage !== 'none'
  IF found AND no overlay detected (no child/pseudo with semi-opaque bg) → warning
  Report: "‹selector› has text over background-image without overlay"
Note: This is a heuristic approximation. Detection of overlays is limited
to checking if a sibling/child has backgroundColor with alpha 0.3-0.9.
```

#### Category 5: Interaction Readiness (2 checks)

**I1 — Touch Target Size**
```
For each element where isInteractive === true:
  IF rect.width < 44 OR rect.height < 44 → critical
  Report: "‹selector› touch target Nw×Nhpx — below 44×44px minimum"
```

**I2 — Missing Cursor**
```
For each element where isInteractive === true AND tag is 'a' or 'button' or [role=button]:
  IF cursor !== 'pointer' → warning
  Report: "‹selector› is interactive but cursor is 'N' (expect pointer)"
```

#### Category 6: Visual Balance (1 check)

**B1 — Quadrant Weight**
```
Divide viewport into 4 quadrants (top-left, top-right, bottom-left, bottom-right).
For each element:
  weight = rect.width * rect.height
  Assign to quadrant based on rect center point.
Sum weights per quadrant.
For each pair of opposite quadrants (TL↔BR, TR↔BL):
  IF ratio > 3:1 → warning
  Report: "Top-left quadrant N× heavier than bottom-right"
```

**Total: 17 checks.** 4 layout + 4 spacing + 4 typography + 2 contrast + 2 interaction + 1 balance.

### 3.4 Contrast Utility

~80 LOC. Handles the color math without axe-core.

```typescript
// ── src/lib/snapshot/contrast.ts ──────────────────────────

/**
 * Parse computed color string to [r, g, b, a].
 * Browsers return computed styles as rgb() or rgba() — never oklch/hsl.
 */
export function parseColor(css: string): [number, number, number, number] {
  // Match: rgb(r, g, b) or rgba(r, g, b, a)
  // Also handles: rgb(r g b) and rgb(r g b / a) — modern syntax
  const match = css.match(
    /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)/
  )
  if (!match) return [0, 0, 0, 1] // fallback: black, opaque
  return [
    parseFloat(match[1]),
    parseFloat(match[2]),
    parseFloat(match[3]),
    match[4] !== undefined ? parseFloat(match[4]) : 1,
  ]
}

/**
 * WCAG 2.x relative luminance.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * WCAG contrast ratio between two luminance values.
 * Returns value ≥ 1.0 (e.g. 4.5, 7.0, 21.0).
 */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Alpha-composite foreground over background.
 * Both as [r, g, b] (0-255). Alpha is fg alpha (0-1).
 */
export function alphaComposite(
  fg: [number, number, number],
  bg: [number, number, number],
  alpha: number
): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ]
}
```

**Why this is sufficient:**

Ralph's generated apps use Wiggum's theme system. Colors come from OKLCH CSS variables on solid backgrounds. The hard edge cases axe-core handles — `mix-blend-mode`, stacked semi-transparent layers, CSS gradients behind text, `backdrop-filter` — barely exist in Ralph's output. A straightforward `getComputedStyle` → parse rgb → luminance → ratio chain covers 95%+ of what Ralph will produce.

The 5% it misses (text over `background-image`, complex layering) gets caught by check C2 as a warning ("text on image without overlay"), and if the user configures Tier 2, the vision model provides the definitive judgment.

---

## 4. TIER 2: RALPH'S EYES (VISION PROVIDER)

### 4.1 Second Provider Slot

Settings UI gains a second optional provider configuration:

```
🧠 Coding Provider (Ralph's brain)
   Provider: OpenRouter / Anthropic / OpenAI / Ollama / Zhipu / DeepSeek
   API Key: sk-...
   Model: glm-5 / claude-sonnet-4 / gpt-4o

👁️ Vision Provider (Ralph's eyes) — OPTIONAL
   Provider: OpenRouter / Anthropic / OpenAI / Google / DeepSeek
   API Key: sk-... (can be same key if provider supports both)
   Model: gpt-4o / claude-sonnet-4 / gemini-2.0-flash / deepseek-vl2
```

**Same shape as existing provider config in `AppConfig`:**

```typescript
export interface VisionProviderConfig {
  baseUrl: string       // e.g. 'https://api.deepseek.com'
  apiKey: string
  model: string         // e.g. 'deepseek-vl2'
  useProxy?: boolean    // Route through Gateway CORS proxy
}
```

**Provider auto-detection:** If the coding provider's model has `supportsImages: true` in the model registry (§11 of LLM API 3.2), the UI can offer a "Use same provider for vision" toggle — no second key needed. One subscription, both brain and eyes.

**Validation before call:** Check `getModelCapability(model).supportsImages`. If false or unknown, skip vision review silently.

### 4.2 Screenshot Capture

Inject a small capture function into the preview iframe via `postMessage`. No `html-to-image` library needed — native canvas approach:

```typescript
// Injected into preview iframe's bridge script

async function captureScreenshot(): Promise<string> {
  // Option A: Use OffscreenCanvas + DOM serialization (complex, fragile)
  // Option B: Use window's native rendering (simple, reliable)

  // We use html2canvas (~40KB) or the simpler approach:
  // Serialize the iframe's innerHTML, render into a hidden canvas.
  //
  // Simplest viable approach: just grab the iframe's rendered
  // content using the existing bridge. The parent has access to
  // the iframe element directly — can use:

  // Parent-side (not iframe-side):
  // const canvas = await html2canvas(iframe.contentDocument.body)
  // const base64 = canvas.toDataURL('image/png', 0.8)

  // This works because:
  // - Same-origin (we serve the preview from our own blob/data URL)
  // - html2canvas handles CSS → canvas rendering
  // - 0.8 quality keeps PNG reasonable (~100-300KB for typical app)
  return base64
}
```

**Implementation choice:** Use `html2canvas` (~40KB, well-tested, handles CSS) imported via esm.sh. Only loaded when vision provider is configured — lazy import, not in main bundle. Inject into parent context, not iframe, since we have same-origin access to `iframe.contentDocument`.

**Alternative for future:** `html-to-image` (~8KB) is lighter but less reliable with complex CSS. Start with html2canvas, profile, switch if needed.

### 4.3 Vision Call Flow

```
1. Ralph finishes code generation → app renders in preview iframe
2. Tier 1 runs: probe → analyze → write findings to visual-review.md
3. IF vision provider configured:
   a. html2canvas captures iframe.contentDocument.body → base64 PNG
   b. Resize to max 1280px wide (keep aspect ratio) — reduces token cost
   c. Send to vision provider:

      POST {visionProvider.baseUrl}/chat/completions
      {
        model: "{visionProvider.model}",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: "data:image/png;base64,{screenshot}",
                detail: "low"     // 720p tile, cheapest
              }
            },
            {
              type: "text",
              text: "Review this web app screenshot. Describe: layout quality, visual hierarchy, color harmony, spacing feel, anything that looks broken or amateur. Be terse — 3-5 bullet points max. Focus on what a designer would notice."
            }
          ]
        }]
      }

   d. Parse response text
   e. Append to visual-review.md under "## Aesthetic Review (vision)" section
```

**Cost model:** 720p screenshot ≈ 1,000-2,000 image tokens (low detail mode). At GPT-4o pricing: ~$0.002 per review. At Gemini Flash pricing: ~$0.0002 per review. Fires once per render cycle, typically 3-5 times per app build. Total cost per app: $0.001-$0.01.

**Timeout:** 15 second timeout on vision call. If it fails or times out, Tier 1 findings alone are written. Vision is never blocking.

### 4.4 Example Provider Combinations

| Coding Model | Vision Model | Notes |
|---|---|---|
| GLM-5 (Zhipu) | DeepSeek VL2 | Two cheap providers, both OpenAI-compatible |
| Claude Sonnet 4 | Claude Sonnet 4 | Same key, same provider, `supportsImages: true` |
| GPT-4o | GPT-4o | Same key, one subscription handles both |
| DeepSeek Coder V3 | Gemini 2.0 Flash | Cheapest vision option at Google's flash pricing |
| Ollama (local) | GPT-4o (API) | Local coding, cloud vision only when needed |
| Any | *(none)* | Tier 1 only — zero cost, still catches 80-90% of issues |

---

## 5. OUTPUT FORMAT

Both tiers write to the same file: `.ralph/visual-review.md`

```markdown
## Visual Review

### 🔴 Critical (N)
- Overlap: `.card:nth-child(2)` overlaps `.header` by 8px vertically
- Contrast: `.cta-button` contrast 2.8:1 against background — fails WCAG AA (need 4.5:1)
- Touch target: `.nav-link` is 32×28px — below 44×44px minimum

### 🟡 Warning (N)
- Spacing: `.card-grid` gaps vary [16,24,16,32]px (σ=7.3, expect ≤4)
- Typography: 7 distinct font sizes (recommend ≤6): 12,14,16,18,20,24,32px
- Line length: `.body-text` ~94 chars/line (recommend ≤80)
- Balance: top-left quadrant 2.8× heavier than bottom-right

### 🟢 Pass (N)
- Heading hierarchy: 32→24→18px ✓
- Horizontal margins balanced: 24px / 24px ✓
- All interactive elements have cursor:pointer ✓
- No viewport overflow ✓
- Line height ≥1.4 on all body text ✓

Score: N/17 checks passing

## Aesthetic Review (vision)
- Card grid reads well, good use of whitespace between sections
- CTA button color feels washed out — insufficient pop against muted background
- Hero text tracking too tight at this size, feels cramped
- Overall: clean layout, typography needs work, color palette is cohesive
```

**When no vision provider is configured,** the "Aesthetic Review" section is simply absent. Ralph processes whatever sections exist.

**Score:** `passing / total` where total = number of checks that ran (some may be skipped if no relevant elements exist, e.g. no headings = T2 doesn't run). This gives Ralph a quick signal: "8/14 — several things to fix" vs "14/14 — looks clean."

---

## 6. INTEGRATION WITH RALPH LOOP

### When It Runs

Visual review fires after every successful build + render cycle:

```
Ralph iteration N:
  1. Ralph writes code (shell commands)
  2. Build triggers → esbuild → preview iframe renders
  3. Wait for iframe load event
  4. Run Tier 1: postMessage probe → analyze → write .ralph/visual-review.md
  5. Run Tier 2 (if configured): screenshot → vision call → append to visual-review.md
  6. Iteration ends

Ralph iteration N+1:
  7. System prompt rebuilds context → reads all .ralph/ files
  8. visual-review.md is included alongside design-brief.md, rendered-structure.md, etc.
  9. Ralph sees: "3 critical issues, 4 warnings, 10 passing"
  10. Ralph prioritizes fixes based on severity
```

**No extra iteration cost.** The review happens during the existing post-build phase. Ralph doesn't spend an iteration requesting the review — it's automatically there on the next iteration's context refresh.

### What Ralph Does With It

Ralph's system prompt already includes instructions to read `.ralph/` files. The visual review becomes one more signal:

```
IF critical issues exist:
  Ralph prioritizes fixing them (overlap, contrast failure, tiny touch targets)
IF only warnings:
  Ralph may fix them or note them depending on remaining iteration budget
IF all passing:
  Ralph moves on to feature work or calls complete
```

The scoring threshold for "good enough" can be tuned:
- **Default:** 0 critical issues required to complete
- **Strict:** 0 critical + 0 warnings
- **Relaxed:** Critical issues only block completion

This integrates with the existing quality gates system — visual review findings can feed into the gate pass/fail decision.

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Enhanced Probe + Types (~2 days)

Extend the existing iframe probe to collect `ElementMeasurement` and `ContainerMeasurement` data.

**Files:**
- `src/lib/snapshot/visual-types.ts` — new, all type definitions
- `src/lib/snapshot/visual-probe.ts` — new, iframe-side probe script
- Existing probe bridge — add `'probe-visual'` message handler alongside existing probe

**Test:** Mock DOM fixtures → verify probe returns expected measurements. Verify element cap (60), container cap (20), selector generation.

### Phase 2: Heuristic Analyzer + Contrast (~3 days)

Implement all 17 checks as pure functions. Contrast utility.

**Files:**
- `src/lib/snapshot/visual-analyzer.ts` — new, all heuristic checks
- `src/lib/snapshot/contrast.ts` — new, color parsing + WCAG math
- `src/lib/snapshot/__tests__/visual-analyzer.test.ts` — new, fixture-based tests
- `src/lib/snapshot/__tests__/contrast.test.ts` — new, known color pair tests

**Test:** Fixture-based. Create `VisualProbeResult` objects with known issues, verify each check fires at correct severity. Use WCAG-published color pairs for contrast validation.

### Phase 3: Orchestrator + Markdown Writer (~1 day)

Wire probe → analyzer → `.ralph/visual-review.md` file write.

**Files:**
- `src/lib/snapshot/visual-review.ts` — new, orchestrates probe + analysis + file write
- `src/lib/snapshot/snapshot.ts` — modify, add `visualReview` to the `generateSnapshot` flow

**Test:** Integration test: mock probe result → verify markdown output format.

### Phase 4: Vision Provider Slot (~2 days)

Add second provider config, screenshot capture, vision call, append to markdown.

**Files:**
- `src/lib/config/types.ts` — modify, add `visionProvider?: VisionProviderConfig`
- `src/components/settings/` — modify, add Vision Provider section to settings UI
- `src/lib/snapshot/vision-capture.ts` — new, html2canvas wrapper + resize
- `src/lib/snapshot/vision-review.ts` — new, vision LLM call + response parsing
- `src/lib/snapshot/visual-review.ts` — modify, add Tier 2 call after Tier 1

**Test:** Mock vision provider response → verify markdown append. Test timeout handling. Test `supportsImages` gate.

### Phase 5: Quality Gate Integration (~1 day)

Wire visual review score into existing quality gates system.

**Files:**
- Quality gates config — add visual review threshold option
- Ralph loop — read visual review score, factor into completion decision

**Test:** Verify gate blocks completion with critical findings. Verify gate passes with clean report.

**Total: ~9 days across 5 phases.**

---

## 8. FILE CHANGE INDEX

### New Files

| File | LOC (est.) | Phase | Purpose |
|------|-----------|-------|---------|
| `src/lib/snapshot/visual-types.ts` | 60 | 1 | All type definitions for probe, analyzer, findings |
| `src/lib/snapshot/visual-probe.ts` | 180 | 1 | Iframe-side DOM walking and measurement collection |
| `src/lib/snapshot/visual-analyzer.ts` | 300 | 2 | 17 heuristic checks, pure functions |
| `src/lib/snapshot/contrast.ts` | 80 | 2 | Color parsing, WCAG luminance, contrast ratio, alpha composite |
| `src/lib/snapshot/visual-review.ts` | 60 | 3 | Orchestrator: trigger probe, run analyzer, write markdown |
| `src/lib/snapshot/vision-capture.ts` | 50 | 4 | html2canvas wrapper, resize, base64 output |
| `src/lib/snapshot/vision-review.ts` | 70 | 4 | Vision LLM call, prompt, response parsing, timeout |
| `src/lib/snapshot/__tests__/visual-analyzer.test.ts` | 150 | 2 | Fixture-based tests for all 17 checks |
| `src/lib/snapshot/__tests__/contrast.test.ts` | 60 | 2 | Known color pair tests, edge cases |
| **Production total** | **~800** | | |
| **Test total** | **~210** | | |

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `src/lib/snapshot/snapshot.ts` | 3 | Add `visualReview` integration to `generateSnapshot()` |
| `src/lib/config/types.ts` | 4 | Add `visionProvider?: VisionProviderConfig` to AppConfig |
| `src/components/settings/*` | 4 | Add Vision Provider config section |
| Iframe bridge script | 1 | Add `'probe-visual'` message handler |
| Quality gates config | 5 | Add visual review threshold option |

### Dependencies

| Package | Size | When loaded | Phase |
|---------|------|-------------|-------|
| `html2canvas` | ~40KB | Lazy — only when vision provider configured | 4 |

**That's it.** One optional lazy dependency for screenshot capture. Zero dependencies for Tier 1.

---

## 9. CC PROMPT STRATEGY

### Phase 1 CC Prompt: Enhanced Probe

```
Read: src/lib/snapshot/snapshot.ts (understand existing probe types),
      preview iframe bridge script (understand postMessage pattern)

Create src/lib/snapshot/visual-types.ts with:
- VisualProbeResult extends IframeProbeResult
- ElementMeasurement interface (rect, typography, color, box model, interactive)
- ContainerMeasurement interface (display, direction, gap, childRects, childGaps)
- VisualFinding interface (severity, category, check, message, element)
- Severity and VisualCategory types

Create src/lib/snapshot/visual-probe.ts:
- Function that runs inside iframe context (will be injected via postMessage)
- Walks DOM depth-first from document.body
- Skips script/style/meta/hidden/display:none elements
- Collects ElementMeasurement for up to 60 elements
- Collects ContainerMeasurement for flex/grid containers with 2+ children (up to 20)
- Generates minimal unique selectors (id > class:nth > tag:nth, max 2 levels)
- Parses getComputedStyle strings to numbers via parseFloat
- Measures childGaps along main axis (row: left-right, column: top-bottom)
- Returns VisualProbeResult
- Include viewport dimensions

Add 'probe-visual' handler to iframe bridge alongside existing probe handler.
Pattern: parent sends postMessage('probe-visual'), iframe runs probe,
returns result via postMessage.

Do NOT modify any existing probe logic or types.
Do NOT modify snapshot.ts yet (Phase 3).
```

### Phase 2 CC Prompt: Analyzer + Contrast

```
Read: src/lib/snapshot/visual-types.ts (types from Phase 1)

Create src/lib/snapshot/contrast.ts:
- parseColor(css: string): [r, g, b, a] — parse rgb()/rgba() strings
- relativeLuminance(r, g, b): number — WCAG 2.x formula
- contrastRatio(l1, l2): number — (lighter + 0.05) / (darker + 0.05)
- alphaComposite(fg, bg, alpha): [r, g, b]
- All pure functions, no DOM access

Create src/lib/snapshot/visual-analyzer.ts:
- analyzeVisuals(probe: VisualProbeResult): VisualFinding[]
- Implement 17 checks organized by category:
  Layout (4): sibling-overlap, content-overflow, zero-size-children, trapped-whitespace
  Spacing (4): gap-variance, gap-token-alignment, margin-balance, section-rhythm
  Typography (4): font-size-proliferation, heading-hierarchy, line-length, line-height-ratio
  Contrast (2): text-contrast, text-on-image
  Interaction (2): touch-target-size, missing-cursor
  Balance (1): quadrant-weight
- Each check is a separate function returning VisualFinding[]
- analyzeVisuals calls all checks, concatenates results, sorts by severity
- Apply limits where noted (max 5 contrast failures, max 3 line-length warnings, etc.)
- effectiveBackground walks allElements to find opaque ancestor, falls back to white

Thresholds (tune later — start with these):
  overlap intersection: > 4px²
  content overflow: > 2px
  gap stddev: > 4px
  gap-token miss: > 2px
  margin balance delta: > 8px
  section rhythm stddev: > 12px
  font size count: > 6
  line length: > 80 chars
  line height ratio: < 1.3
  contrast normal: < 4.5:1
  contrast large: < 3.0:1 (fontSize ≥ 18 OR fontSize ≥ 14 AND weight ≥ 700)
  touch target: < 44px either dimension
  quadrant ratio: > 3:1

Create tests:
  src/lib/snapshot/__tests__/contrast.test.ts
    - White on white = 1:1
    - Black on white = 21:1
    - WCAG example pairs from w3.org
    - Alpha composite: 50% black on white = gray
    - Parse 'rgb(255, 0, 0)' → [255, 0, 0, 1]
    - Parse 'rgba(0, 0, 0, 0.5)' → [0, 0, 0, 0.5]

  src/lib/snapshot/__tests__/visual-analyzer.test.ts
    - Fixture: overlapping siblings → critical finding
    - Fixture: uniform gaps → no spacing warnings
    - Fixture: varied gaps → gap-variance warning
    - Fixture: 8 font sizes → proliferation warning
    - Fixture: inverted heading sizes → critical
    - Fixture: small button → touch target critical
    - Fixture: all clean → only pass findings

All pure functions, no DOM, no browser APIs.
```

### Phase 3 CC Prompt: Orchestrator

```
Read: src/lib/snapshot/snapshot.ts, visual-types.ts, visual-probe.ts, visual-analyzer.ts

Create src/lib/snapshot/visual-review.ts:
- runVisualReview(probeResult: VisualProbeResult, fs: JSRuntimeFS, cwd: string): Promise<void>
- Calls analyzeVisuals(probeResult) to get findings
- Formats findings as markdown (critical/warning/pass sections with counts and score)
- Writes to {cwd}/.ralph/visual-review.md
- If file already exists, overwrite (each review is fresh)

Modify src/lib/snapshot/snapshot.ts:
- In generateSnapshot(), after Layer 3 render, call runVisualReview if probeResult is VisualProbeResult
- Add visual review as Layer 3b (does not replace existing Layer 3 render section)
- visual-review.md is a separate file from the snapshot report — Ralph reads both

Keep existing snapshot report format unchanged.
visual-review.md is its own file, not embedded in the snapshot report.
```

### Phase 4 CC Prompt: Vision Provider

```
Read: src/lib/config/types.ts, src/lib/llm/client.ts,
      src/lib/snapshot/visual-review.ts,
      model-registry types (ModelCapability.supportsImages)

Add to AppConfig in src/lib/config/types.ts:
  visionProvider?: { baseUrl: string; apiKey: string; model: string; useProxy?: boolean }

Create src/lib/snapshot/vision-capture.ts:
- capturePreviewScreenshot(iframe: HTMLIFrameElement): Promise<string>
- Lazy-import html2canvas from esm.sh
- Capture iframe.contentDocument.body → canvas
- Resize canvas to max 1280px wide (preserve aspect ratio)
- Return base64 PNG data URL string
- Handle errors gracefully (return empty string on failure)

Create src/lib/snapshot/vision-review.ts:
- runVisionReview(screenshot: string, visionProvider: VisionProviderConfig, useProxy: boolean): Promise<string>
- Check getModelCapability(model).supportsImages — return empty if false
- Build OpenAI-compatible chat/completions request with image_url content block
- Use existing fetch-based LLM client pattern (no SDK)
- Route through Gateway proxy if useProxy is true
- Prompt: "Review this web app screenshot. Describe: layout quality, visual hierarchy,
  color harmony, spacing feel, anything that looks broken or amateur. Be terse — 3-5
  bullet points max. Focus on what a designer would notice."
- 15 second timeout via AbortController
- Return response text, or empty string on failure/timeout

Modify src/lib/snapshot/visual-review.ts:
- After Tier 1 analysis, check if visionProvider is configured
- If yes: call capturePreviewScreenshot, then runVisionReview
- Append "## Aesthetic Review (vision)" section to visual-review.md
- If vision fails/times out, just write Tier 1 findings (no error in output)

Add Vision Provider section to settings UI:
- Same field pattern as coding provider (base URL, API key, model)
- "Use same provider for vision" toggle when coding model supportsImages
- Fields disabled/hidden when toggle is on
```

---

## 10. WHY NOT AXE-CORE

**Size.** 300KB injected into a preview iframe that renders student/prototype apps. The audit tool would be heavier than most apps Ralph builds.

**Scope mismatch.** axe-core runs 90+ rules covering ARIA roles, landmark regions, `lang` attributes, form labels, link text, table headers, `tabindex` ordering. Ralph generates single-page apps with cards and buttons. We'd pay for 90 rules to use 4.

**Output mismatch.** axe-core produces WCAG compliance reports with verbose node/check/violation structures. Ralph needs terse actionable markdown. Translating axe-core output is its own adapter layer.

**The contrast problem is overstated.** axe-core's contrast handling is impressive for real-world CSS hell: `mix-blend-mode`, stacked semi-transparent backgrounds, CSS gradients behind text, `backdrop-filter`. Ralph's generated apps use Wiggum's theme system with OKLCH CSS variables on solid backgrounds. A straightforward `getComputedStyle → parse rgb → relative luminance → ratio` covers 95%+ of what Ralph produces. The 5% gets caught by Tier 2 vision.

**Dependency philosophy.** Wiggum's entire ethos: explicit over magic, browser-native, minimal dependencies. Injecting a 300KB third-party audit engine into the carefully controlled iframe sandbox contradicts that. We control the probe, the bridge, the measurements, the thresholds, the output format. No adapter layer, no version bumps, no "axe-core 5.0 changed the API."

**What we get for 80 extra LOC:** Full control over every threshold. Ability to add checks axe-core doesn't have (spacing variance, visual balance, typography proliferation, alignment — these are novel). Output format exactly matched to Ralph's consumption pattern. Zero additional bundle size for Tier 1.

---

## 11. RELATIONSHIP TO OTHER PLANS

| Plan | Relationship |
|------|-------------|
| **Snapshot System** (existing) | Structure Plus extends Layer 3's probe. Same postMessage bridge, same iframe. visual-review.md is a sibling of the snapshot report, not a replacement. |
| **LLM API 3.2** | Vision provider uses same fetch-based client pattern. Model registry's `supportsImages` flag gates vision calls. Cost tracking applies to vision calls. |
| **Gateway CORS Proxy** | Vision provider calls route through Gateway if `useProxy` is true. Same pass-through proxy, same origin allowlisting. |
| **Chief Implementation** | Chief could surface visual review findings conversationally: "Your app has 3 contrast issues — want me to have Ralph fix them?" Chief reads .ralph/visual-review.md same as Ralph does. |
| **Quality Gates** | Visual review score can feed into gate pass/fail. 0 critical = gate passes. Configurable threshold. |
| **Anti-Slop** | Visual review IS anti-slop. Catching generic layouts, poor spacing, amateur typography is exactly what "distinctive, not cookie-cutter" means. The heuristics enforce design quality deterministically. |
| **Gumdrops Ecosystem** | Gumdrops provide the recipe for good layout. Visual review verifies the result matches the recipe. Complementary: gumdrops = input guidance, visual review = output validation. |
| **Power-Up Plan** | Independent. No dependency in either direction. Can be implemented before or after PWA/Tailwind/package registry work. |
| **ZenFS Migration** | Independent. Visual review writes to `.ralph/visual-review.md` via `JSRuntimeFS` interface. Works with LightningFS today, ZenFS tomorrow. |

---

## LOC SUMMARY

| Component | LOC | Dependencies |
|-----------|-----|-------------|
| Tier 1: Types | 60 | — |
| Tier 1: Probe (iframe) | 180 | — |
| Tier 1: Analyzer (17 checks) | 300 | — |
| Tier 1: Contrast utility | 80 | — |
| Tier 1: Orchestrator | 60 | — |
| **Tier 1 subtotal** | **680** | **Zero** |
| Tier 2: Screenshot capture | 50 | html2canvas (~40KB, lazy) |
| Tier 2: Vision LLM call | 70 | — |
| **Tier 2 subtotal** | **120** | **One (lazy)** |
| Tests | 210 | — |
| **Grand total** | **~1,010** | **One optional lazy dep** |
