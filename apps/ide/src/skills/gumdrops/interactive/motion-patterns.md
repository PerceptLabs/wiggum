---
name: motion-patterns
domain: interactive
intent: Animation vocabulary — easings, timing, transitions, micro-interactions, page orchestration
complexity: basic
components: none (CSS patterns that enhance any component)
---

# Motion Patterns

## Recipe

Motion is a design language. These are the building blocks every animation in Wiggum is composed from. Zero dependencies — CSS custom properties, keyframes, and transitions only.

### Motion Tokens (CSS Custom Properties)

Define in `src/index.css` alongside theme vars:

```css
:root {
  /* Durations */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --duration-reveal: 700ms;

  /* Easings */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);        /* snappy exit — buttons, menus */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* symmetric — modals, slides */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* overshoot — playful, bouncy */
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);        /* material-style — general UI */
  --ease-dramatic: cubic-bezier(0.7, 0, 0.3, 1);      /* slow start, fast end — reveals */
}
```

These are consumed everywhere. Never hardcode `ease-in-out` or `0.3s` — use tokens.

### Easing Personality Guide

| Easing | Personality | Use For |
|--------|------------|---------|
| `--ease-out` | Confident, decisive | Button press, dropdown open, tooltip appear |
| `--ease-in-out` | Balanced, professional | Modal open/close, page transitions, slides |
| `--ease-spring` | Playful, energetic | Toggle switches, notification badges, fun UI |
| `--ease-smooth` | Calm, polished | Fade-ins, color transitions, hover states |
| `--ease-dramatic` | Cinematic, editorial | Hero reveals, section entrances, scroll effects |

**Rule:** Match easing to brand personality. Luxury = `--ease-dramatic`. SaaS = `--ease-smooth`. Creative = `--ease-spring`.

### Duration Rules

| What's Moving | Duration | Why |
|--------------|----------|-----|
| Color/opacity hover | `--duration-fast` (150ms) | Instant feedback, no lag |
| Tooltip/popover appear | `--duration-fast` (150ms) | Feels like it was always there |
| Dropdown/menu | `--duration-normal` (300ms) | Visible but not slow |
| Modal/dialog | `--duration-normal` (300ms) | Smooth entrance, doesn't block |
| Slide panel/sheet | `--duration-slow` (500ms) | Spatial movement needs time |
| Scroll reveal | `--duration-reveal` (700ms) | Dramatic enough to notice |
| Page transition | 400-600ms | Depends on distance traveled |

**Rule:** Small elements = fast. Large elements = slow. Movement = slower than opacity.

## Variants

### Micro-Interactions

Tiny animations that make UI feel alive:

```css
/* Button press */
.btn-press:active { transform: scale(0.97); transition: transform var(--duration-fast) var(--ease-out); }

/* Hover lift */
.hover-lift { transition: transform var(--duration-normal) var(--ease-out), box-shadow var(--duration-normal) var(--ease-out); }
.hover-lift:hover { transform: translateY(-2px); box-shadow: 0 4px 12px hsl(var(--foreground) / 0.08); }

/* Focus ring pulse */
.focus-pulse:focus-visible { animation: pulse-ring 1.5s var(--ease-in-out) infinite; }
@keyframes pulse-ring { 0%, 100% { box-shadow: 0 0 0 0 hsl(var(--ring) / 0.4); } 50% { box-shadow: 0 0 0 4px hsl(var(--ring) / 0); } }

/* Icon spin on action */
.icon-spin { transition: transform var(--duration-normal) var(--ease-spring); }
.icon-spin.active { transform: rotate(90deg); }

/* Badge bounce on update */
@keyframes badge-bounce { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
.badge-update { animation: badge-bounce 0.4s var(--ease-spring); }

/* Skeleton shimmer */
@keyframes shimmer { from { background-position: -200% 0; } to { background-position: 200% 0; } }
.skeleton { background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted-foreground) / 0.08) 50%, hsl(var(--muted)) 75%); background-size: 200% 100%; animation: shimmer 1.5s ease infinite; }
```

### Entrance Patterns

