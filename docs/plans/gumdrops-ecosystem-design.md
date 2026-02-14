# Gumdrops — Wiggum's Compositional Recipe System

## What This Is

Gumdrops are **compositional recipes** — not code templates, not copy-paste blocks. They're structured knowledge that teaches Ralph *which components compose into which patterns, with which layouts and interactions*. Think of them as the missing layer between "here are 60 atoms" and "build me a SaaS landing page."

```
@wiggum/stack (60 atoms)         ← dumb, prop-driven, data-agnostic
       ↓
   gumdrops (compositional recipes)  ← THIS DOCUMENT
       ↓
   themed, diverse, unique apps
```

blocks.so proved the model: 70 blocks, all composed from shadcn atoms, zero magic. But blocks.so only covers app-level UI (dashboards, forms, auth). Wiggum needs everything — marketing, app, content, interactive, AND full-stack data patterns. And unlike blocks.so, gumdrops aren't static code. They're AI-native recipes optimized for Ralph to interpret, adapt, and combine.

**Naming:** Wiggum → gum → gumdrops. You "drop" them into a page. Small, colorful, distinct — each one is a self-contained compositional unit with its own flavor. Wiggum (IDE), Ralph (agent), Chief (planner), Gumdrops (recipes).

---

## Architecture

### The Skill Problem (Why Not One Big File)

Current state: 5 skills totaling ~1,200+ lines, all dumped into every prompt. Ralph ignores most of it. The creativity skill is 190 lines of philosophy that says "don't be boring" without saying what TO do.

**Gumdrops solution: searchable recipe database.**

Ralph doesn't load all gumdrops at once. Ralph searches by intent:

```bash
grep skill "pricing section"        → gets the pricing gumdrop recipe
grep skill "file upload dropzone"   → gets the upload gumdrop recipe  
grep skill "stats dashboard"        → gets the stats gumdrop recipe
grep skill "crud resource api"      → gets the CRUD API gumdrop recipe
```

Each gumdrop is a self-contained recipe: ~15-40 lines. Ralph loads only what's relevant to the current task. No more 800-line prompt dumps.

### File Structure

```
skills/
├── gumdrops/
│   ├── SKILL.md                    # Index + composition rules + anti-slop
│   ├── marketing/                  # Marketing section recipes (14)
│   │   ├── hero.md
│   │   ├── features.md
│   │   ├── pricing.md
│   │   ├── testimonials.md
│   │   ├── faq.md
│   │   ├── cta.md
│   │   ├── team.md
│   │   ├── social-proof.md
│   │   ├── contact.md
│   │   ├── newsletter.md
│   │   ├── blog-grid.md
│   │   ├── gallery.md
│   │   ├── portfolio.md
│   │   └── footer.md
│   ├── app/                        # App-level UI recipes (21)
│   │   ├── ai-prompt.md
│   │   ├── file-upload.md
│   │   ├── command-palette.md
│   │   ├── dialog-modal.md
│   │   ├── stats-dashboard.md
│   │   ├── data-table.md
│   │   ├── grid-list.md
│   │   ├── form-layout.md
│   │   ├── auth-login.md
│   │   ├── sidebar-nav.md
│   │   ├── onboarding.md
│   │   ├── settings-panel.md
│   │   ├── chat-messaging.md
│   │   ├── notification-feed.md
│   │   ├── kanban-board.md
│   │   ├── calendar-view.md
│   │   ├── search-results.md
│   │   ├── empty-state.md
│   │   ├── profile-page.md
│   │   ├── activity-feed.md
│   │   └── file-browser.md
│   ├── content/                    # Content display recipes (4)
│   │   ├── article-layout.md
│   │   ├── documentation.md
│   │   ├── changelog.md
│   │   └── timeline.md
│   ├── interactive/                # Rich interaction recipes (5)
│   │   ├── drag-drop.md
│   │   ├── multi-step-wizard.md
│   │   ├── rich-text-editor.md
│   │   ├── color-picker.md
│   │   └── keyboard-shortcuts.md
│   └── api/                        # Full-stack data recipes (6) — NEW
│       ├── crud-resource.md
│       ├── auth-session.md
│       ├── file-upload-api.md
│       ├── realtime-messaging.md
│       ├── search-query.md
│       └── pagination-api.md
├── creativity/SKILL.md             # REPLACED → pointer to gumdrops/
├── frontend-design/SKILL.md        # KEPT → design philosophy (unchanged)
├── theming/SKILL.md                # KEPT → CSS variables (unchanged)
├── stack/SKILL.md                  # KEPT → component reference (unchanged)
└── code-quality/SKILL.md           # KEPT → patterns (unchanged)
```

**Total: ~50 gumdrop recipes across 5 domains.**

### Recipe Format

Every gumdrop follows this exact structure. Compact, grep-friendly, actionable:

```markdown
---
name: [gumdrop-name]
domain: marketing | app | content | interactive | api
intent: [what this section/pattern does — the search key]
complexity: basic | intermediate | advanced
components: [comma-separated @wiggum/stack components used]
---

# [Gumdrop Name]

## Recipe
[Which components, how they connect, what layout]

## Variants
[2-4 named variants with what changes between them]

## Interaction Patterns
[State management, event handlers, keyboard shortcuts]

## Data Patterns (stateful gumdrops only)
### Frontend-only
[Local state / localStorage approach]
### Full-stack (when Hono backend exists)
[API routes, shared schemas, client hooks]

## Anti-Patterns
[What NOT to do — common mistakes Ralph makes]

## Composition Notes
[How this gumdrop connects with other gumdrops on a page]
```

---

## The Full-Stack Data Model

### The Progressive Principle

Gumdrops follow the Hono plan's core philosophy: **frontend-only by default, backend additive.** The 60 @wiggum/stack atoms are completely data-agnostic — a Button doesn't care if its onClick calls setState or fetch(). The data awareness lives entirely in the gumdrop layer.

```
@wiggum/stack atoms     ← DUMB. Props in, UI out. Zero changes for full-stack.
       ↓
gumdrops (UI recipes)   ← SMART. Dual-tier data patterns on stateful gumdrops.
       ↓
gumdrops (API recipes)  ← NEW. Backend conventions that pair with UI gumdrops.
```

### Which Gumdrops Need Data Patterns?

**32 gumdrops are purely static UI** — marketing sections (hero, features, pricing, testimonials, etc.), content display (article, changelog), and pure interaction patterns (drag-drop, keyboard-shortcuts). These compose atoms into layouts. They never fetch data. No data patterns needed.

**13 gumdrops are stateful** — they manage data that could come from local state OR an API. These get dual-tier data patterns:

| Gumdrop | Why It's Stateful |
|---------|------------------|
| **data-table** | Fetches, filters, paginates data |
| **form-layout** | Submits data for persistence |
| **auth-login** | Auth flows need session management |
| **file-upload** | Files go somewhere — local or server |
| **chat-messaging** | Message persistence and history |
| **kanban-board** | Card/column state persisted across sessions |
| **search-results** | Queries against a data source |
| **notification-feed** | Fetches notification stream |
| **activity-feed** | Fetches event history |
| **settings-panel** | Saves user preferences |
| **profile-page** | User data display/edit |
| **ai-prompt** | Sends to LLM API, stores conversation |
| **stats-dashboard** | Metrics from data source |

**6 API gumdrops are backend-only** — they describe Hono route patterns, Zod schemas, and data store conventions. These are the recipes Ralph uses when composing `src/api/` code.

### Dual-Tier Data Pattern Example

