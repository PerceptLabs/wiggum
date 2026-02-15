---
name: settings-panel
domain: app
intent: Tabbed settings with toggles, selects, and grouped form controls
complexity: intermediate
components: Tabs, Card, Switch, Select, Input, Label
---

# Settings Panel

## Recipe
**Core:** Tabs (vertical or horizontal) for setting categories +
Card per section within each tab. Each Card: CardHeader (title + description) +
CardContent with form controls (Switch for toggles, Select for choices, Input for text).

**Layout:** Tabs on left (lg:flex-row) or top (mobile). Content area with
stacked Cards per category. Each Card groups related settings.

**Save pattern:** Either auto-save on change (with toast confirmation) or
explicit Save Button at bottom of each tab/page.

**Enhancements:**
- Separator between setting groups within a Card
- Badge "Beta" or "New" next to experimental settings
- Switch with inline description for toggles
- Select with Label for dropdown choices
- Reset to defaults Button (variant=outline) per section

## Variants
- **tabbed**: Horizontal Tabs for categories. Standard.
- **sidebar-tabs**: Vertical Tabs on left, content on right. Desktop-friendly.
- **single-page**: All settings in one scrollable page with sections. Simple apps.
- **modal-settings**: Settings inside Dialog, compact. Quick preferences.

## Interaction Patterns
- Tab navigation: Tabs component handles active state
- Toggle: Switch with onChange updating state immediately
- Select: controlled Select with onValueChange
- Text input: Input with onBlur or debounced onChange to save
- Dirty state: track unsaved changes, warn on navigation away

## Data Patterns

### Frontend-only
- useState for each setting category (appearance, notifications, privacy, etc.)
- localStorage persistence: load on mount, save on change
- No loading states — synchronous reads from localStorage
- Reset: restore hardcoded defaults object

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/settings.ts (nested object per category)
- API: GET /api/settings, PATCH /api/settings (partial update)
- Client hook: useSettings() → { settings, updateSetting, resetDefaults, isSaving }
- Optimistic updates with rollback on error
- Loading skeleton on initial fetch

## Anti-Patterns
- ❌ No visual grouping — related settings MUST be in same Card
- ❌ No save confirmation — toast or inline indicator on save
- ❌ No descriptions on toggles — Switch without context is confusing
- ❌ Too many settings per page — use Tabs to categorize

## Composition Notes
- Pairs with sidebar-nav for app-level navigation to settings
- Often accessed via user avatar DropdownMenu → "Settings"
- Profile section within settings reuses profile-page patterns
- Notification preferences tab pairs with notification-feed settings
