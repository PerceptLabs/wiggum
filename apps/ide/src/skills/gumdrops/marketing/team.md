---
name: team
domain: marketing
intent: Team member display with photos, roles, and social links
complexity: intermediate
components: Avatar, HoverCard, Badge, Card
---

# Team

## Recipe
**Core:** Grid (grid-cols-2 md:grid-cols-3 lg:grid-cols-4) of team member items.
Each item: Avatar (size lg) + name (font-semibold) + role (text-sm text-muted-foreground)

**Enhancements:**
- HoverCard on Avatar showing full bio, social links, fun fact
- Badge for department or speciality ("Engineering", "Design", "Founder")
- Card wrapper per member for elevated look with hover effect
- Social icons row (Github, Twitter, Linkedin from lucide-react)

## Variants
- **grid-simple**: Avatar + name + role in a clean grid. Minimal.
- **card-detailed**: Card per member with Avatar, bio paragraph, social links.
- **hover-reveal**: Grid of Avatars, HoverCard reveals full details on hover.
- **featured-founders**: Large Cards for founders/leaders, smaller grid for rest.

## Anti-Patterns
- ❌ No photos — use Avatar with AvatarFallback (initials) at minimum
- ❌ All identical Card layouts — vary featured members vs regular
- ❌ Too much text per member — keep visible info to name + role
- ❌ No social links — always include at least one contact method

## Composition Notes
- Pairs with social-proof and testimonials for building trust
- Works as standalone section or within an "About" page
- Follow with a CTA or contact section
- Never place directly after another Card-grid section
