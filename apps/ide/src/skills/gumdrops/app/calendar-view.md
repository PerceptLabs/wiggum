---
name: calendar-view
domain: app
intent: Calendar display with month, week, and day views for events
complexity: intermediate
components: Card, Badge, Button, Dialog
---

# Calendar View

## Recipe
**Core:** Month grid (grid-cols-7) with day cells. Each cell: date number +
event indicators (Badge dots or short event titles).

**Header:** flex justify-between — month/year title + prev/next Buttons (ChevronLeft/ChevronRight)

**Day cells:** min-h-24 border-border border + date number (text-sm) +
event list (Badge or truncated titles). Click day to see full events.

**Enhancements:**
- View switcher: Button group for Month/Week/Day
- Dialog for event detail/creation on cell click
- Today highlight: bg-primary/10 on current date cell
- Badge color coding by event type/category

## Variants
- **month-grid**: Full month grid with event dots. Classic calendar.
- **week-view**: 7-column grid with hourly rows. Detailed scheduling.
- **day-view**: Single day with hourly timeline. Focus mode.
- **mini-calendar**: Compact month picker (w-64) for date selection only.

## Interaction Patterns
- Navigation: useState for currentDate, prev/next buttons adjust by month/week/day
- View toggle: useState for 'month' | 'week' | 'day', conditional render
- Event click: Dialog with full event detail (title, time, description, actions)
- Create event: click empty cell → Dialog with form (title, date, time, type)
- Today button: reset currentDate to new Date()

## Anti-Patterns
- ❌ No today indicator — MUST highlight current date
- ❌ No navigation (prev/next) — calendar must be browsable
- ❌ Too many events visible per cell — truncate with "+3 more" indicator
- ❌ No click interaction on events — always open detail Dialog

## Composition Notes
- Pairs with sidebar-nav for app navigation context
- Event creation Dialog reuses form-layout patterns
- Works as main content area in a dashboard layout
- Week/day views pair well with stats-dashboard for scheduling apps
