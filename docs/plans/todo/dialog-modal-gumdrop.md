---
name: dialog-modal
domain: app
intent: Modal overlays for confirmations, forms, detail views, product showcases, and multi-step flows
complexity: basic→advanced
components: Dialog, AlertDialog, Button, Input, Label, Separator, RadioGroup, Badge, ScrollArea, AspectRatio
---

# Dialog / Modal

## Recipe

Modals serve two fundamentally different purposes and Ralph must distinguish them:

**Action modals** — user does something (confirm, fill form, choose option). Small, focused,
footer-driven. Use DialogHeader + DialogFooter. Content is inputs and choices.

**Showcase modals** — user views rich content (product detail, profile, portfolio piece,
article preview). Large, scrollable, visually composed. Content borrows section patterns
from other gumdrops (hero headers, tag lists, checklists, metadata rows). No DialogFooter —
the CTA lives inline with the content.

Both types share the same mechanical foundation: Dialog + DialogContent + controlled
open state + backdrop + Escape to close. The difference is what goes inside.

### Action Modal Foundation

Dialog + DialogTrigger (Button) + DialogContent + DialogHeader
(DialogTitle + DialogDescription) + body content + DialogFooter
(Button variant=outline for cancel + Button variant=default for confirm)

DialogContent width: max-w-md for simple, max-w-lg for forms, max-w-xl for multi-step.

### Showcase Modal Foundation

Dialog + DialogContent (max-w-2xl, max-h-[90vh] overflow-y-auto, p-0) +
custom header zone (gradient/image/colored, full-bleed inside DialogContent) +
scrollable body sections + inline CTA.

The p-0 on DialogContent is critical — it lets the header bleed edge-to-edge.
Body sections add their own padding (p-6 or p-8).

Close button: absolute positioned top-right in the header zone. When header has a
dark/colored background, close button uses bg-white/20 hover:bg-white/30 text-white.
When header is light, use standard muted styling.

### Entry Animation

Custom modal entrance makes the experience feel designed, not generated:

```css
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-scale-in { animation: scale-in 200ms ease-out; }
.animate-fade-in { animation: fade-in 150ms ease-out; }
```

Apply animate-fade-in to the backdrop overlay, animate-scale-in to the modal container.
The slight translateY(8px) gives the modal a "rising into view" feel.

For showcase modals with a hero element (emoji, illustration, icon), add a delayed
float or bounce animation to that element:

```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
.animate-float { animation: float 3s ease-in-out infinite; }
```

## Variants

### simple
Title + description + Cancel/Confirm footer. 80% of use cases.
DialogContent max-w-md. Two buttons in DialogFooter: outline cancel, default confirm.
Use for: confirmations, acknowledgments, simple yes/no decisions.

### form
DialogContent max-w-lg. Input/Select/Textarea fields inside body.
Fields in grid (grid-cols-1 sm:grid-cols-2 for side-by-side where logical).
Submit button in DialogFooter replaces confirm. Cancel still outline.
Use for: quick create/edit that doesn't warrant a full page.

### destructive
AlertDialog (not Dialog — blocks interaction until resolved).
Warning icon (triangle-alert from lucide) + explicit consequence description.
Input requiring typed confirmation (project name, "DELETE", etc.) to enable action.
Button variant=destructive in footer, disabled until confirmation text matches.
Use for: delete, remove, revoke, any irreversible action.

### multi-step
DialogContent max-w-xl. useState for currentStep (0-indexed).
Step indicator at top: numbered circles connected by lines, active step highlighted.
Conditional content per step. Back/Next buttons in footer, Finish on last step.
Back disabled on step 0, Next disabled if current step invalid.
Separator between step indicator and content.
Use for: onboarding wizards, guided setup, complex creation (2-4 steps max —
beyond 4, use a full page wizard from multi-step-wizard gumdrop).

### product-detail
**The showcase modal.** Triggered by clicking a product card, menu item, portfolio
piece, or any content card that needs an expanded view.

DialogContent max-w-2xl, max-h-[90vh], overflow-y-auto, rounded-2xl or rounded-3xl,
p-0 (critical — allows header bleed).

**Anatomy (top to bottom):**

