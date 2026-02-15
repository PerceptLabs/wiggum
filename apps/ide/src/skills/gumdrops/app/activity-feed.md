---
name: activity-feed
domain: app
intent: Chronological event timeline with user actions, icons, and timestamps
complexity: basic
components: Avatar, Badge, Separator
---

# Activity Feed

## Recipe
**Core:** Vertical timeline of activity events. Each event: flex row —
Avatar (user who performed action) + content (action description with
linked entity names as font-semibold) + timestamp (text-xs text-muted-foreground).
Separator between events.

**Timeline line:** Optional vertical line (border-l-2 border-muted) connecting events
on the left side, with dot indicators at each event.

**Event types:** Different icons/colors per action type:
- Created: Plus icon, green
- Updated: Pencil icon, blue
- Deleted: Trash icon, red
- Commented: MessageSquare icon, default

**Enhancements:**
- Badge for event type or category
- Group by date: "Today", "Yesterday", "Last week" headers
- Filter by event type: Button group or Select
- "Load more" Button at bottom for pagination

## Variants
- **simple-list**: Flat list with Avatar + description + timestamp. Standard.
- **timeline**: Vertical line with dot indicators connecting events. Visual.
- **compact**: No Avatar, just icon + text + time. Dense, for sidebars.
- **grouped**: Events grouped by date with sticky date headers.

## Interaction Patterns
- Click event: navigate to the referenced entity (project, file, comment)
- Filter: Select or Button group filters by event type
- Load more: Button or infinite scroll loads older events
- Hover: show full timestamp in tooltip

## Data Patterns

### Frontend-only
- useState for events array, newest first
- Hardcoded demo events for prototype
- Filter: derived state from events.filter(e => e.type === selectedType)
- Date grouping: computed from event timestamps

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/activity.ts (id, userId, type, entityType, entityId, description, createdAt)
- API: GET /api/activity?type=all&cursor=<lastId>&limit=20
- Client hook: useActivityFeed(filters) → { events, isLoading, hasMore, loadMore }
- Cursor-based pagination: load 20 events, "Load more" fetches next page
- Real-time: SSE or polling for new events at top of feed

## Anti-Patterns
- ❌ No timestamps — temporal context is essential for activity
- ❌ No user attribution — Avatar or name must identify who acted
- ❌ All events look identical — differentiate by icon/color per type
- ❌ No pagination — feeds grow indefinitely, must paginate

## Composition Notes
- Embeds inside profile-page Activity tab
- Appears in stats-dashboard as recent activity sidebar
- Compact variant works in sidebar-nav or Sheet panel
- Event items can link to relevant detail pages
