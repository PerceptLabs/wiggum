# The Gumdrops Manifesto

> **What this is:** The definitive reference for how compositional creativity works in Wiggum.
> **What this replaces:** All prior gumdrops documents — ecosystem design, refinements, addendum.

---

## The Premise

Wiggum has 60 UI atoms. They're dumb. A Card doesn't know it's for pricing. A Table doesn't know it's for features. A Button doesn't know it's a CTA. They take props, render UI, consume CSS variables. That's it. This is by design — `@wiggum/stack` is a material library, not an opinion.

Ralph's job is to compose these atoms into applications. The problem: without guidance, Ralph reaches for the same 5–8 atoms every time and arranges them the same way. Card grid, Button at the bottom, Badge on the "popular" item. The output is functional and boring. AI slop.

Gumdrops solve this. They are the composition layer — the knowledge of **how atoms combine** and **what shapes they can take** — delivered programmatically so Ralph can't ignore them and creatively so Ralph isn't constrained by them.

```
@wiggum/stack    →  60 atoms (dumb, prop-driven, data-agnostic)
       ↓
   gumdrops      →  composition knowledge (structures × atoms × knobs)
       ↓
   themed apps   →  diverse, creative, never the same twice
```

---

## Theoretical Foundations

Gumdrops isn't invented from scratch. The system borrows from five established disciplines that have solved the problem of creative composition from primitives. Sacred geometry governs the theme system (OKLCH color science). These five govern the composition system — from spatial rules and perceptual grouping up through algorithmic constraint solving and the philosophy of living design.

### Shape Grammars — The Spatial Foundation

Introduced by George Stiny and James Gips in 1971, shape grammars are a formal system for generating designs from production rules applied to geometric primitives. A shape grammar consists of a vocabulary of shapes, spatial relations between them, and rules that transform one arrangement into another.

**What gumdrops borrows:** The concept that complex compositions emerge from small vocabularies of shapes combined through production rules. Stiny proved that a grammar of ~50 rules applied to basic rectangles and circles could generate all of Kurokawa's museum designs. Gumdrops operates the same way — ~10 structures are the shape vocabulary, ~15 atom sets are the material vocabulary, and knobs are the production rules that transform one combination into another.

**The key insight from shape grammars:** Structures must remain at the spatial grammar level. The moment a structure encodes domain knowledge ("this is a pricing layout"), it's no longer a grammar rule — it's a template. Stiny's grammars work because the rules are about spatial relations (divide, rotate, scale, nest), not about what the spaces contain. Gumdrops structures describe spatial arrangements (grid-with-emphasis, comparison-matrix, sequential-flow), never content types (pricing-section, hero-block, dashboard-panel).

**Practical application:** The `compose` command is a shape grammar interpreter. It takes a structure (spatial rule), an atom set (material vocabulary), and knobs (rule parameters), and produces a composition. Like Stiny's grammar generating different museum floor plans from the same rules, gumdrops generates different UI sections from the same structures.

### Musical Form — The Temporal Foundation

Music theory identifies three fundamental operations that govern all composition: **repetition**, **contrast**, and **variation**. Every musical form — sonata, rondo, theme-and-variations, strophic — is built from these three operations applied to melodic, harmonic, and rhythmic motifs.

- **Repetition** creates familiarity and unity. A chorus that returns grounds the listener.
- **Contrast** creates interest and tension. A bridge that departs from the verse re-engages attention.
- **Variation** creates depth without losing identity. A motif that returns altered rewards recognition.

**What gumdrops borrows:** A page is a temporal experience — users scroll through it like a listener moves through a piece. Sections are phrases. The three operations map directly:

- **Repetition:** Reusing atoms across sections creates visual unity. Card appearing in both features and pricing ties the page together.
- **Contrast:** Adjacent sections with different structures create visual interest. A `grid-with-emphasis` followed by a `comparison-matrix` re-engages the eye — the same way a bridge re-engages the ear.
- **Variation:** The same structure appearing twice but with different knobs (density, emphasis) creates recognition without monotony — like a theme returning in a different key.

**The key insight from musical form:** Slop is the absence of contrast. A page where every section is a card grid is a song where every phrase uses the same chord — technically correct, experientially dead. The fingerprint diversity system is gumdrops' implementation of mandatory contrast: adjacent sections must differ in shape, the way adjacent phrases in a well-composed piece differ in harmonic function.

**Practical application:** `compose page` applies musical form automatically. It sequences sections with alternating fingerprint shapes (contrast), allows atoms to recur across sections (repetition), and randomizes knobs so the same structure appears differently each time (variation). The page has compositional rhythm without Ralph needing to understand music theory.

### Gestalt Principles — The Perceptual Foundation

Gestalt psychology (Wertheimer, Koffka, Köhler, 1920s) identifies how the human brain organizes visual information: proximity (close elements group), similarity (alike elements group), continuity (elements on a path relate), closure (incomplete shapes complete), and figure-ground (foreground separates from background).

**What gumdrops borrows:** Gestalt explains *why* certain atom combinations work and others don't. A Card with a Badge and a Button feels like a unit because of proximity and common region. A row of identically-styled Cards feels like a group because of similarity. A sequential-flow structure guides the eye because of continuity. These aren't aesthetic preferences — they're perceptual laws.

**The key insight from gestalt:** Anti-patterns are gestalt violations. Three identical Cards in a row exploit similarity so aggressively that the brain can't distinguish them — no focal point, no hierarchy, no figure-ground separation. The anti-pattern redirect ("vary Card density per tier or use comparison-matrix") is really saying "break the similarity to create figure-ground separation." Gestalt principles are the reason the redirects work, even though the YAML doesn't cite them.

**Practical application:** Atom sets encode gestalt-informed palettes. The `pricing` atom set recommends Badge alongside Card because Badge breaks similarity (creates a focal point on the recommended tier). It recommends Separator because Separator creates common-region boundaries between tiers. It recommends Tooltip because Tooltip adds interaction depth that differentiates elements the eye otherwise groups uniformly. These aren't arbitrary component suggestions — they're gestalt-driven composition tools.

### Modular Scale — The Proportional Foundation

A modular scale is a sequence of numbers related by a consistent ratio — derived from music theory (perfect fourth = 1.333, golden ratio = 1.618) and applied to typography, spacing, and layout proportions. Rather than choosing sizes arbitrarily, every value in the system relates to every other through the same mathematical ratio.

