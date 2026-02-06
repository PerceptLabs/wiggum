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

**DO:** Pick a distinctive display font paired with a refined body font. Add via `<link>` in index.html (never `@import url()` in CSS — esbuild can't process it).

```bash
grep skill "fonts external resources"
```

## Color & Palette

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

**NEVER:** Purple gradients on white (the universal AI slop signal).

Define your palette as CSS variables in `src/index.css`:

```bash
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

## Skill Reference

This skill defines philosophy. For implementation details, grep these:

| Skill | What It Covers |
|-------|---------------|
| `stack` | Components, imports, project structure |
| `theming` | CSS variables, dark mode, animation library |
| `creativity` | Layout patterns, color palettes, motion snippets |
| `code-quality` | React patterns, accessibility, form contrast |

```bash
grep skill "<topic>"      # Search all skills
cat .skills/theming.md    # Read full skill
cat .skills/creativity.md # Read full skill
```

## No Two Projects Should Look The Same

Vary EVERYTHING between projects:
- Light vs dark base
- Different font pairings
- Different layout structures
- Different animation styles
- Different color temperatures

If your last project used Space Grotesk with a blue palette and bento grid, this one should use something completely different. Repetition is the enemy.