1. **Hero header** — Full-width colored zone. Uses the product's category color or
   a gradient derived from theme variables. Contains:
   - Close button (absolute top-4 right-4, bg-white/20 rounded-full)
   - Large visual anchor: emoji (text-6xl), product image, or icon (w-16 h-16)
   - Category badge: Badge with bg-white/20 text-white, capitalize
   - Product/item name: font-serif or font-heading, text-3xl→4xl font-bold text-white
   - Tagline/subtitle: text-lg→xl text-white/80, italic optional

   Color approaches for the header:
   - bg-gradient-to-br from-{hue}-600 to-{hue}-700 (rich, vibrant)
   - bg-primary with text-primary-foreground (theme-aligned)
   - Product image with overlay (bg-black/40 backdrop-blur)

2. **Description section** — p-6 or p-8. Heading (font-serif text-lg font-semibold) +
   paragraph (text-muted-foreground leading-relaxed). Keep concise — 2-3 sentences max.

3. **Pull quote or highlight block** (optional) — bg-muted/50 rounded-xl p-5
   border border-border. Italic text. Works for testimonials, tasting notes,
   editorial quotes, or featured descriptions. Distinct from the description
   because it's visually set apart — the muted background creates a "card within
   the modal" feel.

4. **Tag list section** — Heading + flex flex-wrap gap-2 of tag spans.
   Each tag: px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm.
   Use for: ingredients, skills, technologies, categories, tags.

5. **Checklist section** — Heading + grid grid-cols-2 gap-2 of check items.
   Each item: flex items-center gap-2, check icon (lucide Check, w-4 h-4 text-primary
   flex-shrink-0) + text (text-sm text-muted-foreground).
   Use for: benefits, features, what's included, specifications.

6. **Metadata row** — flex gap-6 py-4 border-t border-b border-border.
   Each datum: flex items-center gap-2, icon (w-5 h-5 text-muted-foreground) +
   text (text-sm text-muted-foreground). 2-4 data points max.
   Use for: brew time, servings, prep time, duration, difficulty, date, author.

7. **Action bar** — flex items-center justify-between pt-4. Contains:
   - Left side: quantity stepper (flex items-center gap-2 bg-muted rounded-xl p-1,
     minus button + count span + plus button) and/or price display (text-3xl font-bold)
   - Right side: primary CTA button (bg-primary text-primary-foreground, px-6 py-3
     rounded-xl, with icon + label). flex items-center gap-2 for icon+text in button.

   The action bar is NOT a DialogFooter. It's inline content at the bottom of the
   scrollable area, styled as part of the showcase — not as a system-level dialog control.

**Not all sections are required.** A product modal might use sections 1-2-4-6-7.
A portfolio piece might use 1-2-5-6. A team member profile might use 1-2-3-5.
Pick sections that serve the content. Minimum: hero header (1) + at least one
body section + action or close affordance.

### gallery-lightbox
DialogContent max-w-4xl p-0. Full-bleed image/media display.
AspectRatio wrapper for consistent sizing. Navigation arrows (absolute left/right,
bg-background/80 backdrop-blur rounded-full p-2). Thumbnail strip below (optional,
flex gap-2 overflow-x-auto). Caption overlay at bottom.
Use for: image galleries, portfolio detail, media viewers.

## Interaction Patterns

**Controlled open (all variants):** useState boolean, pass to Dialog open prop.
Never rely solely on DialogTrigger — always support programmatic open/close for
cases where the trigger isn't a direct child (e.g., table row click, card click).

```tsx
const [open, setOpen] = useState(false)
// Card onClick opens modal:
<div onClick={() => setOpen(true)} className="cursor-pointer">...</div>
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>
```

**Form submission:** Local state for fields, validate before closing. On success,
call setOpen(false) after the action completes. Show inline errors, not toasts.

**Destructive confirmation:** Compare input.value.trim().toLowerCase() against
expected string. Disable delete button until exact match.

**Multi-step navigation:** step state, validate current step before advancing.
Going back never loses data (preserve state across steps).

**Quantity stepper (product-detail):** useState for count, min 1, max from data.
Minus button disabled at min, plus at max.

**Keyboard:** Escape closes (Dialog handles this). Tab traps focus inside modal
(Dialog handles this). Enter on focused button activates (native).

**Scroll locking:** Dialog component handles body scroll lock automatically.
The max-h-[90vh] overflow-y-auto on DialogContent keeps the modal itself scrollable
while the page behind stays locked.

## Data Patterns

### Frontend-only
Product/item data lives in a local array or object. The modal receives the full
item object as a prop or via context. No loading state needed — data is synchronous.

