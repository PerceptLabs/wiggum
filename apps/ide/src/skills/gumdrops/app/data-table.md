---
name: data-table
domain: app
intent: Sortable, filterable, paginated data display with row actions
complexity: advanced
components: Table, Checkbox, DropdownMenu, Input, Select, Button, Badge
---

# Data Table

## Recipe
**Basic:** Table + TableHeader + TableBody + TableRow + TableCell

**Rich table adds:**
- @tanstack/react-table for sorting/filtering/pagination state
- Checkbox column for row selection (header checkbox = select all)
- DropdownMenu (MoreHorizontal icon) per row for actions (View/Edit/Delete)
- Input above table for global search/filter
- Select for page size (10/20/50)
- Pagination footer: "Showing 1-10 of 45" + prev/next buttons
- Badge per row for status indicators (active, pending, error)

## Variants
- **simple**: Table with headers and rows. No interaction.
- **sortable**: + column header buttons with ArrowUpDown icon, sort state
- **filterable**: + Input search above + column-specific Select filters
- **full**: All of above + Checkbox selection + DropdownMenu row actions + pagination

## Interaction Patterns
- Sort: click column header toggles asc/desc/none, icon rotates
- Filter: Input with onChange debounced, filters rows
- Pagination: page index state, slice data, prev/next with disabled states
- Row selection: Checkbox per row, header Checkbox for select-all, selectedRows state
- Row actions: DropdownMenu → View (navigate), Edit (Dialog), Delete (AlertDialog)
- Bulk actions: appear when selectedRows.length > 0 (Delete selected, Export, etc.)

## Data Patterns

### Frontend-only
- Data lives in useState or imported from a static array
- Sort/filter/paginate by slicing the local array
- CRUD operations mutate local state via setState
- No loading states needed (data is synchronous)

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/<resource>.ts
  (defines shape, used by BOTH API validation and form validation)
- API: GET /api/<resource>?page=1&limit=10&sort=name&order=asc&filter=active
- Response shape: { data: T[], total: number, page: number, limit: number }
- Client hook: use<Resource>(params) → { data, total, isLoading, error, refetch }
- Params sync: sort/filter/page state passed to hook, triggers refetch
- Optimistic delete: remove row from local state, revert on API error
- Loading skeleton: Table rows with Skeleton cells while fetching
- Empty state: when data.length === 0 after fetch, show empty-state gumdrop

## Anti-Patterns
- ❌ No pagination on 50+ rows — always paginate
- ❌ Sort indicator missing — MUST show current sort direction
- ❌ Delete without confirmation — always use AlertDialog
- ❌ No empty state when filter returns 0 results
- ❌ Raw div table instead of Table component

## Composition Notes
- Pairs naturally with Stats Dashboard above (overview → detail)
- DropdownMenu row actions can open Dialogs for edit/delete flows
- Filter + table + pagination is self-contained — wrap in Card if needed
