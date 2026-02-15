---
name: chat-messaging
domain: app
intent: Real-time messaging with conversation list, message bubbles, and input
complexity: advanced
components: ScrollArea, Card, Avatar, Input, Button
---

# Chat Messaging

## Recipe
**Core:** Two-panel layout — conversation list (left) + message thread (right).
Message thread: ScrollArea with message bubbles + Input bar at bottom.

**Conversation list:** Vertical stack of Cards (compact) with Avatar + name +
last message preview (line-clamp-1) + timestamp + unread Badge.

**Message bubbles:** Sent messages right-aligned (bg-primary text-primary-foreground),
received messages left-aligned (bg-muted). Each bubble: Avatar (received only) +
message text + timestamp (text-xs text-muted-foreground).

**Input bar:** flex gap-2 — Input (flex-1) + Button (Send icon). Sticky at bottom.

**Enhancements:**
- Typing indicator: animated dots in a bubble
- Read receipts: checkmark icons below sent messages
- File/image attachments: Button with Paperclip icon
- Message grouping: consecutive messages from same sender share Avatar
- Scroll to bottom Button when scrolled up

## Variants
- **two-panel**: Conversation list + thread side by side. Standard.
- **thread-only**: Single message thread without conversation list. Embedded chat.
- **floating-widget**: Popover-style chat bubble in bottom-right corner.
- **group-chat**: Multiple Avatars, sender name above each message group.

## Interaction Patterns
- Send message: Input value + Enter key or Send Button click
- Scroll: ScrollArea auto-scrolls to bottom on new message
- Select conversation: click conversation Card to load thread
- Load more: scroll to top triggers loading older messages

## Data Patterns

### Frontend-only
- useState for conversations list and active conversation messages
- Messages stored in memory — lost on refresh
- Simulated responses with setTimeout for demo/prototype
- No typing indicators — synchronous local state

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/message.ts (id, conversationId, senderId, content, createdAt)
- API: GET /api/conversations, GET /api/conversations/:id/messages, POST /api/conversations/:id/messages
- Real-time: WebSocket or SSE for incoming messages
- Client hook: useMessages(conversationId) → { messages, sendMessage, isLoading, hasMore, loadMore }
- Optimistic send: append message immediately, confirm on server response
- Pagination: cursor-based for message history

## Anti-Patterns
- ❌ No scroll management — MUST auto-scroll on new messages
- ❌ No visual distinction between sent/received — different alignment + colors
- ❌ No timestamps — users need temporal context
- ❌ Input not sticky at bottom — must always be accessible

## Composition Notes
- Conversation list can reuse sidebar-nav layout patterns
- Message input can include file-upload for attachments
- Floating widget variant works as overlay on any page
- Pairs with notification-feed for message notifications
