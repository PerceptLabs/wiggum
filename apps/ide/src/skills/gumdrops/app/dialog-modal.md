---
name: dialog-modal
domain: app
intent: Modal overlays for confirmations, forms, multi-step flows, and alerts
complexity: basic→advanced
components: Dialog, AlertDialog, Button, Input, Label, Separator, RadioGroup
---

# Dialog / Modal

## Recipe
**Simple:** Dialog + DialogTrigger (Button) + DialogContent + DialogHeader
(DialogTitle + DialogDescription) + DialogFooter (Button outline cancel + Button default confirm)

**Destructive:** AlertDialog + Input (password with Eye/EyeOff visibility toggle) +
Label + Button variant=destructive

**Multi-step:** Dialog with useState for currentStep + conditional content per step +
Separator between sections + RadioGroup for selections + progress indicator

## Variants
- **simple**: Title + description + Cancel/Confirm footer. 80% of use cases.
- **form**: + Input/Select/Textarea fields inside DialogContent.
- **destructive**: AlertDialog requiring password/text confirmation before delete.
- **multi-step**: useState for step, conditional rendering, back/next/finish buttons.

## Interaction Patterns
- Controlled open: useState boolean, pass to Dialog open prop
- Form submission: local state for fields, validate before closing
- Destructive confirmation: compare input against expected string, disable button until match
- Multi-step: step index state, array of step content, back/next navigation
- Password visibility: useState boolean, toggle Eye/EyeOff, input type switch

## Anti-Patterns
- ❌ Dialog inside Dialog (nesting modals)
- ❌ Destructive action without confirmation
- ❌ Missing DialogDescription (accessibility)
- ❌ No way to cancel/escape
- ❌ Form in dialog with no validation

## Composition Notes
- Triggered from Buttons, DropdownMenu items, or table row actions
- Keep dialogs focused — one purpose per dialog
- Multi-step for complex flows; truly complex wizards use a full page instead
