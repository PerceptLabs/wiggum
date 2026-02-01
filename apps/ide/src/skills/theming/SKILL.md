---
name: Theming
description: How to style your app with CSS variables
when_to_use: Every project - defines your visual identity
---

## How It Works

Components use CSS variables like `var(--primary)`. You define these in `src/index.css`.

**Define all variables in src/index.css.** The full list is in the Required Variables table below - just include them all when setting up your theme.

## Required Variables

| Variable | What It Affects | Example Value |
|----------|-----------------|---------------|
| `--background` | Page background | `0 0% 100%` (white) |
| `--foreground` | Main text color | `0 0% 3.9%` (near black) |
| `--primary` | Buttons, links, accents | `210 100% 50%` (blue) |
| `--primary-foreground` | Text on primary | `0 0% 100%` (white) |
| `--secondary` | Secondary buttons | `0 0% 96.1%` (light gray) |
| `--secondary-foreground` | Text on secondary | `0 0% 9%` |
| `--muted` | Subtle backgrounds | `0 0% 96.1%` |
| `--muted-foreground` | Subtle text | `0 0% 45.1%` |
| `--accent` | Hover states | `0 0% 96.1%` |
| `--accent-foreground` | Text on accent | `0 0% 9%` |
| `--destructive` | Delete, error actions | `0 84.2% 60.2%` (red) |
| `--destructive-foreground` | Text on destructive | `0 0% 98%` |
| `--card` | Card backgrounds | `0 0% 100%` |
| `--card-foreground` | Card text | `0 0% 3.9%` |
| `--popover` | Dropdown backgrounds | `0 0% 100%` |
| `--popover-foreground` | Dropdown text | `0 0% 3.9%` |
| `--border` | All borders | `0 0% 89.8%` |
| `--input` | Input borders | `0 0% 89.8%` |
| `--ring` | Focus rings | `0 0% 3.9%` |
| `--radius` | Border radius | `0.5rem` |

**Values are HSL without `hsl()`** - the format is `hue saturation% lightness%`.

## Complete Theme Examples

