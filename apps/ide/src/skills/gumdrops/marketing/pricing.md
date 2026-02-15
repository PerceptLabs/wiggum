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
