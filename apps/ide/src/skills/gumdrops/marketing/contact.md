---
name: contact
domain: marketing
intent: Contact form with fields for name, email, subject, and message
complexity: basic
components: Card, Input, Textarea, Label, Button, Select
---

# Contact

## Recipe
**Core:** Card with form fields — Input (name) + Input (email) + Select (subject/reason) +
Textarea (message) + Button (submit). Each field with Label.

**Layout:** max-w-xl mx-auto or split layout (form left, contact info right)

**Enhancements:**
- Select for inquiry type (General, Support, Sales, Partnership)
- Contact info sidebar: email, phone, address, social links
- Map embed or office illustration alongside form
- Success state: replace form with "Thanks" message + expected response time

## Variants
- **simple**: Card with stacked fields + submit. Clean, focused.
- **split-layout**: Form left, contact info/map right. Grid grid-cols-1 md:grid-cols-2.
- **with-subject**: + Select dropdown for categorizing inquiry type.
- **minimal-inline**: Input (email) + Textarea (message) + Button. No Card wrapper.

## Anti-Patterns
- ❌ Too many required fields — name, email, message is sufficient
- ❌ No field validation — always validate email format + required fields
- ❌ No success feedback — always confirm submission
- ❌ Phone number as required — makes users abandon the form

## Composition Notes
- Usually near bottom of page, before footer
- Pairs with FAQ section above (questions → can't find answer → contact)
- Can also be a Dialog/Sheet overlay triggered by a Button elsewhere
