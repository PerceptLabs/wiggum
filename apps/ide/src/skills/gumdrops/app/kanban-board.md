---
name: kanban-board
domain: app
intent: Column-based task board with draggable cards and status management
complexity: advanced
components: Card, Badge, Avatar, DropdownMenu
---

# Kanban Board

## Recipe
**Core:** Horizontal flex row of columns. Each column: heading (status name + Badge count) +
vertical stack of task Cards. Each Card: title + description (line-clamp-2) +
Badge (priority/label) + Avatar (assignee) + DropdownMenu (actions).

**Column layout:** flex gap-4 overflow-x-auto. Each column: w-72 shrink-0 bg-muted/30
rounded-lg p-3. Column header: flex justify-between — title + Badge (card count) +
DropdownMenu (column actions).

**Task Card:** Card with CardHeader (title, compact) + CardContent (description +
flex row of Badge tags) + CardFooter (Avatar assignee + due date text-xs).

**Enhancements:**
- Add card: Button (Plus icon) at bottom of each column
- Column DropdownMenu: Rename, Clear completed, Delete column
- Card DropdownMenu: Edit, Move to column, Assign, Delete
- Color-coded Badge for priority (red=urgent, yellow=medium, green=low)
- WIP limits: warning Badge when column exceeds max cards

## Variants
- **standard**: Fixed columns (To Do, In Progress, Done). Classic.
- **custom-columns**: User-defined columns with add/rename/delete. Flexible.
- **swimlanes**: Horizontal rows grouping cards by category within columns.
- **compact**: Minimal cards (title only) for high-density boards.

## Interaction Patterns
- Move card: drag-and-drop between columns (or DropdownMenu "Move to")
- Add card: Button opens inline form or Dialog with title + description
- Edit card: click Card to open Dialog with full details
- Filter: Input or Select above board to filter by assignee/label/priority
- Column reorder: drag column headers to rearrange

## Data Patterns

### Frontend-only
- useState for columns array, each with ordered cards array
- Move card: splice from source column, insert into target column
- Card positions: array index determines order within column
- localStorage persistence for board state across refreshes

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/card.ts (id, title, description, columnId, position, priority, assigneeId)
- API: GET /api/boards/:id, POST /api/cards, PATCH /api/cards/:id (move = update columnId + position), DELETE /api/cards/:id
- Client hook: useBoard(boardId) → { columns, moveCard, addCard, updateCard, deleteCard, isLoading }
- Optimistic reorder: update UI immediately, sync position to server
- Conflict resolution: server returns canonical order on save

## Anti-Patterns
- ❌ No card count per column — Badge count helps scanning
- ❌ No way to move cards without drag — always provide DropdownMenu fallback
- ❌ Cards without any metadata — at minimum show title + one indicator
- ❌ No add card affordance — Plus Button must be visible per column

## Composition Notes
- Often the main content of a project management app
- Card detail Dialog reuses form-layout patterns for editing
- Pairs with stats-dashboard for project overview metrics
- Column statuses map to workflow stages — customize per domain
