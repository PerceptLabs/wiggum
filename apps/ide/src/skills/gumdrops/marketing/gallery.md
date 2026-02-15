---
name: gallery
domain: marketing
intent: Image gallery with lightbox, filtering, and responsive grid
complexity: intermediate
components: AspectRatio, Dialog, ScrollArea, Tabs
---

# Gallery

## Recipe
**Core:** Grid of images wrapped in AspectRatio for consistent proportions.
Click opens Dialog lightbox with full-size image.

**Layout options:**
- Uniform grid: grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 with AspectRatio(1/1)
- Masonry-like: varied AspectRatio (1/1, 4/3, 3/4) with auto-rows
- Horizontal scroll: ScrollArea with flex row, snap-x for carousel feel

**Enhancements:**
- Tabs for category filtering (All, Nature, Architecture, etc.)
- Dialog lightbox with prev/next navigation (ChevronLeft/ChevronRight)
- Image caption overlay (absolute bottom-0, bg-gradient-to-t)
- Lazy loading: loading="lazy" on img elements

## Variants
- **grid-uniform**: Square grid with Dialog lightbox. Clean, Pinterest-like.
- **masonry**: Mixed aspect ratios for organic feel. Visual interest.
- **carousel**: ScrollArea horizontal scroll with snap. Space-efficient.
- **filtered**: Tabs above for category filtering + grid below.

## Anti-Patterns
- ❌ No AspectRatio — images jump around as they load
- ❌ No lightbox — users want to see full-size images
- ❌ All same aspect ratio for portfolio work — vary for interest
- ❌ No lazy loading on large galleries — performance matters

## Composition Notes
- Standalone section for portfolios, products, or photo galleries
- Pairs with Tabs for categorized browsing
- Follow with a CTA or contact section for portfolio conversion
- Never place directly after another grid section