```css
/* Fade up — default entrance */
@keyframes fade-up { from { opacity: 0; transform: translateY(1rem); } to { opacity: 1; transform: translateY(0); } }

/* Fade in — subtlest */
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

/* Scale in — from center */
@keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

/* Slide in from edge */
@keyframes slide-in-right { from { opacity: 0; transform: translateX(2rem); } to { opacity: 1; transform: translateX(0); } }
@keyframes slide-in-left { from { opacity: 0; transform: translateX(-2rem); } to { opacity: 1; transform: translateX(0); } }

/* Pop — spring entrance */
@keyframes pop-in { 0% { opacity: 0; transform: scale(0.8); } 70% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }

/* Blur in — editorial */
@keyframes blur-in { from { opacity: 0; filter: blur(8px); } to { opacity: 1; filter: blur(0); } }
```

Apply via utility classes:
```css
.animate-fade-up { animation: fade-up var(--duration-reveal) var(--ease-dramatic) both; }
.animate-scale-in { animation: scale-in var(--duration-slow) var(--ease-out) both; }
.animate-pop-in { animation: pop-in var(--duration-slow) var(--ease-spring) both; }
.animate-blur-in { animation: blur-in var(--duration-reveal) var(--ease-smooth) both; }
```

### Continuous Ambient Animations

Subtle motion that runs indefinitely — use sparingly (1-2 per page max):

```css
/* Floating element */
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-0.5rem); } }
.animate-float { animation: float 4s var(--ease-in-out) infinite; }

/* Gentle rotation */
@keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.animate-spin-slow { animation: spin-slow 20s linear infinite; }

/* Breathing scale */
@keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.03); opacity: 1; } }
.animate-breathe { animation: breathe 5s var(--ease-in-out) infinite; }

/* Gradient shift */
@keyframes gradient-shift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
.animate-gradient { background-size: 200% 200%; animation: gradient-shift 8s ease infinite; }
```

### Page Orchestration

How to choreograph a full page load:

```
Frame 0ms:    Nav fades in (duration-fast)
Frame 0ms:    Hero background visible (no animation — anchor point)
Frame 100ms:  Hero headline fade-up (duration-reveal, ease-dramatic)
Frame 250ms:  Hero subtext fade-up (duration-reveal, ease-dramatic)
Frame 400ms:  Hero CTA scale-in (duration-slow, ease-spring)
Frame 600ms:  Hero visual slide-in (duration-reveal, ease-out)
Scroll:       Section 2+ revealed via IntersectionObserver
```

Implementation:
```css
.hero-headline { animation: fade-up var(--duration-reveal) var(--ease-dramatic) 100ms both; }
.hero-subtext { animation: fade-up var(--duration-reveal) var(--ease-dramatic) 250ms both; }
.hero-cta { animation: scale-in var(--duration-slow) var(--ease-spring) 400ms both; }
.hero-visual { animation: slide-in-right var(--duration-reveal) var(--ease-out) 600ms both; }
```

**Rule:** Hero elements get choreographed delays. Below-fold sections use scroll triggers (see scroll-animation recipe).

## Anti-Patterns

- **Easing: `linear`** for UI elements. Linear is for progress bars and loading spinners only. Everything else needs a curve.
- **Duration: same for everything.** `transition: all 0.3s ease` is the hallmark of default thinking. Vary by element size and importance.
- **Bounce on serious UI.** `--ease-spring` on a banking dashboard = wrong. Match easing to context.
- **Animating layout properties.** Never animate `width`, `height`, `top`, `left`, `margin`, `padding`. Use `transform` and `opacity` only — they're GPU-composited.
- **Ambient animation overload.** Max 2 continuous animations visible at any time. More = carnival, not design.
- **No reduced-motion.** Always:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Animating on mount without purpose.** Not everything needs an entrance. Static content (nav, footer, body text) should just... be there.

## Composition Notes

- **motion-patterns is the vocabulary. scroll-animation is the trigger.** Use motion tokens and entrance patterns everywhere. Use scroll triggers to orchestrate when they fire.
- **Theme-aware timing:** Luxury brands = slower (`--duration-reveal: 900ms`), `--ease-dramatic`. Startups = snappier (`--duration-reveal: 500ms`), `--ease-out`. Playful = bouncy (`--ease-spring`). Adjust tokens per project.
- **Layer with any gumdrop:** Hero + fade-up orchestration. Features + stagger cascade. Pricing + scale-in on scroll. Stats + counter roll-up on scroll.
- **Pair with theme command:** `theme generate` handles colors/fonts. Motion tokens in `src/index.css` handle timing/easing. Both are design personality expressed through CSS custom properties.
