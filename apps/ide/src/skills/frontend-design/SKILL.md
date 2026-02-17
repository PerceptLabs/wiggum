---
name: Frontend Design
description: Design thinking and aesthetic philosophy — read FIRST before any UI work
when_to_use: Every project — sets creative direction before implementation
---

# Frontend Design

Before writing a single line of code, commit to a design direction. This skill defines HOW to think. Other skills define how to implement.

## Design Thinking

For every project, answer these before coding:

1. **Purpose** — What problem does this solve? Who uses it?
2. **Tone** — Pick a direction and commit. Options for inspiration:
   - Brutally minimal, maximalist chaos, retro-futuristic
   - Organic/natural, luxury/refined, playful/toy-like
   - Editorial/magazine, brutalist/raw, art deco/geometric
   - Soft/pastel, industrial/utilitarian, cyberpunk/neon
   - Don't pick from this list literally — let the PROJECT drive the aesthetic
3. **Differentiation** — What's the one thing someone will remember about this?

**Bold maximalism and refined minimalism both work.** The key is intentionality, not intensity. Match complexity to the vision — maximalist designs need elaborate animations, minimal designs need precision and restraint.

## Typography

Choose fonts that match the aesthetic, not defaults.

**NEVER use:** Inter, Roboto, Arial, system-ui, sans-serif as a design choice. These are fallbacks, not decisions.

**DO:** Pick a distinctive display font paired with a refined body font. Declare fonts in `src/index.css` using `/* @fonts: FontName:wght@400;500;600 */` comment — the preview system auto-injects `<link>` tags. Never use `@import url()` in CSS — esbuild can't process it. Never modify `index.html` — it is locked.

```bash
grep skill "fonts external resources"
```

## Color & Palette

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

**NEVER:** Purple gradients on white (the universal AI slop signal).

Use the `theme` command to generate your palette. Never freestyle color values. For content-specific colors beyond the semantic palette, use `theme extend --name <name> --hue <deg>`.

```bash
theme preset retro-arcade --apply          # curated preset
theme generate --seed 38 --pattern analogous --mood retro --chroma high --apply  # custom
theme extend --name grape --hue 300        # content-specific color
grep skill "CSS variables theme"
```

## Spatial Composition

Break the grid. Unexpected layouts create memorable experiences:
- Asymmetry and overlap
- Diagonal flow and grid-breaking elements
- Generous negative space OR controlled density
- Elements that bleed across section boundaries

```bash
grep skill "layout patterns bento"
grep skill "overlapping sections diagonal"
```

## Motion & Atmosphere

Use animation to create delight, not decoration. One well-orchestrated page load with staggered reveals creates more impact than scattered micro-interactions.

Focus on high-impact moments:
- Page entrance orchestration (staggered delays)
- Scroll-triggered reveals
- Hover states that surprise
- Background effects that create depth (gradients, grain, mesh)

CSS-only animations preferred. See patterns:

```bash
grep skill "entrance animations stagger"
grep skill "background effects glassmorphism"
```

## The Anti-Slop Checklist

Before AND after implementing, verify:

- [ ] Could someone guess the project's PURPOSE from the design alone (without reading text)?
- [ ] Is the typography a deliberate choice, not a default?
- [ ] Does the color palette evoke the right FEELING?
- [ ] Is there at least one layout element that breaks convention?
- [ ] Would this make an Apple/Stripe designer pause and look twice?

If any answer is NO — iterate before moving on.

## Cookie-Cutter vs Distinctive (Examples)

### Cookie-Cutter (what Ralph defaults to)
```bash
# No theme command at all — just default violet purple
```
- Inter font (the universal AI default)
- Centered hero → 3-card feature grid → CTA footer
- Same `py-24 px-4` padding on every section
- Generic gradient orbs in corners
- White background, gray cards, purple buttons

**Result:** Looks like every other AI-generated landing page. Forgettable.

### Distinctive (what Ralph should produce)
```bash
theme generate --seed 38 --pattern analogous --mood retro --chroma high --apply
# → warm amber/ochre palette with tactile depth
```
- Instrument Sans (display) + Source Serif 4 (body) — deliberate pairing
- Split hero with offset terminal mockup → masonry features → diagonal CTA
- Varied rhythm: tight nav (`py-4`), airy hero (`py-32`), dense features (`py-16`)
- Decorative elements that reinforce the product story (code snippets as bg texture)
- Warm cream background, amber accents, charcoal text

**Result:** Someone could guess the product category from the design alone.

### The Test

Before writing code, ask: **"If I described this design to someone, would they know WHICH project I'm talking about?"**

If the answer is "it could be any landing page" — go back and commit to something specific in your `.ralph/plan.md` Direction section.

## Skill Reference

This skill defines philosophy. For implementation details, grep these:

| Skill | What It Covers |
|-------|---------------|
| `stack` | Components, imports, project structure |
| `theming` | CSS variables, dark mode, animation library |
| `gumdrops` | Compositional recipes, page templates, anti-slop |
| `code-quality` | React patterns, accessibility, form contrast |

```bash
grep skill "<topic>"      # Search all skills
cat .skills/theming.md    # Read full skill
cat .skills/gumdrops.md   # Read full skill
```

## No Two Projects Should Look The Same

Vary EVERYTHING between projects:
- Light vs dark base
- Different font pairings
- Different layout structures
- Different animation styles
- Different color temperatures

If your last project used Space Grotesk with a blue palette and bento grid, this one should use something completely different. Repetition is the enemy.
