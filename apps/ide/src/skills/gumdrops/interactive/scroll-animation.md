---
name: scroll-animation
domain: interactive
intent: Scroll-triggered reveals, parallax, stagger sequences, and progress-linked animations
complexity: intermediate
components: none (CSS + React patterns that enhance any component)
---

# Scroll Animation

## Recipe

Scroll animations are a **layer**, not a component. They enhance any section or element. Three mechanisms, zero dependencies:

### 1. Intersection Observer Reveal (React)

The workhorse. Fires a class toggle when elements enter the viewport.

```tsx
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); obs.unobserve(el) } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, isVisible }
}
```

Usage — wrap any element:
```tsx
function RevealSection({ children, delay = 0, direction = 'up' }) {
  const { ref, isVisible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${directionClass(direction)}`}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function directionClass(dir: string) {
  switch (dir) {
    case 'up': return 'translate-y-8'
    case 'down': return '-translate-y-8'
    case 'left': return 'translate-x-8'
    case 'right': return '-translate-x-8'
    case 'scale': return 'scale-95'
    default: return 'translate-y-8'
  }
}
```

### 2. CSS Scroll-Driven Animation (native, no JS)

Modern browsers. Element animates as it enters/exits viewport:

```css
.scroll-reveal {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
}

@keyframes reveal {
  from { opacity: 0; transform: translateY(2rem); }
  to { opacity: 1; transform: translateY(0); }
}
```

Progress-linked (element transforms as you scroll through it):
```css
.scroll-progress {
  animation: progress-slide linear both;
  animation-timeline: view();
  animation-range: contain 0% contain 100%;
}

@keyframes progress-slide {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

### 3. CSS Custom Property Stagger

Set `--i` per child, cascade delays automatically:

```css
.stagger-group > * {
  --delay: calc(var(--i, 0) * 80ms);
  opacity: 0;
  transform: translateY(1rem);
  transition: opacity 0.5s ease var(--delay), transform 0.5s ease var(--delay);
}

.stagger-group.visible > * {
  opacity: 1;
  transform: translateY(0);
}
```

```tsx
{items.map((item, i) => (
  <Card key={item.id} style={{ '--i': i } as React.CSSProperties}>
    {/* ... */}
  </Card>
))}
```

## Variants

- **fade-up**: Default. Subtle upward drift + fade. Best for most sections.
- **stagger-cascade**: Children animate in sequence. Best for grids, card groups, feature lists.
- **parallax-depth**: Layers move at different speeds on scroll. Best for hero sections, visual storytelling.
- **progress-reveal**: Animation tied to scroll position (progress bars, counters, horizontal slides). Best for data storytelling.
- **clip-reveal**: Content revealed through expanding clip-path. Best for images, dramatic reveals.
- **split-text**: Characters or words animate individually. Best for headlines, hero text.

## Interaction Patterns

### Stagger Orchestration

Stagger delays follow a rhythm, not uniform spacing:

| Pattern | Delays | Feel |
|---------|--------|------|
| Linear | 0, 80, 160, 240ms | Mechanical, predictable |
| Ease-in | 0, 40, 100, 200ms | Accelerating cascade |
| Burst | 0, 30, 60, 200ms | Quick group + pause |
| Wave | 0, 60, 120, 60, 0ms | Ping-pong, organic |

**Recommended:** Ease-in for grids (feels natural). Burst for nav items (snappy). Linear only for >8 items.

### Combining Animations

Layer multiple effects without fighting:

```css
/* Base: all sections fade up on scroll */
.section { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 35%; }

/* Enhancement: hero image parallax */
.hero-image { animation: parallax linear both; animation-timeline: scroll(); animation-range: 0% 50%; }

/* Enhancement: stagger children inside revealed section */
.section.visible .feature-card { transition: opacity 0.5s ease var(--delay), transform 0.5s ease var(--delay); }
```

Rule: **one scroll-linked animation per element.** Combine by nesting: outer div handles reveal, inner elements handle stagger/parallax.

### Parallax Depth Layers

```css
.parallax-slow { animation: drift linear both; animation-timeline: scroll(); }
.parallax-medium { animation: drift linear both; animation-timeline: scroll(); animation-range: 0% 80%; }
.parallax-fast { animation: drift linear both; animation-timeline: scroll(); animation-range: 0% 60%; }

@keyframes drift { from { transform: translateY(0); } to { transform: translateY(-4rem); } }
```

Three layers at different speeds = depth without a library.

### Clip-Path Reveals

```css
.clip-reveal {
  clip-path: inset(100% 0 0 0);
  animation: unclip 0.8s ease-out forwards;
  animation-timeline: view();
  animation-range: entry 0% entry 50%;
}

@keyframes unclip {
  to { clip-path: inset(0 0 0 0); }
}
```

Variations: `circle(0% at 50% 50%)` → `circle(100%)` for radial. `polygon()` for diagonal wipes.

## Anti-Patterns

- **Everything animates.** Pick 3-5 key moments per page. The rest stays static. Animation is seasoning, not the main course.
- **Uniform timing.** Every element at 300ms ease looks robotic. Vary duration (400-800ms), vary easing, vary delay.
- **Animation on scroll-up.** Trigger once, don't re-trigger. Use `obs.unobserve(el)` after first intersection.
- **Heavy transforms on scroll-linked.** Avoid box-shadow, filter, or layout-triggering properties in scroll-driven animations. Stick to transform + opacity (GPU-composited).
- **Missing reduced-motion.** Always include:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Animations that block content.** If an element is invisible until scrolled to, users who jump via anchor links or keyboard see nothing. Set a fallback timeout.
- **Stagger on >12 items.** Cap visible stagger at 8-10 items max. Beyond that, reveal in groups or use a wave pattern.

## Composition Notes

- **Works with any gumdrop.** This is a layer pattern. Hero + scroll-animation. Features + scroll-animation. Pricing + scroll-animation.
- **Page-level orchestration:** First section: immediate (no scroll trigger). Sections 2+: scroll-triggered fade-up. One section: special treatment (parallax or clip-reveal).
- **Stagger naturally pairs with:** feature grids, card groups, team sections, pricing tiers, stats dashboards.
- **Parallax naturally pairs with:** hero sections, full-bleed images, visual storytelling, editorial layouts.
- **Progress-linked naturally pairs with:** stats/counters, horizontal scroll sections, timeline, skill bars.
