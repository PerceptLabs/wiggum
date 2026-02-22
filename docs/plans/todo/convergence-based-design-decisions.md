# Convergence-Based Design Decisions

> How LLM output distributions shape Wiggum's anti-slop strategy. This document names the problem — mode convergence — and describes how the gumdrop system, Chief's planning, and recipe authoring exploit distribution awareness to produce distinctive outputs without new infrastructure.

---

## THE OBSERVATION

Give any LLM the same prompt and you get eerily similar outputs. Not identical — but structurally, aesthetically, and conceptually convergent. This isn't a bug. It's how probability distributions work.

**The prompt:** "Build me a bold energy drink landing page. Electric green, aggressive typography, fast animations."

**The output, every time:**
- Brand name: VOLT (or SURGE, APEX, RUSH)
- Dark background, neon green accents
- Angular/sharp UI elements, diagonal slashes
- Three flavor cards in a row, identical dimensions
- "UNLEASH YOUR POWER" or equivalent heading
- Particle effects or lightning bolt imagery

This happens because the prompt activates a tight cluster of high-probability tokens in the model's training distribution. "Energy" + "electric" + "green" + "bold" points directly at the **mode** — the single most likely output given the input. Every model trained on roughly the same internet converges on roughly the same mode.

Temperature doesn't fix this. Temperature 0 gives you the mode exactly. Temperature 1.0 gives you slight perturbations around the mode — VOLT becomes SURGE, the lightning becomes sparks, the green shifts slightly. You're sampling from the same peak, just with more wobble. The output is still recognizably generic.

---

## THE VOCABULARY

**Mode:** The most probable output for a given prompt. Where the distribution peaks. This is where slop lives.

**Mode gravity:** How strongly a prompt pulls toward its mode. "Energy drink landing page, electric green" has extreme mode gravity — the training data overwhelmingly agrees on what this looks like. "Project management tool for beekeepers" has weak mode gravity — less training data, more room for the model to explore.

**Mode signals:** Structural fingerprints that identify mode-convergent output. Three equal-width cards, centered heading + subtitle, gradient background, checkmark feature lists. These are the recurring patterns that appear across models, across temperatures, across providers.

**Mode escape:** Any technique that shifts the output away from the distribution peak toward the tails, where distinctive, interesting compositions live. Wiggum's entire architecture is a mode escape system.

**Convergence prompts:** User prompts with high mode gravity. Common product categories with strong training data representation. These are the hardest prompts to produce distinctive output for, and the ones where Wiggum's anti-slop pipeline provides the most value.

---

## KNOWN CONVERGENCE CLUSTERS

These are the most overdetermined prompt categories — where every AI produces nearly identical output. Recipe authors should study these carefully because these are exactly where gumdrop recipes add the most value.

### Marketing / Landing Pages

| Prompt Pattern | Mode Output | Mode Signals |
|---------------|-------------|--------------|
| Energy drink / sports brand | Dark bg, neon accent, angular shapes, "VOLT/SURGE/APEX" | diagonal-slashes, particle-effects, three-flavor-cards |
| SaaS dashboard product | Purple/blue gradient, "Nexus/Pulse/Nova," floating UI mockup | gradient-hero, floating-screenshot, three-feature-cards |
| Coffee shop / bakery | Warm browns, latte art hero, "The Daily Grind / Bean & Brew" | warm-earth-tones, food-photography-hero, menu-grid |
| AI startup | Dark theme, purple/blue gradient (again), abstract neural network art | dark-gradient, abstract-hero-graphic, "powered by AI" badge |
| Fitness / wellness app | Dark with neon accent, body silhouette, "FitPulse / TrackPro" | dark-neon, progress-ring-graphic, three-benefit-cards |
| E-commerce fashion | Full-bleed hero photo, minimal nav, "New Collection" | full-bleed-hero, hamburger-nav, product-grid-4-col |
| Portfolio / agency | Horizontal scroll or bento grid, "Creative Studio," monochrome + one accent | bento-grid, monochrome-plus-accent, case-study-cards |
| Real estate | Split hero (image + search form), blue color scheme, property cards with badges | split-hero, property-card-grid, map-integration |

### App UI

| Prompt Pattern | Mode Output | Mode Signals |
|---------------|-------------|--------------|
| Dashboard | Cards with numbers, bar/line chart, sidebar nav, blue/purple scheme | stat-cards-top-row, chart-center, sidebar-left |
| Kanban board | Three columns (To Do / In Progress / Done), draggable cards, minimal | three-columns-default, card-with-avatar-badge, plus-button-top |
| Settings page | Left sidebar sections, right content area, toggles and inputs | sidebar-sections, toggle-rows, save-button-bottom |
| Chat interface | Messages left/right bubbles, input bar bottom, "AI Assistant" | bubble-messages, bottom-input-bar, typing-indicator |
| Pricing page | Three cards (Basic / Pro / Enterprise), checkmark lists, "Most Popular" badge | three-tier-cards, checkmark-lists, popular-badge-center |