Here's how data-table looks with both tiers:

```markdown
## Data Patterns

### Frontend-only (default)
- Data lives in useState or imported from a static array
- Sort/filter/paginate by slicing the local array
- CRUD operations mutate local state via setState
- No loading states needed (data is synchronous)

### Full-stack (when src/api/ exists)
- Zod schema: src/shared/schemas/<resource>.ts
  (defines shape, used by BOTH API validation and form validation)
- API: GET /api/<resource>?page=1&limit=10&sort=name&filter=active
- Response shape: { data: T[], total: number, page: number, limit: number }
- Client hook: use<Resource>(params) → { data, total, isLoading, error, refetch }
- Params sync: sort/filter/page state passed to hook, triggers refetch
- Optimistic UI: mutate local state immediately, revert on API error
- Loading skeleton: show Skeleton components while isLoading
- Error state: show Alert component on error, retry Button
- Empty state: show empty-state gumdrop when data.length === 0
```

Ralph reads the tier that matches the project. No `src/api/` directory? Use frontend-only tier. Has `src/api/`? Use full-stack tier. The UI composition — which components, which layout, which variants — is identical either way.

---

## The Full Registry

### Domain 1: Marketing (14 gumdrops)

These are the sections Ralph needs for landing pages, marketing sites, portfolios. No MIT library covers these well (shadcnblocks bans AI builders, others are AGPL/paid). These are original compositional knowledge.

#### hero.md
```
---
name: hero
domain: marketing
intent: Above-the-fold landing section with primary message and CTA
complexity: intermediate
components: Badge, Button, Input, AspectRatio
---

# Hero

## Recipe
**Core:** Heading (text-4xl→6xl) + subheading (text-lg text-muted-foreground) + 
Button×2 (primary CTA + outline secondary) + visual element (image/mockup/demo)

**Layout options:**
- Split (60/40): text left, visual right. Grid grid-cols-1 lg:grid-cols-2
- Centered: text center, visual below or behind. Max-w-3xl mx-auto text-center
- Offset: text overlapping visual with negative margins

**Enhancements:**
- Badge above heading ("New: Feature X" or "Trusted by 10k+")
- Input + Button inline for email capture
- Social proof strip below CTA (Avatar row + "Join 5,000+ users")
- Background: gradient mesh, grain texture, or full-bleed image with overlay

## Variants
- **split-image**: Text left, product screenshot/mockup right. Most versatile.
- **centered-video**: Centered text, video/animation below. Impact-focused.
- **search-hero**: Centered text + prominent Input + Button. For search/marketplace.
- **social-proof-hero**: Split layout with Avatar stack + metrics integrated.

## Interaction Patterns
- Email capture: Input with type="email" + Button submit, local state for value
- Video: AspectRatio wrapper, play button overlay, Dialog for lightbox
- Scroll indicator: Animated chevron-down at bottom

## Anti-Patterns
- ❌ Purple gradient background (universal AI slop signal)
- ❌ Generic stock photo right side
- ❌ Three identical buttons
- ❌ Wall of text — max 2 sentences in subheading
- ❌ Center-aligning everything on every hero

## Composition Notes
- Hero is ALWAYS first section on a marketing page
- Follow with a section that's visually different — if hero is sparse, next should be dense
- Never follow hero with another full-width centered section
```

#### features.md
```
---
name: features
domain: marketing
intent: Showcase product capabilities, benefits, or feature highlights
complexity: intermediate
components: Tabs, Card, Badge, Accordion, HoverCard, AspectRatio
---

# Features

## Recipe
**Core:** Section heading + feature items (icon + title + description each)

**Layout options:**
- Tabbed detail: Tabs with TabsList + TabsContent panels showing detailed Card per feature
- Bento grid: Asymmetric grid with mixed Card sizes (col-span-2, row-span-2)
- Alternating rows: Feature + visual alternating left/right per row
- Icon grid: 2x3 or 3x3 grid of icon + title + short description

**Enhancements:**
- Badge on featured items ("New", "Popular", "Beta")
- HoverCard for expanded detail on hover
- Accordion for progressive disclosure of feature details
- AspectRatio for consistent screenshot/demo sizing

## Variants
- **tabbed**: Tabs switching between detailed feature panels. Best for 3-6 complex features.
- **bento**: Asymmetric grid with hero feature large, others small. Visual variety.
- **alternating**: Feature text + screenshot alternating sides. Classic, readable.
- **icon-grid**: Minimal grid of icons + titles. Best for many simple features (6-12).

## Anti-Patterns
- ❌ Three identical cards in a row (THE classic AI slop pattern)
- ❌ All features same visual weight — highlight 1-2 as primary
- ❌ Just icons + titles without any detail mechanism
- ❌ Using Card for everything — mix Tabs, Accordion, HoverCard

## Composition Notes
- Never place features directly after another card-grid section
- Tabbed features work great after a sparse hero
- Bento features create density — follow with breathing space (CTA or social proof)
- If features section uses Card, the next section CANNOT use Card as primary element
```

#### pricing.md
```
---
name: pricing
domain: marketing
intent: Display pricing tiers, plans, or subscription options
complexity: intermediate
components: Card, Badge, Button, Switch, Separator, Tabs, Table
---

# Pricing

## Recipe
**Core:** Section heading + 2-4 Card tiers side by side, each with:
name + price + feature list + CTA Button

**Layout:** Grid grid-cols-1 md:grid-cols-3 gap-6, center tier highlighted

**Highlight pattern:**
- Popular tier: ring-2 ring-primary + Badge "Most Popular" + scale-105
- Other tiers: border-border, no ring

**Enhancements:**
- Switch for annual/monthly toggle (annual shows discount Badge)
- Separator between feature list and CTA
- Tabs for individual/team/enterprise groupings
- Table comparison matrix below tier cards

## Variants
- **tier-cards**: 3 Card columns, middle highlighted. Standard.
- **toggle-annual**: Same + Switch toggling annual/monthly with Badge showing savings.
- **comparison-table**: Tier cards above + Table below with Check/X per feature row.
- **single-featured**: One large featured Card with detail, smaller cards flanking.

## Interaction Patterns
- Annual toggle: useState boolean, price display switches, Badge shows "Save 20%"
- Tabs: useState for tier group, conditional card rendering
- Comparison table: Static Table with Check/X icons per cell

## Anti-Patterns
- ❌ All tiers visually identical — MUST have visual hierarchy
- ❌ Feature lists with 15+ items — group or truncate
- ❌ No CTA differentiation — primary tier gets Button default, others get outline
- ❌ Missing the "most popular" signal

## Composition Notes
- Usually placed in lower-half of page, after features establish value
- Works well between features and FAQ (natural flow: what → how much → questions)
- Never adjacent to another Card-heavy section
```

#### Remaining marketing gumdrops (outlined):
- **testimonials.md** — Avatar + Card + Badge + ScrollArea/HoverCard
- **faq.md** — Accordion + Card + Input(search) + Tabs(categories)
- **cta.md** — Card + Button + Input(email) — full-bleed or floating variant
- **team.md** — Avatar + HoverCard + Badge + Card
- **social-proof.md** — Avatar + Badge + ScrollArea — logos, metrics, trust
- **contact.md** — Card + Input + Textarea + Label + Button + Select
- **newsletter.md** — Input + Button — inline, modal, or banner variant
- **blog-grid.md** — Card + Badge + Avatar + AspectRatio + Separator
- **gallery.md** — AspectRatio + Dialog + ScrollArea + Tabs
- **portfolio.md** — Card + Badge + Dialog + Tabs + AspectRatio
- **footer.md** — Separator + navigation links + Input(newsletter) + Button

