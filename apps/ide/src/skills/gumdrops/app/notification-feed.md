---
name: notification-feed
domain: app
intent: Notification list with read/unread states, actions, and filtering
complexity: intermediate
components: Card, Avatar, Badge, Separator, DropdownMenu
---

# Notification Feed

## Recipe
**Core:** Vertical stack of notification items. Each item: flex row —
Avatar (source icon or user) + content (title + description + timestamp) +
DropdownMenu (MoreHorizontal) for actions. Unread items: bg-muted/50 or
left border-primary indicator.

**Header:** flex justify-between — "Notifications" heading + Badge (unread count) +
"Mark all read" Button (variant=ghost).

**Notification item:** p-4 with hover:bg-muted/50 transition.
Separator between items. Click notification to mark read + navigate.

**Enhancements:**
- Filter tabs: All / Unread / Mentions (Tabs or Button group)
- DropdownMenu per item: Mark read, Mute, Delete
- Group by date: "Today", "Yesterday", "Earlier" with Separator + label
- Empty state when no notifications

## Variants
- **full-page**: Scrollable list with filters. Dedicated notifications page.
- **dropdown-panel**: Inside Popover/DropdownMenu from bell icon. Compact.
- **toast-stream**: Real-time toast notifications as they arrive. Ephemeral.
- **grouped**: Notifications grouped by type or source with collapsible sections.

## Interaction Patterns
- Mark read: click notification or explicit action in DropdownMenu
- Mark all read: Button clears all unread states
- Filter: Tabs switch between All/Unread views
- Delete: DropdownMenu action removes notification
- Navigate: click notification body to go to relevant page

## Data Patterns

### Frontend-only
- useState for notifications array with isRead boolean per item
- Hardcoded initial data for demo/prototype
- Filter derived from state: notifications.filter(n => !n.isRead)
- Badge count: computed from unread count

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/notification.ts (id, type, title, body, isRead, createdAt, actionUrl)
- API: GET /api/notifications, PATCH /api/notifications/:id/read, POST /api/notifications/mark-all-read, DELETE /api/notifications/:id
- Polling: useEffect interval or SSE for real-time updates
- Client hook: useNotifications() → { notifications, unreadCount, markRead, markAllRead, deleteNotification }
- Pagination: cursor-based, load more on scroll

## Anti-Patterns
- ❌ No read/unread distinction — visual indicator is essential
- ❌ No way to mark all read — bulk action saves time
- ❌ No timestamps — users need to know when things happened
- ❌ No empty state — show "You're all caught up" when empty

## Composition Notes
- Dropdown variant lives in app header, triggered by Bell icon Button
- Badge on Bell icon shows unread count (hide when 0)
- Pairs with chat-messaging for message notifications
- Individual notification actions can open Dialog for confirmation