### Content

| Prompt Pattern | Mode Output | Mode Signals |
|---------------|-------------|--------------|
| Blog | Card grid with thumbnail + title + date + excerpt, sidebar categories | card-grid-3-col, thumbnail-top, sidebar-right |
| Documentation | Left sidebar tree, right content, breadcrumbs top | sidebar-tree-nav, breadcrumb-bar, code-blocks |
| Changelog | Reverse-chronological list, version badges, "New/Improved/Fixed" tags | timeline-vertical, version-badges, tag-colored |

---

## HOW WIGGUM ESCAPES MODES

Wiggum doesn't fight convergence with randomness. It fights convergence with **context injection** — loading specific, structured information into Ralph's context that displaces the mode with a directed creative vision.

### Layer 1: Moods Displace Color Convergence

The mode for "energy drink" is neon green on dark. But if the plan says `mood="acid"` with `seed={142}`, Ralph's CSS variables produce a specific OKLCH palette that has nothing to do with #39FF14. The mood system doesn't fight the green — it replaces it entirely with a principled color system. The user said "electric green" and they get a palette *inspired* by electric green but generated through color science, not through training data recall.

Twelve moods × 360 seed values = 4,320 distinct palettes before any manual tuning. The mode has one palette. Wiggum has thousands.

### Layer 2: Philosophy Displaces Structural Convergence

The mode for "pricing page" is three vertical cards. But if the plan's philosophy says "brutalist minimalism, heavy type, generous negative space," Ralph reads that and writes wider spacing, monospaced headings, and asymmetric layouts. The philosophy statement directly contradicts the mode's structural assumptions.

This is why philosophy statements matter — they're mode escape instructions in natural language. "Playful organic curves" escapes the sharp-edge mode. "Swiss grid, maximum information density" escapes the generous-whitespace mode. "Retro analog warmth, grain textures, rounded everything" escapes the clean-digital mode.

### Layer 3: Compositions Displace Pattern Convergence

The mode for "pricing" is three equal cards with checkmark lists. But if the plan says `compose={["merged-surface", "dual-comparison"]}`, Ralph reads the pricing recipe's alternative arrangements and builds a merged comparison surface instead of isolated cards. The cross-composition explicitly names a pattern the mode doesn't include.

30 composition patterns × 4+ arrangements per gumdrop = hundreds of structural combinations. The mode has one structural pattern per UI type.

### Layer 4: Block Atoms Displace Component Convergence

The mode for a testimonial section is a Card with quote text and an avatar. But the testimonials gumdrop has block atoms: `TestimonialSection`, `TestimonialGrid`, `TestimonialCard`, `TestimonialQuote`, `TestimonialAuthor`, `TestimonialRating`, `TestimonialAvatar`. These atoms enable compositions the mode never attempts — ratings integrated into the quote, author bios that expand, testimonials that scroll horizontally, testimonials mixed with stats.

287 block atoms across 62 gumdrops vs. the mode's ~20 generic component patterns (Card, Button, Input, etc.).

### Layer 5: Anti-Pattern Documentation Displaces Ignorance

If Ralph doesn't know what the mode looks like, it can't avoid it. Recipe anti-patterns should name the modes explicitly so Ralph has negative examples alongside positive ones. "Don't produce three identical cards in a row" is more useful than "be creative."

---

## RECIPE AUTHORING GUIDANCE

### Documenting Modes in Anti-Patterns

Every gumdrop recipe has an anti-patterns section. When writing or reviewing recipes, add a **Known Modes** subsection that documents what every AI produces for this pattern type. Be specific — name the structural patterns, not just "don't be generic."

**Example: Pricing gumdrop anti-patterns**

```markdown
## Anti-Patterns

### Known Modes (what every AI defaults to)
- 3 identical vertical cards: Basic ($9) / Pro ($29) / Enterprise ($99)
- Centered "Choose Your Plan" heading in sans-serif
- Checkmark/X feature lists, identical formatting per tier
- "Most Popular" badge on the middle card
- Purple or blue gradient section background
- "Get Started" as every CTA label
- Equal card heights with the featured card slightly elevated or bordered

### How to Escape
- Try horizontal tiers, comparison tables, or merged surfaces
- Pull tier names from the user's domain (Starter/Growth/Scale, Solo/Team/Org)
- Mix feature presentation: some inline, some expandable, some in a comparison toggle
- Use the plan's mood palette — no gradients from training data
- Make the featured tier structurally different, not just bordered
- CTA labels should reflect the product action, not generic "Get Started"
```

**Example: Hero gumdrop anti-patterns**