---

### Domain 2: App (21 gumdrops)

These come directly from the blocks.so analysis. Every recipe is validated against real implementations. Stateful gumdrops include dual-tier data patterns for frontend-only and full-stack modes.

#### ai-prompt.md
```
---
name: ai-prompt
domain: app
intent: AI chat input with attachments, settings, and model selection
complexity: advanced
components: Textarea, Button, DropdownMenu, Badge, Switch, Dialog
---

# AI Prompt Interface

## Recipe
**Core:** Textarea (auto-growing) + Button (send, disabled when empty) + 
DropdownMenu (attachments/settings)

**Auto-grow textarea:**
onInput: textarea.style.height = 'auto'; textarea.style.height = scrollHeight + 'px'

**Submit logic:** Enter to submit, Shift+Enter for newline

**Hidden file input:** input[type=file] with display:none, triggered via ref on 
DropdownMenuItem click

## Variants
- **centered**: Textarea + send Button. Clean, minimal.
- **with-attachments**: + DropdownMenu for file upload, search toggle, agent mode
- **multi-selector**: + row of DropdownMenu pill buttons below for model/agent/performance
- **full-featured**: + Badge file chips (with preview + remove) + drag-drop overlay + 
  DropdownMenu with Switch toggles (autocomplete, streaming, show history)

## Interaction Patterns
- File state: useState<File[]>, display as Badge chips with X remove button
- Drag-drop: onDragOver (prevent default + set isDragOver) / onDrop (extract files) / 
  onDragLeave (clear isDragOver)
- Image preview in chips: URL.createObjectURL(file)
- Settings panel: DropdownMenu with Switch items (no close on toggle)
- Submit: local state for input value, clear on send, disable Button when empty

## Data Patterns

### Frontend-only
- Messages stored in useState<Message[]>
- Send adds to local array, simulated response after delay
- Conversation not persisted across refreshes

### Full-stack (when Hono backend exists)
- Zod schema: MessageSchema in src/shared/schemas/message.ts
  { role: z.enum(['user','assistant']), content: z.string(), createdAt: z.string() }
- API: POST /api/chat → streams response (ReadableStream)
- API: GET /api/conversations → list saved conversations
- API: GET /api/conversations/:id → load conversation history
- Client hook: useChat() with streaming support
  Appends chunks to assistant message as they arrive
- File uploads: POST /api/upload → returns file URL for message attachment

## Anti-Patterns
- ❌ Fixed-height textarea — MUST auto-grow
- ❌ No keyboard submit — Enter must send
- ❌ File upload without preview feedback
- ❌ Settings as a separate page — keep inline via DropdownMenu

## Composition Notes
- Usually the primary interaction point — give it visual prominence
- Pair with a message display area above (scrollable, newest at bottom)
- Works inside Card or standalone
```

#### file-upload.md
```
---
name: file-upload
domain: app
intent: File upload with drag-drop zone, progress tracking, and preview
complexity: intermediate
components: Card, Button, Input, Badge, Tooltip, Dialog, Progress
---

# File Upload / Dropzone

## Recipe
**Core:** Dashed border div (border-2 border-dashed border-border rounded-md) + 
hidden input[type=file] triggered via ref + icon (Upload from lucide-react) + 
label text + "click to browse" link

**Drop zone behavior:**
- onClick → triggers hidden input via ref (fileInputRef.current.click())
- onDragOver → e.preventDefault() + set isDragOver state
- onDrop → e.preventDefault() + extract e.dataTransfer.files + clear isDragOver
- onDragLeave → clear isDragOver
- Visual feedback: isDragOver ? 'border-primary bg-primary/5' : 'border-border'

**File list:** Map of uploaded files showing:
- Thumbnail: img with src=URL.createObjectURL(file) for images
- Name: file.name
- Size: (file.size / 1024).toFixed(1) + ' KB'
- Progress bar: div with h-1 w-full bg-muted + inner div with scaleX(progress/100)
- Remove button: X icon button

## Variants
- **simple**: Drop zone + file list. No frills.
- **with-preview**: + image thumbnails via URL.createObjectURL
- **with-progress**: + progress bars (simulated or real upload tracking)
- **multi-section**: Drop zone inside a larger Card form with other Input fields

## Interaction Patterns
- File state: useState<{file: File, progress: number}[]>
- Progress simulation: setInterval updating progress 0→100 over ~2 seconds
- File validation: check file.type against accept attribute, show error for invalid
- Multiple files: input has `multiple` attribute, spread new files into existing array
- Remove: filter file out of state array, revoke object URL

## Data Patterns

### Frontend-only
- Files tracked in useState, previewed via URL.createObjectURL
- No actual upload — files exist only in browser memory
- Progress bar is visual-only simulation

### Full-stack (when Hono backend exists)
- API: POST /api/upload (multipart/form-data)
  Returns { url: string, filename: string, size: number }
- Real progress: XMLHttpRequest with upload.onprogress for actual upload %
  (fetch doesn't support upload progress — XHR needed here)
- File list: GET /api/files → returns uploaded file metadata
- Delete: DELETE /api/files/:id → removes from store
- Client hook: useFileUpload() returning { upload, progress, files, remove }

## Anti-Patterns
- ❌ No visual feedback on drag — MUST change border/bg color
- ❌ No file type validation — always validate against accept list
- ❌ Progress bar without animation — use transition-transform
- ❌ No way to remove uploaded files

## Composition Notes
- Often embedded inside a Dialog or Card form, not standalone
- Pair with form fields (Input for name, Select for category, etc.)
- Footer pattern: Cancel (Button outline) + Continue/Upload (Button default)
```

#### command-palette.md
```
---
name: command-palette
domain: app
intent: Keyboard-triggered command search and navigation (⌘K)
complexity: intermediate
components: Command, Dialog, Kbd, Badge
---

# Command Palette

## Recipe
**Core:** CommandDialog (Dialog + Command combined) + CommandInput + CommandList 
(max-h-[320px]) + CommandGroups with headings + CommandItems with icons

**Keyboard trigger:**
useEffect: listen for keydown, if (e.metaKey || e.ctrlKey) && e.key === 'k' → 
  e.preventDefault() + setOpen(true)

**Footer:** Close hint with Kbd component showing "Esc"

## Variants
- **simple**: CommandDialog + grouped items. Navigate to pages/sections.
- **with-recent**: + "Recent" CommandGroup showing last-used commands
- **with-actions**: Items have Badge indicators (type: "page", "action", "setting")
- **with-preview**: Split layout — command list left, preview pane right

## Interaction Patterns
- Open/close: useState boolean, ⌘K/Ctrl+K to toggle, Esc to close
- Search: CommandInput filters CommandItems automatically (Command handles this)
- Selection: Enter executes, arrow keys navigate
- Actions: each CommandItem has onSelect callback

## Anti-Patterns
- ❌ No keyboard shortcut — MUST have ⌘K/Ctrl+K
- ❌ No escape to close
- ❌ Too many items without grouping — always use CommandGroup
- ❌ No empty state message

## Composition Notes
- Global to the app — rendered at root level, not inside specific sections
- Usually paired with NavigationMenu for visual nav + Command for keyboard nav
- Trigger Button in the nav bar with Kbd hint: "⌘K"
```