```tsx
const [selectedItem, setSelectedItem] = useState<Item | null>(null)
// Card click: setSelectedItem(item)
// Modal reads selectedItem directly
```

### Full-stack (when Hono backend exists)
- Click card → open modal with item.id
- Fetch full detail: GET /api/<resource>/:id
- Hook: use<Resource>Detail(id) → { data, isLoading, error }
- Loading state: show Skeleton placeholders matching modal layout
  (gradient skeleton for header, text skeletons for body sections)
- Error state: show Alert inside modal body, close button still works
- Optimistic updates: cart/quantity changes update local state immediately,
  sync to API in background

## Anti-Patterns

- ❌ Dialog inside Dialog — never nest modals. If a modal action needs confirmation,
  use AlertDialog which renders as a separate layer, not a nested Dialog.
- ❌ Destructive action without confirmation — always require explicit confirmation
  for delete/remove/revoke.
- ❌ Missing DialogDescription — screen readers need it. If visually hidden,
  use sr-only class on DialogDescription, don't omit it.
- ❌ No way to cancel/escape — Dialog handles Escape, but custom modal containers
  MUST include a visible close button (X) and backdrop click to close.
- ❌ Form in dialog with no validation — always validate. At minimum, check required
  fields before allowing submit.
- ❌ Showcase modal with DialogHeader/DialogFooter — product-detail and gallery-lightbox
  should NOT use the standard Dialog header/footer. They compose their own header zone
  and inline CTA. Using DialogHeader puts a plain text title where a rich header belongs.
- ❌ Flat showcase modal — if opening a card into a detail view, the modal MUST be
  visually richer than the card. A modal that looks like a bigger card with more text
  fails the purpose test. Add a gradient/colored header, pull quotes, tag lists,
  or checklists — something the card couldn't show.
- ❌ All-white modal header for product showcases — the hero zone needs color. Use a
  gradient, the product's category color, or an image with overlay. The colored header
  is what makes the modal feel like a designed experience, not a system dialog.
- ❌ Hardcoded Tailwind colors in header gradient — use CSS variable hues or theme-derived
  colors. If the product has a category color, derive it from the theme palette.
  `bg-gradient-to-br from-primary/90 to-accent/80` adapts to any theme.
- ❌ No entry animation — showcase modals without animation feel like they pop in
  from nowhere. Add scale-in on the container and fade-in on the backdrop.
- ❌ CTA in DialogFooter on showcase modals — the purchase/action button belongs
  inline at the bottom of the scrollable content, not pinned in a system footer bar.
  It's part of the content experience, not a dialog control.

## Composition Notes

### Where modals get triggered
- **Product/item cards** → product-detail variant (grid of cards, click opens showcase)
- **Table row actions** → DropdownMenu item opens form or destructive variant
- **Toolbar buttons** → form variant for quick create
- **Settings toggles** → simple variant for confirmation
- **Gallery thumbnails** → gallery-lightbox variant

### What composes inside showcase modals
The product-detail modal is a **compositional container** — it borrows section patterns
from other gumdrops and composes them vertically inside a scrollable overlay:

| Modal Section | Borrowed From | Adaptation |
|--------------|---------------|------------|
| Hero header | hero gumdrop | Compressed to fit modal width, no CTA in header |
| Tag list | features icon-grid | Horizontal tag chips instead of icon + description |
| Benefits checklist | features icon-grid | 2-col grid with check icons, no heading needed |
| Pull quote | testimonials | Single quote, no avatar, muted background |
| Metadata row | stats-dashboard | Inline icon+text pairs, no Cards |
| Action bar | pricing | Price + quantity + CTA, no tier comparison |

This composition is what makes showcase modals feel designed rather than generated.
Each section pulls from a known pattern but adapts it for the modal context — smaller,
denser, vertically scrollable.

### Sequencing rules for showcase modal sections
1. Hero header is ALWAYS first (full-bleed, colored)
2. Description or about section comes immediately after (establish context)
3. Middle sections (tags, checklist, pull quote) can be in any order — choose
   the order that serves the content hierarchy
4. Metadata row acts as a visual separator before the action bar
5. Action bar is ALWAYS last (the thing you scroll down to do)

### When NOT to use a modal
- Content requires more than 90vh of scrolling → use a full page or Sheet instead
- Complex multi-entity editing → use a page with URL routing
- Sequential flow with 5+ steps → use multi-step-wizard gumdrop (full page)
- Content that benefits from URL sharing → use a route, not a modal (modals have no URL)