```markdown
## Anti-Patterns

### Known Modes (what every AI defaults to)
- Centered H1 + subtitle + CTA button, nothing else
- Gradient background (purple/blue or dark-to-transparent)
- Floating product screenshot or abstract 3D graphic
- "Welcome to [Product]" or "The Future of [Category]"
- Single CTA: "Get Started Free"
- Decorative blobs or circles in the background

### How to Escape
- Try split layouts (content left, visual right) or asymmetric compositions
- Use the plan's philosophy to drive typography hierarchy
- Hero should contain actual product information, not just a tagline
- Consider search-hero, social-proof-hero, or stats-hero cross-compositions
- Background should come from mood/theme, not gradient defaults
- Multiple CTAs with different weights (primary + text link)
```

This costs nothing to implement. The content is written once per recipe. Ralph reads it every time (skill lookup gate guarantees this). The mode documentation becomes part of Ralph's context, directly displacing the patterns it would otherwise produce.

### High-Value Recipes to Prioritize

Recipes for convergence clusters with the strongest mode gravity should be written first and with the most detailed mode documentation. Ranked by mode strength:

1. **Pricing** — extremely strong mode (3 cards, checkmarks, purple)
2. **Hero** — very strong mode (centered H1, gradient, CTA)
3. **Dashboard/stats** — very strong mode (stat cards top, chart center, sidebar)
4. **Testimonials** — strong mode (quote card + avatar + name)
5. **Features** — strong mode (3 or 6 cards in a grid, icon + title + description)
6. **FAQ** — strong mode (accordion, nothing else)
7. **Blog grid** — strong mode (card grid, thumbnail + title + excerpt)
8. **Contact/CTA** — strong mode (centered text + form or button)

These are where the gap between "generic AI output" and "Wiggum output" should be most visible. Weaker convergence clusters (file browser, kanban, calendar) have less training data pressure and naturally produce more varied output — their recipes matter less for differentiation.

---

## CHIEF'S ROLE: MODE AWARENESS IN PLANNING

### Recognizing High-Convergence Prompts

Chief's system prompt should include guidance for recognizing when a user request has strong mode gravity and proactively offering divergent alternatives:

```
When a user describes a common product category with strong visual conventions
(energy drink, SaaS landing page, coffee shop, fitness app, AI startup),
recognize that every AI tool will produce nearly identical output for this prompt.

Your job is to acknowledge the convention, then offer 2-3 alternatives that
escape the mode while still serving the user's goals:

User: "Build me a bold energy drink landing page. Electric green, aggressive."

You: "Energy drink sites have a strong visual convention — dark backgrounds,
neon accents, angular everything. I can work within that if you want to feel
familiar, or we can stand out:

1. **Convention with a twist** — dark + green palette, but brutalist grid layout
   with monospaced type instead of the usual angular/futuristic look
2. **Retro energy** — analog aesthetic, grain textures, vintage typography,
   the green comes through in a more organic palette
3. **Clean contrast** — white background, green as a strategic accent color,
   Swiss-grid layout that lets the product photography carry the intensity

All three deliver 'bold and aggressive' differently."
```

Chief doesn't need an algorithmic mode detector. Chief is well-read — the convergence clusters are common knowledge for anyone who's seen AI output. A paragraph in the system prompt is sufficient. The goal is to make Chief a creative collaborator who recognizes convergence and offers escape routes, not a passive order-taker who builds VOLT.

### Plan-Level Mode Escape

When Chief writes plan.tsx, the choices themselves are mode escapes:

| Plan Element | Mode | Chief's Escape |
|-------------|------|---------------|
| `mood` | No mood (purple/blue gradient from training data) | Specific mood with seed from user's domain |
| `philosophy` | None (default to generic clean aesthetic) | Explicit creative direction in natural language |
| `gumdrop` | Generic (Card + Grid for everything) | Domain-specific gumdrop with block atoms |
| `compose` | None (vertical stacking of independent sections) | Named cross-composition patterns |
| `<Rule>` | None (default thresholds) | Per-section visual quality criteria |

Every field Chief fills in is a mode escape. An empty plan produces mode-convergent output. A detailed plan produces distinctive output. Chief's job is to fill in the plan thoroughly enough that Ralph can't fall back to the mode.

---

## WHAT THIS DOESN'T REQUIRE

No new infrastructure. No mode database. No clustering algorithms. No generation costs.

The convergence concept is a **mental model** that improves three things that already exist:

1. **Recipe content** — anti-patterns section gains "Known Modes" documentation
2. **Chief's system prompt** — gains mode-awareness paragraph
3. **Recipe prioritization** — high-convergence gumdrops get written first

The only "implementation" is better writing. The enforcement is already built — the skill lookup gate guarantees Ralph reads the recipes, the similarity gate catches mode-convergent output that matches refs, and the quality pipeline catches everything else.

The distribution is the enemy. Naming it is the weapon. The gumdrops are the armor.