#### dialog-modal.md
```
---
name: dialog-modal
domain: app
intent: Modal overlays for confirmations, forms, multi-step flows, and alerts
complexity: basic→advanced
components: Dialog, AlertDialog, Button, Input, Label, Separator, RadioGroup
---

# Dialog / Modal

## Recipe
**Simple:** Dialog + DialogTrigger (Button) + DialogContent + DialogHeader 
(DialogTitle + DialogDescription) + DialogFooter (Button outline cancel + Button default confirm)

**Destructive:** AlertDialog + Input (password with Eye/EyeOff visibility toggle) + 
Label + Button variant=destructive

**Multi-step:** Dialog with useState for currentStep + conditional content per step + 
Separator between sections + RadioGroup for selections + progress indicator

## Variants
- **simple**: Title + description + Cancel/Confirm footer. 80% of use cases.
- **form**: + Input/Select/Textarea fields inside DialogContent.
- **destructive**: AlertDialog requiring password/text confirmation before delete.
- **multi-step**: useState for step, conditional rendering, back/next/finish buttons.

## Interaction Patterns
- Controlled open: useState boolean, pass to Dialog open prop
- Form submission: local state for fields, validate before closing
- Destructive confirmation: compare input against expected string, disable button until match
- Multi-step: step index state, array of step content, back/next navigation
- Password visibility: useState boolean, toggle Eye/EyeOff, input type switch

## Anti-Patterns
- ❌ Dialog inside Dialog (nesting modals)
- ❌ Destructive action without confirmation
- ❌ Missing DialogDescription (accessibility)
- ❌ No way to cancel/escape
- ❌ Form in dialog with no validation

## Composition Notes
- Triggered from Buttons, DropdownMenu items, or table row actions
- Keep dialogs focused — one purpose per dialog
- Multi-step for complex flows; truly complex wizards use a full page instead
```

#### stats-dashboard.md
```
---
name: stats-dashboard
domain: app
intent: KPI cards, metric displays, progress tracking, and data visualization
complexity: intermediate
components: Card, Badge, Progress, Separator
---

# Stats Dashboard

## Recipe
**KPI row:** Grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4) of Cards.
Each Card: title (text-xs uppercase text-muted-foreground tracking-wide) + 
value (text-3xl font-bold tabular-nums) + change indicator 
(text-xs with text-green-600 or text-red-600 based on positive/negative)

**Progress metric:** Card + value/limit display ("2.3 GB / 5 GB") + 
progress bar (div h-1 w-full bg-muted rounded-full + inner div with 
width based on percentage, bg-primary, transition-all)

**Divider pattern:** Cards in grid with gap-px + parent bg-border creates 
1px dividers between cards (no explicit Separator needed)

## Variants
- **kpi-row**: 4 stat Cards with title + value + change. Clean, executive.
- **with-sparklines**: + tiny inline chart in each Card (recharts AreaChart, ~40px, no axes)
- **progress-cards**: Cards showing resource usage with progress bars + limits
- **comparison**: Two-value cards showing current vs previous period with % change

## Interaction Patterns
- Change indicators: compute sign, apply green/red class conditionally
- Progress bars: width % from data, animate with transition-all duration-500
- Stacked progress: multiple colored segments (flexbox, each segment flex-grow by proportion)
- Dotted leaders: border-b-2 border-dotted between label and value for breakdown rows
- Edit capability: Dialog triggered from Card action for editing budgets/limits

## Data Patterns

### Frontend-only
- Stats defined as a static array or computed from local state
- Hardcoded or derived: { label: 'Revenue', value: '$12.4k', change: +12.5 }
- Change indicators calculated at render time

### Full-stack (when Hono backend exists)
- API: GET /api/stats → returns computed metrics from store
- API: GET /api/stats/:metric → detailed breakdown for one metric
- Client hook: useStats() → { stats, isLoading, error, refetch }
- Polling: optional setInterval refetch for live dashboards (every 30s)
- Loading: Skeleton components matching card layout while fetching

## Anti-Patterns
- ❌ Stats without context (raw numbers — add labels, change indicators)
- ❌ All identical Card layouts — vary what's inside each card
- ❌ Too many stats at once — 4-6 max per row, group related metrics
- ❌ Fake precision — round to meaningful digits

## Composition Notes
- Usually at top of dashboard, below navigation
- Follow with detailed Data Table or Activity Feed for drill-down
- Stats + Data Table is the canonical dashboard pattern
```

#### data-table.md
```
---
name: data-table
domain: app
intent: Sortable, filterable, paginated data display with row actions
complexity: advanced
components: Table, Checkbox, DropdownMenu, Input, Select, Button, Badge
---

# Data Table

## Recipe
**Basic:** Table + TableHeader + TableBody + TableRow + TableCell

**Rich table adds:**
- @tanstack/react-table for sorting/filtering/pagination state
- Checkbox column for row selection (header checkbox = select all)
- DropdownMenu (MoreHorizontal icon) per row for actions (View/Edit/Delete)
- Input above table for global search/filter
- Select for page size (10/20/50)
- Pagination footer: "Showing 1-10 of 45" + prev/next buttons
- Badge per row for status indicators (active, pending, error)

## Variants
- **simple**: Table with headers and rows. No interaction.
- **sortable**: + column header buttons with ArrowUpDown icon, sort state
- **filterable**: + Input search above + column-specific Select filters
- **full**: All of above + Checkbox selection + DropdownMenu row actions + pagination

## Interaction Patterns
- Sort: click column header toggles asc/desc/none, icon rotates
- Filter: Input with onChange debounced, filters rows
- Pagination: page index state, slice data, prev/next with disabled states
- Row selection: Checkbox per row, header Checkbox for select-all, selectedRows state
- Row actions: DropdownMenu → View (navigate), Edit (Dialog), Delete (AlertDialog)
- Bulk actions: appear when selectedRows.length > 0 (Delete selected, Export, etc.)

## Data Patterns

### Frontend-only
- Data lives in useState or imported from a static array
- Sort/filter/paginate by slicing the local array
- CRUD operations mutate local state via setState
- No loading states needed (data is synchronous)

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/<resource>.ts
  (defines shape, used by BOTH API validation and form validation)
- API: GET /api/<resource>?page=1&limit=10&sort=name&order=asc&filter=active
- Response shape: { data: T[], total: number, page: number, limit: number }
- Client hook: use<Resource>(params) → { data, total, isLoading, error, refetch }
- Params sync: sort/filter/page state passed to hook, triggers refetch
- Optimistic delete: remove row from local state, revert on API error
- Loading skeleton: Table rows with Skeleton cells while fetching
- Empty state: when data.length === 0 after fetch, show empty-state gumdrop

## Anti-Patterns
- ❌ No pagination on 50+ rows — always paginate
- ❌ Sort indicator missing — MUST show current sort direction
- ❌ Delete without confirmation — always use AlertDialog
- ❌ No empty state when filter returns 0 results
- ❌ Raw div table instead of Table component

## Composition Notes
- Pairs naturally with Stats Dashboard above (overview → detail)
- DropdownMenu row actions can open Dialogs for edit/delete flows
- Filter + table + pagination is self-contained — wrap in Card if needed
```

