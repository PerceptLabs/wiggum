---
name: newsletter
domain: marketing
intent: Email newsletter signup with inline, modal, or banner variants
complexity: basic
components: Input, Button
---

# Newsletter

## Recipe
**Core:** Input (type="email", placeholder="your@email.com") + Button ("Subscribe").
Inline flex row with gap-2.

**Layout options:**
- Inline: flex row, often embedded within another section (hero, footer, CTA)
- Banner: full-width strip with bg-muted or bg-primary, centered Input + Button
- Card standalone: Card with heading + description + Input + Button
- Dialog popup: Dialog triggered on scroll/timer with email capture

**Enhancements:**
- Description text above (text-sm text-muted-foreground): "Get weekly updates"
- Privacy note below (text-xs): "No spam. Unsubscribe anytime."
- Success state: replace form with "Check your inbox" message
- Badge count: "Join 5,000+ subscribers"

## Variants
- **inline**: Input + Button in a row. Embeds anywhere.
- **banner**: Full-width colored strip. Prominent, standalone.
- **card**: Card with heading, description, form. Self-contained section.
- **popup**: Dialog on trigger (scroll depth, timer). Attention-grabbing.

## Anti-Patterns
- ❌ Asking for more than email — name is optional, everything else is friction
- ❌ No privacy note — users worry about spam
- ❌ No success state — always confirm subscription
- ❌ Popup on page load — wait for scroll depth or time delay

## Composition Notes
- Inline variant embeds in hero, footer, or CTA sections
- Banner works as a standalone breathing section
- Never show popup if user already subscribed (check localStorage)
- Pairs with CTA section for combined conversion
