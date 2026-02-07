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

### Dark Mode

Always include a `.dark` class alongside `:root`. Components switch automatically when `<html class="dark">` is set:

```css
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}
```

Adapt dark values to match your theme's personality — a warm theme should have warm dark mode colors too.

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

---

## Theme Preset Picker

9 curated presets (3 above + 6 below). Pick based on project feel:

| If the task feels like... | Try these presets |
|---------------------------|-------------------|
| Professional / corporate | slate-modern, clean-minimal |
| Warm / friendly / food | amber-glow, bold-confident |
| Nature / organic / health | forest-green, ocean-blue |
| Bold / startup / tech | bold-cyan, ocean-blue |
| Luxury / editorial / fashion | rose-gold, clean-minimal |
| Dark-first / dev tools / gaming | cosmic-dark, slate-modern |

**NEVER default to violet purple.** If none of these fit, use the Color Derivation Logic below to create a custom theme.

---

## Slate Modern (217°)

Clean corporate with cool neutrals. Good for dashboards, B2B, admin panels.

```css
:root {
  --background: 210 20% 98%;
  --foreground: 217 33% 17%;
  --card: 210 20% 99%;
  --card-foreground: 217 33% 17%;
  --popover: 0 0% 100%;
  --popover-foreground: 217 33% 17%;
  --primary: 217 91% 60%;
  --primary-foreground: 210 40% 98%;
  --secondary: 214 32% 91%;
  --secondary-foreground: 217 33% 17%;
  --muted: 214 32% 91%;
  --muted-foreground: 215 16% 47%;
  --accent: 214 32% 91%;
  --accent-foreground: 217 33% 17%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 217 91% 60%;
  --radius: 0.5rem;
}

.dark {
  --background: 217 33% 8%;
  --foreground: 210 40% 98%;
  --card: 217 33% 10%;
  --card-foreground: 210 40% 98%;
  --popover: 217 33% 10%;
  --popover-foreground: 210 40% 98%;
  --primary: 217 91% 65%;
  --primary-foreground: 217 33% 8%;
  --secondary: 217 33% 17%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 16% 57%;
  --accent: 217 33% 17%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
  --ring: 217 91% 65%;
}
```

---

## Amber Glow (38°)

Warm, inviting, golden. Good for food, hospitality, warm brands.

```css
:root {
  --background: 36 33% 97%;
  --foreground: 28 25% 14%;
  --card: 36 33% 99%;
  --card-foreground: 28 25% 14%;
  --popover: 0 0% 100%;
  --popover-foreground: 28 25% 14%;
  --primary: 38 92% 50%;
  --primary-foreground: 38 92% 10%;
  --secondary: 36 33% 90%;
  --secondary-foreground: 28 25% 14%;
  --muted: 36 33% 90%;
  --muted-foreground: 28 10% 45%;
  --accent: 36 33% 90%;
  --accent-foreground: 28 25% 14%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 36 25% 85%;
  --input: 36 25% 85%;
  --ring: 38 92% 50%;
  --radius: 0.75rem;
}

.dark {
  --background: 28 25% 6%;
  --foreground: 36 33% 96%;
  --card: 28 25% 9%;
  --card-foreground: 36 33% 96%;
  --popover: 28 25% 9%;
  --popover-foreground: 36 33% 96%;
  --primary: 38 92% 55%;
  --primary-foreground: 28 25% 6%;
  --secondary: 28 25% 15%;
  --secondary-foreground: 36 33% 96%;
  --muted: 28 25% 15%;
  --muted-foreground: 28 10% 55%;
  --accent: 28 25% 15%;
  --accent-foreground: 36 33% 96%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
  --border: 28 25% 15%;
  --input: 28 25% 15%;
  --ring: 38 92% 55%;
}
```

---

## Forest Green (152°)

Natural, trustworthy, grounded. Good for health, nature, sustainability.