#### form-layout.md
```
---
name: form-layout
domain: app
intent: Structured forms with validation, sections, and submission
complexity: intermediate
components: Input, Label, Select, Textarea, RadioGroup, Checkbox, Separator, Button
---

# Form Layout

## Recipe
**Core:** Grid (grid-cols-1 sm:grid-cols-6) with form fields.
Each field: Label (with optional red asterisk for required) + Input/Select/Textarea.
Responsive col-span: col-span-3 for half-width, col-span-full for full-width.

**Sections:** Separator between logical field groups + section heading (text-sm font-medium)

**Footer:** flex justify-end gap-2 → Button(variant=outline) cancel + Button(variant=default) submit

**Enhancements:**
- RadioGroup for selections (custom card-style radio items with border + checked state)
- Checkbox for agreements/opt-ins
- Textarea for long-form input
- Select with grouped options

## Variants
- **simple**: Stacked fields + submit button. Quick forms.
- **sectioned**: Fields grouped with Separator + section headings. Structured.
- **card-radio**: + RadioGroup with custom card-style radio items. For plan/option selection.
- **multi-column**: Grid layout with half-width fields side by side.

## Interaction Patterns
- Field state: useState for each field or single state object
- Validation: check required fields on submit, show error styling (ring-destructive)
- Error messages: text-xs text-destructive below invalid fields
- Submission: prevent default, validate, then action (local or API)

## Data Patterns

### Frontend-only
- Form state in useState, submitted data stored in local state or console.log
- Validation: manual checks or Zod .safeParse on the state object
- Success: show toast/alert, clear form

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/<entity>.ts
  SAME schema used by API (zValidator) AND form (zodResolver or manual .safeParse)
  Single source of truth — change schema once, both sides update
- Submit: POST /api/<resource> with form data as JSON body
- Client: use<Resource>().create(data) via hc typed client
- Validation errors from API: 400 response with field-level errors, map to form fields
- Success: redirect or refetch list + show success toast
- Loading state: disable submit Button + show Spinner while submitting

## Anti-Patterns
- ❌ No validation — always validate before submit
- ❌ All fields full-width — use grid cols for logical grouping
- ❌ No visual separation between sections
- ❌ Submit without loading indicator
- ❌ Duplicating Zod schemas between frontend and backend

## Composition Notes
- Forms often live inside Dialog (for quick create) or standalone page (for complex forms)
- Pair with data-table: table shows list, form creates/edits items
- Multi-step forms → use multi-step-wizard gumdrop instead
```

#### auth-login.md
```
---
name: auth-login
domain: app
intent: Login, registration, and authentication flows
complexity: intermediate
components: Card, Input, Button, Checkbox, Separator, Label
---

# Auth / Login

## Recipe
**Core:** Centered Card (sm:max-w-md, min-h-dvh flex items-center justify-center) +
Logo/heading + Input fields (email, password) + Button (full-width submit) +
footer links (forgot password, create account)

**Registration extends:** + name Input, confirm password Input, Checkbox (terms agreement)

**Social login:** Separator with "or" text (flex items-center: line + text + line) +
Button(variant=outline) for each provider (Google, GitHub icons)

## Variants
- **simple-login**: Email + password + submit. Minimal.
- **with-social**: + Separator + social login buttons below form.
- **registration**: Full registration with name, email, password, confirm, terms checkbox.
- **split-layout**: Two-column — form one side, illustration/image other side.

## Interaction Patterns
- Password visibility: useState boolean, Eye/EyeOff icon toggle, type="password"/"text"
- Form state: useState for each field (email, password, etc.)
- Validation: email format, password minimum length, confirm match
- Submit: disable Button + show loading state during auth

## Data Patterns

### Frontend-only
- Simulated auth: store "logged in" boolean in useState or localStorage
- No real authentication — just UI flow demonstration
- Redirect to dashboard on "success"

### Full-stack (when Hono backend exists)
- Zod schemas: LoginSchema { email, password }, RegisterSchema { name, email, password }
  in src/shared/schemas/auth.ts
- API: POST /api/auth/login → validates credentials, returns session token
- API: POST /api/auth/register → creates user, returns session token
- API: POST /api/auth/logout → invalidates session
- API: GET /api/auth/me → returns current user (for session validation)
- Session: httpOnly cookie or Authorization header (see auth-session API gumdrop)
- Client hook: useAuth() → { user, isLoading, login, register, logout }
- Protected routes: check useAuth().user, redirect to /login if null
- Error handling: 401 → "Invalid credentials" message, 409 → "Email already exists"

## Anti-Patterns
- ❌ Password in plain text (no visibility toggle)
- ❌ No loading state on submit
- ❌ Registration without password confirmation
- ❌ No link between login and register flows
- ❌ Storing passwords in localStorage (frontend-only is simulation only)

## Composition Notes
- Standalone page — not a section within another page
- After login, redirect to dashboard (stats-dashboard + sidebar-nav)
- Registration can lead into onboarding gumdrop flow
```

#### Remaining app gumdrops (outlined):
- **sidebar-nav.md** — Sidebar + Collapsible + Avatar + DropdownMenu + Badge + Select
- **onboarding.md** — Card + Collapsible + Badge + Progress — checklist with step tracking
- **settings-panel.md** — Tabs + Card + Switch + Select + Input + Label (stateful: saves prefs to API)
- **chat-messaging.md** — ScrollArea + Card + Avatar + Input + Button (stateful: message persistence)
- **notification-feed.md** — Card + Avatar + Badge + Separator + DropdownMenu (stateful: mark read via API)
- **kanban-board.md** — Card + Badge + Avatar + DropdownMenu — draggable columns (stateful: card positions)
- **calendar-view.md** — Card + Badge + Button + Dialog — month/week/day views (stateful: events from API)
- **search-results.md** — Input + Card + Badge + Pagination + Tabs (stateful: queries search-query API)
- **empty-state.md** — icon + heading + description + Button — contextual empty states
- **profile-page.md** — Avatar + Card + Tabs + Badge + Button (stateful: user data from API)
- **activity-feed.md** — Avatar + Badge + Separator — timestamped event log (stateful: fetches history)
- **file-browser.md** — Table + Breadcrumb + DropdownMenu + Dialog — directory navigation
- **grid-list.md** — Card + DropdownMenu + Badge — responsive card grids with actions

---

### Domain 3: Content (4 gumdrops)

- **article-layout.md** — prose styling + AspectRatio + Separator + Badge
- **documentation.md** — Sidebar + ScrollArea + Breadcrumb + Tabs + Table
- **changelog.md** — Badge + Separator + Card — version history
- **timeline.md** — Card + Avatar + Badge + Separator — chronological events

---

### Domain 4: Interactive (5 gumdrops)

- **drag-drop.md** — Card + visual feedback patterns — reorderable lists/grids
- **multi-step-wizard.md** — Card + Progress + Button — form wizard with validation
- **rich-text-editor.md** — Textarea + Button toolbar + Dialog — formatting tools
- **color-picker.md** — Input + Popover + Slider — HSL/hex color selection
- **keyboard-shortcuts.md** — Kbd + Dialog + Command — shortcut reference/overlay

---

### Domain 5: API (6 gumdrops)

These are **backend-only recipes** for Hono route patterns. They pair with stateful UI gumdrops. Ralph searches these when composing `src/api/` code in a full-stack project. These exist only when the project has a Hono backend — frontend-only projects never touch this domain.

