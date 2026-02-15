---
name: empty-state
domain: app
intent: Contextual empty states with icon, message, and action prompts
complexity: basic
components: Button
---

# Empty State

## Recipe
**Core:** Centered flex column — icon (lucide-react, size 48, text-muted-foreground) +
heading (text-lg font-semibold) + description (text-sm text-muted-foreground max-w-sm) +
Button (primary action to resolve empty state)

**Layout:** flex flex-col items-center justify-center py-16 text-center

**Pattern:** Each empty state is contextual — the message and action match what's empty:
- No items: "No projects yet" + "Create your first project" Button
- No results: "No results for [query]" + "Clear filters" Button
- Error: "Something went wrong" + "Try again" Button
- No permission: "You don't have access" + "Request access" Button

## Variants
- **simple**: Icon + heading + description + Button. Standard.
- **illustrated**: + large illustration/graphic above heading. Visual.
- **actionless**: Icon + heading + description only. When user can't take action.
- **inline**: Compact version for table/list empty states (no icon, smaller text).

## Anti-Patterns
- ❌ Blank white space with no explanation — always show why it's empty
- ❌ Generic "No data" message — be specific about what's missing
- ❌ No action Button — always give users a next step (when possible)
- ❌ Same empty state for every context — vary message per scenario

## Composition Notes
- Appears inside data-table when filter returns 0 results
- Appears in grid-list when no items exist
- Appears in search-results when query has no matches
- The empty state IS the section — don't wrap in another Card
