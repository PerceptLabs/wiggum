---
name: form-layout
domain: app
intent: Structured forms with validation, sections, and submission
complexity: intermediate
components: Input, Label, Select, Textarea, RadioGroup, Checkbox, Separator, Button
---

# Form Layout

## Recipe
**Core:** Grid (grid-cols-1 sm:grid-cols-6) with form fields.
Each field: Label (with optional red asterisk for required) + Input/Select/Textarea.
Responsive col-span: col-span-3 for half-width, col-span-full for full-width.

**Sections:** Separator between logical field groups + section heading (text-sm font-medium)

**Footer:** flex justify-end gap-2 → Button(variant=outline) cancel + Button(variant=default) submit

**Enhancements:**
- RadioGroup for selections (custom card-style radio items with border + checked state)
- Checkbox for agreements/opt-ins
- Textarea for long-form input
- Select with grouped options

## Variants
- **simple**: Stacked fields + submit button. Quick forms.
- **sectioned**: Fields grouped with Separator + section headings. Structured.
- **card-radio**: + RadioGroup with custom card-style radio items. For plan/option selection.
- **multi-column**: Grid layout with half-width fields side by side.

## Interaction Patterns
- Field state: useState for each field or single state object
- Validation: check required fields on submit, show error styling (ring-destructive)
- Error messages: text-xs text-destructive below invalid fields
- Submission: prevent default, validate, then action (local or API)

## Data Patterns

### Frontend-only
- Form state in useState, submitted data stored in local state or console.log
- Validation: manual checks or Zod .safeParse on the state object
- Success: show toast/alert, clear form

### Full-stack (when Hono backend exists)
- Zod schema: src/shared/schemas/<entity>.ts
  SAME schema used by API (zValidator) AND form (zodResolver or manual .safeParse)
  Single source of truth — change schema once, both sides update
- Submit: POST /api/<resource> with form data as JSON body
- Client: use<Resource>().create(data) via hc typed client
- Validation errors from API: 400 response with field-level errors, map to form fields
- Success: redirect or refetch list + show success toast
- Loading state: disable submit Button + show Spinner while submitting

## Anti-Patterns
- ❌ No validation — always validate before submit
- ❌ All fields full-width — use grid cols for logical grouping
- ❌ No visual separation between sections
- ❌ Submit without loading indicator
- ❌ Duplicating Zod schemas between frontend and backend

## Composition Notes
- Forms often live inside Dialog (for quick create) or standalone page (for complex forms)
- Pair with data-table: table shows list, form creates/edits items
- Multi-step forms → use multi-step-wizard gumdrop instead
