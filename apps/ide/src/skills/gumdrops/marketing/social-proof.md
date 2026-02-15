---
name: social-proof
domain: marketing
intent: Trust signals with logos, metrics, awards, and partner badges
complexity: basic
components: Avatar, Badge, ScrollArea
---

# Social Proof

## Recipe
**Core:** Row of trust indicators — company logos, metric counters, or award badges.
Typically a horizontal strip with flex items-center justify-center gap-8.

**Layout options:**
- Logo strip: grayscale logos in flex row (opacity-50 hover:opacity-100 transition)
- Metric counters: 3-4 big numbers (text-4xl font-bold) + labels (text-sm text-muted-foreground)
- Award badges: Badge components with icons for certifications/ratings
- Combined: logos above, metrics below with Separator between

**Enhancements:**
- ScrollArea for horizontal logo overflow on mobile
- Avatar for partner/client headshots
- Animated counter (count-up effect with useEffect + requestAnimationFrame)
- "As seen in" or "Trusted by" label above logos

## Variants
- **logo-strip**: Horizontal row of grayscale logos. Classic trust signal.
- **metric-counters**: Big numbers (users, revenue, uptime). Impact-focused.
- **badge-row**: Award/certification Badge components in a row.
- **combined**: Logos + metrics + optional Avatar testimonial snippets.

## Anti-Patterns
- ❌ Colored logos that clash with theme — always grayscale with hover reveal
- ❌ Too many metrics — 3-4 max, each must be impressive
- ❌ Fake or inflated numbers — credibility is the whole point
- ❌ Missing context labels — numbers without labels mean nothing

## Composition Notes
- Best as a breathing section between dense content blocks
- Works immediately below hero or between features and pricing
- Keep it visually light — this section should feel effortless
- Pairs with testimonials for deeper social proof