### Clean Minimal (Default)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --radius: 0.5rem;
}
```

### Bold & Confident

```css
:root {
  --background: 55 100% 98%;
  --foreground: 0 0% 4%;
  --primary: 50 100% 53%;
  --primary-foreground: 0 0% 4%;
  --secondary: 45 50% 92%;
  --secondary-foreground: 0 0% 4%;
  --muted: 45 30% 90%;
  --muted-foreground: 0 0% 40%;
  --accent: 50 100% 53%;
  --accent-foreground: 0 0% 4%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --card: 55 100% 98%;
  --card-foreground: 0 0% 4%;
  --popover: 55 100% 98%;
  --popover-foreground: 0 0% 4%;
  --border: 0 0% 0%;
  --input: 0 0% 0%;
  --ring: 50 100% 53%;
  --radius: 0px;
}
```

### Ocean Blue

```css
:root {
  --background: 210 40% 98%;
  --foreground: 210 40% 10%;
  --primary: 210 100% 50%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 20% 94%;
  --secondary-foreground: 210 40% 10%;
  --muted: 210 20% 94%;
  --muted-foreground: 210 20% 40%;
  --accent: 210 30% 90%;
  --accent-foreground: 210 40% 10%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --card: 0 0% 100%;
  --card-foreground: 210 40% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 210 40% 10%;
  --border: 210 20% 85%;
  --input: 210 20% 85%;
  --ring: 210 100% 50%;
  --radius: 0.75rem;
}
```

## Tips

1. **Pick 1-2 accent colors max** - too many colors looks chaotic
2. **Keep contrast high** - foreground should contrast with background
3. **--radius sets personality**: `0` = sharp/modern, `0.5rem` = balanced, `1rem+` = playful
4. **Test with Card and Button** - if those look good, most things will

## Design Philosophy

### Dynamic by Default
Landing pages should have motion, personality, and visual interest. Static pages feel dated.
Only reduce animations when user explicitly requests "minimal", "clean", or "simple".

### Theme Independence
Create themes appropriate to project content and mood, not the IDE.
A crypto landing page should feel different from a bakery website.

### Purposeful Motion
Animations should:
- Guide attention to important elements
- Provide feedback on interactions
- Create a sense of polish and care
- Never distract or annoy

### Match Project Type

| Project Type | Direction |
|-------------|-----------|
| SaaS/Product | Clean with bold CTAs, professional but not boring |
| Creative/Portfolio | Expressive, unique layouts, memorable |
| Developer tools | Dark mode friendly, code-inspired, polished |
| E-commerce | Clear hierarchy, product-focused |
| Personal/Blog | Warm, readable, personality-forward |

## Creative CSS (Use By Default)

### Entrance Animations
Add to sections and cards:
```css
.fade-in {
  animation: fadeIn 0.6s ease-out forwards;
  opacity: 0;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Staggered Delays
For lists and grids, delay each item:
```css
.stagger > *:nth-child(1) { animation-delay: 0s; }
.stagger > *:nth-child(2) { animation-delay: 0.1s; }
.stagger > *:nth-child(3) { animation-delay: 0.2s; }
/* Continue pattern */
```

### Micro-interactions
```css
/* Hover lift */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}

/* Button press */
.press:active {
  transform: scale(0.98);
}

/* Glow effect for CTAs */
.glow:hover {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.4);
}
```

### Background Effects
```css
/* Gradient background */
.gradient-bg {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)));
}

/* Glassmorphism */
.glass {
  background: hsl(var(--background) / 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid hsl(var(--border) / 0.5);
}
```

### Timing Guidelines
- Micro-interactions: 150-200ms
- Hover states: 200-300ms
- Entrance animations: 400-600ms
- Stagger delays: 50-100ms between items
- Easing: `ease-out` for entrances, `ease-in-out` for hovers

## Keyframes Library

Include these in src/index.css as needed:

```css
/* Entrances */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

/* Decorative */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

/* Backgrounds */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 5px hsl(var(--primary) / 0.5); }
  50% { box-shadow: 0 0 20px hsl(var(--primary) / 0.8); }
}
```

## Accessibility

**Always include this in src/index.css:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This respects users who have motion sensitivity while keeping your design intact for others.

## Respecting User Preferences

### Default (no specific request)
Go rich: animations, expressive colors, dynamic backgrounds, micro-interactions.
Make it memorable.

### When user says "minimal", "clean", or "simple"
- Reduce to subtle fades only (no bounces, floats, or complex animations)
- Monochromatic or limited palette
- More whitespace
- Fewer decorative elements

### When user says "professional" or "corporate"
- Subdued animations (fades only, shorter durations)
- Conservative color palette (blues, grays)
- Structured grid layouts
- No playful elements

**Always honor explicit requests.** If user says "no animations", remove them entirely.

## Overlays & Z-Index (CRITICAL)

Stack components handle this automatically. If you must go custom:

```css
/* Backdrop */
.overlay-backdrop {
  @apply fixed inset-0 bg-black/50 z-40;
}

/* Content */
.overlay-content {
  @apply fixed z-50;
  /* center it */
  @apply top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2;
}
```

Z-index scale:
- `z-10`: Sticky headers
- `z-20`: Dropdowns, tooltips
- `z-30`: Fixed sidebars
- `z-40`: Modal backdrops
- `z-50`: Modal content
- `z-[100]`: Dev tools only

**Never** manually layer multiple modals. Use one at a time.

## Native Form Element Fix (CRITICAL)

Radix Select, native `<select>`, and other form elements ignore CSS variables in dark mode. Always include:

```css
/* In src/index.css, after :root variables */
select,
input,
textarea {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}

select option {
  background-color: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
}

/* For autofill */
input:-webkit-autofill {
  -webkit-box-shadow: 0 0 0 1000px hsl(var(--background)) inset;
  -webkit-text-fill-color: hsl(var(--foreground));
}
```

**Test before marking complete**: Switch to dark mode and verify ALL inputs are readable.