#### crud-resource.md
```
---
name: crud-resource
domain: api
intent: Standard CRUD routes for any resource with Zod validation
complexity: intermediate
components: none (backend-only — Hono + Zod + @wiggum/api store)
---

# CRUD Resource API

## Recipe
Hono route file at src/api/routes/<resource>.ts:

**Routes:**
- GET    /<resource>          → list (with ?page, ?limit, ?sort, ?filter query params)
- GET    /<resource>/:id      → detail (by ID)
- POST   /<resource>          → create (body validated with zValidator('json', schema))
- PUT    /<resource>/:id      → update (partial body validated)
- DELETE /<resource>/:id      → delete (returns 204)

**Response shapes:**
- List: { data: T[], total: number, page: number, limit: number }
- Detail: T
- Create: T (the created resource with generated ID) — 201
- Update: T (the updated resource)
- Delete: 204 No Content

**Shared schema:** Zod object in src/shared/schemas/<resource>.ts
Used by BOTH the API route (zValidator) AND React forms (zodResolver / .safeParse).
Never duplicate schemas — one source of truth.

**Store:** IDBStore from @wiggum/api/store/idb-store (free mode / browser preview)
Swappable to D1Store, TursoStore, etc. in Pro mode. Same interface.

## Variants
- **basic**: CRUD with no query params. List returns all.
- **paginated**: + page/limit query params, response includes total
- **sortable**: + sort/order query params
- **filterable**: + filter query params mapped to store.list() where clauses

## Pattern
```typescript
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { ResourceSchema } from '../../shared/schemas/resource'

const app = new Hono()
  .get('/', async (c) => {
    const page = Number(c.req.query('page') ?? 1)
    const limit = Number(c.req.query('limit') ?? 10)
    const { data, total } = await store.list('resources', { page, limit })
    return c.json({ data, total, page, limit })
  })
  .post('/', zValidator('json', ResourceSchema), async (c) => {
    const body = c.req.valid('json')
    const created = await store.create('resources', body)
    return c.json(created, 201)
  })
  // ... GET /:id, PUT /:id, DELETE /:id

export default app
```

## Anti-Patterns
- ❌ Duplicating Zod schemas in API and frontend — import from src/shared/
- ❌ No input validation on POST/PUT — always use zValidator
- ❌ Returning 200 on create — use 201
- ❌ DELETE returning the deleted object — use 204 No Content
- ❌ No pagination on list endpoints — always support page/limit

## Pairs With (UI gumdrops)
- data-table → lists resources with sort/filter/paginate
- form-layout → creates/edits resources
- dialog-modal → confirms destructive deletes
- empty-state → when list returns 0 items
```

#### auth-session.md
```
---
name: auth-session
domain: api
intent: Session-based authentication with login, register, logout, and session check
complexity: advanced
components: none (backend-only — Hono middleware + store)
---

# Auth Session API

## Recipe
Hono route file at src/api/routes/auth.ts:

**Routes:**
- POST /auth/register → creates user (hashed password), returns session cookie
- POST /auth/login → validates credentials, returns session cookie
- POST /auth/logout → clears session cookie
- GET  /auth/me → returns current user from session (or 401)

**Session management:**
- Session ID stored in httpOnly cookie (secure in production)
- Session record in store: { userId, createdAt, expiresAt }
- Middleware: authMiddleware checks session cookie, attaches user to context

**Password handling:**
- Free mode (browser): simple hash (crypto.subtle.digest SHA-256)
  NOT production-secure but functional for preview
- Pro mode: bcrypt or Argon2 via runtime

**Shared schemas:**
- LoginSchema: { email: z.string().email(), password: z.string().min(8) }
- RegisterSchema: { name: z.string(), email, password, confirmPassword }
  with .refine(data => data.password === data.confirmPassword)

## Middleware Pattern
```typescript
const authMiddleware = async (c, next) => {
  const sessionId = getCookie(c, 'session')
  if (!sessionId) return c.json({ error: 'Unauthorized' }, 401)
  const session = await store.get('sessions', sessionId)
  if (!session || session.expiresAt < Date.now()) 
    return c.json({ error: 'Expired' }, 401)
  c.set('user', await store.get('users', session.userId))
  await next()
}
```

## Anti-Patterns
- ❌ Storing passwords in plain text — always hash
- ❌ Session tokens in localStorage — use httpOnly cookies
- ❌ No session expiry — always set expiresAt
- ❌ Returning password hash in user objects — strip sensitive fields

## Pairs With (UI gumdrops)
- auth-login → login/register forms
- sidebar-nav → shows user avatar + logout in footer
- settings-panel → user preferences behind auth
- profile-page → display/edit authenticated user info
```

#### file-upload-api.md
```
---
name: file-upload-api
domain: api
intent: File upload endpoint with multipart handling and storage
complexity: intermediate
components: none (backend-only)
---

# File Upload API

## Recipe
**Route:** POST /api/upload (multipart/form-data)

**Handler:**
- Parse multipart body: c.req.parseBody() → gets file as File/Blob
- Validate: file type (mime check), file size (reject if > limit)
- Store: write to store with metadata { filename, mimeType, size, createdAt }
- Free mode: store file as base64 in IndexedDB (small files only, <5MB)
- Pro mode: upload to R2/S3 bucket, store URL in DB
- Return: { id, url, filename, mimeType, size }

**Supporting routes:**
- GET /api/files → list uploaded files (metadata only)
- GET /api/files/:id → get file metadata (or serve file in Pro mode)
- DELETE /api/files/:id → remove file

## Anti-Patterns
- ❌ No file size limit — always validate
- ❌ No mime type check — always whitelist allowed types
- ❌ Storing large files as base64 in IndexedDB — limit to <5MB in free mode
- ❌ No cleanup on delete — remove both metadata and file data

## Pairs With (UI gumdrops)
- file-upload → dropzone UI + progress tracking
- ai-prompt → file attachments in chat
- profile-page → avatar upload
- form-layout → file fields in forms
```

#### Remaining API gumdrops (outlined):
- **realtime-messaging.md** — SSE or polling for chat/notifications, message store, event streaming
- **search-query.md** — Full-text search route with query params, pagination, relevance scoring
- **pagination-api.md** — Reusable cursor-based and offset-based pagination patterns for any resource

---

## Composition Rules (The Page Assembly System)

This is the "skeleton" layer — how gumdrops combine into pages.

### Sequencing Rules (Enforceable)

1. **No adjacent repeats.** Never place two sections with the same dominant component 
   back-to-back. Card grid → Card grid = slop.
   
2. **Density alternation.** Dense section (features grid, data table) → 
   breathing section (CTA, social proof) → dense. Never three dense in a row.

3. **Container variation.** Alternate between contained (max-w-6xl mx-auto) and 
   full-bleed sections. Never all one or the other.

4. **Padding rhythm.** Vary section padding: py-8 → py-24 → py-16 → py-20. 
   Never uniform padding across all sections.

5. **Background variety.** At least one section per page uses a contrasting 
   background (bg-muted, bg-primary with inverted text, or subtle gradient).

### Component Diversity Rules (Enforceable)

1. **Minimum 10 distinct component types per page** from @wiggum/stack.
   
2. **Maximum 2 sections** can use Card as the primary container.
   
3. **At least 2 interactive components per page:** Tabs, Accordion, Dialog, Sheet, 
   HoverCard, Collapsible, Command, Popover.
   
4. **At least 1 navigation component per page:** NavigationMenu, Breadcrumb, 
   Pagination, DropdownMenu.

### Page Type Templates

