---
name: web-design-guidelines
description: 100+ UI/UX rules for accessibility, forms, animation, and web interfaces
when_to_use: Building UI, accessibility review, form design, animation, responsive design
---

# Web Design Guidelines

100+ rules for building accessible, performant, and user-friendly interfaces.

## Accessibility

### Required
- Icon buttons MUST have `aria-label`
- Form controls MUST have associated `<label>` or `aria-label`
- Interactive elements need keyboard handlers (`onKeyDown`/`onKeyUp` with `onClick`)
- Use `<button>` for actions, `<a>`/`<Link>` for navigation
- Images require `alt` text (or `alt=""` if purely decorative)
- Decorative icons need `aria-hidden="true"`
- Async updates (toasts, validation) need `aria-live="polite"`

### Best Practices
- Prefer semantic HTML over ARIA attributes
- Headings must be hierarchical (`h1` > `h2` > `h3`)
- Include skip links for keyboard navigation
- Add `scroll-margin-top` to anchor targets

## Focus States

### Required
- Interactive elements need visible focus: `focus-visible:ring-2 ring-ring`
- NEVER use `outline-none` without a replacement focus style

### Best Practices
- Prefer `:focus-visible` over `:focus` (hides focus on click)
- Use `:focus-within` for compound controls (input groups)
- Ensure sufficient contrast for focus indicators

## Forms

### Required
- Inputs need `autocomplete` and meaningful `name` attributes
- Use semantic input types: `email`, `tel`, `url`, `number`
- Labels must be clickable via `htmlFor` or by wrapping the control
- NEVER block paste functionality (`onPaste` with `preventDefault`)

### Best Practices
- Disable spellcheck on emails, codes, usernames: `spellCheck={false}`
- Submit button stays enabled until request actually starts
- Display errors inline near the affected field
- Focus first error field on submit
- Placeholders should show example format (end with `...`)
- Use `autocomplete="off"` on non-auth fields only
- Warn before navigation with unsaved changes

### Input Modes
```tsx
// Numeric keyboard on mobile
<input type="text" inputMode="numeric" pattern="[0-9]*" />

// Email keyboard
<input type="email" inputMode="email" />

// Phone keyboard
<input type="tel" inputMode="tel" />
```

## Animation

### Required
- Honor `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Best Practices
- Animate only `transform` and `opacity` (GPU accelerated)
- NEVER use `transition: all` - list properties explicitly
- Set correct `transform-origin` for scale/rotate
- Make animations interruptible
- Keep durations short: 150-300ms for UI, up to 500ms for emphasis

## Typography

### Required
- Use proper ellipsis `...` not three periods `...`
- Use curly quotes `""` not straight quotes `""`

### Best Practices
- Non-breaking spaces for measurements: `5&nbsp;kg`
- Loading states end with `...`
- Use `font-variant-numeric: tabular-nums` for number columns/tables
- Apply `text-wrap: balance` or `text-pretty` to headings

## Content Handling

### Required
- Text containers must handle overflow: `truncate`, `line-clamp-*`, or `break-words`
- Handle empty states - don't render broken/empty UI

### Best Practices
- Flex children need `min-w-0` for text truncation to work
- Anticipate short, average, and very long user inputs
- Test with realistic data lengths

## Images

### Required
- `<img>` requires explicit `width` and `height` (prevents CLS)
- Below-fold images use `loading="lazy"`

### Best Practices
- Mark above-fold critical images with `priority` or `fetchpriority="high"`
- Use `srcSet` for responsive images
- Provide `sizes` attribute when using responsive images

## Performance

### Required
- Virtualize lists over 50 items (use `virtua` or `content-visibility: auto`)
- Avoid layout reads in render (`getBoundingClientRect`, `offsetHeight`)

### Best Practices
- Batch DOM reads/writes to avoid layout thrashing
- Prefer uncontrolled inputs for performance
- Add `<link rel="preconnect">` for CDNs
- Critical fonts: `<link rel="preload">` with `font-display: swap`

## Navigation & State

### Required
- URL should reflect shareable state (filters, tabs, pagination)
- Use `<a>` or `<Link>` for navigation, never `<div onClick>` alone

### Best Practices
- Deep-link stateful UI (sync state to URL via `nuqs` or query params)
- Destructive actions need confirmation modal or undo window
- Preserve scroll position on back navigation

## Touch & Mobile

### Required
- Apply `touch-action: manipulation` (removes 300ms tap delay)

### Best Practices
- Set `-webkit-tap-highlight-color` intentionally (or `transparent`)
- Use `overscroll-behavior: contain` in modals/drawers
- During drag: disable text selection, add `inert` to background
- Use `autoFocus` sparingly - can disorient mobile users

## Safe Areas & Layout

### Required
- Full-bleed layouts must use `env(safe-area-inset-*)` for device notches

### Best Practices
- Prevent unwanted scrollbars with proper overflow handling
- Prefer Flex/Grid over JS-based measurement

## Dark Mode

### Required
- Set `color-scheme: dark` on `<html>` for dark themes
- `<meta name="theme-color">` should match page background

### Best Practices
- Native `<select>` needs explicit `background-color` and `color` in dark mode
- Test both modes with actual content

## Internationalization

### Best Practices
- Dates/times: use `Intl.DateTimeFormat`
- Numbers/currency: use `Intl.NumberFormat`
- Detect language via `Accept-Language` header or `navigator.languages`
- Never hardcode date/number formats

## Anti-patterns to Flag

| Pattern | Problem |
|---------|---------|
| `user-scalable=no` | Blocks accessibility zoom |
| `maximum-scale=1` | Blocks pinch zoom |
| `onPaste` + `preventDefault` | Blocks paste |
| `transition: all` | Poor performance, unexpected effects |
| `outline-none` without replacement | No focus indicator |
| `<div onClick>` for navigation | Not accessible, no right-click |
| `<div>` / `<span>` with click handlers | Use `<button>` |
| Images without dimensions | Causes layout shift (CLS) |
| Large arrays without virtualization | Performance |
| Form inputs without labels | Accessibility |
| Icon buttons without `aria-label` | Accessibility |
| Hardcoded date/number formats | i18n issues |
| `autoFocus` without justification | Disorienting on mobile |
