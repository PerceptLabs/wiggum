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