```css
:root {
  --background: 140 20% 97%;
  --foreground: 152 28% 12%;
  --card: 140 20% 99%;
  --card-foreground: 152 28% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 152 28% 12%;
  --primary: 152 60% 36%;
  --primary-foreground: 140 20% 98%;
  --secondary: 140 20% 90%;
  --secondary-foreground: 152 28% 12%;
  --muted: 140 20% 90%;
  --muted-foreground: 152 10% 44%;
  --accent: 140 20% 90%;
  --accent-foreground: 152 28% 12%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 140 15% 85%;
  --input: 140 15% 85%;
  --ring: 152 60% 36%;
  --radius: 0.5rem;
}

.dark {
  --background: 152 28% 5%;
  --foreground: 140 20% 96%;
  --card: 152 28% 8%;
  --card-foreground: 140 20% 96%;
  --popover: 152 28% 8%;
  --popover-foreground: 140 20% 96%;
  --primary: 152 60% 42%;
  --primary-foreground: 152 28% 5%;
  --secondary: 152 28% 14%;
  --secondary-foreground: 140 20% 96%;
  --muted: 152 28% 14%;
  --muted-foreground: 152 10% 55%;
  --accent: 152 28% 14%;
  --accent-foreground: 140 20% 96%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
  --border: 152 28% 14%;
  --input: 152 28% 14%;
  --ring: 152 60% 42%;
}
```

---

## Bold Cyan (174°)

Confident, modern, energetic. Good for fintech, dev tools, startups.

```css
:root {
  --background: 180 15% 97%;
  --foreground: 174 30% 10%;
  --card: 180 15% 99%;
  --card-foreground: 174 30% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 174 30% 10%;
  --primary: 174 72% 40%;
  --primary-foreground: 180 15% 98%;
  --secondary: 180 15% 90%;
  --secondary-foreground: 174 30% 10%;
  --muted: 180 15% 90%;
  --muted-foreground: 174 10% 44%;
  --accent: 180 15% 90%;
  --accent-foreground: 174 30% 10%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 180 12% 85%;
  --input: 180 12% 85%;
  --ring: 174 72% 40%;
  --radius: 0.375rem;
}

.dark {
  --background: 174 30% 5%;
  --foreground: 180 15% 96%;
  --card: 174 30% 8%;
  --card-foreground: 180 15% 96%;
  --popover: 174 30% 8%;
  --popover-foreground: 180 15% 96%;
  --primary: 174 72% 48%;
  --primary-foreground: 174 30% 5%;
  --secondary: 174 30% 14%;
  --secondary-foreground: 180 15% 96%;
  --muted: 174 30% 14%;
  --muted-foreground: 174 10% 55%;
  --accent: 174 30% 14%;
  --accent-foreground: 180 15% 96%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
  --border: 174 30% 14%;
  --input: 174 30% 14%;
  --ring: 174 72% 48%;
}
```

---

## Rose Gold (346°)

Elegant, editorial, premium. Good for fashion, lifestyle, luxury brands.

```css
:root {
  --background: 340 20% 98%;
  --foreground: 346 25% 13%;
  --card: 340 20% 99%;
  --card-foreground: 346 25% 13%;
  --popover: 0 0% 100%;
  --popover-foreground: 346 25% 13%;
  --primary: 346 77% 50%;
  --primary-foreground: 340 20% 98%;
  --secondary: 340 20% 92%;
  --secondary-foreground: 346 25% 13%;
  --muted: 340 20% 92%;
  --muted-foreground: 346 10% 45%;
  --accent: 340 20% 92%;
  --accent-foreground: 346 25% 13%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 340 15% 87%;
  --input: 340 15% 87%;
  --ring: 346 77% 50%;
  --radius: 0rem;
}

.dark {
  --background: 346 25% 5%;
  --foreground: 340 20% 96%;
  --card: 346 25% 8%;
  --card-foreground: 340 20% 96%;
  --popover: 346 25% 8%;
  --popover-foreground: 340 20% 96%;
  --primary: 346 77% 58%;
  --primary-foreground: 346 25% 5%;
  --secondary: 346 25% 15%;
  --secondary-foreground: 340 20% 96%;
  --muted: 346 25% 15%;
  --muted-foreground: 346 10% 55%;
  --accent: 346 25% 15%;
  --accent-foreground: 340 20% 96%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
  --border: 346 25% 15%;
  --input: 346 25% 15%;
  --ring: 346 77% 58%;
}
```

---

## Cosmic Dark (265°)

Immersive, deep, atmospheric. Good for gaming, creative tools, dark-first apps. **This is a dark-first theme** — dark mode is the primary experience.

