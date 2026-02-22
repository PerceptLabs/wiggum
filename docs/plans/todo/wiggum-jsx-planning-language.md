# Wiggum Planning Language: JSX as Architectural Contract

> **Goal:** Replace markdown planning artifacts (`.ralph/plan.md`, `.ralph/design-brief.md`, `.ralph/intent.md`) with a single typed `.plan.tsx` file that serves as both design brief and structural blueprint. Uses JSX syntax with planning-domain components to give Ralph a schema-validated, autocomplete-powered, structurally-enforceable plan — without stifling creative freedom.

---

## TABLE OF CONTENTS

1. [Why This Exists](#1-why-this-exists)
2. [Design Philosophy: Constraints vs. Creativity](#2-design-philosophy-constraints-vs-creativity)
3. [The Planning Component Library](#3-the-planning-component-library)
4. [Type System Design](#4-type-system-design)
5. [How It Replaces Current Artifacts](#5-how-it-replaces-current-artifacts)
6. [The Ralph Workflow](#6-the-ralph-workflow)
7. [Plan Validation (Quality Gate)](#7-plan-validation-quality-gate)
8. [Plan-to-Implementation Diffing](#8-plan-to-implementation-diffing)
9. [Chief Integration](#9-chief-integration)
10. [Creativity Escape Hatches](#10-creativity-escape-hatches)
11. [Architecture & File Structure](#11-architecture--file-structure)
12. [Implementation Phases](#12-implementation-phases)
13. [File Change Index](#13-file-change-index)
14. [CC Prompt Strategy](#14-cc-prompt-strategy)
15. [Risk Assessment](#15-risk-assessment)
16. [Examples](#16-examples)

---

## 1. WHY THIS EXISTS

### The Problem with Markdown Plans

Ralph currently writes `.ralph/plan.md` as free-form prose. This has three failure modes:

1. **No validation.** Ralph can reference gumdrops that don't exist, moods that aren't defined, or components that aren't in @wiggum/stack. Nobody catches this until build time — 5+ iterations later.

2. **No accountability.** The plan says "four stat cards in a dashboard grid" but Ralph builds three cards in a flex column. There's no way to programmatically compare plan-vs-output because the plan has no structure.

3. **Duplication.** `.ralph/plan.md`, `.ralph/intent.md`, and `.ralph/design-brief.md` all contain overlapping information in different prose formats. Ralph reads all three (or forgets one). Context waste.

### What JSX Solves

JSX is a **typed declarative tree**. TypeScript validates it. The tree structure enforces valid nesting. Props are typed — Ralph can't put a string where a number belongs. Union types constrain vocabulary — `mood` can only be one of the 12 registered moods. Autocomplete guides Ralph toward valid choices rather than away from invalid ones.

The key insight: **this is not a new syntax for Ralph to learn.** Ralph writes TSX all day. The planning components look like the output components. The cognitive gap between "plan this" and "build this" shrinks from a prose-to-code translation to a high-level-JSX-to-detailed-JSX expansion.

### What JSX Does NOT Do

JSX is not a template engine. The `.plan.tsx` file never executes, never renders to DOM, never becomes a running React app. It's a **structured data format** that happens to use JSX syntax for the ergonomic benefits: typing, nesting, autocomplete, and Ralph's existing familiarity.

---

## 2. DESIGN PHILOSOPHY: CONSTRAINTS vs. CREATIVITY

The single biggest risk of a typed planning format is killing creative expression. If every prop is a rigid enum, Ralph becomes a form-filler — picking from dropdowns instead of designing. This section defines the line.

### What Gets Constrained (Hard Types)

These are domains where freestyle has proven to produce bad results:

| Domain | Why Constrain | Type Strategy |
|--------|--------------|---------------|
| **Mood** | Ralph invents color schemes with bad contrast | Union of 12 registered moods |
| **Gumdrop references** | Ralph forgets which recipes exist | Union of ~50 gumdrop names |
| **Stack components** | Ralph writes raw `<button>` instead of `<Button>` | Union of 53 component names |
| **Font families** | Ralph invents fonts that don't exist | Union of 32 registry fonts |
| **Shadow profiles** | Ralph guesses shadow values | Union of 5 named profiles |
| **Radius stops** | Ralph mixes arbitrary radius values | Union of 5 named stops |
| **Sacred geometry patterns** | Ralph can't invent math | Union of known patterns |
| **Animation easings** | Ralph writes `ease-in-out` everywhere | Union of approved easings |

### What Stays Free (Open Types)

These are domains where constraint kills creativity:

| Domain | Why Keep Free | Type Strategy |
|--------|--------------|---------------|
| **App name / descriptions** | Creative expression | `string` |
| **Section titles / labels** | Content is user's voice | `string` |
| **Color seed (hue)** | Infinite creative range from 0-360° | `number` (0-360) |
| **Layout intent** | "split", "bento", "stacked" are suggestions | `string` with common literal suggestions via union-with-string |
| **Custom CSS** | Escape hatch for one-off effects | `string` in dedicated prop |
| **Data bindings** | App-specific, can't be enumerated | `string` |
| **Composition order** | Which sections come first/last | JSX child ordering (natural) |
| **Number of sections** | Some apps need 3, some need 12 | No min/max on children |
| **Variant selection within gumdrops** | Which variant of a gumdrop | `string` (variants are gumdrop-specific) |
| **Philosophy statement** | The soul of the design brief | `string` |

### The "String-Escape" Pattern

For props that should guide but not restrict, use TypeScript's union-with-string pattern:

```typescript
type Layout = 'sidebar-detail' | 'split' | 'stacked' | 'bento' | 'full-bleed' | (string & {})
```

This gives autocomplete for common values while allowing `layout="asymmetric-three-panel"` if Ralph has a creative reason. The `(string & {})` trick preserves literal autocomplete without rejecting freeform strings. This is the primary mechanism for keeping creativity alive.

### Philosophy: Guardrails, Not Rails

Think of it as bowling with bumpers. The bumpers prevent gutter balls (bad contrast, invented fonts, missing accessibility, component poverty). But between the bumpers, Ralph can throw the ball however it wants — straight, curved, fast, slow. The typed plan prevents the known failure modes without dictating the creative outcome.

---

## 3. THE PLANNING COMPONENT LIBRARY

### Component Hierarchy

```
<App>                           — Root. One per plan. Carries name + description.
  <Theme>                       — Design brief: mood, seed, pattern, fonts, shadows.
    <Typography />              — Type scale per element role.
    <Animation />               — Timing per interaction class.
    <Rule />                    — Mood-specific constraints (allowed/forbidden).
  </Theme>

  <Screen>                      — A distinct page or view. Apps have 1+.
    <Nav>                       — Navigation structure.
      <Nav.Item />              — Individual nav entry.
    </Nav>

    <Content>                   — Main content area.
      <Section>                 — A compositional region using a gumdrop.
        <Gumdrop />             — An instance of a recipe within a section.
        <Column />              — Table column definition.
        <Field />               — Form field definition.
        <Action />              — User interaction trigger.
        <Slot />                — Named placeholder for custom content.
      </Section>
    </Content>

    <Aside>                     — Secondary content (sidebar detail, drawer).
      <Section />               — Same as Content sections.
    </Aside>
  </Screen>

  <Data>                        — Data model declarations (optional, full-stack).
    <Schema />                  — Zod schema reference for a resource.
    <Endpoint />                — API route declaration.
  </Data>
</App>
```

### Component Responsibilities

**`<App>`** — The root container. Declares the project's identity.
- `name: string` — Project name (creative, free)
- `description?: string` — What this app does (free)
- Children: exactly one `<Theme>`, one or more `<Screen>`, optionally one `<Data>`

**`<Theme>`** — Replaces `.ralph/design-brief.md` entirely. This is the design contract.
- `mood: Mood` — One of 12 registered moods (constrained)
- `seed: number` — Base hue 0-360 (free within range)
- `pattern: GeometryPattern` — Sacred geometry pattern (constrained)
- `font?: FontName` — Primary font from registry (constrained)
- `monoFont?: FontName` — Mono font from registry (constrained)
- `shadowProfile?: ShadowProfile` — Named shadow personality (constrained)
- `radius?: RadiusStop` — Named radius stop (constrained)
- `philosophy?: string` — One sentence design soul (free)
- Children: `<Typography>`, `<Animation>`, `<Rule>` elements

**`<Typography>`** — Type hierarchy per element role.
- Props map element roles to shorthand strings: `hero`, `titles`, `labels`, `body`, `code`
- Values are freeform strings like `"3xl light white tight"` — this lets Ralph express size/weight/color/tracking in natural language without over-structuring
- Why string and not an object: because Ralph reads these as gestalt descriptions, not individual properties. "3xl light white tight" is how a designer thinks. `{ size: '3xl', weight: 'light', color: 'white', tracking: 'tight' }` is how a serializer thinks.

**`<Animation>`** — Timing contracts per interaction class.
- `hover?: string` — e.g., "200ms spring"
- `cards?: string` — e.g., "300ms easeOutCubic"
- `pages?: string` — e.g., "400ms easeInOutQuart"
- `micro?: string` — e.g., "100ms ease"
- `reveals?: string` — e.g., "500ms easeOutQuart"
- String format because animation is multi-dimensional (duration + easing + optional delay). Over-typing this kills readability.

**`<Rule>`** — Mood-specific constraints. The "Allowed vs Not Allowed" list.
- `no?: string` — Something forbidden: "rounded corners over 4px"
- `always?: string` — Something required: "use uppercase tracking-widest on all labels"
- `prefer?: string` — Soft guidance: "cool shadows over warm"

**`<Screen>`** — A distinct page/view in the app.
- `name: string` — Route-like identifier: "dashboard", "settings", "detail"
- `layout?: Layout` — Layout strategy (union-with-string for creativity)
- `gumdrop?: GumDropName` — If the whole screen follows one gumdrop pattern
- Children: `<Nav>`, `<Content>`, `<Aside>`

**`<Section>`** — A compositional region within a screen.
- `gumdrop: GumDropName` — Which recipe to use (constrained to valid gumdrops)
- `variant?: string` — Which variant of the gumdrop (free — gumdrop-specific)
- `cols?: number` — Grid columns (free)
- `span?: number | 'full'` — How much space this section occupies
- `source?: string` — Data binding (free)
- `className?: string` — CSS escape hatch (free)
- Children: `<Gumdrop>`, `<Column>`, `<Field>`, `<Action>`, `<Slot>`

**`<Gumdrop>`** — A specific instance of a recipe within a section.
- `use: GumDropName` — Which recipe (constrained)
- `variant?: string` — Variant name (free)
- `source?: string` — Data binding key (free)
- `label?: string` — Display label (free)
- `span?: number` — Grid span (free)
- Recursive: can contain child `<Gumdrop>` elements for nested composition

**`<Field>`** — Form field declaration.
- `name: string` — Field identifier (free)
- `type: FieldType` — Input type (constrained: text, email, password, select, textarea, slider, date, checkbox, radio, repeater, file)
- `required?: boolean`
- `options?: string` — Reference to options source (free)
- `range?: [number, number]` — For sliders
- `placeholder?: string` (free)
- Children: nested `<Field>` for repeater groups

**`<Column>`** — Data table column.
- `field: string` — Data property name (free)
- `sortable?: boolean`
- `filterable?: boolean`
- `format?: string` — Display format hint (free): "relative", "currency", "percent"
- `width?: string` — Column width hint (free)

**`<Action>`** — Interaction trigger declaration.
- `trigger: string` — What initiates it (free): "row", "toolbar", "fab", "hotkey"
- `gumdrop?: GumDropName` — What opens (constrained)
- `intent?: string` — What it does (free): "create", "edit", "delete", "export"
- `hotkey?: string` — Keyboard shortcut (free): "cmd+n", "delete"

**`<Nav.Item>`** — Navigation entry.
- `icon?: string` — Lucide icon name (free — too many to enumerate)
- `label: string` — Display text (free)
- `to?: string` — Route/screen reference (free)

**`<Data>`** — Full-stack data declarations. Only present when the project needs a backend.
- Children: `<Schema>`, `<Endpoint>`

**`<Schema>`** — Declares a Zod schema that will live in `src/shared/schemas/`.
- `name: string` — Resource name: "recipe", "user", "comment"
- `fields: Record<string, string>` — Field name → type shorthand: `{ title: 'string', rating: 'number', tags: 'string[]' }`
- This is intentionally loose — the exact Zod types get generated during implementation

**`<Endpoint>`** — Declares an API route.
- `resource: string` — Resource name matching a `<Schema>`
- `pattern: 'crud' | 'readonly' | 'custom'` — Route pattern
- `auth?: boolean` — Whether it requires authentication

---

## 4. TYPE SYSTEM DESIGN

### Core Types

```typescript
// packages/planning/src/types.ts

// === CONSTRAINED UNIONS (validated, autocomplete-powered) ===

/** The 12 registered mood presets */
type Mood =
  | 'bubblegum' | 'caffeine' | 'catppuccin' | 'cyberpunk'
  | 'doom-64' | 'elegant-luxury' | 'mocha-mousse' | 'mono'
  | 'northern-lights' | 'retro-arcade' | 'soft-pop' | 'tangerine'

/** Sacred geometry color patterns */
type GeometryPattern =
  | 'golden-ratio' | 'fibonacci' | 'vesica-piscis'
  | 'flower-of-life' | 'metatron' | 'sri-yantra'
  | 'complementary' | 'triadic' | 'split-complementary'
  | 'analogous' | 'tetradic'

/** Curated font registry (32 fonts) */
type FontName =
  | 'Inter' | 'Plus Jakarta Sans' | 'Outfit' | 'Poppins'
  | 'Manrope' | 'Sora' | 'Space Grotesk' | 'DM Sans'
  | 'Nunito' | 'Rubik' | 'Lexend' | 'Geist'
  | 'Oxanium' | 'Orbitron' | 'JetBrains Mono'
  | 'IBM Plex Mono' | 'Fira Code' | 'Source Serif 4'
  | 'Playfair Display' | 'Fraunces' | 'Lora'
  // ... remaining from the 32-font curated registry

/** Named shadow profiles */
type ShadowProfile = 'none' | 'subtle' | 'medium' | 'harsh' | 'layered'

/** Named radius stops */
type RadiusStop = 'none' | 'sm' | 'md' | 'lg' | 'pill'

/** All ~50 registered gumdrop names */
type GumDropName =
  // Marketing (14)
  | 'hero' | 'features' | 'pricing' | 'testimonials' | 'faq'
  | 'cta' | 'team' | 'social-proof' | 'contact' | 'newsletter'
  | 'blog-grid' | 'gallery' | 'portfolio' | 'footer'
  // App (21)
  | 'ai-prompt' | 'file-upload' | 'command-palette' | 'dialog-modal'
  | 'stats-dashboard' | 'data-table' | 'grid-list' | 'form-layout'
  | 'auth-login' | 'sidebar-nav' | 'onboarding' | 'settings-panel'
  | 'chat-messaging' | 'notification-feed' | 'kanban-board'
  | 'calendar-view' | 'search-results' | 'empty-state'
  | 'profile-page' | 'activity-feed' | 'file-browser'
  // Content (4)
  | 'article-layout' | 'documentation' | 'changelog' | 'timeline'
  // Interactive (5)
  | 'drag-drop' | 'multi-step-wizard' | 'rich-text-editor'
  | 'color-picker' | 'keyboard-shortcuts'
  // API (6)
  | 'crud-resource' | 'auth-session' | 'file-upload-api'
  | 'realtime-messaging' | 'search-query' | 'pagination-api'

/** Form field types */
type FieldType =
  | 'text' | 'email' | 'password' | 'number' | 'url' | 'tel'
  | 'select' | 'multi-select' | 'textarea' | 'slider' | 'toggle'
  | 'date' | 'datetime' | 'checkbox' | 'radio'
  | 'repeater' | 'file' | 'color' | 'rating'

// === OPEN UNIONS (autocomplete suggestions + freeform) ===

/** Layout strategies — common patterns + freeform */
type Layout =
  | 'sidebar-detail' | 'split' | 'stacked' | 'bento'
  | 'full-bleed' | 'centered' | 'dashboard' | 'holy-grail'
  | (string & {})

/** 53 @wiggum/stack component names for explicit component referencing */
type StackComponent =
  | 'Accordion' | 'AlertDialog' | 'Alert' | 'AspectRatio' | 'Avatar'
  | 'Badge' | 'Breadcrumb' | 'ButtonGroup' | 'Button' | 'Calendar'
  | 'Card' | 'Carousel' | 'Chart' | 'Checkbox' | 'Collapsible'
  | 'Command' | 'ContextMenu' | 'Dialog' | 'Drawer' | 'DropdownMenu'
  | 'Empty' | 'Field' | 'Form' | 'HoverCard' | 'InputGroup'
  | 'InputOTP' | 'Input' | 'Item' | 'Kbd' | 'Label'
  | 'Menubar' | 'NavigationMenu' | 'Pagination' | 'Popover' | 'Progress'
  | 'RadioGroup' | 'Resizable' | 'ScrollArea' | 'Select' | 'Separator'
  | 'Sheet' | 'Sidebar' | 'Skeleton' | 'Slider' | 'Sonner'
  | 'Spinner' | 'Switch' | 'Table' | 'Tabs' | 'Textarea'
  | 'ToggleGroup' | 'Toggle' | 'Tooltip'
```

### The Auto-Generation Strategy

These types are NOT hand-maintained. They're **generated from source-of-truth registries**:

| Type | Generated From |
|------|---------------|
| `Mood` | Theme preset JSON files in `apps/ide/src/lib/theme-generator/themes/` |
| `GeometryPattern` | Pattern implementations in `apps/ide/src/lib/theme-generator/` |
| `FontName` | `FONT_REGISTRY` in `apps/ide/src/lib/theme-generator/personality.ts` |
| `ShadowProfile` | Shadow profile registry in theme generator |
| `RadiusStop` | Radius stop registry in theme generator |
| `GumDropName` | Frontmatter `name` fields from `skills/gumdrops/**/*.md` |
| `StackComponent` | Export names from `packages/stack/src/index.ts` |

A build-time script reads these sources and generates `packages/planning/src/generated-types.ts`. When you add a gumdrop, the type union updates. When you add a font to the registry, it becomes available in plans. No manual sync.

---

## 5. HOW IT REPLACES CURRENT ARTIFACTS

### Before (Current State)

```
.ralph/
├── origin.md         # Immutable project concept
├── task.md           # Current task
├── intent.md         # Ralph writes: what it's building          ← REPLACED
├── plan.md           # Ralph writes: design direction + steps    ← REPLACED
├── design-brief.md   # Theme generator writes: mood + rules     ← REPLACED
├── summary.md        # Ralph writes: what was built
├── feedback.md       # Harness writes: gate failures
├── status.txt        # running | complete | waiting
├── iteration.txt     # Current iteration number
└── ...
```

### After (With Planning Language)

```
.ralph/
├── origin.md         # Immutable project concept (unchanged)
├── task.md           # Current task (unchanged)
├── plan.tsx          # THE PLAN — typed, validated, complete     ← NEW (replaces 3 files)
├── summary.md        # Ralph writes: what was built (unchanged)
├── feedback.md       # Harness writes: gate failures (unchanged)
├── status.txt        # running | complete | waiting (unchanged)
├── iteration.txt     # Current iteration number (unchanged)
└── ...
```

### What Each Replaced File Maps To

| Old File | New Location in plan.tsx | Notes |
|----------|------------------------|-------|
| `intent.md` | `<App name="..." description="...">` | The app's identity and purpose |
| `plan.md` (structural) | `<Screen>` tree with `<Section>` children | Which gumdrops, where, in what order |
| `plan.md` (steps) | Implicit in section ordering + `<Data>` block | Implementation order follows plan tree traversal |
| `design-brief.md` (mood) | `<Theme mood="..." seed={...} pattern="...">` | Mood, colors, font, shadow, radius |
| `design-brief.md` (typography) | `<Typography hero="..." labels="..." />` | Type hierarchy per role |
| `design-brief.md` (animation) | `<Animation hover="..." cards="..." />` | Timing per interaction class |
| `design-brief.md` (rules) | `<Rule no="..." />` elements | Strict constraints |
| `design-brief.md` (checklist) | Plan validation gate (automated) | Machine-checked, not human-checked |

### The `theme` Command Integration

Currently `theme generate` outputs to `.ralph/design-brief.md`. After this change:

1. `theme generate --seed 152 --pattern golden-ratio --mood premium` still works
2. But instead of writing markdown, it writes the `<Theme>` block of `.ralph/plan.tsx`
3. If `plan.tsx` already exists, it updates only the `<Theme>` section
4. If `plan.tsx` doesn't exist, it creates a skeleton with just the `<Theme>` block — Ralph fills in the `<Screen>` sections later

This means the theme command becomes a **plan enricher** rather than a standalone output.

---

## 6. THE RALPH WORKFLOW

### New Loop with Planning Phase

```
ITERATION 0 (Planning):
  1. Ralph reads .ralph/task.md + .ralph/origin.md
  2. Ralph searches gumdrops: grep skill "<intent>" for relevant recipes
  3. Ralph writes .ralph/plan.tsx using planning components
  4. Harness validates plan.tsx (see §7)
  5. If valid → proceed to iteration 1
  6. If invalid → feedback in .ralph/feedback.md, Ralph revises plan

ITERATION 1-N (Implementation):
  1. Ralph reads .ralph/plan.tsx (fresh context, as always)
  2. Ralph picks next unimplemented <Screen> or <Section>
  3. Ralph expands that section into real TSX using gumdrop recipes
  4. Quality gates check build + runtime
  5. Repeat until all sections implemented
  6. Post-build: plan-vs-implementation diff gate (see §8)

COMPLETION:
  1. All sections in plan.tsx have corresponding src/ files
  2. Build passes, runtime errors clear
  3. Plan diff gate shows no missing sections
  4. Ralph writes summary.md and completes
```

### How Ralph Reads the Plan

Ralph doesn't need to "parse" the JSX — it reads it as a structured document. The system prompt tells Ralph:

```
Your plan is in .ralph/plan.tsx. It's a typed JSX tree.
Each <Screen> is a page. Each <Section> uses a gumdrop recipe.
Build screens top-to-bottom, sections in order.
The <Theme> block is your design contract — follow it for all CSS variables.
<Rule no="..."> means NEVER do that thing.
<Rule always="..."> means ALWAYS do that thing.
```

This is simpler than the current multi-file reading ("check plan.md for structure, design-brief.md for theme, intent.md for context...").

### When Ralph Writes a Plan vs. Receives One

**Ralph writes the plan** when:
- User gives a prompt directly to Ralph ("build me a recipe tracker")
- Iteration 0 is the planning iteration — Ralph creates plan.tsx before writing any src/ files

**Chief writes the plan** when:
- User chats with Chief to refine the idea
- Chief's `write_plan` tool creates/updates plan.tsx
- When user says "go" / "build it", Chief sends plan to Ralph via coordinator
- Ralph skips iteration 0 (plan already exists) and goes straight to implementation

**Theme command enriches the plan** when:
- User or Ralph runs `theme generate` / `theme preset`
- Theme command fills/updates the `<Theme>` block in plan.tsx

---

## 7. PLAN VALIDATION (QUALITY GATE)

### The `plan-valid` Gate

A new quality gate that runs after Ralph writes `.ralph/plan.tsx` (or when Chief writes it). This gate checks structural correctness without judging creative choices.

**Checks (all must pass):**

| Check | What It Validates | Failure Message |
|-------|------------------|-----------------|
| **parseable** | File is valid TSX (no syntax errors) | "plan.tsx has syntax errors on line X" |
| **has-app-root** | Exactly one `<App>` element at root | "plan.tsx must have a single <App> root" |
| **has-theme** | `<App>` contains a `<Theme>` block | "Missing <Theme> — run `theme generate` or add one" |
| **has-screens** | At least one `<Screen>` exists | "No <Screen> elements — plan needs at least one page" |
| **valid-mood** | `mood` prop is a registered mood | "Unknown mood 'X' — valid: bubblegum, caffeine, ..." |
| **valid-gumdrops** | All `gumdrop` and `use` props reference real gumdrops | "Unknown gumdrop 'X' in Screen 'Y'" |
| **valid-font** | Font props reference registry fonts | "Unknown font 'X' — not in curated registry" |
| **sections-have-gumdrops** | Every `<Section>` has a `gumdrop` prop | "Section in Screen 'X' has no gumdrop — what recipe should Ralph follow?" |
| **no-empty-screens** | Every `<Screen>` has at least one `<Section>` | "Screen 'X' is empty — add sections" |
| **schema-endpoint-match** | Every `<Endpoint>` references a declared `<Schema>` | "Endpoint 'X' references schema 'Y' which isn't declared" |

**Checks that WARN but don't fail:**

| Check | What It Warns | Warning Message |
|-------|--------------|-----------------|
| **anti-slop: adjacent-grids** | Two consecutive sections both using grid-heavy gumdrops | "Sections A and B are both grid-based — consider varying layout" |
| **anti-slop: low-diversity** | Fewer than 3 distinct gumdrop types used | "Only N gumdrop types — consider more variety" |
| **missing-nav** | App screens but no `<Nav>` anywhere | "No navigation declared — most multi-screen apps need nav" |
| **no-data-for-stateful** | Stateful gumdrop used but no `<Data>` block | "Using 'data-table' but no data model declared" |

### Implementation Approach

Plan validation does NOT require compiling the TSX. It uses a lightweight AST parse:

1. Parse plan.tsx with a TSX parser (the esbuild-wasm instance you already have, or a lighter parser like `@babel/parser` with jsx plugin)
2. Walk the AST looking for JSXElement nodes
3. Extract component names and prop values
4. Validate against registries (mood list, gumdrop list, font list)
5. Check structural rules (nesting, required children)

This is ~200-300 lines of validation logic, not a full compiler. It runs in the same thread as other quality gates.

---

## 8. PLAN-TO-IMPLEMENTATION DIFFING

### The Contract Enforcement Loop

After Ralph completes implementation, a new gate compares the plan against what was built:

```
.ralph/plan.tsx (contract)    ←→    src/ files (implementation)
```

**What it checks:**

| Plan Declaration | Implementation Check | How |
|-----------------|---------------------|-----|
| `<Screen name="dashboard">` | `src/pages/Dashboard.tsx` or route exists | File existence check |
| `<Section gumdrop="stats-dashboard">` | Component imports from recipe | AST scan for gumdrop-associated components |
| `<Column field="name" sortable />` | Table has a "name" column | String search in rendered output |
| `<Field name="title" type="text" required />` | Form has a title input | Component presence check |
| `<Theme mood="midnight">` | CSS variables in index.css match mood | Variable existence check |
| `<Data><Schema name="recipe" />` | `src/shared/schemas/recipe.ts` exists | File existence |
| `<Data><Endpoint resource="recipe" pattern="crud" />` | `src/api/routes/recipe.ts` exists | File existence |

**Importantly, this is a SOFT gate** — it warns, it doesn't fail. The plan is a contract of intent, not a specification. Ralph might have good reason to deviate: maybe a section got merged with another, maybe a gumdrop variant worked better than planned. The diff report tells the user "here's what was planned vs. built" and lets them decide if the deviation is acceptable.

### Diff Output Format

Written to `.ralph/plan-diff.md`:

```markdown
## Plan vs Implementation

### ✅ Implemented as planned
- Screen: dashboard (4 sections)
- Screen: settings (2 sections)
- Theme: midnight mood applied
- Data: recipe schema + CRUD endpoints

### ⚠️ Deviations
- Section: planned `stats-dashboard` with 4 cards, built 3 (missing avgRating)
- Section: planned `data-table` with delete action, not implemented

### ❌ Missing
- Screen: detail (not built)
```

---

## 9. CHIEF INTEGRATION

### Chief as Plan Author

Chief's primary output becomes a `.plan.tsx` file instead of `.chief/plan.md`. This is a natural fit because Chief already:
- Asks clarifying questions to understand what to build
- Searches skills for design guidance
- Writes plans for Ralph to execute

The difference: instead of writing prose, Chief writes typed JSX. Chief's conversation with the user refines the plan iteratively:

```
User: "Build me a recipe tracker"
Chief: "I'll set up a plan. A few questions..."
Chief: [asks about features, mood, complexity]
Chief: [writes .ralph/plan.tsx with write_plan tool]
Chief: "Here's your plan. I've set up a midnight mood with..."
User: "Add a favorites section"
Chief: [updates plan.tsx to add a new <Section>]
User: "Go"
Chief: [sends to Ralph via coordinator]
```

### Chief's Updated `write_plan` Tool

```typescript
{
  name: 'write_plan',
  description: 'Write or update .ralph/plan.tsx. Creates a typed JSX plan file.',
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'Complete plan.tsx content' }
    },
    required: ['content']
  }
}
```

The tool writes the content and runs plan validation immediately, returning any errors to Chief so it can fix them before the user sees issues.

---

## 10. CREATIVITY ESCAPE HATCHES

### The `<Slot>` Component

For truly custom sections that don't map to any gumdrop:

```tsx
<Section gumdrop="hero" variant="split-layout">
  <Slot name="illustration">
    {/* Ralph decides what goes here — no gumdrop constraint */}
    A custom SVG animation of recipe ingredients floating
  </Slot>
</Section>
```

`<Slot>` is a named placeholder where the content is described in prose (as JSX children text). Ralph interprets the description creatively. The gumdrop provides structure; the slot provides creative freedom within that structure.

### The `<Custom>` Component

For entire sections that are pure creative expression:

```tsx
<Screen name="landing">
  <Content>
    <Section gumdrop="hero" variant="centered" />
    <Custom intent="interactive ingredient wheel">
      A circular, draggable ingredient selector that lets users
      spin through categories. Think roulette wheel meets food picker.
      Use canvas or SVG. Make it playful and tactile.
    </Custom>
    <Section gumdrop="features" variant="bento" />
  </Content>
</Screen>
```

`<Custom>` has:
- `intent: string` — Brief label for what this section does
- Children: freeform prose description of what Ralph should build

This is the "break glass" escape. No gumdrop constraint, no structural validation beyond "it exists." The plan diff will mark it as "custom section — verify manually."

### The `className` Prop

Available on `<Section>`, `<Screen>`, and `<Content>` for one-off CSS:

```tsx
<Section gumdrop="stats-dashboard" className="bg-gradient-to-br from-card to-background">
```

This lets Ralph add visual flourishes without the plan fighting back.

### The Philosophy: Maximum Structure, Maximum Escape

Every constrained prop has an escape route:
- `mood` is constrained → but `seed` (hue) is free within 0-360
- `gumdrop` is constrained → but `<Custom>` is freeform
- `font` is constrained → but the registry has 32 choices
- `layout` is open union → any string works, common ones autocomplete
- `variant` is fully free → gumdrop variants are described, not enforced

The type system says "here are the good paths" via autocomplete. It doesn't say "these are the only paths."

---

## 11. ARCHITECTURE & FILE STRUCTURE

### Package Location

```
packages/
├── planning/                        # NEW PACKAGE
│   ├── src/
│   │   ├── index.ts                 # Barrel exports
│   │   ├── components.ts            # Planning component type definitions
│   │   ├── types.ts                 # Core types (Mood, GumDropName, etc.)
│   │   ├── generated-types.ts       # Auto-generated from registries
│   │   ├── validate.ts              # Plan validation logic
│   │   └── diff.ts                  # Plan-vs-implementation diffing
│   ├── package.json
│   └── tsconfig.json
├── stack/                           # Existing — unchanged
└── api/                             # Existing — unchanged
```

### Why a Separate Package

1. **Clean dependency graph.** `packages/planning` depends on nothing from `apps/ide`. It's pure types + validation.
2. **Ralph and Chief both import from it.** The planning types are shared between plan authors (Chief, theme command, Ralph) and plan consumers (Ralph loop, quality gates).
3. **Type generation script lives here.** `packages/planning/scripts/generate-types.ts` reads from sibling packages and the IDE app.
4. **Future: external plan editing.** If you ever want users to edit plans in their own editor, they `npm install @wiggum/planning` for types.

### Integration Points with apps/ide

```
apps/ide/src/
├── lib/
│   ├── ralph/
│   │   ├── loop.ts              # EDIT: iteration 0 = planning phase
│   │   ├── gates.ts             # EDIT: add plan-valid + plan-diff gates
│   │   └── system-prompt.ts     # EDIT: add plan reading instructions
│   ├── chief/
│   │   └── tools.ts             # EDIT: write_plan outputs .plan.tsx
│   ├── shell/
│   │   └── commands/
│   │       └── theme.ts         # EDIT: theme output → plan.tsx <Theme> block
│   └── build/
│       └── plan-parser.ts       # NEW: lightweight TSX→AST for validation
└── skills/
    └── ralph/
        └── planning/
            └── SKILL.md         # NEW: teaches Ralph how to write plan.tsx
```

---

## 12. IMPLEMENTATION PHASES

### Phase 0: Type Foundation (~2-3 hours)

Create `packages/planning/` with core types and component definitions. No validation yet, no integration. Just the type system.

**Deliverables:**
- `packages/planning/package.json` + `tsconfig.json`
- `src/types.ts` — all constrained unions (Mood, GumDropName, FontName, etc.)
- `src/components.ts` — JSX component type definitions (App, Theme, Screen, Section, etc.)
- `src/index.ts` — barrel exports
- One example `.plan.tsx` file that type-checks

**Verification:** Write a sample plan file. TypeScript catches invalid mood names, unknown gumdrops, malformed props. Autocomplete works for all constrained unions.

### Phase 1: Type Auto-Generation (~2-3 hours)

Build the script that generates type unions from source-of-truth registries.

**Deliverables:**
- `packages/planning/scripts/generate-types.ts`
- Reads: theme presets, font registry, gumdrop .md frontmatter, stack exports
- Writes: `src/generated-types.ts`
- npm script: `pnpm --filter planning generate-types`
- CI/pre-commit hook ensures types stay in sync

**Verification:** Add a new gumdrop `.md` file → run generate → new gumdrop appears in `GumDropName` union. TypeScript catches if someone references the old non-existent name.

### Phase 2: Plan Validation Gate (~3-4 hours)

Build the lightweight plan parser and validation logic. Integrate as a quality gate.

**Deliverables:**
- `src/validate.ts` — plan validation function
- `apps/ide/src/lib/build/plan-parser.ts` — TSX AST extraction (reuse esbuild or use @babel/parser)
- New quality gate in `apps/ide/src/lib/ralph/gates.ts`: `plan-valid`
- Gate runs after iteration 0, before implementation begins

**Verification:**
- Valid plan → gate passes silently
- Plan with typo'd mood → gate fails with "Unknown mood 'midnite'"
- Plan with missing `<Theme>` → gate fails with "Missing <Theme>"
- Plan with unknown gumdrop → gate fails with specific error

### Phase 3: Ralph Integration (~3-4 hours)

Update Ralph's loop to use the planning phase and read plan.tsx.

**Deliverables:**
- Update `loop.ts`: iteration 0 is planning (write plan.tsx)
- Update system prompt: instructions for reading plan.tsx
- New skill: `skills/ralph/planning/SKILL.md` — teaches Ralph the planning component API
- Update: Ralph reads plan.tsx on every iteration for context (replaces reading plan.md + design-brief.md + intent.md)

**Verification:**
- Give Ralph a task → iteration 0 produces valid plan.tsx
- Iteration 1+ reads plan.tsx and implements sections in order
- Ralph's output matches the plan structure

### Phase 4: Theme Command Integration (~2 hours)

Update the `theme` command to write `<Theme>` blocks to plan.tsx.

**Deliverables:**
- Update `theme.ts` shell command: output writes to plan.tsx `<Theme>` block
- If plan.tsx doesn't exist, creates a skeleton (just `<App><Theme>...</Theme></App>`)
- If plan.tsx exists, replaces only the `<Theme>` section
- Backward compat: `--output brief` flag still writes design-brief.md for migration period

**Verification:**
- `theme preset cyberpunk` → plan.tsx has `<Theme mood="cyberpunk" ...>`
- `theme generate --seed 200 --pattern golden-ratio` → plan.tsx has correct props
- Existing plan.tsx with screens → theme command updates only `<Theme>`, leaves screens intact

### Phase 5: Chief Integration (~2 hours)

Update Chief's `write_plan` tool to output plan.tsx.

**Deliverables:**
- Update `tools.ts`: `write_plan` outputs .plan.tsx format
- Chief's system prompt updated with planning component API
- Plan validation runs inline when Chief writes — errors returned to Chief immediately

**Verification:**
- Chat with Chief about a project → Chief produces valid plan.tsx
- Chief iterates on plan → updates are valid after each change
- "Go" sends plan to Ralph → Ralph reads and implements

### Phase 6: Plan Diffing (~3-4 hours)

Build the plan-vs-implementation comparison gate.

**Deliverables:**
- `src/diff.ts` — compares plan.tsx against src/ file tree
- New quality gate in gates.ts: `plan-diff` (soft — warns, doesn't fail)
- Output written to `.ralph/plan-diff.md`
- Gate runs after Ralph marks complete, before final summary

**Verification:**
- Full implementation matching plan → diff shows all green
- Missing a planned section → diff shows it as missing
- Extra unplanned section → diff shows it as addition (not an error)

### Phase 7: Cleanup & Migration (~1-2 hours)

Remove old artifacts and update documentation.

**Deliverables:**
- Remove intent.md, plan.md, design-brief.md from Ralph's file creation logic
- Update all references in system prompts
- Update CLAUDE.md and architecture docs
- Delete `RalphContext.tsx` (already dead code — good time to clean up)

**Total estimate: ~18-22 hours across 8 phases.**

---

## 13. FILE CHANGE INDEX

### New Files

| File | LOC (est.) | Purpose |
|------|-----------|---------|
| `packages/planning/package.json` | ~15 | Package config |
| `packages/planning/tsconfig.json` | ~15 | TypeScript config |
| `packages/planning/src/index.ts` | ~10 | Barrel exports |
| `packages/planning/src/types.ts` | ~120 | Core type definitions |
| `packages/planning/src/components.ts` | ~200 | JSX component type definitions |
| `packages/planning/src/generated-types.ts` | ~80 | Auto-generated unions |
| `packages/planning/src/validate.ts` | ~250 | Plan validation logic |
| `packages/planning/src/diff.ts` | ~200 | Plan-vs-implementation diffing |
| `packages/planning/scripts/generate-types.ts` | ~150 | Type generation from registries |
| `apps/ide/src/lib/build/plan-parser.ts` | ~100 | TSX AST extraction |
| `apps/ide/src/skills/ralph/planning/SKILL.md` | ~150 | Planning skill for Ralph |

**New file total: ~1,290 LOC**

### Modified Files

| File | Changes | LOC Changed (est.) |
|------|---------|-------------------|
| `apps/ide/src/lib/ralph/loop.ts` | Add planning phase (iteration 0) | ~40 |
| `apps/ide/src/lib/ralph/gates.ts` | Add plan-valid + plan-diff gates | ~60 |
| `apps/ide/src/lib/ralph/system-prompt.ts` | Plan reading instructions | ~30 |
| `apps/ide/src/lib/shell/commands/theme.ts` | Output to plan.tsx | ~50 |
| `apps/ide/src/lib/chief/tools.ts` | write_plan → plan.tsx | ~30 |
| `pnpm-workspace.yaml` | Add packages/planning | ~1 |

**Modified file total: ~211 LOC changed**

### Deleted Files (Phase 7)

| File | Why |
|------|-----|
| `apps/ide/src/lib/ralph/RalphContext.tsx` | Dead code (already noted in memory) |
| References to intent.md, plan.md, design-brief.md in system prompts | Replaced by plan.tsx |

---

## 14. CC PROMPT STRATEGY

### Prompt Principles

Following Wiggum's clean room implementation approach: describe patterns, concepts, and files to edit. Never provide literal code to copy.

### Prompt 1: Type Foundation (Phase 0)

```
Create the @wiggum/planning package — a pure TypeScript types package
that defines planning components for Wiggum's JSX-based planning language.

Location: packages/planning/

This package contains ONLY type definitions — no runtime code, no React
dependency. The "components" are TypeScript interfaces that describe JSX
elements for plan files. They never render to DOM.

Read the following files to understand the vocabularies that the types
must reference:
- apps/ide/src/lib/theme-generator/themes/ (mood names from JSON filenames)
- apps/ide/src/lib/theme-generator/personality.ts (FONT_REGISTRY entries)
- skills/gumdrops/*/*.md (gumdrop names from frontmatter)
- packages/stack/src/index.ts (component export names)

The type system has two categories:
1. CONSTRAINED unions — autocomplete-only values (moods, gumdrops, fonts,
   shadow profiles, radius stops). Invalid values = TypeScript error.
2. OPEN unions — common values with autocomplete PLUS freeform strings.
   Use the (string & {}) pattern to preserve literal autocomplete while
   allowing custom values. Layout is the primary example.

Component hierarchy: App > Theme (with Typography, Animation, Rule children)
> Screen (with Nav, Content, Aside children) > Section (with Gumdrop,
Column, Field, Action, Slot children). Plus Data > Schema, Endpoint.

See packages/stack/package.json for package.json structure conventions.
Use the same TypeScript config patterns as packages/stack.

DO NOT copy code from any existing file. Implement fresh from the
type descriptions above.
```

### Prompt 2: Type Auto-Generation (Phase 1)

```
Create a type generation script for @wiggum/planning that reads
source-of-truth registries and generates TypeScript union types.

Location: packages/planning/scripts/generate-types.ts

The script reads from:
1. Theme preset JSON files (apps/ide/src/lib/theme-generator/themes/*.json)
   → extracts mood names for the Mood union
2. Font registry (apps/ide/src/lib/theme-generator/personality.ts)
   → extracts font names for the FontName union
3. Gumdrop markdown files (apps/ide/src/skills/gumdrops/**/*.md)
   → extracts name from YAML frontmatter for the GumDropName union
4. Stack component exports (packages/stack/src/index.ts)
   → extracts component names for the StackComponent union

Output: packages/planning/src/generated-types.ts

The script should be runnable via pnpm: add a "generate-types" script
to packages/planning/package.json. Use Node.js fs APIs and simple
string parsing (no heavy YAML parser needed — frontmatter is simple
key: value).

Check how scripts/bundle-stack.ts works for the script pattern used
in this monorepo.
```

### Prompt 3: Plan Validation (Phase 2)

```
Create plan validation for Wiggum's JSX planning language.

Two parts:

1. A lightweight TSX-to-AST parser at apps/ide/src/lib/build/plan-parser.ts
   that extracts component names and props from a .plan.tsx file.
   This does NOT need to be a full TypeScript compiler — it just needs
   to identify JSXElement nodes, their names, and their prop values.
   Check what's already available: esbuild-wasm is in the project and
   can parse TSX. If esbuild's AST isn't accessible, consider
   @babel/parser with the jsx + typescript plugins (check if it's
   already a dependency or easily addable via esm.sh).

2. A validation function at packages/planning/src/validate.ts that
   takes the extracted AST and checks it against registries.

   Checks that FAIL: parseable, has-app-root, has-theme, has-screens,
   valid-mood, valid-gumdrops, valid-font, sections-have-gumdrops,
   no-empty-screens, schema-endpoint-match.

   Checks that WARN: adjacent-grids, low-diversity, missing-nav,
   no-data-for-stateful.

Integrate as a quality gate in apps/ide/src/lib/ralph/gates.ts.
Look at existing gates for the pattern — each gate returns
{ passed: boolean, message?: string }. The plan-valid gate should
run after iteration 0 (when plan.tsx is written), before iteration 1.

Check gates.ts for the current gate interface and registration pattern.
```

### Prompt 4: Ralph Integration (Phase 3)

```
Update Ralph's loop to use the planning phase.

Files to modify:
- apps/ide/src/lib/ralph/loop.ts — Add iteration 0 as "planning" phase
- apps/ide/src/lib/ralph/system-prompt.ts (or wherever the prompt lives)
  — Add instructions for reading and writing plan.tsx

Create:
- apps/ide/src/skills/ralph/planning/SKILL.md — Teaches Ralph the
  planning component API. Format matches existing skills (check
  skills/ralph/frontend-design/SKILL.md for structure).

The planning skill should include:
- The component hierarchy (App > Theme > Screen > Section)
- Which props are constrained vs free
- How to use <Custom> and <Slot> for creative freedom
- Example plan.tsx snippets for common app types
- Anti-patterns (plans that are too vague, too rigid, etc.)

In loop.ts: iteration 0 is special. Instead of the normal shell-execute
pattern, Ralph's first iteration should:
1. Read task.md and origin.md
2. Search gumdrops for relevant recipes
3. Write .ralph/plan.tsx
4. Plan validation gate runs
5. If valid, proceed to iteration 1
6. If invalid, feedback written, Ralph revises

After iteration 0, subsequent iterations read plan.tsx instead of
plan.md + design-brief.md + intent.md. Ralph no longer writes those
three files.

Look at how iteration counting and the feedback loop work in loop.ts
before making changes.
```

### Prompts 5-7: Theme, Chief, Diffing (Phases 4-6)

Similar pattern — describe the changes needed, reference files to read for patterns, describe verification criteria. Each prompt is self-contained.

---

## 15. RISK ASSESSMENT

### Risk: Ralph writes bad plan.tsx syntax

**Likelihood:** Medium — Ralph writes TSX all day, but planning components are new.
**Mitigation:** The planning skill (SKILL.md) includes examples. Validation catches syntax errors immediately. Fresh context means Ralph gets the skill instructions every iteration.

### Risk: Plan validation is too slow

**Likelihood:** Low — it's AST parsing of one file, not compilation.
**Mitigation:** The parser only needs to identify JSX elements and props, not type-check. This should be <50ms.

### Risk: Over-constraining creativity

**Likelihood:** Medium — the biggest philosophical risk.
**Mitigation:** The entire §10 (Creativity Escape Hatches) exists for this. `<Custom>`, `<Slot>`, `className`, open unions with `(string & {})`. The type system suggests, it doesn't dictate. Monitor Ralph's output variety after launch — if things feel samey, loosen types.

### Risk: Plan.tsx adds overhead to every task

**Likelihood:** Low-Medium — for simple "make a button bigger" tasks, a full plan is overkill.
**Mitigation:** Planning phase only triggers for new projects or major features. Quick edits skip iteration 0 entirely. Detection: if task.md is an edit to existing code (not a new build), skip planning.

### Risk: Type generation script falls out of sync

**Likelihood:** Medium — someone adds a gumdrop but forgets to run generate.
**Mitigation:** Pre-commit hook or CI check that runs `generate-types` and fails if output differs. Add to the existing CI pipeline.

### Risk: esbuild-wasm can't extract JSX AST cleanly

**Likelihood:** Medium — esbuild's API is focused on bundling, not AST access.
**Mitigation:** Fall back to `@babel/parser` which has excellent JSX+TypeScript support and a well-documented AST format. It can run in-browser. Alternatively, since plan.tsx has a very predictable structure, a regex-based parser could work for v1.

### Risk: Context cost of plan.tsx in system prompt

**Likelihood:** Low — a typical plan.tsx is 30-80 lines. This is less than the combined plan.md + design-brief.md + intent.md it replaces.
**Mitigation:** Plan.tsx is naturally more compact than prose because structure is syntax, not words. Measured: a 5-screen app plan in JSX is ~60 lines. The equivalent prose plan + brief + intent is ~150+ lines.

---

## 16. EXAMPLES

### Example 1: Recipe Tracker (Full-Stack)

```tsx
import type { FC } from 'react'
import {
  App, Theme, Typography, Animation, Rule,
  Screen, Nav, Content, Section, Gumdrop,
  Field, Column, Action, Data, Schema, Endpoint
} from '@wiggum/planning'

const plan: FC = () => (
  <App name="RecipeBox" description="A personal recipe tracker with favorites and sharing">
    <Theme
      mood="mocha-mousse"
      seed={28}
      pattern="golden-ratio"
      font="DM Sans"
      monoFont="JetBrains Mono"
      shadowProfile="subtle"
      radius="md"
      philosophy="Warm, nourishing, like a kitchen that's been loved for years"
    >
      <Typography
        hero="4xl light foreground tight"
        titles="xl medium foreground normal"
        labels="xs medium muted-foreground widest uppercase"
        body="sm normal foreground normal"
      />
      <Animation
        hover="200ms ease"
        cards="300ms easeOutCubic"
        pages="400ms easeInOutQuart"
        reveals="600ms easeOutQuart"
      />
      <Rule always="use warm, rounded corners on interactive elements" />
      <Rule always="show loading skeletons for all async data" />
      <Rule no="harsh shadows — keep everything soft and inviting" />
      <Rule no="cold blues or grays in primary palette" />
      <Rule prefer="cards with subtle hover lift over flat lists" />
    </Theme>

    <Screen name="dashboard" layout="sidebar-detail">
      <Nav gumdrop="sidebar-nav">
        <Nav.Item icon="book-open" label="All Recipes" to="/" />
        <Nav.Item icon="heart" label="Favorites" to="/favorites" />
        <Nav.Item icon="tag" label="Collections" to="/collections" />
        <Nav.Item icon="settings" label="Settings" to="/settings" />
      </Nav>

      <Content>
        <Section gumdrop="stats-dashboard" variant="kpi-row" cols={4}>
          <Gumdrop use="stats-dashboard" source="recipes.count" label="Total Recipes" />
          <Gumdrop use="stats-dashboard" source="favorites.count" label="Favorites" />
          <Gumdrop use="stats-dashboard" source="recipes.thisWeek" label="Added This Week" />
          <Gumdrop use="stats-dashboard" source="recipes.avgRating" label="Avg Rating" />
        </Section>

        <Section gumdrop="data-table" source="recipes.all">
          <Column field="title" sortable />
          <Column field="cuisine" filterable />
          <Column field="rating" sortable format="rating" />
          <Column field="prepTime" sortable format="duration" />
          <Column field="created" sortable format="relative" />
          <Action trigger="row-click" intent="view-detail" />
          <Action trigger="toolbar" gumdrop="dialog-modal" intent="create" />
          <Action trigger="row-menu" intent="edit" />
          <Action trigger="row-menu" intent="delete" />
        </Section>
      </Content>
    </Screen>

    <Screen name="create" layout="centered">
      <Content>
        <Section gumdrop="form-layout" variant="sectioned">
          <Field name="title" type="text" required placeholder="Grandma's Apple Pie" />
          <Field name="description" type="textarea" placeholder="The story behind this recipe..." />
          <Field name="cuisine" type="select" options="cuisines" />
          <Field name="prepTime" type="number" />
          <Field name="cookTime" type="number" />
          <Field name="servings" type="number" />
          <Field name="ingredients" type="repeater">
            <Field name="item" type="text" required />
            <Field name="amount" type="text" />
            <Field name="unit" type="select" options="units" />
          </Field>
          <Field name="steps" type="repeater">
            <Field name="instruction" type="textarea" required />
            <Field name="duration" type="number" />
          </Field>
          <Field name="rating" type="rating" range={[1, 5]} />
          <Field name="tags" type="multi-select" options="tags" />
          <Field name="image" type="file" />
        </Section>
      </Content>
    </Screen>

    <Screen name="settings" layout="centered">
      <Content>
        <Section gumdrop="settings-panel">
          <Field name="displayName" type="text" />
          <Field name="defaultServings" type="number" />
          <Field name="measurementSystem" type="radio" options="metric,imperial" />
          <Field name="theme" type="select" options="moods" />
        </Section>
      </Content>
    </Screen>

    <Data>
      <Schema name="recipe" fields={{
        title: 'string',
        description: 'string?',
        cuisine: 'string',
        prepTime: 'number',
        cookTime: 'number',
        servings: 'number',
        ingredients: '{ item: string, amount: string, unit: string }[]',
        steps: '{ instruction: string, duration?: number }[]',
        rating: 'number',
        tags: 'string[]',
        imageUrl: 'string?',
        favorite: 'boolean',
      }} />
      <Schema name="collection" fields={{
        name: 'string',
        description: 'string?',
        recipeIds: 'string[]',
      }} />
      <Endpoint resource="recipe" pattern="crud" />
      <Endpoint resource="collection" pattern="crud" />
    </Data>
  </App>
)

export default plan
```

### Example 2: Portfolio Site (Frontend-Only, Creative)

```tsx
import type { FC } from 'react'
import {
  App, Theme, Typography, Animation, Rule,
  Screen, Content, Section, Custom, Slot
} from '@wiggum/planning'

const plan: FC = () => (
  <App name="Kenji Tanaka — Portfolio" description="Architectural photographer portfolio">
    <Theme
      mood="mono"
      seed={0}
      pattern="golden-ratio"
      font="Space Grotesk"
      monoFont="IBM Plex Mono"
      shadowProfile="none"
      radius="none"
      philosophy="The work speaks. Everything else whispers."
    >
      <Typography
        hero="6xl light foreground tighter"
        titles="lg light foreground normal"
        labels="xs medium muted-foreground widest uppercase"
        body="sm normal muted-foreground normal"
        code="xs normal muted-foreground tight"
      />
      <Animation
        hover="150ms ease"
        cards="300ms easeOutCubic"
        pages="500ms easeInOutQuart"
        reveals="800ms easeOutQuart"
      />
      <Rule always="let images breathe — generous whitespace around every photo" />
      <Rule always="monochrome UI — only the photos have color" />
      <Rule no="rounded corners anywhere" />
      <Rule no="decorative elements, drop shadows, gradients" />
      <Rule no="animations that compete with the photography" />
      <Rule prefer="asymmetric grid layouts over uniform columns" />
    </Theme>

    <Screen name="home" layout="full-bleed">
      <Content>
        <Section gumdrop="hero" variant="minimal">
          <Slot name="headline">Kenji Tanaka</Slot>
          <Slot name="subtitle">Architectural Photography</Slot>
        </Section>

        <Custom intent="asymmetric photo grid">
          A masonry-like grid of architectural photos with varying
          aspect ratios. No uniform sizing. Let each image claim the
          space it needs. Hover reveals project name in small caps.
          Click opens full-screen lightbox. Use CSS grid with
          grid-auto-flow: dense for natural packing.
        </Custom>

        <Section gumdrop="contact" variant="minimal" />

        <Section gumdrop="footer" variant="minimal" />
      </Content>
    </Screen>

    <Screen name="project" layout="stacked">
      <Content>
        <Section gumdrop="gallery" variant="filmstrip">
          <Slot name="context">
            Project description, location, year. Two short paragraphs max.
            Set in body type, left-aligned, max-w-prose.
          </Slot>
        </Section>
      </Content>
    </Screen>
  </App>
)

export default plan
```

### Example 3: SaaS Dashboard (Complex, Multi-Screen)

```tsx
import type { FC } from 'react'
import {
  App, Theme, Typography, Animation, Rule,
  Screen, Nav, Content, Aside, Section, Gumdrop,
  Column, Field, Action, Data, Schema, Endpoint
} from '@wiggum/planning'

const plan: FC = () => (
  <App name="Beacon Analytics" description="Team performance tracking and sprint metrics">
    <Theme
      mood="caffeine"
      seed={215}
      pattern="fibonacci"
      font="Geist"
      shadowProfile="layered"
      radius="sm"
      philosophy="Data is energy. Every metric should feel alive and actionable."
    >
      <Typography
        hero="5xl semibold foreground tight"
        titles="lg medium foreground normal"
        labels="xs semibold muted-foreground wide uppercase"
        body="sm normal foreground normal"
      />
      <Animation
        hover="150ms ease"
        cards="250ms easeOutCubic"
        pages="350ms easeInOutQuart"
        micro="100ms ease"
      />
      <Rule always="tabular-nums on all metric displays" />
      <Rule always="green for positive trends, red for negative — never reversed" />
      <Rule no="chart junk — no 3D effects, no unnecessary gridlines" />
      <Rule prefer="sparklines over full charts for inline metrics" />
    </Theme>

    <Screen name="dashboard" layout="sidebar-detail">
      <Nav gumdrop="sidebar-nav">
        <Nav.Item icon="layout-dashboard" label="Overview" to="/" />
        <Nav.Item icon="users" label="Team" to="/team" />
        <Nav.Item icon="target" label="Sprints" to="/sprints" />
        <Nav.Item icon="chart-bar" label="Reports" to="/reports" />
        <Nav.Item icon="settings" label="Settings" to="/settings" />
      </Nav>

      <Content>
        <Section gumdrop="stats-dashboard" variant="kpi-row" cols={4}>
          <Gumdrop use="stats-dashboard" source="velocity.current" label="Current Velocity" />
          <Gumdrop use="stats-dashboard" source="sprint.completion" label="Sprint Progress" />
          <Gumdrop use="stats-dashboard" source="bugs.open" label="Open Bugs" />
          <Gumdrop use="stats-dashboard" source="team.utilization" label="Utilization" />
        </Section>

        <Custom intent="velocity trend chart">
          Line chart showing velocity over last 8 sprints. Use recharts.
          Subtle gradient fill under the line. Tooltip on hover with
          sprint details. Small trend arrow + percentage in top-right corner.
        </Custom>

        <Section gumdrop="data-table" source="tasks.current" variant="compact">
          <Column field="title" sortable />
          <Column field="assignee" filterable />
          <Column field="priority" sortable filterable />
          <Column field="status" filterable />
          <Column field="storyPoints" sortable />
          <Action trigger="toolbar" gumdrop="dialog-modal" intent="create-task" />
          <Action trigger="row-click" intent="open-detail" />
        </Section>
      </Content>
    </Screen>

    <Screen name="team" layout="sidebar-detail">
      <Content>
        <Section gumdrop="grid-list" source="team.members" variant="card-grid" cols={3}>
          <Gumdrop use="profile-page" variant="card-preview" />
        </Section>
      </Content>

      <Aside>
        <Section gumdrop="activity-feed" source="team.activity" />
      </Aside>
    </Screen>

    <Screen name="auth" layout="centered">
      <Content>
        <Section gumdrop="auth-login" variant="with-social" />
      </Content>
    </Screen>

    <Data>
      <Schema name="task" fields={{
        title: 'string',
        description: 'string?',
        assigneeId: 'string',
        priority: "'critical' | 'high' | 'medium' | 'low'",
        status: "'todo' | 'in-progress' | 'review' | 'done'",
        storyPoints: 'number',
        sprintId: 'string',
        tags: 'string[]',
      }} />
      <Schema name="sprint" fields={{
        name: 'string',
        startDate: 'string',
        endDate: 'string',
        goals: 'string[]',
        velocity: 'number?',
      }} />
      <Schema name="member" fields={{
        name: 'string',
        email: 'string',
        role: "'engineer' | 'designer' | 'pm'",
        avatar: 'string?',
      }} />
      <Endpoint resource="task" pattern="crud" auth />
      <Endpoint resource="sprint" pattern="crud" auth />
      <Endpoint resource="member" pattern="readonly" auth />
    </Data>
  </App>
)

export default plan
```

---

## 17. THE HOLISTIC VIEW: PLAN AS CENTRAL CONTRACT

The planning language was designed in isolation to solve a specific problem — Ralph's unstructured markdown plans. But four companion systems (ESLint Integration, Visual Review, Toolkit 2.0, LLM API 3.2) transform plan.tsx from a planning artifact into something larger: **the single source of truth that configures every quality layer in Wiggum.**

This section traces how the five systems combine into a closed-loop, contract-driven quality pipeline that none of them could achieve alone.

### 17.1 The Pipeline Before vs. After

**Before (independent quality checks):**

```
User prompt → Ralph freestyle → build gate → runtime gate → done
                                     ↑              ↑
                               (compilation)   (JS errors)
                               
Each gate checks its own concern independently.
No shared definition of "what should this app be."
Guidelines are prompt text Ralph can ignore.
```

**After (contract-driven pipeline):**

```
User prompt → plan.tsx (contract) → implementation → multi-layer validation → done
                  ↓                       ↓                    ↓
            plan-valid gate         ESLint (source)     visual-review (rendered)
            (structure ok?)         (code follows        (output matches
                                    plan's rules?)       plan's aesthetic?)
                                         ↓                    ↓
                                    plan-diff gate      plan-aware thresholds
                                    (built what was     (Rule elements set
                                     planned?)           visual targets)
                                         ↓
                                    feedback → Ralph reads → adjusts
```

Every quality layer references the **same contract**. The plan doesn't just describe intent — it configures enforcement. This is the architectural shift.

### 17.2 How Each System Supercharges the Plan (and Vice Versa)

#### Plan.tsx × ESLint Integration = Plan-Configured Lint Rules

**What ESLint gets from the plan:**

The ESLint doc describes `.ralph/lint-config.json` for per-project rule overrides. Currently, this would be manually authored or task-specific. With plan.tsx, `<Rule>` elements become the **source** for lint configuration:

```tsx
<Rule no="hardcoded colors" />           → wiggum/no-hardcoded-colors: "error"
<Rule no="raw HTML elements" />          → wiggum/no-raw-html-elements: "error"  
<Rule prefer="css variables for all styling" /> → wiggum/require-css-variables: "warn"
```

A plan compilation step reads `<Rule>` elements and generates `.ralph/lint-config.json` automatically. Ralph doesn't choose which rules to follow — the plan decides, and ESLint enforces deterministically.

But this goes further. Some `<Rule>` elements are aesthetic constraints that ESLint can partially enforce:

```tsx
<Rule no="rounded corners over 4px" />
```

ESLint can't check rendered border-radius. But it CAN check source code for `rounded-lg`, `rounded-xl`, `rounded-full` Tailwind classes and flag them. The plan turns an aesthetic preference into a detectable source-level pattern. This means the `@wiggum/eslint-rules` package could gain a `plan-aware` mode where rule thresholds are derived from the plan file rather than hardcoded.

**What the plan gets from ESLint:**

ESLint's three-layer model (write-guard → ESLint → gates) now has a natural fourth layer at the front:

```
Layer 0 — BLUEPRINT (plan.tsx)
  What should exist? What constraints apply? What aesthetic rules?
  Validated at iteration 0. Configures downstream layers.

Layer 1 — ACCESS CONTROL (write-guard.ts)
  Where can Ralph write? What extensions? — UNCHANGED

Layer 2 — SOURCE QUALITY (ESLint, plan-configured)
  Does source follow the plan's design contract?
  AST-aware. Runs on write AND at completion.
  Rules and severity configured by plan's <Rule> elements.

Layer 3 — OUTPUT VALIDATION (gates + visual review, plan-aware)
  Does the built artifact match the plan's structure and aesthetic?
  Plan diff + visual review + runtime checks.
```

The plan is the **floor's floor** — it defines what the floor (ESLint) should enforce.

#### Plan.tsx × Visual Review = Plan-Aware Aesthetic Validation

**What visual review gets from the plan:**

Currently, visual review's 17 heuristic checks use hardcoded thresholds: gap standard deviation > 4px, font count > 6, touch target < 44px. These are universal defaults. With plan.tsx, the thresholds become **plan-specific**:

```tsx
<Rule no="rounded corners over 4px" />
→ Visual review checks: any element with border-radius > 4px = critical finding

<Rule always="tabular-nums on all metric displays" />  
→ Visual review checks: elements with numeric content use font-variant-numeric

<Rule no="harsh shadows" />
→ Visual review checks: computed box-shadow opacity above threshold = warning

<Rule prefer="asymmetric grid layouts over uniform columns" />
→ Visual review adjusts: uniform grid detection becomes a warning, not a pass
```

The plan transforms visual review from "is this generally well-designed?" to "does this match the specific aesthetic contract?" This is the difference between a generic code review and a code review against a spec.

**What the plan gets from visual review:**

Visual review's Tier 2 (vision LLM) could review plan fidelity directly. After implementation, capture a screenshot and ask: "Given this plan [plan.tsx summary], does the rendered result match the declared structure and mood?" The vision model becomes a **plan auditor** — not just checking generic quality, but checking contract compliance.

The plan-diff gate (§8) checks structural fidelity: "did Ralph build the sections in the right order with the right gumdrops?" Visual review checks aesthetic fidelity: "does it look like the mood and rules intended?" Together, they close **both** loops — structural and aesthetic — against the same contract.

#### Plan.tsx × Toolkit 2.0 = Plan Commands as Typed Tools

**What Toolkit 2.0 gives the plan:**

The plan becomes a first-class shell command following the exact dual-mode pattern from Toolkit 2.0:

```typescript
interface PlanArgs {
  action: 'validate' | 'diff' | 'show' | 'lint-config';
  screen?: string;
}

class PlanCommand implements ShellCommand<PlanArgs> {
  name = 'plan';
  description = 'Validate, diff, or inspect the project plan';
  usage = 'plan validate | plan diff | plan show [screen] | plan lint-config';

  argsSchema = z.object({
    action: z.enum(['validate', 'diff', 'show', 'lint-config']),
    screen: z.string().optional(),
  });

  examples = [
    'plan validate',          // check plan.tsx is well-formed
    'plan diff',              // compare plan vs implementation
    'plan show dashboard',    // display one screen's plan
    'plan lint-config',       // generate .ralph/lint-config.json from <Rule> elements
  ];
}
```

As a discrete tool, the LLM sees:

```json
{ "name": "plan", "params": { "action": "validate" | "diff" | "show" | "lint-config", "screen?": "string" } }
```

This means Ralph can **self-validate** during implementation. Instead of waiting for the plan-valid gate at the end, Ralph calls `plan validate` after writing plan.tsx and gets immediate feedback. Ralph calls `plan diff` mid-build to check progress. Ralph calls `plan show dashboard` to re-read just the relevant screen before implementing it — targeted context, not the whole plan.

The `plan lint-config` subcommand is new: it reads `<Rule>` elements from plan.tsx and generates `.ralph/lint-config.json`. This is the bridge between the plan and ESLint — the plan declares rules, this command compiles them into enforceable lint config.

**What the plan gives Toolkit 2.0:**

The `theme` command already outputs plan.tsx (per §5). With Toolkit 2.0's Zod schemas, the theme command gains plan-aware validation:

```bash
theme generate --seed 152 --pattern golden-ratio --mood premium
```

Toolkit 2.0 validates the args (seed is 0-360, pattern is a valid geometry, mood is registered). Then the command writes to plan.tsx's `<Theme>` block. If plan.tsx already exists with screens, only the theme section updates. The Zod schema for the theme command's args and the planning language's `Theme` component props are the **same types** — imported from `@wiggum/planning`.

#### Plan.tsx × LLM API 3.2 = Context-Intelligent Planning

**What API 3.2 gives the plan:**

*Context preflight:* API 3.2's `preflightCheck()` estimates tokens before every LLM call. Plan.tsx is a mandatory context item — it can't be trimmed like conversation history. The preflight system needs to reserve budget for plan.tsx, system prompt, and `.ralph/` state files before allocating space for tool results. This means:

- If plan.tsx is 80 lines (~320 tokens), preflight accounts for it
- If a model has a 4K context window, a large plan might not fit alongside the system prompt — preflight catches this and warns Ralph to simplify the plan or use a larger model
- The plan parser (§7) could produce a **condensed plan summary** (~20 lines) for context-constrained models: just screen names, gumdrop references, and theme props — no `<Rule>` elements, no `<Field>` details

*Conversation budget for Chief:* Chief builds plans conversationally over multiple turns. API 3.2's `budgetMessages()` trims conversation history when it grows too long. The critical insight: **plan.tsx IS the persistent checkpoint.** Chief's earlier turns — the clarifying questions, the brainstorming — can be aggressively trimmed because the plan file captures everything that matters. Chief doesn't need conversation memory of "we discussed having a favorites section" because `<Section gumdrop="grid-list" source="favorites">` is already in the plan. The plan makes budget management trivial.

*Stall detection:* API 3.2's tool call signature detects when Ralph makes identical tool calls across iterations. Plan-aware stall detection goes further: if Ralph keeps rewriting `<Section gumdrop="data-table">` in the same screen, the system knows **which gumdrop** is causing problems. The stall handler can inject targeted guidance: "You're stuck on data-table in the dashboard screen. Re-read the data-table gumdrop recipe: `grep skill 'data-table'`." This is a qualitative improvement over generic "you seem stuck" feedback.

*Streaming for Chief:* Chief uses `stream()` to build plans interactively with the user. Plan validation runs after streaming completes — you can't validate a partial plan. But the streaming UI could show **incremental plan structure** as Chief writes: new `<Screen>` elements appear in a sidebar as they're streamed, giving the user a real-time structural outline even before the full JSX is complete.

**What the plan gives API 3.2:**

The plan's structure enables smarter context management. Instead of Ralph reading ALL of plan.tsx every iteration, the preflight system can **scope plan context to the current task:**

- Iteration working on Screen "dashboard" → load only that screen's plan section + theme
- Iteration fixing an ESLint violation → load only the relevant `<Rule>` elements + the screen containing the violating file
- Final iteration writing summary → load the full plan for diff comparison

This is plan-aware context budgeting — the plan's tree structure makes it decomposable in a way that prose plan.md never was.

### 17.3 The Emergent Capability: Self-Correcting Contract Loop

None of the five systems alone creates a self-correcting loop. Together they do:

```
                    ┌──────────────────────────────────────┐
                    │           plan.tsx (contract)         │
                    │  Structure + Aesthetic + Data Model   │
                    └──────────┬───────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
     ┌────────────────┐ ┌───────────┐ ┌─────────────────┐
     │ plan validate  │ │ plan      │ │ plan lint-config │
     │ (Toolkit 2.0)  │ │ show      │ │ (Toolkit 2.0)   │
     │ Structure ok?  │ │ (scoped   │ │ <Rule> → ESLint  │
     └───────┬────────┘ │  context) │ └────────┬────────┘
             │          └─────┬─────┘          │
             │                │                ↓
             │                │       ┌────────────────┐
             │                │       │ ESLint         │
             │                │       │ (plan-config'd)│
             │                ↓       │ Source checks  │
             │     ┌──────────────┐   └───────┬────────┘
             │     │ Ralph writes │           │
             │     │ implementation│←──────────┘
             │     │ (with plan   │   lint feedback
             │     │  as context) │   on every write
             │     └──────┬───────┘
             │            │
             │     ┌──────┴───────┐
             │     │ build gate   │
             │     │ runtime gate │
             │     └──────┬───────┘
             │            │
             │     ┌──────┴──────────────────────┐
             │     │                              │
             │     ↓                              ↓
             │  ┌─────────────┐         ┌──────────────────┐
             │  │ plan diff   │         │ visual review    │
             │  │(Toolkit 2.0)│         │(plan-aware       │
             │  │ Structure   │         │ thresholds)      │
             │  │ fidelity    │         │ Aesthetic fidelity│
             │  └──────┬──────┘         └────────┬─────────┘
             │         │                         │
             │         └────────────┬────────────┘
             │                      ↓
             │              .ralph/feedback.md
             │              (plan-referenced,
             │               section-specific)
             │                      │
             └──────────────────────┘
                    Ralph reads feedback,
                    re-reads relevant plan section,
                    fixes specific issue
                    (stall detection via API 3.2
                     if same section keeps failing)
```

**What makes this a closed loop:**

1. The **plan declares** what should be built (structure) and how it should look (aesthetic rules)
2. **Plan validation** catches bad plans before any code is written
3. **ESLint** enforces plan rules at the source level, on every file write
4. **Plan diff** verifies the implementation matches the plan's structure
5. **Visual review** verifies the rendered output matches the plan's aesthetic intent
6. **Feedback** references specific plan sections, not vague guidelines
7. **Stall detection** identifies which plan section is causing problems
8. **Context scoping** loads only the relevant plan section per iteration

Every layer talks in terms of the plan. Feedback isn't "you have hardcoded colors" — it's "Screen 'dashboard', Section 'stats-dashboard' violates plan Rule 'no hardcoded colors' (enforced by ESLint)." Ralph knows exactly where to look and what to fix.

### 17.4 What This Means for Anti-Slop

The planning language was motivated by preventing AI slop. Combined with the four companion systems, the anti-slop story becomes comprehensive:

| Slop Type | What Catches It | When |
|-----------|----------------|------|
| **Wrong gumdrop** (references recipe that doesn't exist) | Plan validation (type union) | Iteration 0 |
| **Missing sections** (plan says 4 screens, only 3 built) | Plan diff gate | Completion |
| **Hardcoded colors** (`bg-blue-500` instead of CSS vars) | ESLint, plan-configured | Every write |
| **Raw HTML** (`<button>` instead of `<Button>`) | ESLint | Every write |
| **Placeholder content** ("Lorem ipsum", "Item 1") | ESLint | Every write |
| **Poor spacing** (inconsistent gaps, cramped layout) | Visual review Tier 1 | Post-build |
| **Typography soup** (8+ font sizes, no hierarchy) | Visual review Tier 1 | Post-build |
| **Broken contrast** (text unreadable on background) | Visual review Tier 1 | Post-build |
| **Violated aesthetic rules** ("no rounded corners" but rounded-lg used) | ESLint (source) + Visual review (rendered) | Write + Post-build |
| **Generic purple gradient** (default AI aesthetic) | Theme typed to mood + visual review | Plan validation + Post-build |
| **Stuck in a loop** (rewriting same section repeatedly) | API 3.2 stall detection, plan-aware | During implementation |
| **Context overflow** (plan too large for model) | API 3.2 preflight + plan condensation | Pre-request |

Every type of slop has a specific, deterministic catch point. No single system covers everything — but together, there's no gap.

### 17.5 Revised Implementation Sequencing

The companion systems affect the planning language's implementation order. Some phases now have dependencies:

```
Phase 0: Type Foundation                           ← no dependencies
Phase 1: Type Auto-Generation                      ← no dependencies
Phase 2: Plan Validation Gate                      ← no dependencies
Phase 3: Ralph Integration                         ← no dependencies
Phase 4: Theme Command Integration                 ← no dependencies
Phase 5: Chief Integration                         ← depends on API 3.2 streaming (for interactive plan building)
Phase 6: Plan Diffing                              ← no dependencies

NEW Phase 7: Plan-Aware ESLint Config              ← depends on ESLint Integration (Phase 1-2 of that plan)
  - `plan lint-config` command (Toolkit 2.0 pattern)
  - <Rule> → .ralph/lint-config.json compilation
  - ESLint loads plan-generated config

NEW Phase 8: Plan-Aware Visual Review Thresholds   ← depends on Visual Review (Phase 2 of that plan)
  - <Rule> → visual-analyzer threshold overrides
  - Plan-referenced findings in visual-review.md

NEW Phase 9: Plan Shell Command (Toolkit 2.0)      ← depends on Toolkit 2.0 (Phase 2 of that plan)
  - plan validate | plan diff | plan show | plan lint-config
  - Zod schema, dual-mode, discrete tool in LLM tool list

NEW Phase 10: Context-Scoped Plan Loading          ← depends on API 3.2 (preflight, §13)
  - Plan parser produces per-screen excerpts
  - Preflight reserves plan budget
  - Iteration-scoped plan loading (only current screen + theme)
```

Phases 0-6 are the core planning language — they can ship independently with no external dependencies. Phases 7-10 are the integration layers that supercharge the plan by connecting it to companion systems. Each integration phase depends on its companion system existing but NOT on other integration phases.

**Recommended build order:**
1. Planning Language Phases 0-6 (core, standalone)
2. Toolkit 2.0 Phase 1-2 (Zod schemas, dual-mode dispatch)
3. ESLint Integration Phase 1-2 (rules package, browser linter)
4. Planning Language Phase 9 (plan as Toolkit 2.0 command)
5. Planning Language Phase 7 (plan-aware ESLint config)
6. Visual Review Phase 1-3 (probe, analyzer, orchestrator)
7. Planning Language Phase 8 (plan-aware visual thresholds)
8. LLM API 3.2 Phase 5 (preflight, budget)
9. Planning Language Phase 10 (context-scoped plan loading)

---

## 18. RELATIONSHIP TO COMPANION PLANS

### ESLint Integration

| Concern | Owner | Interaction |
|---------|-------|-------------|
| Source-level rule enforcement | ESLint | Plan's `<Rule>` elements generate ESLint config |
| Which rules are active per project | Plan.tsx → `plan lint-config` | Plan compiles rules, ESLint enforces |
| Auto-lint on write feedback | ESLint (Toolkit 2.0 hook) | Feedback references plan section where violation occurs |
| Hardcoded color detection | ESLint `no-hardcoded-colors` rule | Plan's mood/theme makes hardcoded colors always wrong |
| Raw HTML element detection | ESLint `no-raw-html-elements` rule | Plan's `<Section gumdrop="...">` implies stack components |
| Per-project severity overrides | `.ralph/lint-config.json` | Generated from plan's `<Rule>` elements |
| Oscillation detection | ESLint + API 3.2 stall signal | Plan section identifies WHERE Ralph is stuck |

**Key change to planning doc:** Plan validation (§7) runs at iteration 0. ESLint runs during iterations 1-N. They are sequential, not competing. The plan is Layer 0 (blueprint), ESLint is Layer 2 (source quality).

**Key change to ESLint doc:** Add `plan lint-config` as the source for `.ralph/lint-config.json` instead of manual authoring. The ESLint doc's Phase 2 (per-project config) becomes plan-driven.

### Visual Review

| Concern | Owner | Interaction |
|---------|-------|-------------|
| Rendered DOM heuristic checks | Visual Review Tier 1 | Plan's `<Rule>` elements set threshold overrides |
| Aesthetic judgment (vision) | Visual Review Tier 2 | Vision prompt includes plan's philosophy + rules |
| Spacing variance detection | Visual Review | Plan's spacing rhythm → expected gap token |
| Typography proliferation | Visual Review | Plan's `<Typography>` → expected font size count |
| Contrast checking | Visual Review | Plan's mood → expected contrast character |
| Border radius checking | Visual Review | Plan's `<Rule no="rounded corners over 4px">` → max-radius threshold |
| Structural fidelity | Plan diff gate | Visual review handles aesthetic, plan diff handles structural |

**Key change to planning doc:** Plan diff (§8) and visual review are complementary halves of contract enforcement. Plan diff = "did you build the right things?" Visual review = "do they look right?" Both reference the plan.

**Key change to visual review doc:** In §3 (analyzer), add plan-aware threshold loading. If `.ralph/plan.tsx` exists, parse `<Rule>` elements and use them to override default thresholds. If no plan exists, fall back to hardcoded defaults (backward compatible).

### Toolkit 2.0

| Concern | Owner | Interaction |
|---------|-------|-------------|
| Plan as shell command | Toolkit 2.0 pattern | `PlanCommand` with Zod schema, dual-mode |
| Plan as discrete LLM tool | Toolkit 2.0 `toolFromCommand()` | Ralph calls `plan validate` as typed tool |
| Theme command → plan.tsx | Toolkit 2.0 pattern | Theme command gains plan-aware output mode |
| Auto-generated tool description | Toolkit 2.0 `buildShellDescription()` | Plan command appears in LLM tool list |
| Structured error on plan validation failure | Toolkit 2.0 error format | Plan validation errors match `ShellCommandResult` |

**Key change to planning doc:** Add `PlanCommand` to implementation phases. Plan validation moves from a gate-only check to a dual-mode command Ralph can call explicitly.

**Key change to Toolkit 2.0 doc:** Add `plan` to the promoted commands list (§9). It follows the same pattern as `preview` — simple Zod enum for action, optional string for screen name.

### LLM API 3.2

| Concern | Owner | Interaction |
|---------|-------|-------------|
| Context preflight | API 3.2 `preflightCheck()` | Plan.tsx budget reserved as mandatory item |
| Plan condensation for small models | Planning language parser | Produces ~20-line summary when full plan exceeds budget |
| Conversation budget (Chief) | API 3.2 `budgetMessages()` | Plan.tsx IS the checkpoint — history is trimmable |
| Stall detection | API 3.2 tool call signature | Plan structure identifies stuck section |
| Streaming (Chief plan building) | API 3.2 `stream()` | Plan validation runs post-stream, not mid-stream |
| Observability | API 3.2 LogTape integration | Plan-related LLM calls tagged with plan context |

**Key change to planning doc:** Add plan condensation as a feature of the plan parser. When API 3.2 preflight indicates insufficient budget, the parser produces a minimal plan summary (screen names + gumdrop refs + theme mood only, no fields/columns/rules). This ensures plan context is always present, even on 4K-context models.

**Key change to API 3.2 doc:** Add plan.tsx to the list of mandatory context items in §13 (alongside system prompt and `.ralph/status.txt`). Preflight must account for plan size. Add plan-aware stall guidance to §13's stall detection: when stall is detected and plan.tsx exists, the recovery prompt includes "re-read the relevant plan section."

---

## WHAT DOES NOT CHANGE

- **@wiggum/stack** — components unchanged, still theme-agnostic via CSS variables
- **Gumdrops** — recipes unchanged, still searchable via grep skill. Plan references gumdrops by name; gumdrop format doesn't change.
- **Theme generator** — OKLCH math unchanged, output format changes (plan.tsx vs markdown)
- **Ralph loop** — fresh context per iteration, one action per iteration, discriminated unions. Iteration 0 becomes planning phase; subsequent iterations unchanged.
- **Existing quality gates** — app-exists, build-succeeds, runtime-errors, etc. all unchanged. New gates added alongside.
- **Existing shell commands** — all 37+ commands work as before. `plan` is a new addition, not a replacement.
- **Skills system** — grep-searchable, on-demand lookup, same format. Plan references skills by gumdrop name; skills don't change.
- **esbuild-wasm** — still the primary bundler
- **LightningFS / ZenFS** — filesystem layer unchanged
- **Chief architecture** — Coordinator pattern unchanged, Chief's output format changes from plan.md to plan.tsx

---

## SUCCESS METRICS

### Core Planning Language (Phases 0-6)

| Metric | Target |
|--------|--------|
| Plan validation time | <100ms |
| Plan creation (iteration 0) | 1 iteration, no retries |
| Plan-to-implementation fidelity | >80% sections match |
| Context reduction | plan.tsx < combined plan.md + brief + intent |
| Invalid gumdrop references | 0 (caught at plan time) |
| Invalid mood/font references | 0 (caught at plan time) |
| Creative expression (judged qualitatively) | No reduction — `<Custom>` and `<Slot>` provide escape hatches |
| Two-project test | Same requirements → structurally similar plans → visually DIFFERENT output |

### Integration Layers (Phases 7-10)

| Metric | Target |
|--------|--------|
| Plan-configured ESLint catches violations Ralph would otherwise ignore | >50% of current prompt-only rules now enforced |
| Plan-aware visual review findings reference specific `<Rule>` elements | 100% of rule-derived findings cite the plan |
| `plan validate` self-check usage by Ralph | Called at least once per plan before proceeding |
| Context-scoped plan loading reduces per-iteration token cost | >30% reduction vs. loading full plan every iteration |
| Chief plan building survives budget trimming without losing coherence | 100% — plan.tsx is the checkpoint, not conversation history |
| Stall detection identifies stuck plan section | Section-specific guidance when stall counter hits 3 |

### End-to-End Quality Pipeline

| Metric | Target |
|--------|--------|
| Slop types with deterministic catch point | 12/12 (see §17.4 table) |
| Time from plan violation to Ralph feedback | <1 iteration (ESLint catches on write, before completion) |
| False positive rate on plan-aware checks | <5% (tune thresholds per §17.2) |
| Full pipeline latency (plan validation + build + lint + visual review + diff) | <3 seconds total |
