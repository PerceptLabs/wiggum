---
name: sidebar-nav
domain: app
intent: App navigation with collapsible groups, user menu, and workspace switching
complexity: intermediate
components: Sheet, Collapsible, Avatar, DropdownMenu, Badge, Select, Separator, Button
---

# Sidebar Navigation

## Recipe
**Core:** Fixed sidebar (w-64 border-r border-border h-dvh flex flex-col) with three zones:

**Top zone:** Logo/app name + optional Select for workspace/team switching

**Middle zone (flex-1 overflow-y-auto):** Nav groups, each group is:
- Collapsible with CollapsibleTrigger (group label + ChevronRight icon that rotates on open)
- CollapsibleContent containing nav items as Button(variant=ghost) full-width
- Badge on items for counts/status (e.g., "3" unread, "New" indicator)
- Active item: bg-accent text-accent-foreground

**Bottom zone:** Separator + user area with Avatar + name + DropdownMenu
(Settings, Profile, Logout actions)

## Variants
- **simple**: Logo + flat nav links + user footer. No groups.
- **collapsible-groups**: + Collapsible sections with ChevronRight rotation.
- **with-workspace**: + Select for workspace/team switching at top.
- **mobile-responsive**: Sheet on mobile (hidden on lg:), persistent sidebar on desktop.

## Interaction Patterns
- Active link: track current path in state, apply bg-accent to matching item
- Collapsible: each group tracks open/close independently with useState
- Sheet toggle: Button (Menu icon) visible on mobile, toggles Sheet with sidebar content
- User menu: DropdownMenu with settings, profile, logout items
- Workspace: Select with onChange updating current workspace context

## Anti-Patterns
- ❌ No active state indicator — MUST highlight current page
- ❌ No mobile responsiveness — always provide Sheet fallback
- ❌ Raw `<nav>` with `<a>` tags instead of semantic stack components
- ❌ User menu as a separate page — keep inline via DropdownMenu
- ❌ All nav items flat — use Collapsible groups for 6+ items

## Composition Notes
- Left column of a dashboard layout (grid grid-cols-[256px_1fr])
- Pairs with stats-dashboard/data-table in the main content area
- First section Ralph builds for any app with navigation
- On mobile, sidebar collapses entirely — Sheet replaces it
