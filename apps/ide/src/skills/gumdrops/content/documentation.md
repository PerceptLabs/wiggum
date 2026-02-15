---
name: documentation
domain: content
intent: Documentation pages with sidebar navigation, breadcrumbs, and code examples
complexity: intermediate
components: ScrollArea, Breadcrumb, Tabs, Table
---

# Documentation

## Recipe
**Core:** Three-column layout — sidebar navigation (left) + main content (center) +
on-page table of contents (right). Sidebar: ScrollArea with nested nav links grouped
by section. Content: Breadcrumb at top + prose-styled documentation body.

**Sidebar navigation:** ScrollArea (h-screen sticky top-0) with collapsible sections.
Each section: heading (text-sm font-semibold uppercase text-muted-foreground) +
links (text-sm, active state: font-medium text-primary).

**Breadcrumb:** BreadcrumbList showing docs hierarchy (Docs > Section > Page).

**Content patterns:**
- Code blocks: bg-muted rounded-lg p-4 with copy Button
- Tabs for code examples in multiple languages
- Table for API reference (parameter, type, description columns)
- Callout boxes: border-l-4 with icon for Note/Warning/Tip

**Enhancements:**
- Search: Input at top of sidebar for doc search
- Version selector: Select in sidebar header
- Previous/Next navigation: flex justify-between links at bottom
- Edit on GitHub: Button link in page header

## Variants
- **three-column**: Sidebar + content + on-page TOC. Full docs site.
- **two-column**: Sidebar + content only. Simpler, most common.
- **single-page**: One long scrollable page with anchor navigation. Simple docs.
- **tabbed-api**: Tabs for endpoint groups + Table for parameters. API reference.

## Anti-Patterns
- ❌ No sidebar navigation — docs MUST have persistent nav structure
- ❌ No Breadcrumb — users need to know where they are in the hierarchy
- ❌ No code copy Button — always provide one-click copy for code blocks
- ❌ No previous/next links — help users progress through docs linearly

## Composition Notes
- Sidebar navigation reuses sidebar-nav patterns with nested collapsible sections
- Code blocks with Tabs pair language variants (JavaScript, Python, etc.)
- API reference Tables reuse data-table column patterns
- Search in sidebar can link to search-results for full search
