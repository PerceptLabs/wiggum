---
name: onboarding
domain: app
intent: Checklist-based onboarding with step tracking and progress
complexity: intermediate
components: Card, Collapsible, Badge, Progress
---

# Onboarding

## Recipe
**Core:** Card containing a checklist of onboarding steps.
Each step: Collapsible with CollapsibleTrigger (step title + completion Badge) +
CollapsibleContent (description + action Button/link).

**Progress:** Progress bar at top showing completed/total ratio.
Text: "3 of 5 steps complete" (text-sm text-muted-foreground).

**Step states:**
- Pending: text-muted-foreground, no Badge
- Current: font-semibold, Collapsible open by default
- Complete: Badge "Done" (variant=secondary) + line-through or checkmark icon

## Variants
- **checklist**: Vertical list with Collapsible steps + Progress bar. Standard.
- **wizard-cards**: Step-by-step Cards, one visible at a time with prev/next.
- **sidebar-checklist**: Compact checklist in sidebar/Sheet, always visible.
- **dismissible**: + "Skip" Button per step + "Dismiss onboarding" at bottom.

## Interaction Patterns
- Step completion: useState<Set<number>> for completed step IDs
- Progress: computed from completedSteps.size / totalSteps
- Auto-advance: when step completes, open next Collapsible
- Dismiss: store dismissed state in localStorage, hide onboarding Card

## Anti-Patterns
- ❌ No progress indicator — users need to see how much is left
- ❌ Forcing all steps — allow skipping non-critical steps
- ❌ No way to dismiss — respect user choice to skip onboarding
- ❌ Too many steps — 5-7 max for first-run onboarding

## Composition Notes
- Shows at top of dashboard on first login, above stats-dashboard
- Collapsible into a compact Card once dismissed
- Can persist in sidebar as a progress checklist
- After completion, replace with a "Welcome back" greeting or remove entirely