```css
:root {
  --background: 260 15% 95%;
  --foreground: 265 20% 15%;
  --card: 260 15% 97%;
  --card-foreground: 265 20% 15%;
  --popover: 0 0% 100%;
  --popover-foreground: 265 20% 15%;
  --primary: 265 85% 55%;
  --primary-foreground: 260 15% 98%;
  --secondary: 260 15% 88%;
  --secondary-foreground: 265 20% 15%;
  --muted: 260 15% 88%;
  --muted-foreground: 265 8% 45%;
  --accent: 265 40% 85%;
  --accent-foreground: 265 20% 15%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --border: 260 12% 85%;
  --input: 260 12% 85%;
  --ring: 265 85% 55%;
  --radius: 0.75rem;
}

.dark {
  --background: 265 30% 4%;
  --foreground: 260 15% 95%;
  --card: 265 25% 7%;
  --card-foreground: 260 15% 95%;
  --popover: 265 25% 7%;
  --popover-foreground: 260 15% 95%;
  --primary: 265 85% 65%;
  --primary-foreground: 265 30% 4%;
  --secondary: 265 20% 14%;
  --secondary-foreground: 260 15% 95%;
  --muted: 265 20% 14%;
  --muted-foreground: 265 8% 55%;
  --accent: 280 40% 20%;
  --accent-foreground: 260 15% 95%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 0 0% 98%;
  --border: 265 20% 14%;
  --input: 265 20% 14%;
  --ring: 265 85% 65%;
}
```

**Note:** Cosmic Dark uses purple intentionally (it's a deliberate immersive choice, not a lazy default). Use ONLY for dark-first creative/gaming apps. For general projects, pick a different preset.

---

## Color Derivation Logic

When customizing presets or building themes from scratch, follow these rules.

### Dark Mode Derivation (Inverted Lightness)

| Light mode L% | Dark mode L% | Role |
|---------------|-------------|------|
| 95-100% | 4-10% | Backgrounds (background, card, popover) |
| 85-92% | 13-18% | Muted surfaces (muted, secondary, accent) |
| 40-55% | 55-65% | Muted foreground text |
| 8-15% | 93-98% | Primary text (foreground) |
| Primary hue L% | Same hue, boost L% by 5-8% | Primary button/accent |

### Paired Tokens (ALWAYS update both sides)

These pairs must maintain readable contrast. Never change one without the other:
- `background` ↔ `foreground`
- `card` ↔ `card-foreground`
- `primary` ↔ `primary-foreground`
- `secondary` ↔ `secondary-foreground`
- `accent` ↔ `accent-foreground`
- `destructive` ↔ `destructive-foreground`
- `muted` ↔ `muted-foreground`
- `popover` ↔ `popover-foreground`

### Token Change Logic

| User Says | Variables to Change |
|-----------|-------------------|
| "Make it [color]" | primary, secondary, accent, ring |
| "Darker/lighter background" | background, card, popover, muted (surfaces only) |
| "More contrast" | Widen foreground/background L% gap by 10+ |
| "Warmer" | Shift all hues toward 20-40° range |
| "Cooler" | Shift all hues toward 200-230° range |
| "More saturated" | Increase S% on primary/accent by 10-20% |
| "Softer" | Decrease S%, increase background L% |

### Variable Groupings (move together)

- **Surface group:** background, card, popover, muted — share similar L% and low S%
- **Brand group:** primary, secondary, accent, ring — carry the personality
- **Utility group:** border, input — neutral, 6-12% darker than background
- **Destructive:** Always red-based (H: 0-10°). Don't change unless explicitly asked.

### Contrast Rules (WCAG AA — Non-Negotiable)

- Normal text on background: minimum **4.5:1** contrast ratio
- Large text (18px+) and UI elements: minimum **3:1**
- **Quick L% check:** foreground and background lightness must differ by **≥50 points**
- Destructive: Always `0 84% 60%` light / `0 63% 31%` dark (proven readable)

### Anti-Slop Color Rules

- **NEVER** use generic purple (~270° 80% 60%) as primary unless the project is explicitly about gaming/immersive (use cosmic-dark preset)
- **NEVER** use the same palette for consecutive projects
- **ALWAYS** define both `:root` AND `.dark` — no exceptions
- **NEVER** set border and background to the same lightness (borders should be 6-12% darker)
- **ALWAYS** test destructive buttons are visible on both light and dark backgrounds
