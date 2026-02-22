---
name: code-quality
description: Essential React and UI quality rules for Wiggum projects
when_to_use: Every project - non-negotiable quality standards
---

# Code Quality

Rules you MUST follow. Use `grep skill "<topic>"` for details.

## React Essentials

### State Management
- Compute derived values during render, not in useEffect
- Use functional setState: `setCount(prev => prev + 1)`
- useRef for values that change but don't need re-render

### Performance
- Parallelize: `Promise.all([fetchA(), fetchB()])`
- Ternary over &&: `{items.length > 0 ? <List /> : null}`
- Stable keys: `key={item.id}` never `key={index}`

### Imports
- Import from @wiggum/stack, not raw HTML
- One component per file, max 200 lines

## Accessibility (Non-Negotiable)

- Form inputs MUST have `<Label htmlFor="id">`
- Icon buttons MUST have `aria-label`
- Interactive elements: `focus-visible:ring-2 ring-ring`
- Animations: include `@media (prefers-reduced-motion)`

## Dark Mode / Theming (CRITICAL)

CSS variables contain full OKLCH color values. Use `var(--name)` directly — never wrap in `hsl()` or `oklch()`.

```css
/* CORRECT — variables contain complete color values */
background-color: var(--background);
color: var(--foreground);
border-color: var(--border);

/* WRONG — double-wrapping breaks the color */
background-color: hsl(var(--background));    /* ❌ */
background-color: oklch(var(--background));  /* ❌ */
```

Native form elements ignore CSS variables in dark mode. Always add to src/index.css (after the theme zone):

```css
select, input, textarea {
  background-color: var(--background);
  color: var(--foreground);
  border-color: var(--border);
}

select option {
  background-color: var(--popover);
  color: var(--popover-foreground);
}
```

**Opacity with Tailwind v4:** Use native opacity modifiers — they work with OKLCH:
```
bg-primary/30        /* 30% opacity — Tailwind v4 handles this natively */
text-foreground/70   /* 70% opacity */
```

For CSS (not Tailwind), use `color-mix`:
```css
color-mix(in oklch, var(--primary), transparent 60%)  /* 40% primary */
```

## Overlays & Modals (CRITICAL)

- Use Dialog/Sheet from @wiggum/stack (handles z-index automatically)
- Custom overlays: backdrop `fixed inset-0 bg-black/50 z-40`, content `z-50`
- Never manually stack multiple overlays
- Always include close mechanism (X button, click outside, Escape key)

## CSS Syntax (CRITICAL)

CSS comments use `/* */` only. Never use `//` in CSS files — they are not valid CSS and silently break ALL rules below them including @keyframes, @media, and @font-face. esbuild will warn but the preview renders with missing styles and no runtime error.

Wrong: `// Section header`
Right: `/* Section header */`

## React Context Providers

When creating Context + Provider + useHook:
- Provider MUST wrap `<App />` in **main.tsx**, never inside App.tsx
- Components calling useHook must be children of the Provider
- Never call useHook in the same component that renders the Provider

```tsx
// main.tsx — correct
import { ThemeProvider } from './components/ThemeContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
)
```

## Anti-Patterns

| Never Do | Do Instead |
|----------|------------|
| `<button>`, `<input>` raw | Import from @wiggum/stack |
| `outline-none` alone | Add `focus-visible:ring-2` |
| `transition: all` | List properties explicitly |
| `<div onClick>` for nav | Use `<a>` or `<Link>` |
| Images without dimensions | Add `width` and `height` |
| Form inputs without labels | Add `<Label htmlFor>` |

## Before Marking Complete

Verify each item:

- [ ] All form inputs have visible labels
- [ ] Text readable in ALL inputs (test dark themes!)
- [ ] Interactive elements have focus states
- [ ] No overlapping/broken modals
- [ ] Animations respect reduced-motion preference
- [ ] No console errors or warnings
