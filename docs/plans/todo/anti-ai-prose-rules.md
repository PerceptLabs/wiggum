# Anti-AI Prose Rules

> A ruleset for reducing AI texture in the text content Ralph writes into generated software. Headings, descriptions, button labels, feature copy, empty states, tooltips, error messages — every string literal in the output. This isn't about articles or blog posts. This is about the words users see in the UI.

---

## WHY THIS EXISTS

AI-generated software has two slop layers. Layer one is visual: purple gradients, three-card grids, generic layouts. The gumdrop system, ESLint rules, and visual review handle that. Layer two is textual: the words inside the components. A beautifully composed pricing section still screams "AI made this" if every tier says "Unlock Your Potential" and every button says "Get Started."

The existing `no-placeholder-content` ESLint rule catches "Lorem ipsum" and "Your X here." That's the floor. This document defines the ceiling — prose that sounds like a human wrote it for a specific product, not like a model autocompleted the most probable next token.

---

## THE CORE INSIGHT: DENSITY, NOT BANS

No single word is the problem. "Seamless" is a perfectly good word. "Robust" has legitimate uses. "Tapestry" belongs in a textile marketplace. The problem is **density** — when AI-isms cluster together, the text develops a recognizable texture that reads as machine-generated to humans.

> ❌ "**Unleash** the power of **seamless** collaboration — not just a tool, but a **comprehensive** platform **designed to** **elevate** your workflow"

That's 5 AI markers in one sentence. Any single one of those words is fine in isolation. Together they produce the unmistakable AI texture. That sentence couldn't have been written by a human copywriter because no human stacks those words that way.

> ✅ "See who's working on what. Updates every 3 seconds."

Zero markers. Specific. Human.

The enforcement philosophy: **any word is fine once. Clustering is the signal.** We measure texture density, not individual words. And crucially, we reward specificity — concrete detail (numbers, mechanics, constraints) reduces the density score. This means the system pushes Ralph toward better copy, not just less copy. The pressure goes in two directions: away from generic AI-isms, toward specific human detail.

This is borrowed from how prose linters like write-good work — they flag patterns and let the author decide, rather than banning vocabulary.

---

## THE AI-ISM DICTIONARY

These tables are reference material for the density checker and for recipe authors. They are **not a blocklist**. Every word here has legitimate uses. The checker counts how many appear per text block and only flags when the density crosses a threshold.

### Tier 1 — High-Signal AI-isms

These words appear with dramatically higher frequency in AI-generated text than in human-written copy. Each individual occurrence adds to the density score.

| Word | Why it's a signal | What humans usually write |
|------|-------------------|--------------------------|
| delve | Almost never appears in UI copy | explore, dig into, look at |
| tapestry | Metaphorical usage is almost always AI | (usually unnecessary) |
| leverage | Corporate jargon preferred by LLMs over "use" | use |
| utilize | Same as leverage | use |
| harness | LLMs strongly prefer this over "use" | use, work with |
| elevate | AI's favorite verb for improvement | improve, boost |
| embark | AI's favorite verb for starting | start, begin, try |
| unleash | AI's favorite verb for releasing | release, open, start |
| unlock | AI's favorite verb for enabling (unless literal lock) | access, open, enable, get |
| unveil | AI's favorite verb for revealing | show, reveal, announce |
| empower | The #1 AI corporate buzzword | help, enable, let you |
| foster | AI's favorite verb for supporting | support, encourage, build |
| streamline | AI's favorite verb for simplifying | simplify, speed up, cut |
| revolutionize | AI's favorite verb for changing | change, improve, rethink |
| realm | AI's favorite noun for "area" | area, field, space |
| beacon | AI's favorite metaphorical noun | (usually unnecessary) |
| spearhead | AI's favorite verb for leading | lead, drive, run |
| underscore | AI's favorite verb for emphasizing (unless literal `_`) | highlight, emphasize |
| pivotal | AI's favorite adjective for importance | important, key, critical |
| robust | AI's favorite adjective for quality | strong, solid, reliable |
| seamless | AI's favorite adjective for smooth | smooth, easy, simple |
| cutting-edge | Cliché since 2005, now an AI marker | modern, new, latest |
| game-changer | AI's favorite noun for impact | (describe what actually changed) |
| comprehensive | AI's way of saying "I covered stuff" | complete, full, thorough |
| multifaceted | AI's way of saying "complex" | (be specific about the facets) |
| meticulous | AI's favorite adjective for care | careful, precise, detailed |
| nuanced | Ironic because AI output usually lacks it | (be specific about the nuance) |
| testament | AI's favorite noun for proof | proof, sign, evidence |
| bustling | AI's go-to for describing activity | active, busy, lively |
| vibrant | AI's go-to for describing color/energy | (use the actual color or mood) |

