---
name: article-layout
domain: content
intent: Long-form article display with hero image, typography, and metadata
complexity: basic
components: AspectRatio, Separator, Badge
---

# Article Layout

## Recipe
**Core:** Centered column (max-w-prose mx-auto) with hero image (AspectRatio 16:9) +
article metadata + article body with typographic styling.

**Metadata:** flex items-center gap-2 — author name (font-medium) + date (text-muted-foreground) +
Badge for category/tag. Separator below metadata before body.

**Body:** Prose-styled content — headings (text-2xl/xl/lg font-bold), paragraphs (leading-7),
blockquotes (border-l-4 border-primary pl-4 italic), code blocks (bg-muted rounded p-4).

**Enhancements:**
- Table of contents: sticky sidebar with anchor links to headings
- Reading time estimate: text-sm text-muted-foreground in metadata
- Share buttons: Button group at bottom (Twitter, LinkedIn, Copy link)
- Related articles: Card grid below Separator at article end

## Variants
- **standard**: Centered prose with hero image. Classic blog post.
- **sidebar-toc**: Article left, sticky table of contents right. Documentation-style.
- **magazine**: Full-width hero, drop cap first paragraph. Editorial feel.
- **minimal**: No hero image, just title + body. Clean, focused reading.

## Anti-Patterns
- ❌ No max-width on text — lines over 75 chars hurt readability
- ❌ No metadata (date, author) — attribution and temporal context matter
- ❌ Missing Separator between sections — visual breaks aid scanning
- ❌ No responsive images — AspectRatio prevents layout shift

## Composition Notes
- Links from blog-grid Cards to individual article pages
- Table of contents sidebar pairs with ScrollArea for long articles
- Share buttons at bottom can reuse Button patterns
- Related articles section reuses blog-grid Card layout
