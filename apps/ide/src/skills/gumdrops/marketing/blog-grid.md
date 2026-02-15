---
name: blog-grid
domain: marketing
intent: Blog post grid with cards, categories, and author info
complexity: intermediate
components: Card, Badge, Avatar, AspectRatio, Separator
---

# Blog Grid

## Recipe
**Core:** Grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3) of Cards.
Each Card: AspectRatio (16/9) cover image + title (font-semibold) +
excerpt (text-sm text-muted-foreground line-clamp-2) +
author row (Avatar + name + date) + Badge for category

**Layout options:**
- Uniform grid: all Cards same size, consistent rhythm
- Featured first: first Card col-span-2 row-span-2 with larger image
- List view: single column with horizontal Card layout (image left, content right)

**Enhancements:**
- Badge for category/tag filtering
- Avatar + author name for attribution
- Separator between content and author row
- Read time estimate (text-xs text-muted-foreground)
- Pagination below grid

## Variants
- **uniform-grid**: Equal Cards in a 3-column grid. Clean, scannable.
- **featured-first**: Large hero post + smaller grid. Editorial feel.
- **list-view**: Horizontal Cards in a single column. Readable, detailed.
- **category-filtered**: Badge filters above grid, click to filter posts.

## Anti-Patterns
- ❌ No cover images — AspectRatio images are essential for visual rhythm
- ❌ Full article text in Card — use line-clamp for excerpts
- ❌ No category indicators — Badge helps users scan for relevant content
- ❌ Missing author attribution — Avatar + name adds credibility

## Composition Notes
- Standalone page section or route (/blog)
- Pairs with sidebar-nav for blog navigation on dedicated blog pages
- Featured-first variant works great as a homepage section
- Follow with Pagination for multi-page blog archives