**What gumdrops borrows:** The density knob on structures is a modular scale application. `density: airy` doesn't mean "more padding" — it means spacing, element size, and content-per-viewport all scale proportionally from a higher ratio. `density: dense` means they scale from a lower ratio. The result is internal consistency regardless of density level — the same way a typographic scale keeps font sizes harmonious whether the base is 14px or 18px.

**Practical application:** When the theme system ships (sacred geometry OKLCH), its spacing tokens will be generated from modular scales. Gumdrops' density knob selects which scale to apply. The structure provides the spatial grammar. The atoms provide the material. The theme provides the color. The density knob provides the proportional rhythm. All four layers are mathematically grounded, independently variable, and combinatorially powerful.

### Wave Function Collapse — The Algorithmic Foundation

Created by Maxim Gumin in 2016 (building on Paul Merrell's 2007 model synthesis), Wave Function Collapse is a constraint-satisfaction algorithm that generates valid compositions from tiles and adjacency rules. Given a set of tiles, rules about which tiles can sit next to which, and frequency weights for how often each tile should appear, WFC iteratively "collapses" the most constrained cell first, then propagates constraints to neighbors. It's fundamentally a constraint solver disguised as a generator — you define local rules, and global structure emerges.

**What gumdrops borrows:** The `compose page` command is a 1D WFC solver. Sections are cells. Structure × atomSet pairings are tiles. Adjacency rules encode what flows well after what. Frequency weights encode how common each structure should be. The algorithm selects the most constrained section first, collapses it via weighted random, propagates constraints to neighbors, and backtracks on contradiction.

**The key insight from WFC:** Local rules produce global coherence. You never need to author "a SaaS page should have structure A then B then C." You only need to define what flows well next to what, and the solver produces page-level rhythm from section-level constraints. This is the same principle Christopher Alexander proved architecturally — that local regulations in medieval cities produced harmonious wholes without master plans.

**Flow types — the socket system:** Rather than authoring pairwise adjacency rules between every structure pair (10×10 = 100 entries), each structure carries a single `flow` property describing its visual rhythm. WFC adjacency rules operate on flow types: contrasting flows are preferred, same flows are penalized. This mirrors how tile-based WFC uses socket types on edges — tiles connect when sockets match. Here, sections connect best when flows contrast.

| Flow Type | Visual Rhythm | Structures |
|-----------|--------------|------------|
| `symmetric` | Balanced, regular, stable | `grid-with-emphasis`, `comparison-matrix` |
| `asymmetric` | Deliberately unbalanced, tension | `split-panel`, `sidebar-main` |
| `linear` | Sequential, directional | `sequential-flow`, `carousel-rail` |
| `dense` | Information-heavy, varied density | `feed-stream`, `bento-mosaic` |
| `open` | Breathing room, minimal | `stacked-sections`, `canvas-workspace` |

The musical form parallel is exact: flow types are harmonic functions. Symmetric = tonic (home). Asymmetric = dominant (tension). Linear = passage (movement). Dense = development (complexity). Open = resolution (release). Good music alternates between these. Good pages do too.

**What WFC replaces:** The current fingerprint re-rolling system (check adjacent shapes, retry on collision) is a degenerate WFC with binary rules and no propagation. WFC upgrades this in every dimension:

- **Binary → gradient:** Same shape = hard reject, same flow type = soft penalty (×0.3 weight), contrasting flow type = boost (×1.3 weight)
- **Random retry → weighted selection:** Informed by structure base weights, atom affinities, position biases, and propagated constraints
- **Linear top-to-bottom → entropy-driven:** Most constrained section collapses first, preventing dead ends
- **No backtracking → backtrack on contradiction:** If any cell reaches zero valid options, undo last collapse and retry
- **Shape is the only signal → multi-dimensional:** Shape uniqueness + flow contrast + density alternation + position bias all factor in

**Weight normalization discipline:** Multipliers compound fast. Five factors at 1.5× each produce 7.6×; five at 0.5× produce 0.03×. Left unchecked, weights explode or collapse to near-zero, making the solver's output unpredictable. The fix is simple: normalize after every weight adjustment so each cell's domain is a probability distribution (sum = 1.0). Multipliers express relative preference only; absolute magnitude is discarded. Two normalization points: after initial tile-weight computation for each cell, and after each propagation adjustment to a neighbor cell's weights. Hard constraints (same shape) remove options entirely. Soft constraints (same flow, density alternation) only scale weights, then normalize. Floor all weights at `max(w, 1e-6)` before normalizing so nothing collapses to exact zero unless hard-removed. This keeps YAML authoring intuitive — 0.5 means "half as likely," 1.5 means "50% more likely" — without requiring log-space math or worrying about compounding artifacts.

**Practical application:** The solver is ~80–100 lines of TypeScript. No external dependencies. The real power is the data model — adjacency rules, frequency weights, flow types, position biases — which lives in the same YAML files and evolves from reflection data. The algorithm is the backbone; the knowledge is the muscle.

### Pattern Language — The Philosophical Foundation

Christopher Alexander's *A Pattern Language* (1977) proposed that complex, living environments emerge from shared vocabularies of proven solutions — patterns — that non-experts can combine to create harmonious wholes. Alexander's key idea: patterns encode the *relationships between forces* in a design problem, not just the solution itself. A pattern for "window place" doesn't say where windows go — it describes the forces (light, privacy, view, warmth) that make certain window placements feel alive.

**What gumdrops borrows:** Alexander's concept of the "quality without a name" (QWAN) — the aliveness that distinguishes living design from dead correctness — is the anti-slop mission stated formally. Slop is technically correct UI that lacks QWAN. Gumdrops doesn't just fight sameness; it fights deadness. The composition system aims for scaffolds that feel alive: varied in structure, rhythmic in flow, surprising in places, coherent as a whole.

**The key insight from pattern language:** Software's adoption of Alexander missed his central point. The Gang of Four took the notation (name, context, problem, solution) but dropped the moral commitment to creating aliveness. Alexander told the 1996 OOPSLA conference as much: the software community took the mechanism and ignored the purpose. Gumdrops takes both — the mechanism (structures as reusable spatial patterns, atom sets as material vocabularies) and the purpose (compositions that feel alive, not just correct).

**Practical application:** Alexander proved that local rules produce global coherence — that medieval cities built to local regulations without master plans are more harmonious than modern cities designed by architects with god's-eye-view blueprints. WFC is the algorithmic formalization of this proof. Gumdrops' local rules (flow type contrast, gestalt-informed palettes, density alternation) produce page-level coherence without Ralph needing a global composition plan. The harness enforces local rules. QWAN emerges.

---

## The Three Primitives

Gumdrops are built from exactly three primitive types: **structures**, **atom sets**, and **layout archetypes**. Structures describe spatial shapes. Atom sets describe material palettes. Archetypes describe the top-level topology that structures inhabit. None is useful alone. Composition happens when they combine.

### Structures

A structure is a **layout shape** — independent of what it displays. It describes spatial arrangement, visual rhythm, and interaction affordances. It says nothing about whether the content is pricing, features, auth, or anything else.

Borrowing from shape grammar terminology: structures are the production rules of gumdrops. They define how space is divided, not what fills it.

```yaml
# structures/grid-with-emphasis.yaml
id: grid-with-emphasis
type: structure
shape: grid-emphasis
flow: symmetric
weight: 1.5
description: "One highlighted item + N regular items in a grid"
knobs:
  emphasis_method: [scale, border, color, position]
  count: [3, 4, 5, 6]
  density: [airy, normal, dense]
slots:
  emphasis_item: { required: true }
  regular_items: { required: true, repeatable: true }
  header: { required: false }
  footer: { required: false }
```

**The structural vocabulary:**

| Structure | Shape | Flow | Spatial Grammar |
|-----------|-------|------|-----------------|
| `grid-with-emphasis` | `grid-emphasis` | `symmetric` | One standout + repeating items. Gestalt: similarity broken by emphasis. |
| `comparison-matrix` | `matrix` | `symmetric` | Rows × columns. Gestalt: continuity along rows and columns. |
| `sequential-flow` | `flow` | `linear` | Ordered steps or stages. Gestalt: continuity along the path. |
| `feed-stream` | `feed` | `dense` | Vertical list, varied density. Musical form: repetition with variation. |
| `split-panel` | `split` | `asymmetric` | Two panes, one dominant. Gestalt: figure-ground separation. |
| `bento-mosaic` | `bento` | `dense` | Irregular grid, mixed cells. Musical form: contrast within repetition. |
| `carousel-rail` | `carousel` | `linear` | Horizontal scroll. Gestalt: continuity along rail. |
| `stacked-sections` | `stacked` | `open` | Vertical blocks, alternating rhythm. Musical form: ABAB contrast. |
| `sidebar-main` | `sidebar` | `asymmetric` | Fixed nav + scrollable area. Gestalt: common region separation. |
| `canvas-workspace` | `canvas` | `open` | Open drag/drop area. Shape grammar: user-defined spatial rules. |

~10 structures. New structures should be rare. If a proposed structure can be described as an existing structure with different knobs, it's a knob value — not a new structure. If it can't be described without mentioning content ("pricing-layout"), it's a template — not a structure. This is the guardrail that prevents the grammar from degenerating back into a recipe catalog.

### Atom Sets

An atom set is a **palette of components** suited to a particular intent — independent of how they're arranged. Borrowing from shape grammar terminology: atom sets are the vocabulary. They define what materials are available, not how they're arranged.

```yaml
# atoms/pricing.yaml
id: pricing
type: atoms
intent: "pricing tiers, plan comparison, billing selection"
required: [Card, Button]
recommended: [Badge, Toggle, Tooltip, Separator, Tabs, Table]
anti_patterns:
  - trigger: "identical Card repeated 3+"
    redirect: "Vary Card density per tier or use comparison-matrix structure"
  - trigger: "no billing toggle on subscription pricing"
    redirect: "Add Toggle or Tabs for monthly/annual"
```

Atom sets encode gestalt-informed palettes:

| Atom Set | Intent | Required | Recommended (and why) |
|----------|--------|----------|----------------------|
| `pricing` | Plans, tiers, billing | Card, Button | Badge (focal point on featured tier), Toggle (interaction depth), Tooltip (information layering), Separator (common region boundaries), Tabs (alternative views), Table (comparison structure) |
| `features` | Capabilities, benefits | Card, Badge | Tabs (grouping via common region), Accordion (progressive disclosure), HoverCard (depth on hover), Tooltip (detail without clutter), Separator (section boundaries) |
| `auth` | Login, signup, session | Input, Label, Button | Card (common region for form), Separator (step boundaries), Checkbox (consent interaction), Alert (feedback) |
| `dashboard` | Metrics, monitoring | Card | Chart (data visualization), Progress (status encoding), Table (structured data), Badge (status indicators), Tabs (view switching), Select (filtering) |
| `messaging` | Chat, comments, threads | Input, ScrollArea | Avatar (identity via similarity), Card (message common region), Badge (notification focal point), Separator (thread boundaries), Button (actions) |
| `data-display` | Tables, lists, records | Table | Badge (status encoding), Button (row actions), Select (filtering), DropdownMenu (context actions) |
| `form` | Data entry, submission | Input, Label, Button | Select, Checkbox, RadioGroup, Textarea, Switch (interaction variety), Separator (form section boundaries) |
| `navigation` | Wayfinding, menus | Button | NavigationMenu, Sidebar, Tabs, Breadcrumb (path continuity), Command (search-based nav) |
| `media` | Images, galleries, video | AspectRatio | Carousel (browsing continuity), Dialog (focus isolation), Card (item common region), Badge (metadata), Skeleton (loading state) |
| `social-proof` | Testimonials, reviews, trust | Card, Avatar | Badge (credibility markers), ScrollArea (overflow browsing), Carousel (horizontal browsing), Separator (testimonial boundaries) |
| `status` | Progress, activity, feeds | Badge | Progress (completion encoding), Card (event common region), Separator (event boundaries), ScrollArea (history browsing), Avatar (actor identity) |
| `content` | Articles, docs, text | Card | Accordion (collapsible sections), Tabs (alternative views), ScrollArea (long content), Separator (section boundaries), Badge (category markers) |
| `settings` | Preferences, configuration | Switch, Select | Card (setting group common region), Label (setting identity), Separator (group boundaries), Tabs (category switching), Input (text entry), Button (save action) |
| `empty-state` | No data, onboarding | Card, Button | Badge (status indicator), Separator (visual breathing room) |
| `overlay` | Modals, drawers, popovers | Dialog | Sheet (side panel), Drawer (bottom panel), Popover (contextual), Command (search modal), AlertDialog (confirmation) |

~15 atom sets. They overlap intentionally — Card appears in many sets, Badge in most. This mirrors real design systems where the same components serve multiple contexts.

### Layout Archetypes

An archetype is a **top-level spatial topology** — the initial shape in shape grammar terms. Structures describe how space is divided within a region. Archetypes describe how regions relate to each other. A landing page is a vertical sequence of sections. A dashboard is a sidebar + header + main area. A wizard is a linear multi-step flow. These are fundamentally different topologies, and the WFC solver needs to know which one it's working with so adjacency means the right thing.

```yaml
# archetypes/shell.yaml
id: shell
description: "Sidebar + header + main content area. Apps, dashboards, tools."
slots:
  sidebar:
    position: fixed-left
    adjacent_to: [main]
    default_structure: sidebar-main
    default_atoms: navigation
    chrome: true          # exempt from flow contrast — it's navigation, not content
  header:
    position: fixed-top
    adjacent_to: [main]
    default_structure: stacked-sections
    default_atoms: navigation
    chrome: true
  main:
    position: fill
    adjacent_to: [sidebar, header]
    subdivides: true      # can contain sub-structures (e.g., kanban columns inside canvas)
    default_structure: null
    default_atoms: null
  overlay:
    position: floating
    adjacent_to: []       # overlays don't participate in flow contrast
    default_structure: null
    default_atoms: overlay
```

**The archetype vocabulary:**

| Archetype | Topology | Slots | Examples |
|-----------|----------|-------|----------|
| `page-scroll` | 1D vertical sequence | N sequential sections, each adjacent to prev/next | Landing pages, blogs, marketing sites |
| `shell` | Sidebar + header + main | 3-4 named regions, main may subdivide | Dashboards, kanban, email clients, IDEs |
| `split-view` | Two resizable panes | 2 sibling panes, adjacent to each other | Code editors, diff views, master-detail |
| `canvas` | Single open workspace | 1 primary + optional toolbar/sidebar | Whiteboards, design tools, maps |
| `wizard` | Multi-step linear | N sequential steps + shared chrome | Onboarding, checkout, form flows |
| `multi-route` | Collection of views | Per-route layouts with shared chrome | Full apps with routing, each route gets its own archetype |

~6 archetypes. New archetypes should be rare — most projects are one of these topologies or a composition of them (`multi-route` where each route is a `shell` or `page-scroll`).

**How archetypes change the solver:** The WFC solver doesn't hardcode adjacency as `[i-1, i+1]`. It reads the adjacency graph from the archetype's slot definitions. For `page-scroll`, slots are sequential and adjacency is the 1D chain the manifesto already describes. For `shell`, adjacency comes from the slot graph — sidebar is adjacent to main, header is adjacent to main, overlay is adjacent to nothing. The solver algorithm is identical. Only the input graph changes.

**Archetype detection:** The harness detects the archetype from Ralph's plan via the same Orama keyword matching that detects atom set intents. "Kanban board" → `shell`. "Landing page" → `page-scroll`. "Checkout flow" → `wizard`. If detection fails or is ambiguous, the harness defaults to `page-scroll` (the most common case) and notes the uncertainty in `.ralph/feedback.md`.

**Chrome slots:** Some slots in an archetype are `chrome: true` — they're navigation, toolbars, or persistent UI that frames the content. Chrome slots get default structure/atom assignments and are exempt from flow type contrast. You don't need the sidebar to rhythmically contrast with the main area — it's scaffolding, not a compositional section.

**Subdivides:** Slots with `subdivides: true` can contain sub-structures. The `shell` archetype's main slot might contain a `canvas-workspace` at the top level, with column sub-structures inside for a kanban board. This is recursive composition — shape grammars applied to their own output. The solver handles this by running a second pass on subdividing slots after the top-level composition is resolved.

---

## Composition = Archetype × Structure × Atoms

The core idea. A gumdrop composition is an archetype (topology) populated with structures (spatial shapes) combined with atom sets (material palettes). The archetype determines how sections relate spatially. The structure determines how each section is shaped. The atoms determine what components fill it. Together they give Ralph a starting point that is topologically appropriate, structurally diverse, and compositionally rich.

```bash
compose --structure grid-with-emphasis --atoms pricing
```
→ Pricing as a grid with one highlighted tier. Shape grammar: emphasis rule applied.

```bash
compose --structure comparison-matrix --atoms pricing
```
→ Pricing as a feature comparison table. Gestalt: continuity along rows.

```bash
compose --structure sequential-flow --atoms pricing
```
→ Pricing as a narrative flow — problem, tiers revealed progressively, CTA. Musical form: building tension.

```bash
compose --structure bento-mosaic --atoms pricing
```
→ Pricing as an irregular grid with tiers of different visual weight. Musical form: contrast within repetition.

Same atoms. Four completely different sections. The structure controls shape (shape grammar). The atoms control material (gestalt-informed palettes). Ralph controls everything else — content, theme, interaction, which optional atoms to include, how to fill slots.

### Combinatorics

| Dimension | Count | Source |
|-----------|-------|--------|
| Archetypes | ~6 | Topology templates |
| Structures | ~10 | Spatial grammar rules |
| Atom sets | ~15 | Intent-driven palettes |
| Knobs per structure | 3–4 axes, 2–4 options each | Production rule parameters |
| **Unique compositions** | **~150 base × 18–27 knob variants × 6 topologies = 16,000–24,000+** | Before Ralph adds content, theme, and creative decisions |

From ~31 small YAML files.

### Cross-Pollination

Not every combination is conventional. Some are surprising. All are valid.

- `feed-stream × pricing` — pricing as a scrolling reveal of tiers. Unconventional, but compelling for a product-led growth page.
- `canvas-workspace × dashboard` — draggable metric cards the user arranges. Unconventional, but perfect for a customizable analytics tool.
- `comparison-matrix × features` — feature comparison table. Conventional and effective.
- `carousel-rail × social-proof` — horizontal testimonial browser. Conventional and familiar.

The `compose` command can flag low-confidence pairings but never blocks them. Creative composition means allowing unexpected combinations. The best designs often come from applying a structure to content it wasn't "meant" for.

---

## What Gumdrops Are NOT

**Not templates.** Templates give the same output every time. A gumdrop composition varies by structure selection, knob randomization, and fingerprint diversity. Two tasks requesting "pricing section" produce structurally different scaffolds.

**Not prescriptive.** There is no rule that a CTA needs a list, a section needs three columns, or a dashboard needs a sidebar. Structures describe possible shapes. Atom sets describe possible materials. Ralph composes.

**Not exhaustive.** The system covers the spatial arrangements and component palettes that appear across most applications. If Ralph needs something genuinely novel, it builds freehand from the 60 atoms.

**Not rigid.** Ralph can deviate from the scaffold. Drop recommended atoms. Add atoms not in the set. Ignore slot markers. Combine structures unexpectedly. The scaffold is a starting point, not a constraint.

**Not invention.** Ralph never creates new components, fabricates HTML elements pretending to be atoms, or builds custom implementations of things `@wiggum/stack` already provides. The 60 atoms are the complete material. Gumdrops ensures Ralph uses more of them, more diversely — not that Ralph invents beyond them.

---

## Anti-Slop Through Composition Theory

### The Problem

AI slop isn't wrong components. It's the same components the same way every time. Functional and boring. The compositional equivalent of a song that never changes key.

### How Each Foundation Fights Slop

**Shape grammars → structural variety.** Each structure has a `shape` fingerprint. The WFC solver enforces that adjacent sections never share the same shape — a hard constraint during propagation. This is the contrast operation from musical form enforced algorithmically.

**Wave Function Collapse → page-level composition.** The WFC solver's flow type system ensures adjacent sections contrast in visual rhythm, not just shape. Frequency weights prevent overuse of workhorse structures. Entropy-driven selection and backtracking guarantee valid compositions without random retry. Local adjacency rules produce global page-level coherence — Alexander's principle, Gumin's algorithm.

**Musical form → page-level rhythm.** Sections sequence with alternating flow types (contrast), shared atoms across sections (repetition), and randomized knobs on recurring structures (variation). The WFC flow type system is musical form formalized as constraint propagation.

**Gestalt → component-level composition.** Anti-patterns in atom sets are gestalt violations: identical Cards exploit similarity until there's no hierarchy. Recommended atoms break similarity (Badge creates focal point), add depth (Tooltip layers information), and define boundaries (Separator creates common regions). The palette is gestalt-informed even though the YAML doesn't cite the principles.

**Modular scale → proportional consistency.** The density knob ensures spacing, sizing, and content density scale from a consistent ratio, not arbitrary values. An "airy" section has internal proportional harmony even though every measurement is larger.

### What Anti-Slop Does NOT Mean

- No minimum component counts.
- No mandatory section counts.
- No layout prescriptions.
- No hard build failures for repetitive output. All feedback is informational.

---

## The Compose Command

### Section-Level

```bash
compose --structure comparison-matrix --atoms pricing
compose --structure comparison-matrix --atoms pricing --density dense --emphasis features
```

1. Loads structure YAML and atom set YAML
2. Selects knobs (random or specified via flags)
3. Merges required + recommended atoms with knob emphasis
4. Emits scaffold: imports, structural comment with slot markers, anti-pattern warnings

### Page-Level (WFC Solver)

```bash
compose page hero:split-panel:media,features:bento-mosaic:features,pricing:comparison-matrix:pricing,cta:stacked-sections:empty-state
```

Format: `intent:structure:atoms` per section.

The page-level compose is a Wave Function Collapse solver operating on the adjacency graph defined by the detected layout archetype. For `page-scroll`, this is a 1D chain (sections adjacent to their neighbors). For `shell`, it's a slot graph (sidebar adjacent to main, overlay adjacent to nothing). The solver algorithm is identical regardless of topology — only the adjacency input changes. Each slot is a cell. Each valid (structure, atomSet) pairing is a tile. The algorithm:

**1. Detect archetype.** Orama keyword matching on plan intents determines topology. "Landing page" → `page-scroll`. "Dashboard" → `shell`. Default: `page-scroll`.

**2. Initialize.** For each slot/section, create a cell with domain = all (structure, atomSet) pairs where atomSet matches intent. Chrome slots get pre-collapsed with their defaults. Weight each option by: `structure.baseWeight × atomAffinity × positionBias`. If a specific structure is requested (e.g., `pricing:comparison-matrix:pricing`), pre-collapse that cell.

**3. Collapse loop.** While uncollapsed cells remain:

  - **Select:** Find the uncollapsed cell with lowest entropy (fewest weighted options — most constrained).
  - **Collapse:** Pick a tile from that cell's domain via weighted random. Record structure, atomSet, randomized knobs.
  - **Propagate:** For each uncollapsed neighbor (as defined by archetype adjacency, not array index):
    - HARD constraint: Remove tiles with same `shape` as collapsed cell (fingerprint uniqueness)
    - SOFT constraint: Multiply weight × 0.3 for tiles with same `flow` type (penalize rhythmic monotony)
    - SOFT constraint: Multiply weight × 1.3 for tiles with contrasting `flow` type (reward rhythmic variety)
    - SOFT constraint: If collapsed cell used `density: dense`, boost `density: airy` in neighbor (density alternation)
  - **Contradiction check:** If any cell has 0 valid tiles in domain, backtrack — uncollapse last cell, remove the tile that caused contradiction, retry.

**4. Subdivide.** For any slot with `subdivides: true`, run a second pass — the collapsed structure's internal slots become new cells, resolved with the same algorithm.

**5. Return** ordered list of (intent, structure, atomSet, knobs) per slot/section.

**Example walkthrough** — "SaaS landing page" with 5 intents: hero, features, pricing, testimonials, cta.

```
Initialize:
  cell[0] hero         → 30 options (split-panel boosted by position bias)
  cell[1] features     → 25 options
  cell[2] pricing      → 20 options (comparison-matrix heavily weighted)
  cell[3] testimonials → 20 options
  cell[4] cta          → 15 options (stacked-sections boosted by position bias)

Collapse cell[2] pricing (lowest effective entropy — one option dominates):
  → comparison-matrix:pricing (symmetric), density: normal
  Propagate to cell[1] and cell[3]:
    Remove comparison-matrix. Penalize symmetric (×0.3). Boost asymmetric/dense/linear (×1.3).

Collapse cell[0] hero (split-panel dominates after position bias):
  → split-panel:media (asymmetric), density: airy
  Propagate to cell[1]:
    Remove split-panel. Penalize asymmetric (×0.3). bento-mosaic (dense) surges.

Collapse cell[1] features:
  → bento-mosaic:features (dense), density: normal
  Propagate to cell[2] (already collapsed, skip) and cell[0] (already collapsed, skip).

Collapse cell[3] testimonials:
  → carousel-rail:social-proof (linear), density: normal

Collapse cell[4] cta:
  → stacked-sections:empty-state (open), density: airy

Result: asymmetric → dense → symmetric → linear → open
Every adjacent pair contrasts in flow. Page has rhythm.
```

The solver is ~80–100 lines of TypeScript with no external dependencies. The power lives in the data (flow types, weights, position biases), not the algorithm.

### Discovery

```bash
compose --list                      # all structures and atom sets
compose --list structures           # just structures
compose --list atoms                # just atom sets
compose --structures-for pricing    # structures that pair well with pricing atoms
compose --atoms-for split-panel     # atom sets that pair well with split-panel
```

---

## Affinity Scoring (v1.1) — WFC Weight Tuning

After initial deployment, reflection data will reveal which structure-atom pairings produce the best output. This data feeds directly into WFC weights — the frequency hints and position biases that the solver uses during collapse:

```yaml
# Inside structure YAML
weight: 1.5   # base frequency weight (higher = more common in compositions)
affinity:
  strong: [pricing, dashboard, features]   # atom affinity multiplier × 1.5
  medium: [media, content]                 # atom affinity multiplier × 1.0
  weak: [auth]                             # atom affinity multiplier × 0.5
position_bias:
  first: 1.3    # boost when this structure is in position 0 (hero)
  last: 0.8     # slight penalty when in final position
```

```yaml
# Inside atom set YAML
structure_affinity:
  preferred: [comparison-matrix, grid-with-emphasis]   # multiplier × 1.5
  neutral: [bento-mosaic, stacked-sections]            # multiplier × 1.0
  unusual: [canvas-workspace]                          # multiplier × 0.5
```

The WFC solver computes each tile's initial weight as:

```
tile_weight = structure.weight × atom_affinity × position_bias × random_noise
```

This replaces the earlier ad-hoc `score = affinity_weight + random_noise - fingerprint_penalty` formula. Affinity now feeds a proper constraint solver rather than a simple scoring function.

**Do not author affinities from theory.** Author them from reflection data showing which pairings Ralph produces good output from. Affinities are earned, not assumed. Until reflection data exists, all affinities default to 1.0 (uniform weights) and the solver relies on flow type contrast and shape uniqueness alone.

---

## The Three Modes

Same recipe data, three levels of harness involvement. Switchable at runtime for empirical comparison.

### Mode 1 — Suggestive

Recipes exist as searchable knowledge. Ralph finds them via `grep skill`. No `compose` command. No harness automation. System prompt: "recipes exist, search if you want."

### Mode 2 — Commanding

`compose` command available. System prompt strongly directs Ralph to use it before building any section. But the harness doesn't auto-run compose — Ralph must choose to execute.

### Mode 3 — Programmatic

Full harness-initiated composition. After Ralph writes `.ralph/plan.md`, the harness parses section intents, matches them to structures and atom sets, runs `compose page` automatically, writes `.ralph/scaffold.tsx`. Ralph receives the scaffold without choosing to request it. Post-completion recipe-data diff runs automatically.

### Configuration

```typescript
type CompositionMode = 1 | 2 | 3;
```

Stored in settings, exposed in IDE preferences. Default: 3.

### Console Telemetry

All modes log with `[gumdrops:mode{N}]` prefix. Filter in devtools by `gumdrops` for all composition activity.

```
// Mode 3 example
[gumdrops:mode3] Plan parsed: 5 section intents from .ralph/plan.md
[gumdrops:mode3] Archetype detected: page-scroll (5 sequential sections)
[gumdrops:mode3] WFC init: 5 cells, 150 tiles, flow types: symmetric/asymmetric/linear/dense/open
[gumdrops:mode3] Collapse: cell[2] pricing → comparison-matrix:pricing (symmetric) [entropy: 1.2]
[gumdrops:mode3] Propagate: cell[1] penalized symmetric (×0.3), cell[3] boosted linear (×1.3)
[gumdrops:mode3] Collapse: cell[0] hero → split-panel:media (asymmetric) [entropy: 1.8]
[gumdrops:mode3] Collapse: cell[1] features → bento-mosaic:features (dense) [entropy: 2.1]
[gumdrops:mode3] Collapse: cell[3] testimonials → carousel-rail:social-proof (linear) [entropy: 2.4]
[gumdrops:mode3] Collapse: cell[4] cta → stacked-sections:empty-state (open) [entropy: 2.6]
[gumdrops:mode3] Flow sequence: asymmetric→dense→symmetric→linear→open ✓ (all adjacent contrast)
[gumdrops:mode3] Scaffold written: .ralph/scaffold.tsx (22 atoms across 5 sections)
[gumdrops:mode3] Post-completion diff: 18/22 atoms used. Skipped: Slider, Popover, NavigationMenu, Accordion
```

### What Each Mode Enables

| Capability | Mode 1 | Mode 2 | Mode 3 |
|-----------|--------|--------|--------|
| Recipe data loaded | As prose via grep | As data via compose | As data via compose |
| `compose` command | ✗ | ✓ | ✓ |
| Harness auto-compose | ✗ | ✗ | ✓ |
| `.ralph/scaffold.tsx` | ✗ | If Ralph pipes output | ✓ automatic |
| WFC flow diversity | ✗ | If Ralph uses compose page | ✓ automatic |
| Post-completion diff | ✗ | ✗ | ✓ automatic |
| Console depth | Minimal | Command tracking | Full WFC pipeline trace |

Build Mode 3 first. Modes 1 and 2 are just disabling pieces of it.

---

## Harness Integration (Mode 3)

### The Flow

```
User: "Build me a SaaS pricing page"
                ↓
Ralph iteration 1: writes .ralph/plan.md, marks complete
                ↓
Harness intervention check:
  plan.md exists? YES
  scaffold.tsx exists? NO
  → Trigger composition pipeline:
      1. Parses plan for section intents (Orama keyword matching)
      2. Detects layout archetype from plan keywords (default: page-scroll)
      3. Runs WFC solver on archetype's adjacency graph:
         initializes cells from slots/intents, pre-collapses chrome slots,
         computes tile weights (structure.weight × atom_affinity × position_bias × noise)
      4. Collapses cells entropy-first, propagates flow/shape constraints along archetype edges
      5. Subdivides slots where applicable (second pass)
      6. Backtracks on contradiction (rare with ≤12 structures and soft constraints)
      7. Writes .ralph/scaffold.tsx with collapsed composition
      8. Appends composition notes to .ralph/feedback.md
      9. Resets .ralph/status.txt to "running"
                ↓
Ralph iteration 2: reads scaffold + feedback (fresh context)
  Builds from scaffold. Correct atoms imported, diverse structures
  pre-selected, slot markers in place, anti-pattern warnings embedded.
  Marks complete.
                ↓
Quality gates validate:
  Gates pass → done
  Gates fail → feedback.md updated, status reset to "running", iteration 3
                ↓
Harness (post-completion):
  Runs recipe-data diff (recommended vs actual atoms)
  Logs composition metrics to .ralph/reflections.jsonl
```

### When Harness Does NOT Compose

- `.ralph/plan.md` doesn't exist yet
- Plan doesn't match any recognizable intents — Ralph builds freehand
- `.ralph/scaffold.tsx` already exists — don't overwrite Ralph's work
- Task is modification, not construction

### Infrastructure: Two-Phase, Not Multi-Loop

Wiggum's Ralph loop is architecturally a multi-iteration loop (`for iteration = 1..20`) but behaviorally a **single run**. Ralph gets 50 tool calls per iteration — enough to read the task, plan, research skills, set a theme, write every file, and mark complete. Typical builds use 15–35 tool calls. Iteration 2+ only triggers today when quality gates fail, which is error recovery, not workflow.

Gumdrops Mode 3 doesn't change this. It introduces exactly one planned phase transition:

```
Iteration 1: Ralph reads task, writes .ralph/plan.md, marks complete
  ↓
Harness intervention check (between iterations):
  IF plan.md exists AND scaffold.tsx does NOT exist:
    → Run WFC solver, write scaffold.tsx + feedback.md
    → Reset status.txt to "running"
    → Loop naturally advances to iteration 2
  ELSE:
    → No intervention, gates evaluate as normal
  ↓
Iteration 2: Ralph reads scaffold + feedback with fresh context, implements, marks complete
  ↓
Gates validate → done
```

**The mechanism already exists in `loop.ts`.** When gates fail, `handleGateResult` resets `status.txt` to `"running"` and writes `feedback.md`, which causes the `for` loop to continue to the next iteration. The gumdrops harness does exactly the same thing — writes `scaffold.tsx` and `feedback.md`, ensures status stays `"running"`, and the loop naturally advances. No new control flow. No new mechanism. Just a new trigger condition.

**Where the intervention check lives:** After `callbacks?.onIterationEnd?.(iteration)` and before the gate checks at the end of the loop body. The check is:

```typescript
// Harness intervention: inject scaffold after planning iteration
if (config?.gumdrops?.mode === 3) {
  const planExists = await fileExists(fs, `${cwd}/.ralph/plan.md`)
  const scaffoldExists = await fileExists(fs, `${cwd}/.ralph/scaffold.tsx`)
  if (planExists && !scaffoldExists) {
    const scaffold = await runComposition(fs, cwd)  // WFC solver
    await fs.writeFile(`${cwd}/.ralph/scaffold.tsx`, scaffold.code)
    await fs.writeFile(`${cwd}/.ralph/feedback.md`, scaffold.notes)
    await fs.writeFile(`${cwd}/.ralph/status.txt`, 'running')
    callbacks?.onStatus?.('Composition scaffold generated')
    continue  // advance to next iteration
  }
}
```

**Why not multi-loop by default:** Fresh context per iteration is a cost, not a feature. Every new iteration re-reads all `.ralph/` state, rebuilds the full system prompt, and makes a new LLM call. If Ralph already has the context it needs in iteration 1's tool call chain, forcing a context break just to read the same state back from files is pure overhead. The current design pays this cost only when it's justified: gate failures (stale context needs refreshing with feedback) and harness intervention (new artifacts that didn't exist when Ralph started).

**Why not user-initiated multi-loop:** Follow-up messages already work as multi-loop. When the user sends "make the header sticky", `sendMessage()` starts a fresh `runRalphLoop()` with the new task. `origin.md` preserves the project's founding context. `.ralph/` state resets. This is user-initiated iteration — the user knows when the work needs to change. The harness doesn't need to guess.

**The iteration budget:** `MAX_ITERATIONS = 20` is a safety net, not a target. The expected iteration count per task:

| Scenario | Iterations | Why |
|----------|-----------|-----|
| Simple task, gates pass | 1 | Ralph completes in one tool batch |
| Simple task, gates fail once | 2 | Gate feedback → fix → pass |
| Gumdrops Mode 3, gates pass | 2 | Plan → harness scaffold → implement |
| Gumdrops Mode 3, gates fail once | 3 | Plan → scaffold → implement + fix |
| Complex task, multiple gate retries | 3–4 | Rare; usually means prompt needs tuning |
| 5+ iterations | Bug | Something is wrong with the task, prompt, or gates |

---

## Post-Completion Feedback

### Recipe-Data Diff

Compares what the composition recommended against what Ralph actually imported. No DOM analysis, no boredom validator — just two lists.

```
Composition feedback:
  Section: pricing (structure: comparison-matrix, atoms: pricing)
  ✓ Used: Table, Button, Badge, Tooltip, Toggle (5/7 recommended)
  ○ Unused: Separator, Tabs

  Page-level: 14 unique atoms imported. No dominant-component warnings.
```

Informational, never blocks.

### Reflection Logging

```json
{
  "taskId": "task-123",
  "composition": {
    "mode": 3,
    "archetype": "page-scroll",
    "sectionsPlanned": 5,
    "sectionsMatched": 5,
    "structuresUsed": ["split-panel", "bento-mosaic", "comparison-matrix", "carousel-rail", "stacked-sections"],
    "flowSequence": ["asymmetric", "dense", "symmetric", "linear", "open"],
    "flowContrastScore": 1.0,
    "atomSetsUsed": ["media", "features", "pricing", "social-proof", "empty-state"],
    "wfcBacktracks": 0,
    "wfcContradictions": 0,
    "atomsRecommended": 28,
    "atomsUsed": 21,
    "uniqueComponentsInOutput": 14
  }
}
```

Over time reveals: which pairings work, which atoms Ralph skips, whether Mode 3 measurably outperforms Modes 1 and 2.

---

## File Structure

```
skills/gumdrops/
├── SKILL.md              # Manifesto summary + compose reference
├── archetypes/           # ~6 layout topologies
│   ├── page-scroll.yaml
│   ├── shell.yaml
│   ├── split-view.yaml
│   ├── canvas.yaml
│   ├── wizard.yaml
│   └── multi-route.yaml
├── structures/           # ~10 spatial grammar rules
│   ├── grid-with-emphasis.yaml
│   ├── comparison-matrix.yaml
│   ├── sequential-flow.yaml
│   ├── feed-stream.yaml
│   ├── split-panel.yaml
│   ├── bento-mosaic.yaml
│   ├── carousel-rail.yaml
│   ├── stacked-sections.yaml
│   ├── sidebar-main.yaml
│   └── canvas-workspace.yaml
└── atoms/                # ~15 gestalt-informed palettes
    ├── pricing.yaml
    ├── features.yaml
    ├── auth.yaml
    ├── dashboard.yaml
    ├── messaging.yaml
    ├── data-display.yaml
    ├── form.yaml
    ├── navigation.yaml
    ├── media.yaml
    ├── social-proof.yaml
    ├── status.yaml
    ├── content.yaml
    ├── settings.yaml
    ├── empty-state.yaml
    └── overlay.yaml
```

~31 files. Bundled at build time via Vite `?raw`. Indexed in Orama.

---

## Extensibility

Every composition layer is data, not logic. The solver reads files and propagates weights. It has no hardcoded knowledge of specific structures, archetypes, or atom sets.

**What anyone can extend (YAML files, no code changes):**

| Layer | How to extend | Cap | Notes |
|-------|--------------|-----|-------|
| Archetypes | New YAML in `archetypes/` | No hard cap, ~8-10 covers all topologies | Define slots, adjacency graph, chrome flags |
| Atom sets | New YAML in `atoms/` | Unlimited | New domain = new atom set |
| Theme presets | New JSON in `themes/` | Unlimited | `theme` command discovers automatically |

**What the Wiggum developer extends (YAML files, guarded by principles):**

| Layer | How to extend | Cap | Guard |
|-------|--------------|-----|-------|
| Structures | New YAML in `structures/` | ≤12 | Principle 6: must stay spatial, no content leakage |
| Flow types | `flow` field in structure YAML | ≤5 | Principle 10: add one, remove one |

**What requires code changes:**

| Layer | How to extend | Notes |
|-------|--------------|-------|
| Shell commands | New TypeScript class | Command registration in executor |
| Quality gates | New TypeScript function | Gate pipeline in ralph loop |
| Solver logic | ≤100 LOC TypeScript | Should almost never change — if it needs to get smarter, the data is wrong |

**Project-level overrides (future):** The architecture supports project-local YAML that overrides or extends built-in definitions. A fintech project could ship a `trading` atom set in `.wiggum/atoms/trading.yaml`. A design agency could ship custom archetypes for their common project types. The harness loads project-level files alongside built-in ones, with project files taking precedence. No plugin API, no SDK — just files. This is the Wiggum philosophy: files as the universal interface.

---

## Implementation

| Phase | Work | Hours |
|-------|------|-------|
| Archetype definitions | Write ~6 archetype YAMLs with slot graphs, adjacency, chrome flags | 1–2 |
| Structure definitions | Write ~10 structure YAMLs with knobs, slots, flow types, and weights | 2–3 |
| Atom set definitions | Write ~15 atom set YAMLs with anti-patterns | 2–3 |
| `compose` command | Shell command: join structure + atoms, select knobs, emit scaffold | 3–4 |
| WFC solver | Graph-based constraint solver: archetype adjacency, cell init, entropy selection, weighted collapse, flow propagation, normalization, backtracking, subdivision | 2–3 |
| Archetype detection | Orama keyword matching on plan intents → archetype selection | 0.5–1 |
| `compose page` | Multi-section using WFC solver + dominant-component check + import dedup | 2–3 |
| Harness integration (Mode 3) | Plan parsing, archetype detection, auto-compose via WFC, scaffold + feedback writes | 2–3 |
| Harness intervention check | Trigger condition in loop.ts: plan exists + no scaffold → run composition, reset status | 0.5 |
| Mode switch | 3-mode config, conditional logic, console telemetry | 1–2 |
| Orama integration | Index archetypes, structures, and atom sets | 1 |
| Post-completion diff | Recommended vs actual atoms | 1–2 |
| Reflection logging | Composition metrics in reflections.jsonl | 1 |
| `cat @wiggum/stack` enhancement | Derive "pairs with" from atom set data | 1–2 |
| System prompt | Per-mode variants | 0.5 |
| **Total** | | **~21–29 hours** |

---

## Principles

1. **Archetypes, structures, and atoms are independent primitives.** Archetypes define topology. Structures define spatial shape. Atoms define material. None prescribes the output alone. Composition happens when they combine. This is a grammar, not a catalog. *(Shape grammars)*

2. **No combination is forbidden.** Unusual pairings may be flagged, never blocked. Creative composition means allowing the unexpected. *(Shape grammars: rules apply to any shape in the vocabulary)*

3. **The harness composes, Ralph implements.** In Mode 3, Ralph receives a scaffold automatically. Ralph's creativity lives in how it fills the scaffold. *(Harness controls, not suggestions)*

4. **Anti-slop through constraint solving, not rules.** The WFC solver enforces shape uniqueness *(hard constraint)* and flow type contrast *(soft constraint)* through propagation, not counting. Knob randomization prevents run-to-run sameness *(musical variation)*. Atom set breadth prevents component poverty *(gestalt diversity)*. No minimums, no mandates, no manual re-rolling.

5. **Ralph uses atoms, never invents them.** The 60 `@wiggum/stack` components are the complete material. Gumdrops ensures Ralph uses more of them, more diversely. Ralph never fabricates beyond the library.

6. **Structures must stay spatial.** If a proposed structure can't be described without mentioning content, it's a template, not a structure. If it can be described as an existing structure with different knobs, it's a knob value, not a new structure. Keep the grammar at ~10–12 structures maximum. *(Shape grammars: rules describe spatial relations, not content)*

7. **The system learns.** Reflection data drives evolution. Affinity scores are earned from output quality data, not assumed from theory. Weak recipes get rewritten. Missing patterns get added.

8. **Three modes for empirical comparison.** Suggestive, commanding, and programmatic — same data, different levels of harness control. Test which approach produces the best results rather than theorizing.

9. **Six mathematical and theoretical foundations.** Sacred geometry governs color *(OKLCH)*. Shape grammars govern spatial composition. Musical form governs page-level rhythm. Gestalt governs perceptual grouping. Modular scale governs proportional consistency. Wave Function Collapse governs compositional constraint solving. Pattern Language provides the philosophical commitment to aliveness over correctness. Each is independently variable, combinatorially powerful, and grounded in established theory rather than aesthetic opinion.

10. **The solver stays dumb.** ≤100 LOC. ≤5 flow types. ≤12 structures. ≤8 archetypes. No propagation dimension gets added without removing one. The YAML evolves; the algorithm doesn't. Normalize weights after every adjustment. If the solver needs to get smarter, the data is wrong.

11. **Single run by default.** Ralph completes in one iteration. Multi-iteration is error recovery (gate failures) or harness intervention (scaffold injection), never the happy path. Fresh context per iteration is a cost paid only when justified. `MAX_ITERATIONS` is a safety net, not a target. If a task regularly needs 5+ iterations, the prompt or gates need tuning, not the loop.