### Tier 2 — High-Signal AI Phrases

These multi-word patterns are stronger signals than individual words. Each match adds to the density score with higher weight.

| Pattern | Example | What humans write |
|---------|---------|-------------------|
| "Navigate [concept]" | "Navigate your finances" | "Manage your money" |
| "Journey" as metaphor | "Your fitness journey" | "Your progress" or "Your training" |
| "Landscape" as metaphor | "The marketing landscape" | "Marketing today" or just cut it |
| "Dive into [topic]" | "Dive into analytics" | "See your analytics" |
| "In today's [adjective] world" | "In today's fast-paced world" | (delete the entire sentence) |
| "Whether you're a [X] or [Y]" | "Whether you're a beginner or expert" | (just state what the thing does) |
| "From [X] to [Y]" as range | "From startups to enterprises" | "For teams of any size" or be specific |
| "Take [noun] to the next level" | "Take your business to the next level" | (say what specifically improves) |
| "Everything you need" | "Everything you need in one place" | (list what's actually included) |
| "Designed to [verb]" | "Designed to enhance your workflow" | (describe the actual feature) |
| "Say goodbye to [pain]" | "Say goodbye to manual reporting" | "No more manual reports" |
| "Say hello to [benefit]" | "Say hello to automated insights" | "Reports run themselves" |
| "[X] meets [Y]" | "Where productivity meets simplicity" | (delete on sight) |
| "Not just [X], but [Y]" | "Not just a tool, but a partner" | (just say what it is) |
| "Imagine a world where" | "Imagine a world where your data works for you" | (describe reality, not hypotheticals) |

### Tier 3 — Structural Patterns

These are higher-order patterns that contribute to AI texture. Scored separately from word/phrase density.

**The Tricolon.** AI loves groups of three with parallel structure:
> "Plan. Build. Ship." / "Simple. Fast. Reliable." / "Create, collaborate, and conquer."

Not inherently bad — it's a legitimate rhetorical device. But when every section uses it, the repetition screams AI. **At most once per project, and not in the hero.**

**The emoji-per-feature list:**
> "🚀 Launch faster · 📊 Track everything · 🔒 Stay secure"

So strongly associated with AI output it's become a parody. **Zero emojis in feature lists unless the user explicitly asks for them.**

**The parallel-structured benefit triple:**
> "Save time with automated workflows. Focus on what matters with smart filtering. Scale effortlessly with cloud infrastructure."

Three sentences, identical structure, hitting three unrelated benefits. AI padding. **If you have three benefits, present them differently from each other.**

**The alternating em-dash intensifier:**
> "Not just fast — blazingly fast. Not just simple — effortlessly simple."

One em-dash for emphasis is fine. A pattern of em-dashes used identically is an AI fingerprint.

---

## CTA, HEADING, AND COPY GUIDANCE

These aren't enforcement rules — they're positive guidance for writing better UI copy. They complement the density checker by telling Ralph what to write *toward*, not just what to avoid.

### CTA Button Copy

AI defaults to the same 5 button labels for everything. These are the mode of the CTA distribution.

**High-density CTA labels** (each one counts toward density score):

| CTA | Why it's a signal | Better alternatives |
|-----|-------------------|---------------------|
| "Get Started" | The #1 AI default for everything | Specific action: "Create project," "Start free trial," "Build your first [thing]" |
| "Learn More" | Meaningless — learn more about what? | "See pricing details," "Read the docs," "Watch demo" |
| "Sign Up Now" | The "now" adds fake urgency | "Create account," "Join [product name]," "Sign up free" |
| "Discover More" | "Discover" is AI-speak for "click this" | "See features," "Browse templates," "Explore the catalog" |
| "Start Your Journey" | Nobody's on a journey, they're using software | "Try it free," "Create your first [thing]" |
| "Unlock [Feature]" | See Tier 1 dictionary | "Enable [feature]," "Turn on [feature]," "Add [feature]" |
| "Transform Your [X]" | AI marketing-speak | "Improve your [X]" or describe the specific change |
| "Unleash Your Potential" | Peak AI slop. The final boss. | Literally anything else. |

**Positive CTA principles:**
1. Every button describes a **specific action**, not a vague invitation
2. The user should know what happens when they click before they click
3. No fake urgency: "now," "today," "don't miss out"
4. First-person CTAs are fine and often better: "Start my trial," "Show me pricing"
5. CTA text comes from the product domain. A recipe app says "Save recipe." A project tool says "Create board."

### Heading Copy

AI headings follow predictable formulas. The heading is the most visible text on the page — if it reads as AI, the entire page feels generated.

**High-density heading patterns:**

| Pattern | Example | Why it's a signal |
|---------|---------|-------------------|
| "The [Adj] Way to [Verb]" | "The Smart Way to Manage Projects" | AI formula #1 |
| "[Verb] Your [Noun] with [Product]" | "Transform Your Workflow with FlowBoard" | AI formula #2 |
| "Welcome to [Product]" | "Welcome to TaskMaster" | Wastes the most valuable real estate on the page |
| "[Product]: Your [Adj] [Noun]" | "DataSync: Your Ultimate Analytics Platform" | AI formula #3 |
| "[Adj] [Noun] for [Audience]" | "Powerful Analytics for Modern Teams" | Every AI writes this exact pattern |
| "All-in-One [Category] Platform" | "All-in-One Project Management Platform" | The "all-in-one" claim is always AI + always false |
| "The Future of [Category]" | "The Future of Team Collaboration" | Grandiose claim, zero specificity |
| "[Verb] [Object], [Verb] [Object]" | "Track Tasks, Ship Faster" | AI's favorite two-clause headline |

**Positive heading principles:**
1. Say what the product **does**, not what it **is**. "Track every package from warehouse to doorstep" beats "The Ultimate Shipping Platform."
2. Specificity over superlatives. "See your site's performance in 200ms" beats "Blazing Fast Analytics."
3. Numbers beat adjectives. "Used by 2,400 teams" beats "Trusted by teams worldwide."
4. Test: if you can swap the product name for any competitor and the heading still works, it's too generic.

### Feature Descriptions

AI writes feature descriptions in a recognizable three-part formula: [Adjective] [noun]. [Sentence explaining it]. [Sentence about the benefit].

**High-density feature patterns:**

| Pattern | Example | Problem |
|---------|---------|---------|
| "Powerful [feature]" | "Powerful Analytics" | "Powerful" is meaningless |
| "Advanced [feature]" | "Advanced Reporting" | "Advanced" compared to what? |
| "Intuitive [feature]" | "Intuitive Interface" | Self-congratulatory. Let the user decide. |
| "Beautiful [feature]" | "Beautiful Dashboards" | Also self-congratulatory. Show, don't tell. |
| "Effortless [noun]" | "Effortless Collaboration" | Nothing is effortless. Overselling. |
| "Smart [feature]" | "Smart Notifications" | AI calling itself smart is like a restaurant saying "delicious food" |
| "{Feature} that just works" | "Syncing that just works" | Stolen from Apple, now an AI cliché |
| "Built with [audience] in mind" | "Built with developers in mind" | AI filler — describe the feature |
| "Everything you need to [verb]" | "Everything you need to scale" | Too vague. List what's actually included. |
| "Take control of your [noun]" | "Take control of your data" | AI empowerment-speak |

**Positive feature principles:**
1. Lead with what the feature **does**, not what it **is**
2. Include a **specific detail** — a number, a mechanic, a constraint. "Syncs every 30 seconds across all devices" beats "Real-time sync."
3. If the description could apply to any product in the category, it's too generic.
4. No self-congratulatory adjectives (powerful, beautiful, intuitive, smart, elegant). Let the UI speak for itself.
5. Active voice. "Drag tasks between columns" not "Tasks can be dragged between columns."

### Empty States, Errors, and Microcopy

AI has strong convergence patterns for short UI text. These small strings are where AI-isms are most insidious.

**High-density microcopy patterns:**

| Pattern | Example | Write instead |
|---------|---------|---------------|
| "Nothing here yet!" | Generic across all empty states | "No projects yet. Create your first one." |
| "Get started by [verb]ing" | "Get started by creating a project" | "Create a project" (just the action) |
| "It looks like you haven't..." | "It looks like you haven't added any tasks" | "No tasks yet" (shorter, no judgment) |
| "Welcome! Let's get you set up" | AI onboarding default | "Set up your workspace" or a specific first action |
| "Oops! Something went wrong" | The #1 AI error message | "[What happened]. [What to do about it]." |
| "We're sorry, an error occurred" | Over-apologetic AI pattern | "Couldn't save — check your connection." |

**Positive microcopy principles:**
1. Error messages: **what** went wrong + **what to do about it**. No apologies, no "oops."
2. Empty states: the **fact** (no items) + the **action** (create one). No narrative preamble.
3. Tooltips: one sentence, plain language. "Edit the project name." Not "This feature allows you to..."
4. Confirmations: state the **consequence**. "Delete this project? Its 12 tasks will be permanently removed."
5. Loading states: if fast, show nothing. If >2 seconds, say what's happening: "Loading your dashboard"
6. Success states: confirm the action. "Project created." Not "Great job! You've successfully created a project! 🎉"

### Brand Name Generation

When Ralph generates demo/placeholder content, it often needs a product name. AI defaults to a predictable cluster.

**High-density name patterns:**

| Pattern | Examples | Why |
|---------|---------|-----|
| Latin/Greek roots + tech suffix | Nexus, Synapse, Vertex, Prism, Helix | The top of the AI name distribution |
| [Verb]ify | Taskify, Flowify, Datafy | Overplayed pattern |
| [Noun]ly | Projectly, Meetly, Chartly | Same as above |
| [Noun]hub | TaskHub, DataHub, TeamHub | Generic compound |
| One-syllable "energy" words | Bolt, Flux, Volt, Rush, Surge, Pulse | Extremely convergent (the VOLT problem) |
| [Noun]AI or AI[Noun] | TaskAI, AIFlow, SmartAI | Dated within months of GPT hype |
| Generic aspirational words | Zenith, Apex, Summit, Pinnacle | AI's favorite class of brand names |

**Positive naming principles:**
1. Use the name the user provides. If the user said "build me a tool called Mango," the name is Mango.
2. If no name is provided, the plan's philosophy should guide naming. A brutalist tool might be "Slab." A playful app might be "Wobble."
3. Two-word names with unexpected combinations are more distinctive: "Quiet Wire," "Paper Engine," "Slow Glass."

---

## ENFORCEMENT: THE PROSE DENSITY CHECKER

### Architecture: Borrowing from write-good

[write-good](https://github.com/btford/write-good) is a proven prose linter (stable since 2014, no breaking changes) with the exact architecture we need:

- **Pure JavaScript**, browser-compatible — no server, no binary, no Python
- Takes a string → returns an array of `{index, offset, reason}` hits
- **Extensible** via custom check functions — you pass in new matchers, they follow the same interface
- **Naive by design** — pattern matching, not ML. Fast, predictable, deterministic
- Checks for weasel words, passive voice, clichés, wordy phrases — the same class of problem we're solving

We don't import write-good as a dependency (esm.sh compatibility unknown, and we only need a fraction of its surface). We borrow its **architecture** to build a Wiggum-native prose checker that runs as part of the quality gate pipeline.

**Also considered:**

- **Vale** (Go binary) — the most sophisticated prose linter. Defines rules via YAML with typed extension points: `existence`, `substitution`, `occurrence` (threshold-based), `repetition`, `consistency`. The `occurrence` type is closest to our density concept. But it's Go, not browser-native. We borrow its concept of threshold-based occurrence checking.

- **proselint** (Python) — best curated rules, based on advice from Strunk, Orwell, Pinker. Catches `corporate_speak.misc` and `cliches.garner`. But it's Python, can't run in browser. We borrow its philosophy that the linter catches "all that makes prose worse" rather than grammar errors.

- **textlint** (Node.js, pluggable) — wraps write-good, proselint, and others as plugins. The plugin architecture is interesting but the setup cost is high and we only need one check. We borrow the idea that prose rules should be composable and disableable.

None of these tools have a density/clustering concept. They all flag individual occurrences. Our contribution is measuring texture across a block of text — the insight that any one word is fine but clustering is the signal.

### The `prose-check` Module

A single function that takes extracted UI strings and returns density scores. Sits alongside the existing structure and error collectors in the quality gate.

```typescript
// src/lib/quality/prose-check.ts

// --- Types (borrowing write-good's hit pattern) ---

interface ProseHit {
  index: number      // position in the text
  offset: number     // length of the match
  reason: string     // human-readable explanation
  tier: 1 | 2 | 3   // signal strength
  weight: number     // contribution to density score
}

interface ProseDensityResult {
  text: string            // the original text block
  hits: ProseHit[]        // all individual matches
  density: number         // effective density (after specificity bonus + profile)
  flag: boolean           // true if density exceeds threshold AND hits >= 2
  specificity: number     // concrete detail score (numbers, verbs, constraints)
  profile: ProseProfile   // domain weight profile used
  component?: string      // which component this text came from
}

// --- The dictionary (from our tables above) ---

const TIER_1_WORDS: string[] = [
  'delve', 'tapestry', 'leverage', 'utilize', 'harness',
  'elevate', 'embark', 'unleash', 'empower', 'foster',
  'streamline', 'revolutionize', 'realm', 'beacon',
  'spearhead', 'underscore', 'pivotal', 'robust',
  'seamless', 'cutting-edge', 'game-changer', 'comprehensive',
  'multifaceted', 'meticulous', 'nuanced', 'testament',
  'bustling', 'vibrant',
]

const TIER_2_PHRASES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /in today'?s \w+ world/i, reason: '"In today\'s [adj] world" is an AI pattern' },
  { pattern: /whether you'?re a/i, reason: '"Whether you\'re a..." is an AI pattern' },
  { pattern: /everything you need/i, reason: '"Everything you need" is vague AI copy' },
  { pattern: /designed to \w+/i, reason: '"Designed to [verb]" is AI filler' },
  { pattern: /say goodbye to/i, reason: '"Say goodbye to..." is an AI pattern' },
  { pattern: /say hello to/i, reason: '"Say hello to..." is an AI pattern' },
  { pattern: /where \w+ meets \w+/i, reason: '"[X] meets [Y]" is an AI tagline formula' },
  { pattern: /not just \w+,? but/i, reason: '"Not just X, but Y" is an AI pattern' },
  { pattern: /imagine a world/i, reason: '"Imagine a world..." is an AI opener' },
  { pattern: /take .+ to the next level/i, reason: '"Take X to the next level" is AI copy' },
  { pattern: /the future of \w+/i, reason: '"The future of [X]" is an AI heading formula' },
  { pattern: /all-in-one/i, reason: '"All-in-one" is an overused AI claim' },
  { pattern: /start your journey/i, reason: '"Start your journey" is an AI CTA' },
  { pattern: /unleash your potential/i, reason: '"Unleash your potential" is peak AI slop' },
  { pattern: /unlock the power/i, reason: '"Unlock the power" is peak AI slop' },
  // Extend as new patterns emerge
]

// --- Weights ---

const TIER_1_WEIGHT = 1.0   // each Tier 1 word hit
const TIER_2_WEIGHT = 2.0   // each Tier 2 phrase hit (stronger signal)
const TIER_3_WEIGHT = 1.5   // each structural pattern hit

// --- The check function (write-good's pattern) ---

function checkAIisms(text: string): ProseHit[] {
  const hits: ProseHit[] = []

  // Tier 1: individual word scan
  for (const word of TIER_1_WORDS) {
    const re = new RegExp(`\\b${word}\\b`, 'gi')
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      hits.push({
        index: match.index,
        offset: match[0].length,
        reason: `"${match[0]}" is a known AI-ism`,
        tier: 1,
        weight: TIER_1_WEIGHT,
      })
    }
  }

  // Tier 2: phrase pattern scan
  for (const { pattern, reason } of TIER_2_PHRASES) {
    const re = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'
    )
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) !== null) {
      hits.push({
        index: match.index,
        offset: match[0].length,
        reason,
        tier: 2,
        weight: TIER_2_WEIGHT,
      })
    }
  }

  return hits
}

// --- Domain weight profiles ---
// Set by Chief in the plan. Adjusts how aggressively we penalize
// formal language that's legitimate in certain domains.

type ProseProfile = 'consumer' | 'enterprise' | 'academic'

const PROFILE_MULTIPLIERS: Record<ProseProfile, number> = {
  consumer: 1.0,    // full sensitivity — marketing copy should be clean
  enterprise: 0.7,  // "robust distributed systems" is normal here
  academic: 0.5,    // "comprehensive analysis" is standard language
}

// --- The specificity signal ---
// Instead of only penalizing AI texture, reward concrete detail.
// This prevents over-correction toward sterile, lifeless copy.
// Ralph can lower his density score by being specific — not by being terse.

function scoreSpecificity(text: string): number {
  let score = 0
  if (/\d+/.test(text)) score += 1                                    // numbers
  if (/(ms|seconds?|minutes?|hours?|days?|weeks?)/i.test(text)) score += 1  // time units
  if (/(drag|click|sync|upload|export|delete|create|filter|sort|search|copy|paste|edit|save|download)/i.test(text)) score += 1  // concrete UI verbs
  if (/(max|limit|up to|every|within|between|under|over|at least|at most)/i.test(text)) score += 1  // constraints
  return score
}

// --- The density scorer ---

function scoreRawDensity(text: string, hits: ProseHit[]): number {
  if (text.length === 0) return 0
  const weightedSum = hits.reduce((sum, h) => sum + h.weight, 0)
  // Normalize: weighted hits per 100 characters of text
  return (weightedSum / text.length) * 100
}

function scoreEffectiveDensity(
  text: string,
  hits: ProseHit[],
  profile: ProseProfile = 'consumer'
): number {
  const raw = scoreRawDensity(text, hits)
  const specificity = scoreSpecificity(text)
  const profileMultiplier = PROFILE_MULTIPLIERS[profile]

  // Specificity bonus: each concrete detail subtracts 0.5 from density
  // Profile multiplier: enterprise/academic text is judged more leniently
  return Math.max(0, (raw - specificity * 0.5) * profileMultiplier)
}

// --- The threshold ---

const DENSITY_THRESHOLD = 1.5  // flag when effective score exceeds this

// Calibration examples:
//
// "Unleash the power of seamless collaboration" (45 chars, 3 T1 hits)
//   raw: (1+1+1)/45*100 = 6.67
//   specificity: 0 (no numbers, no verbs, no constraints)
//   effective: 6.67 × 1.0 = 6.67 — FLAGGED
//
// "See who's on your site right now. Updates every 3 seconds." (58 chars, 0 hits)
//   raw: 0
//   specificity: 3 (number "3", time unit "seconds", constraint "every")
//   effective: 0 — clean
//
// "Our robust API handles 10,000 requests per second" (50 chars, 1 T1 hit)
//   raw: 1/50*100 = 2.0
//   specificity: 2 (number "10,000", time unit "second")
//   effective: (2.0 - 1.0) × 1.0 = 1.0 — clean (specificity saved it)
//
// "Our robust API handles requests" (31 chars, 1 T1 hit)
//   raw: 1/31*100 = 3.23
//   specificity: 0
//   effective: 3.23 — but only 1 hit, so hits >= 2 rule saves it
//
// "A robust, comprehensive monitoring framework" (44 chars, 2 T1 hits, enterprise)
//   raw: 2/44*100 = 4.55
//   specificity: 0
//   effective: 4.55 × 0.7 = 3.18 — FLAGGED (still high even with enterprise)
//
// "A robust, comprehensive monitoring framework with 99.9% uptime SLA" (66 chars, 2 T1 hits, enterprise)
//   raw: 2/66*100 = 3.03
//   specificity: 1 (number "99.9")
//   effective: (3.03 - 0.5) × 0.7 = 1.77 — FLAGGED (borderline)

// --- Public API ---

export function checkProse(
  text: string,
  component?: string,
  profile: ProseProfile = 'consumer'
): ProseDensityResult {
  const hits = checkAIisms(text)
  const density = scoreEffectiveDensity(text, hits, profile)
  return {
    text,
    hits,
    density,
    flag: density > DENSITY_THRESHOLD && hits.length >= 2,
    specificity: scoreSpecificity(text),
    profile,
    component,
  }
}
```

### How It Integrates

The prose checker sits in the **quality gate pipeline** alongside the structure collector and error collector. It runs after Ralph writes a file, before the build-and-preview step.

```
Ralph writes file
  → ESLint runs (structure collector catches no-hardcoded-colors, etc.)
  → Prose checker extracts string literals from JSX
  → Prose checker scores each text block:
      1. Scan for AI-ism hits (Tier 1 words, Tier 2 phrases)
      2. Compute raw density (weighted hits / text length)
      3. Compute specificity bonus (numbers, time units, concrete verbs, constraints)
      4. Apply domain profile multiplier (consumer/enterprise/academic from plan)
      5. Effective density = (raw - specificity × 0.5) × profile multiplier
      6. Flag only if effective density > 1.5 AND hits >= 2
  → Results added to gate context
  → Flagged components produce warnings in Ralph's next iteration
```

**String extraction:** The checker pulls text content from JSX by scanning for:
- String literals inside JSX elements: `<h1>This text</h1>`
- String attributes: `label="This text"`, `placeholder="This text"`
- Template literals in JSX: `` <p>{`This ${text}`}</p> ``

This extraction piggybacks on the existing ESLint AST traversal — the same visitor that checks `no-placeholder-content` can feed strings to the prose checker.

**Per-component scoring:** Density is measured per text block, not per file. A file with 10 components could have clean prose in 9 and AI-textured prose in 1. The checker reports which component has the problem.

**Warning format** (what Ralph sees):

```
⚠ prose-density: effective score 4.2 (threshold: 1.5) in <HeroSection>
  Profile: consumer | Specificity bonus: 0 | Hits: 3
  "seamless" (T1), "designed to enhance" (T2), "comprehensive" (T1)
  Add specific details (numbers, mechanics, constraints) to reduce score.
```

Ralph sees the effective score, the profile, the specificity bonus, and each hit. If Ralph adds a concrete number or mechanic, the specificity bonus subtracts from the score — rewarding detail, not just penalizing vocabulary. This is a **warning, not an error** — the build still succeeds.

### Why Density, Not Bans

| Approach | Problem |
|----------|---------|
| Hard ban on "seamless" | Blocks "seamless API migration" which is legitimate |
| Hard ban on "robust" | Blocks "a robust test suite" which is normal |
| Hard ban on "tapestry" | Blocks a literal textile marketplace |
| Density scoring | "seamless API migration" in plain prose → score 0.5 → fine |
| Density scoring | "seamless, robust, comprehensive platform that empowers" → score 8.0 → flagged |
| Density + specificity | "robust API handling 10,000 req/s" → specificity bonus cancels the hit → fine |
| Density + profile | "robust distributed systems" in enterprise profile → 0.7× multiplier → fine |

The density approach captures the *texture* — the thing humans actually perceive as "this sounds like AI." Individual words are invisible. Clusters are unmistakable. The specificity bonus ensures Ralph can escape density warnings by adding concrete detail rather than just deleting words — preventing the system from producing sterile, lifeless copy.

### Extending the Dictionary

New AI-isms emerge as models update. The dictionary is a plain array — adding a new word or pattern is a one-line change:

```typescript
// Someone notices Ralph keeps writing "bespoke"
TIER_1_WORDS.push('bespoke')

// Someone notices a new phrase pattern
TIER_2_PHRASES.push({
  pattern: /curated .+ experience/i,
  reason: '"Curated [X] experience" is an AI pattern'
})
```

No build step, no config file, no YAML. The write-good extension pattern is deliberately simple to maintain.

**Dictionary governance — preventing bloat:**

New entries must meet all three criteria:

1. **5+ observed Ralph occurrences.** The word/pattern must appear in at least 5 separate Ralph-generated files. One-off usage doesn't justify a dictionary entry.
2. **Confirmed clustering behavior.** The word/pattern must have been observed clustering with other AI-isms, not appearing in isolation. If it always appears alone in otherwise clean copy, it's domain vocabulary, not an AI-ism.
3. **Not domain-dependent.** The word/pattern must be a signal across multiple product domains. If it's only a signal in consumer apps but normal in enterprise/academic contexts, adjust the domain profile weights instead of adding it to the dictionary.

This keeps the dictionary intentional and prevents the system from drifting toward a 500-word blocklist. The dictionary should grow slowly — a few additions per quarter, not per week.

---

## THE CONDENSED SYSTEM PROMPT INSERT

This block goes into Ralph's base system prompt. ~200 tokens, always loaded. Uses soft language — it tells Ralph what to watch for and what good copy looks like, not absolute prohibitions.

```
PROSE QUALITY:
Your UI copy must sound human-written. AI-generated text has a recognizable
texture when certain words and patterns cluster together. Any ONE of these
is fine — but if you're stacking multiple in the same paragraph, rewrite
with specifics instead.

High-signal AI words: delve, tapestry, leverage, utilize, harness, elevate,
embark, unleash, unlock (unless literal), unveil, empower, foster, streamline,
revolutionize, realm, robust, seamless, cutting-edge, comprehensive, pivotal.

High-signal AI patterns to avoid stacking:
- "The [Adj] Way to [Verb]" headings
- "Whether you're a [X] or [Y]"
- "In today's [adj] world"
- "[X] meets [Y]" taglines
- Emoji-per-feature lists (🚀📊🔒)
- Parallel-structured benefit triples

CTA buttons: describe the specific action, not a vague invitation.
"Create project" not "Get Started." "See pricing" not "Learn More."

Feature copy: include a specific detail (number, mechanic, constraint).
"Syncs every 30 seconds" not "Real-time sync."

Error messages: what happened + what to do. No "Oops!" or apologies.
Empty states: fact + action. "No projects yet. Create one →"
```

---

## RELATIONSHIP TO OTHER SYSTEMS

### Convergence-Based Design Decisions

The AI-ism dictionary is the textual equivalent of the Known Modes concept. Just as "three identical pricing cards" is the visual mode, "Unlock Your Potential" is the prose mode. Both are distribution peaks that every AI converges on. Density scoring catches textual convergence the same way the similarity gate catches visual convergence.

### Gumdrop Recipes

Each recipe's anti-patterns section should include **domain-specific AI-isms** that are too narrow for the global dictionary. The pricing recipe notes that "Choose Your Plan" + "Get Started" + checkmark lists is the pricing prose mode. The hero recipe notes that "Welcome to [Product]" + gradient + centered CTA is the hero prose mode. These are loaded per-section via the skill lookup gate, supplementing the global density checker with context-aware guidance.

### ESLint Integration

The existing `no-placeholder-content` rule catches the floor (Lorem ipsum, "Your X here"). The prose density checker catches the ceiling (AI texture). They're complementary, not overlapping. The density checker could be implemented as a new ESLint rule (`no-ai-texture`) or as a standalone quality gate step — the choice depends on whether we want it in the AST traversal or in a post-build analysis pass.

### Quality Pipeline

Prose density fits into the quality gate context alongside structure and error collectors:

```typescript
interface GateContext {
  errorCollector: ErrorCollector          // runtime errors
  structureCollector: StructureCollector  // ESLint findings
  proseChecker: ProseChecker             // density scores ← new
}
```

The `proseProfile` value comes from the plan. When Chief writes the plan, it includes a prose profile field:

```typescript
// In the plan object
proseProfile: 'consumer' | 'enterprise' | 'academic'
```

Chief selects this based on the product domain. A SaaS marketing page gets `consumer`. An infrastructure monitoring dashboard gets `enterprise`. A research tool gets `academic`. If not specified, defaults to `consumer` (strictest).

The gate doesn't reject on prose density alone — it adds warnings to Ralph's next iteration context, giving Ralph the opportunity to rewrite. Repeated high-density warnings across iterations could escalate, but the initial implementation is advisory.

---

## WHAT GOOD UI COPY LOOKS LIKE

For reference — not templates, but examples of the voice that naturally scores low on AI density.

**Hero heading:**
- ❌ "Revolutionize Your Workflow with TaskFlow" → density ~6.0
- ✅ "Know where every task is. Always." → density 0

**Feature description:**
- ❌ "Powerful real-time analytics that provide comprehensive insights into your data." → density ~5.0
- ✅ "See who's on your site right now. Updates every 3 seconds." → density 0

**CTA button:**
- ❌ "Get Started Free" → density ~3.0 (short text, high concentration)
- ✅ "Create your first project" → density 0

**Empty state:**
- ❌ "Welcome! It looks like you haven't created any projects yet. Get started by clicking the button below!" → density ~2.5
- ✅ "No projects yet. Create one →" → density 0

**Error message:**
- ❌ "Oops! Something went wrong. We're sorry for the inconvenience." → density ~1.5
- ✅ "Couldn't save. Check your connection and try again." → density 0

**Feature list:**
- ❌ "🚀 Blazing fast performance · 🔒 Enterprise-grade security · 📊 Advanced analytics" → density ~4.0
- ✅ "Pages load in under 200ms. SOC 2 compliant. Query 90 days of data." → density 0

The pattern: specificity, brevity, plain language, and concrete details naturally produce low-density prose. You don't need to memorize the dictionary — just write specific copy and the density takes care of itself. The specificity bonus means Ralph's best escape route from density warnings is adding concrete detail: numbers, time units, mechanics, constraints. That's the exact behavior we want.

---

## TUNING AND CALIBRATION

The `DENSITY_THRESHOLD` value (initially 1.5) needs calibration against real Ralph output. The process:

1. Run the checker against 20-30 existing Ralph-generated files
2. Manually categorize each flagged block as "correct flag" or "false positive"
3. Adjust threshold until false positive rate is under ~10%
4. Adjust individual word/phrase weights if certain patterns generate too many false positives

### Built-in False Positive Reduction

Three mechanisms already reduce false positives before threshold tuning:

**Hit-count minimum (hits >= 2).** One word is never the problem. The flag only fires when density exceeds the threshold AND there are at least 2 hits. This eliminates all single-word false positives — the most common source of noise.

**Specificity bonus.** Concrete details (numbers, time units, UI verbs, constraints) subtract from the density score. "Our robust API handles 10,000 requests per second" scores lower than "Our robust API handles requests" because the number and time unit earn specificity credit. This means Ralph can resolve warnings by *adding detail* rather than *deleting words* — preventing over-correction toward sterile copy.

**Domain profiles.** Enterprise and academic copy is judged more leniently. "Comprehensive distributed system" in a `consumer` profile scores 1.0× weight. In an `enterprise` profile it scores 0.7×. This prevents the checker from fighting legitimate domain vocabulary.

### Remaining Edge Case: Short Text

Short text (button labels, headings under ~40 characters) can still produce high density scores from a single word, but the hits >= 2 rule catches this. If a heading reads "Seamless sync" (2 words, technically 1 AI-ism hit), it won't flag. If it reads "Seamless, robust sync" (2 hits in 21 chars), it flags — and that's correct, because two AI-isms in a 3-word heading is genuinely a signal.

If short text still produces excessive false positives after the hits >= 2 rule, add a minimum character floor (don't score blocks under 30 characters) as a last resort.