| Page Type | Required Gumdrops | Min Sections | Min Components |
|-----------|-------------------|-------------|----------------|
| Landing/Marketing | hero + features + ≥1 social proof + cta + footer | 5-7 | 12+ |
| SaaS Product | hero + features + pricing + faq + cta + footer | 6-8 | 15+ |
| Dashboard | sidebar-nav + stats-dashboard + data-table + ≥1 more | 4-6 | 10+ |
| Portfolio | hero + gallery/portfolio + testimonials + contact + footer | 5-6 | 12+ |
| Blog/Content | sidebar-nav + blog-grid + article-layout + footer | 4-5 | 10+ |
| Auth Flow | auth-login + onboarding (optional) | 1-2 | 6+ |
| Settings | sidebar-nav + settings-panel + dialog-modal (confirms) | 3-4 | 10+ |
| Chat App | sidebar-nav + chat-messaging + ai-prompt + command-palette | 3-5 | 12+ |
| Full-Stack CRUD | sidebar-nav + data-table + form-layout + dialog-modal + stats-dashboard | 4-6 | 12+ |

### The "Unexpected" Rule

Every page with 5+ sections MUST include at least one section that breaks the 
expected pattern for that page type:
- Landing page with an interactive demo section (not just static marketing)
- Dashboard with a visual data story (not just tables and charts)
- Settings page with a visual onboarding checklist
- Blog with an embedded interactive component

---

## Component Reach Map

The "you have 60 components but use 8" problem. Three tiers: what Ralph defaults to, 
what it should do, and what great looks like.

### By Intent

| Intent | 🔴 Basic (Ralph default) | 🟡 Better | 🟢 Best |
|--------|-------------------------|-----------|---------|
| Show features | Card ×3 in grid | **Tabs** switching Card panels | **Bento grid** mixed sizes + Badge + HoverCard |
| User quotes | Card + text | Card + **Avatar** + **Badge** role | **ScrollArea** horizontal + **HoverCard** bio |
| Pricing tiers | Card ×3 identical | + **Badge** "Popular" + **Separator** | + **Tabs** groups + **Table** comparison + **Switch** toggle |
| Navigation | flex div with links | **NavigationMenu** dropdowns | + **Sheet** mobile + **Command** ⌘K + **Breadcrumb** |
| FAQ content | div with text | **Accordion** | **Accordion** grouped by **Tabs** + **Input** search |
| Team display | Card + img | Card + **Avatar** + **Badge** | **HoverCard** on hover + **Dialog** full bio |
| Image display | img grid | **AspectRatio** grid | **Dialog** lightbox + **ScrollArea** + **Tabs** filter |
| Settings | form | **Card** groups | **Tabs** panels + **Switch** + **Select** + **Separator** |
| Data display | div table | **Table** + **Badge** status | + **Pagination** + **DropdownMenu** actions + **Input** filter |
| Progressive content | long scroll | **Accordion** | **Tabs** + **Collapsible** nested + **Sheet** details |
| User input | Input | Input + **Label** + **Select** | + **RadioGroup** cards + **Textarea** + form sections |
| Status/progress | text | **Badge** | **Progress** bar + **Badge** + Card with change indicator |
| File handling | input[type=file] | **Button** + hidden input | Dropzone + **Badge** chips + progress + **Dialog** preview |
| Search | Input | **Input** + results list | **Command** palette + **Tabs** filters + **Pagination** |

### Underused Components (Ralph's Blind Spots)

| Component | What Ralph Doesn't Know | Where To Use It |
|-----------|------------------------|-----------------|
| HoverCard | Rich hover previews without modal weight | Team members, user avatars, link previews |
| Collapsible | Lighter than Accordion, better for nesting | Sidebar groups, onboarding steps, detail panels |
| Command | Keyboard-first search and navigation | ⌘K palette, inline search, action dispatch |
| ScrollArea | Styled scrollable containers | Horizontal testimonials, chat history, file lists |
| AspectRatio | Consistent image/video proportions | Gallery, portfolio, hero images, article covers |
| Popover | Positioned floating content | Color pickers, date pickers, tooltip-like forms |
| Sheet | Slide-in panel (mobile nav, filters, detail) | Mobile menu, filter panels, item detail |
| Breadcrumb | Path navigation | Documentation, file browser, multi-level nav |
| Pagination | Structured page navigation | Tables, search results, blog grids |
| ContextMenu | Right-click menus | File browsers, kanban cards, table rows |
| Kbd | Keyboard shortcut display | Command palette footer, nav hints, tooltips |
| Progress | Visual completion indicator | File upload, onboarding, multi-step wizards |

---

## Anti-Slop Database

Specific patterns that WS5 can eventually detect and reject at write time.

### Layout Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| Card grid × 2 adjacent | Two consecutive sections both using `grid` + `Card` | Change one to Tabs, Accordion, or different layout |
| Single-component section | Section with only 1 component type | Compose: minimum 3 component types per section |
| Uniform padding | All sections use identical `py-*` value | Vary: mix py-8, py-12, py-16, py-20, py-24 |
| All centered alignment | Every section uses `text-center mx-auto` | Mix left-aligned, split, and centered sections |
| Identical layouts | >2 sections use same grid pattern | Mix: bento, split, single-column, full-bleed |

### Component Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| No interactivity | Zero Tabs/Accordion/Dialog/Sheet/HoverCard | Add at least 2 interactive components |
| Card-heavy page | >50% of sections use Card as primary | Swap some for Tabs, Table, Accordion |
| Missing navigation | No NavigationMenu, Breadcrumb, or nav | Add appropriate nav for page type |
| Raw HTML elements | `<button>`, `<input>`, `<table>` instead of stack | Replace with @wiggum/stack components |
| Component poverty | <8 distinct component types on page | Use Component Reach Map to upgrade |

### Theme Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| Purple primary | `--primary` hue ~260-280 | Choose literally any other hue |
| Hardcoded colors | `bg-blue-500`, `text-gray-700` in code | Use CSS variables: `bg-primary`, `text-muted-foreground` |
| No dark mode | Missing `.dark` selector | Add dark mode variable set |
| Inter/Roboto font | Default system fonts as design choice | Choose a distinctive font pairing |

### Full-Stack Anti-Patterns

| Anti-Pattern | Detection Signal | Fix |
|-------------|-----------------|-----|
| Duplicated schemas | Same Zod shape in both src/api/ and src/app/ | Move to src/shared/schemas/, import in both |
| No input validation | POST/PUT route without zValidator | Always validate with shared Zod schema |
| fetch() without error handling | Raw fetch with no .catch or status check | Use typed hc client hook with error state |
| Hardcoded API URLs | `fetch('http://localhost:3000/api/...')` | Use relative paths: `fetch('/api/...')` |
| No loading states | Data renders without isLoading check | Show Skeleton/Spinner while fetching |
| No empty states | List renders nothing when data is [] | Show empty-state gumdrop |
| Password in localStorage | Auth token in localStorage | Use httpOnly cookies via auth-session pattern |

---

## Integration with Existing Skills

### What Changes

| Skill | Action | Why |
|-------|--------|-----|
| **creativity/SKILL.md** | **REPLACE** → redirect to gumdrops | 190 lines of philosophy absorbed into gumdrop recipes + composition rules |
| **frontend-design/SKILL.md** | **KEEP** unchanged | Pure philosophy — "HOW to think." Gumdrops are "WHAT to compose." Complementary. |
| **theming/SKILL.md** | **KEEP** unchanged | Skin layer. Gumdrops are bones layer. Both needed. |
| **stack/SKILL.md** | **KEEP** but add pointer | Add: "For compositional patterns, search gumdrops: `grep skill '<intent>'`" |
| **code-quality/SKILL.md** | **KEEP** unchanged | Code patterns, a11y. Orthogonal to composition. |
| **gumdrops/SKILL.md** | **NEW** — index + rules | Composition rules, component reach map, anti-slop. ~200 lines. Recipes in subdirs. |

