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
