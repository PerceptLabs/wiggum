---
name: timeline
domain: content
intent: Vertical timeline with events, dates, and visual connectors
complexity: basic
components: Card, Avatar, Badge, Separator
---

# Timeline

## Recipe
**Core:** Vertical timeline with connecting line and event nodes.
Each event: dot/icon on the line + Card or content block to the side.
Card: title (font-semibold) + description (text-muted-foreground) +
date (text-xs text-muted-foreground) + optional Badge for category.

**Timeline structure:**
- Vertical line: border-l-2 border-muted (left-aligned) or centered
- Event nodes: w-3 h-3 rounded-full bg-primary on the line
- Content: ml-6 relative to the line (left-aligned variant)

**Centered layout:** Alternate events left/right of center line.
Even events: text-right + content left of line. Odd events: content right of line.

**Enhancements:**
- Avatar at event node instead of dot (for user-driven events)
- Badge for event type or status
- Expandable detail: click event to show full description
- Icon nodes: different lucide icons per event type instead of dots

## Variants
- **left-aligned**: All events to the right of a left-side line. Standard.
- **centered**: Events alternate left and right. Symmetrical, visual.
- **compact**: No Cards, just text next to dots. Dense, sidebar-friendly.
- **milestone**: Larger nodes for major events, smaller for minor. Hierarchical.

## Anti-Patterns
- ❌ No connecting line — timeline needs visual continuity
- ❌ No dates — chronological context is the point of a timeline
- ❌ All nodes identical — differentiate by size, color, or icon
- ❌ Too much content per node — keep concise, link to detail

## Composition Notes
- Used in changelog for version history visualization
- Embeds in profile-page for user history/milestones
- Activity-feed can use timeline layout for visual variant
- Works as onboarding progress tracker (completed milestones)
