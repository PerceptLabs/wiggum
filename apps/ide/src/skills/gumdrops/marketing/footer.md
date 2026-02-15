---
name: footer
domain: marketing
intent: Site footer with navigation links, newsletter signup, and legal info
complexity: basic
components: Separator, Button, Input
---

# Footer

## Recipe
**Core:** Separator at top + multi-column layout with link groups +
bottom bar with copyright + legal links.

**Layout:** Grid grid-cols-2 md:grid-cols-4 gap-8 for link columns.
Each column: heading (text-sm font-semibold) + link list (text-sm text-muted-foreground).

**Bottom bar:** flex justify-between items-center + copyright text +
legal links (Privacy, Terms) as text-xs text-muted-foreground.

**Enhancements:**
- Newsletter Input + Button in one column
- Social icons row (Github, Twitter, Linkedin)
- Logo/brand name in first column
- Dark background variant (bg-muted or bg-card)

## Variants
- **multi-column**: 4 columns of links + bottom bar. Standard.
- **simple**: Single row of links + copyright. Minimal.
- **with-newsletter**: + newsletter signup column with Input + Button.
- **branded**: Logo prominent + social links + minimal link groups.

## Anti-Patterns
- ❌ Forgetting Separator at top — footer needs clear boundary
- ❌ Too many link columns — 4 max, group related items
- ❌ No legal links — Privacy Policy and Terms are expected
- ❌ Cramped spacing — generous padding (py-12+) for breathing room

## Composition Notes
- ALWAYS last section on every page
- Never omit — every marketing page needs a footer
- Newsletter variant replaces need for a separate newsletter section
- Match visual weight to the page — simple footer for simple pages
