---
name: testimonials
domain: marketing
intent: Customer quotes, reviews, and social proof from real users
complexity: intermediate
components: Avatar, Card, Badge, ScrollArea, HoverCard
---

# Testimonials

## Recipe
**Core:** Card per testimonial with Avatar (photo) + name + role/company +
quote text (text-muted-foreground italic)

**Layout options:**
- Card wall: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 with masonry-like varied heights
- Horizontal scroll: ScrollArea with horizontal flex, snap-x snap-mandatory
- Featured + supporting: one large Card (col-span-2) with photo + full quote, smaller Cards alongside

**Enhancements:**
- Badge for role/company ("CEO", "Enterprise", verified checkmark)
- HoverCard on Avatar showing full bio, company, LinkedIn link
- Star rating row (lucide Star icons, filled vs outline)
- Company logos strip below testimonials (grayscale, opacity-50 hover:opacity-100)

## Variants
- **card-wall**: Masonry grid of varied-height Cards. Visual variety.
- **horizontal-scroll**: ScrollArea with snap scrolling. Space-efficient.
- **featured-highlight**: One large testimonial + smaller supporting quotes.
- **avatar-stack**: Compact — Avatar row with HoverCard showing quote on hover.

## Anti-Patterns
- ❌ All testimonials identical layout — vary Card sizes and content length
- ❌ No photos/avatars — faceless quotes feel fake
- ❌ Wall of text quotes — keep to 2-3 sentences max
- ❌ Using Card for every section before and after — break the pattern

## Composition Notes
- Works as a breathing section between dense content (features → testimonials → pricing)
- Horizontal scroll variant is great for mobile-first layouts
- Never place directly after another Card-grid section
- Pairs well with social-proof section for combined trust signals
