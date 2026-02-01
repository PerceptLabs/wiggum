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

Native form elements ignore CSS variables. Always add to src/index.css:

```css
select, input, textarea {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

select option {
  background-color: hsl(var(--popover));
  color: hsl(var(--popover-foreground));
}
```

## Overlays & Modals (CRITICAL)

- Use Dialog/Sheet from @wiggum/stack (handles z-index automatically)
- Custom overlays: backdrop `fixed inset-0 bg-black/50 z-40`, content `z-50`
- Never manually stack multiple overlays
- Always include close mechanism (X button, click outside, Escape key)

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
