---
name: grid-list
domain: app
intent: Responsive card grids with actions, badges, and view switching
complexity: basic
components: Card, DropdownMenu, Badge
---

# Grid List

## Recipe
**Core:** Grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4) of Cards.
Each Card: thumbnail/icon + title + description (line-clamp-2) +
Badge for status/type + DropdownMenu (MoreHorizontal) for actions.

**Layout options:**
- Card grid: standard grid with equal Cards
- Compact list: single column, horizontal Card layout
- Toggle view: Button group to switch between grid and list views

**Enhancements:**
- Badge for status indicators (Active, Draft, Archived)
- DropdownMenu per Card for actions (Edit, Duplicate, Delete)
- Checkbox overlay for multi-select mode
- Empty state when no items match filter

## Variants
- **card-grid**: Standard grid of Cards with thumbnail + title + actions.
- **list-view**: Horizontal Cards in single column. More detail visible.
- **toggle-view**: Button toggle between grid and list. User preference.
- **selectable**: + Checkbox on Cards for bulk operations.

## Interaction Patterns
- View toggle: useState for 'grid' | 'list', conditional className
- Card actions: DropdownMenu with Edit/Duplicate/Delete items
- Multi-select: useState<Set<string>> for selected IDs, Checkbox toggle
- Sort/filter: Select or Button group above grid

## Anti-Patterns
- ❌ No actions on Cards — always provide DropdownMenu or click behavior
- ❌ All Cards identical height with varying content — use line-clamp
- ❌ No empty state for filtered results
- ❌ Missing status indicators — Badge helps users scan

## Composition Notes
- Common pattern for resource listings (projects, files, products)
- Pairs with search/filter Input above for discovery
- DropdownMenu actions can open Dialog for edit/delete flows
- Wrap in Card container for visual grouping if needed
