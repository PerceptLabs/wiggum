---
name: search-results
domain: app
intent: Search interface with query input, filtered results, and pagination
complexity: intermediate
components: Input, Card, Badge, Pagination, Tabs
---

# Search Results

## Recipe
**Core:** Search Input at top + results list below + Pagination at bottom.
Each result: Card (or simple div) with title (font-semibold, highlighted match) +
description (line-clamp-2, text-muted-foreground) + metadata (Badge tags + source + date).

**Search bar:** Input with Search icon (left) + clear Button (X icon, right).
Optionally: Select for category filter alongside Input.

**Results header:** flex justify-between — result count text ("42 results for 'query'") +
sort Select (Relevance, Newest, Oldest).

**Enhancements:**
- Tabs for result categories (All, Posts, Users, Files)
- Faceted filters: Checkbox group or Badge toggles in sidebar
- Highlighted search terms in result text (mark element or font-semibold)
- Empty state for no results with suggestions
- Loading skeleton while fetching

## Variants
- **list-view**: Vertical list of result Cards. Standard.
- **tabbed**: Tabs for different result types. Multi-source search.
- **faceted**: Sidebar with filter checkboxes + result list. E-commerce style.
- **instant**: Results update as you type (debounced). Quick search.

## Interaction Patterns
- Search: controlled Input with onSubmit or debounced onChange
- Filter: Tabs or Checkbox group filters result set
- Sort: Select changes result ordering
- Paginate: Pagination component at bottom, or infinite scroll
- Clear: X Button in Input resets query and results

## Data Patterns

### Frontend-only
- useState for query string + filtered results
- Filter from static data array using string matching
- Debounce input: useEffect with setTimeout for instant search
- No pagination needed for small datasets — show all matches

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/search.ts (query, filters, page, pageSize, sortBy)
- API: GET /api/search?q=query&page=1&type=all&sort=relevance
- Client hook: useSearch(query, filters) → { results, totalCount, isLoading, page, setPage }
- Debounced API calls: 300ms delay after last keystroke
- URL sync: search params in URL for shareable search links

## Anti-Patterns
- ❌ No result count — users need to know how many matches
- ❌ No empty state — show "No results for [query]" with suggestions
- ❌ No loading indicator — show skeleton while fetching
- ❌ Search without clear Button — must be easy to reset query

## Composition Notes
- Search Input often lives in app header (command-palette for keyboard users)
- Result Cards link to detail pages
- Faceted filter sidebar reuses form-layout checkbox/select patterns
- Pairs with empty-state for zero results
