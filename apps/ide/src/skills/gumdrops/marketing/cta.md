---
name: cta
domain: marketing
intent: Call-to-action section for conversions, signups, or engagement
complexity: basic
components: Card, Button, Input
---

# Call to Action (CTA)

## Recipe
**Core:** Heading (text-3xl font-bold) + subheading (text-muted-foreground) +
Button (primary CTA) or Input + Button (email capture)

**Layout options:**
- Full-bleed: bg-primary text-primary-foreground, py-20, centered content
- Floating Card: Card with shadow-lg, centered on contrasting bg-muted background
- Split: text left, Input + Button right in a flex row
- Sticky banner: fixed bottom-0 with py-4, dismiss Button

**Enhancements:**
- Urgency Badge ("Limited time", "Last chance")
- Social proof line below CTA ("Join 5,000+ teams")
- Secondary link below primary Button ("No credit card required")

## Variants
- **full-bleed**: Colored background, centered heading + Button. Bold, simple.
- **card-floating**: Card on muted background. Feels contained, premium.
- **email-capture**: Input + Button inline for newsletter/waitlist signup.
- **sticky-banner**: Fixed bottom bar with CTA + dismiss. Persistent nudge.

## Anti-Patterns
- ❌ Multiple competing CTAs — one primary action per section
- ❌ Generic "Sign Up" text — be specific ("Start building free")
- ❌ No visual contrast from surrounding sections — CTA must stand out
- ❌ CTA buried in dense content — give it breathing room (py-16+)

## Composition Notes
- Usually last section before footer, or between major content blocks
- Full-bleed variant creates visual break — great after dense content
- Never place two CTA sections on the same page
- Pair with social proof for trust reinforcement