### How Ralph Uses Gumdrops

**Frontend-only project:**
1. User requests: "build me a portfolio site"
2. Ralph reads frontend-design → design philosophy
3. Ralph reads gumdrops/SKILL.md → composition rules + page template for "portfolio"
4. Ralph searches: `grep skill "hero"`, `grep skill "gallery"`, `grep skill "testimonials"`, `grep skill "contact"`
5. Ralph loads those 4 recipes (~100 lines total)
6. Ralph reads theming → applies CSS variables
7. Ralph composes unique sections from recipes + rules + theme
8. WS5 validates against anti-slop rules

**Full-stack project:**
1. User requests: "build me a recipe tracker where I can save and share recipes"
2. Ralph reads frontend-design → design philosophy
3. Ralph reads gumdrops/SKILL.md → page template for "Full-Stack CRUD"
4. Ralph searches UI gumdrops: `grep skill "sidebar-nav"`, `grep skill "data-table"`, `grep skill "form-layout"`, `grep skill "dialog-modal"`
5. Ralph searches API gumdrops: `grep skill "crud resource"`, `grep skill "auth session"`
6. Ralph loads ~6 recipes: 4 UI + 2 API (~200 lines total)
7. Ralph creates shared Zod schema in src/shared/schemas/recipe.ts
8. Ralph composes UI sections using full-stack data tier patterns (fetch, hooks, loading states)
9. Ralph composes API routes using crud-resource and auth-session patterns
10. Both sides import the shared schema — single source of truth
11. WS5 validates UI anti-slop AND full-stack anti-patterns

**Key insight:** Ralph never loads more than ~200-300 lines of gumdrop guidance per project. Current system loads 1,200+. Less noise, more signal.

---

## What Makes Gumdrops Better Than Everything Else

| Dimension | blocks.so | shadcnblocks | Gumdrops |
|-----------|----------|-------------|----------|
| **Format** | Code templates | Code templates | AI-native recipes |
| **Coverage** | App-level (70) | Marketing (1,351) | Marketing + App + Content + Interactive + API (~50) |
| **Full-stack** | ❌ | ❌ | ✅ Dual-tier data patterns + API recipes |
| **Themes** | Hardcoded | Hardcoded | CSS variable consumption (theme-agnostic) |
| **Diversity** | Same every time | Same every time | Anti-slop rules enforce variety |
| **Page assembly** | None | None | Composition rules, sequencing, rhythm |
| **Searchable** | Browse website | Browse website ($8k AI ban) | Orama-indexed, grep by intent |
| **Component reach** | Uses what it uses | Uses what it uses | Basic → Better → Best upgrade paths |
| **Framework** | Next.js | Next.js | Browser-native React + Hono |
| **Quality gates** | None | None | Anti-pattern database → WS5 enforcement |
| **AI usable** | Copy-paste | ❌ Banned for AI | ✅ Purpose-built for AI agents |

---

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create `skills/gumdrops/` directory structure
2. Write `SKILL.md` index (composition rules + component reach map + anti-slop)
3. Update `creativity/SKILL.md` → redirect to gumdrops
4. Add pointer in `stack/SKILL.md`

### Phase 2: Priority UI Gumdrops (highest impact first)
1. **hero.md** — every landing page starts here
2. **features.md** — #1 slop section, biggest improvement opportunity
3. **pricing.md** — complex composition, high value
4. **stats-dashboard.md** — every dashboard needs this
5. **data-table.md** — workhorse of app UI
6. **auth-login.md** — every app needs auth
7. **form-layout.md** — forms everywhere
8. **dialog-modal.md** — universal interaction pattern
9. **sidebar-nav.md** — every app needs navigation
10. **file-upload.md** — common, tricky to get right

### Phase 3: API Gumdrops
11. **crud-resource.md** — the universal backend pattern
12. **auth-session.md** — session management
13. **file-upload-api.md** — multipart handling
14. **pagination-api.md** — reusable pagination
15. **search-query.md** — full-text search
16. **realtime-messaging.md** — SSE/polling

### Phase 4: Remaining UI Gumdrops
17-50. Complete coverage across all domains

### Phase 5: Orama Integration
- Index all gumdrop .md files
- Enable `grep skill "<intent>"` to return relevant recipe
- Test: `grep skill "pricing"` → returns pricing.md
- Test: `grep skill "crud api hono"` → returns crud-resource.md

### Phase 6: WS5 Enforcement
- Tree-sitter checks against anti-slop database
- Write-time: "you have two Card grids adjacent — fix this"
- Component diversity gate: "only 6 component types — minimum is 10"
- Full-stack gate: "Zod schema duplicated in api/ and app/ — use shared/"

---

## Success Metrics

1. **Component diversity:** Distinct component types per project: ~8 → 12+
2. **Section variety:** No two adjacent sections use the same layout
3. **No card-grid slop:** Features sections use Tabs/Bento, not three identical cards
4. **Interactive richness:** Every project includes 2+ interactive components
5. **Visual rhythm:** Padding, density, backgrounds vary across sections
6. **Theme compliance:** Zero hardcoded colors — all CSS variables
7. **Full-stack coherence:** Shared schemas used by both API and UI — never duplicated
8. **Data patterns:** Loading states, error states, empty states present in every stateful view
9. **Two-project test:** Similar requirements → visually DIFFERENT output

---

## The Big Picture

```
┌──────────────────────────────────────────────────────────────┐
│                    User's Request                             │
│     "Build me a recipe tracker with user accounts"            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              frontend-design (philosophy)                      │
│         "What makes THIS project different?"                  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              gumdrops/SKILL.md (skeleton)                      │
│    Page template: Full-Stack CRUD                             │
│    sidebar-nav + data-table + form-layout + dialog-modal +    │
│    stats-dashboard. Min 5 sections, 12+ components.           │
│    Composition rules: no adjacent card grids, vary padding.   │
└──────────────────────┬───────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
┌─────────────────────┐  ┌─────────────────────┐
│  UI Gumdrops         │  │  API Gumdrops        │
│  (src/app/)          │  │  (src/api/)          │
│                      │  │                      │
│  sidebar-nav.md      │  │  crud-resource.md    │
│  stats-dashboard.md  │  │  auth-session.md     │
│  data-table.md       │  │                      │
│  form-layout.md      │  │  Shared: Zod schemas │
│  dialog-modal.md     │  │  in src/shared/      │
│  auth-login.md       │  │                      │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           └────────┬───────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│              theming (skin)                                    │
│    OKLCH theme → CSS variables. Font pairing. Dark mode.      │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              Ralph generates unique full-stack output          │
│    UI: sections composed from recipes + theme                 │
│    API: routes composed from API recipes + shared schemas     │
│    Atoms (@wiggum/stack): completely unchanged, data-agnostic │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              WS5 validates (future)                            │
│    ✓ 14 component types used                                  │
│    ✓ No adjacent card grids                                   │
│    ✓ Padding varies across sections                           │
│    ✓ All colors from CSS variables                            │
│    ✓ 3 interactive components found                           │
│    ✓ Zod schemas in src/shared/ (not duplicated)              │
│    ✓ All API routes use zValidator                             │
│    ✓ All fetches have loading + error states                  │
└──────────────────────────────────────────────────────────────┘
```

The theme system makes ugly impossible.
Gumdrops make boring impossible.
WS5 makes slop impossible.

Together: Ralph can build virtually anything — frontend or full-stack — and it'll be good every time.
