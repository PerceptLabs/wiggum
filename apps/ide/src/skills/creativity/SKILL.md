---
name: creativity
description: Layout patterns and design variety for unique projects
when_to_use: Landing pages, marketing sites, portfolios - anything user-facing
---

# Design Creativity

Every project deserves a unique layout. Don't default to cookie-cutter.

## Avoid This Pattern

```
Hero Section
    ↓
3-Card Feature Grid
    ↓
CTA Section
```

This is AI slop. Be better.

## Layout Patterns

### Bento Grid
Asymmetric boxes of different sizes. Great for features, portfolios.
```
┌──────────┬─────┐
│   Big    │ Sm  │
│          ├─────┤
├────┬─────┤ Sm  │
│ Sm │ Med │     │
└────┴─────┴─────┘
```
```tsx
<div className="grid grid-cols-4 gap-4">
  <div className="col-span-2 row-span-2">Big</div>
  <div>Small</div>
  <div>Small</div>
  <div>Small</div>
  <div className="col-span-2">Medium</div>
</div>
```

### Split Screen
50/50 or 60/40 divisions. Image + text, demo + description.
```tsx
<div className="grid grid-cols-2 min-h-screen">
  <div className="bg-primary" />
  <div className="flex items-center p-12">Content</div>
</div>
```

### Overlapping Sections
Cards that bleed into the next section. Creates depth.
```tsx
<section className="bg-primary pb-32" />
<section className="relative -mt-24">
  <Card className="mx-auto max-w-4xl" />
</section>
```

### Diagonal Dividers
Angled section breaks instead of straight lines.
```css
.diagonal-top {
  clip-path: polygon(0 10%, 100% 0, 100% 100%, 0 100%);
}
```

### Floating Elements
Images or cards that break container boundaries.
```tsx
<div className="relative">
  <img className="absolute -right-12 -top-8 w-64" />
</div>
```

## Match Layout to Project

| Project Type | Layout Direction |
|--------------|------------------|
| SaaS/Product | Clean grid, clear hierarchy, prominent CTA |
| Portfolio | Asymmetric, full-bleed images, personality |
| App/Dashboard | Dense, functional, minimal decoration |
| E-commerce | Product-focused, scannable, trust signals |
| Creative/Agency | Bold, unexpected, memorable |

## Color Personality

| Palette | Vibe |
|---------|------|
| Warm (orange, coral) | Friendly, energetic |
| Cool (blue, teal) | Trustworthy, calm |
| Dark + neon accents | Techy, futuristic |
| Pastels | Soft, approachable |
| Monochrome + one accent | Sophisticated |

## Motion Ideas (CSS-only)

```css
/* Staggered entrance */
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: 0.1s; }
.stagger > *:nth-child(3) { animation-delay: 0.2s; }

/* Floating decoration */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Parallax-lite on scroll */
.parallax { transform: translateY(calc(var(--scroll) * 0.5)); }
```

## The Golden Rule

Before starting, ask: "What makes THIS project different?"

Then design for that difference.
