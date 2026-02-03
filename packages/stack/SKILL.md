---
name: wiggum-stack
description: Component library for Wiggum projects - READ BEFORE WRITING UI CODE
when_to_use: Building any UI, forms, layouts, or user-facing components
---

# @wiggum/stack

Theme-agnostic React component library with 53 components built on Radix primitives.

## RULES (Non-Negotiable)

1. **Always React** - Never create standalone HTML files. Every UI is a React app.
2. **Always use stack components** - No raw `<button>`, `<input>`, `<div onClick>`, etc.
3. **File organization**:
   - Max 200 lines per file
   - Split pages into `sections/` directory
   - One exported component per file
4. **Import from stack** - Never recreate existing components

## Component Mapping (CRITICAL)

**Use @wiggum/stack components, not raw HTML elements.**

| Want This | Import This | Example |
|-----------|-------------|---------|
| Button | `Button` | `<Button onClick={fn}>Click</Button>` |
| Text input | `Input` | `<Input placeholder="Email" />` |
| Multi-line | `Textarea` | `<Textarea rows={4} />` |
| Dropdown | `Select` | `<Select>...</Select>` |
| Checkbox | `Checkbox` | `<Checkbox checked={val} />` |
| Toggle | `Switch` | `<Switch checked={val} />` |
| Modal | `Dialog` | `<Dialog>...</Dialog>` |
| Side panel | `Sheet` | `<Sheet>...</Sheet>` |
| Tabs | `Tabs` | `<Tabs>...</Tabs>` |
| Tooltip | `Tooltip` | `<Tooltip>...</Tooltip>` |
| Loading | `Spinner` | `<Spinner />` |

## Required Skills

Before writing UI code, you MUST also follow:
- `react-best-practices` - Performance patterns (waterfalls, bundle size)
- `web-design-guidelines` - Accessibility & UX rules

## Import Pattern

```tsx
// Components
import { Button, Card, Input, Dialog } from '@wiggum/stack'

// Utilities
import { cn } from '@wiggum/stack'

// Hooks
import { useDebounce, useDisclosure } from '@wiggum/stack'
```

## Project Structure (REQUIRED)

```
src/
├── main.tsx              # Entry point - DO NOT MODIFY
├── App.tsx               # Root composition only (no business logic)
├── sections/             # Page sections (Hero, Features, etc.)
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   └── CTASection.tsx
├── components/           # Project-specific components
└── pages/               # Route pages (if multi-page)
```

## Available Components (53)

### Layout
| Component | Parts |
|-----------|-------|
| Card | Card, CardHeader, CardTitle, CardContent, CardFooter |
| Dialog | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle |
| Sheet | Sheet, SheetTrigger, SheetContent, SheetHeader |
| Tabs | Tabs, TabsList, TabsTrigger, TabsContent |
| Accordion | Accordion, AccordionItem, AccordionTrigger, AccordionContent |
| Collapsible | Collapsible, CollapsibleTrigger, CollapsibleContent |

### Form Controls
| Component | Variants/Notes |
|-----------|---------------|
| Button | default, destructive, outline, secondary, ghost, link |
| Input | Text input with theme-aware styling |
| Textarea | Multi-line text |
| Select | Select, SelectTrigger, SelectValue, SelectContent, SelectItem |
| Checkbox | Radix checkbox |
| RadioGroup | RadioGroup, RadioGroupItem |
| Switch | Toggle switch |
| Slider | Range slider |
| Label | Form labels (always use with inputs) |

### Feedback
| Component | Use Case |
|-----------|----------|
| Badge | Status indicators |
| Alert | AlertTitle, AlertDescription |
| AlertDialog | Confirmation dialogs |
| Progress | Progress bar |
| Skeleton | Loading placeholders |
| Spinner | Loading indicator |
| toast (Sonner) | Toast notifications |

### Navigation
| Component | Use Case |
|-----------|----------|
| DropdownMenu | Menus, actions |
| ContextMenu | Right-click menus |
| NavigationMenu | Main navigation |
| Breadcrumb | Path navigation |
| Pagination | Page navigation |

### Data Display
| Component | Use Case |
|-----------|----------|
| Table | TableHeader, TableBody, TableRow, TableHead, TableCell |
| Avatar | AvatarImage, AvatarFallback |
| Tooltip | Hover information |
| HoverCard | Rich hover previews |
| Popover | Click-triggered overlays |

### Utility
| Component | Purpose |
|-----------|---------|
| ScrollArea | Custom scrollbars |
| Separator | Visual divider |
| AspectRatio | Maintain ratios |
| Kbd | Keyboard shortcuts |

## Theming

Components are theme-agnostic - they consume CSS variables like `var(--primary)`.
Define your visual style in `src/index.css`. See the `theming` skill for:
- Complete variable reference
- Ready-to-use theme examples
- Tips for choosing colors

## Example: Landing Page Section

```tsx
// src/sections/HeroSection.tsx
import { Button } from '@wiggum/stack'

export function HeroSection() {
  return (
    <section className="py-20 px-4 text-center">
      <h1 className="text-4xl font-bold mb-4">
        Build Faster with Wiggum
      </h1>
      <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
        A browser IDE designed for AI agents, not retrofitted for them.
      </p>
      <div className="flex gap-4 justify-center">
        <Button>Get Started</Button>
        <Button variant="outline">Learn More</Button>
      </div>
    </section>
  )
}
```

## Example: Form with Validation

```tsx
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent } from '@wiggum/stack'

export function LoginForm() {
  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" />
        </div>
        <Button className="w-full">Sign In</Button>
      </CardContent>
    </Card>
  )
}
```

## Anti-Patterns (NEVER DO)

```tsx
// ❌ BAD: Raw HTML elements
<button onClick={...}>Click</button>
<input type="text" />
<div onClick={...}>Clickable</div>

// ✅ GOOD: Stack components
<Button onClick={...}>Click</Button>
<Input type="text" />
<Button variant="ghost" onClick={...}>Clickable</Button>

// ❌ BAD: Inline styles
<div style={{ display: 'flex', gap: '1rem' }}>

// ✅ GOOD: Tailwind classes
<div className="flex gap-4">

// ❌ BAD: Everything in one file
// App.tsx with 500+ lines

// ✅ GOOD: Split into sections
// App.tsx imports HeroSection, FeaturesSection, etc.
```

## Lucide React Icons

Icons come from `lucide-react`. Common valid icons:

| Category | Valid Icons |
|----------|-------------|
| Terminal | `Terminal`, `TerminalSquare` |
| Files | `File`, `FileText`, `FileCode`, `FileCode2`, `Folder`, `FolderOpen` |
| Arrows | `ArrowRight`, `ArrowLeft`, `ArrowUp`, `ArrowDown`, `ChevronRight`, `ChevronLeft`, `ChevronUp`, `ChevronDown` |
| Status | `Check`, `CheckCircle`, `CheckCircle2`, `X`, `XCircle`, `AlertCircle`, `AlertTriangle`, `Info` |
| UI | `Sun`, `Moon`, `Menu`, `Search`, `Settings`, `Plus`, `Minus`, `MoreHorizontal`, `MoreVertical` |
| Social | `Github`, `Twitter`, `Linkedin`, `Mail`, `ExternalLink`, `Link` |
| Media | `Play`, `Pause`, `Volume2`, `VolumeX`, `Image`, `Camera` |
| Actions | `Edit`, `Trash2`, `Copy`, `Download`, `Upload`, `Save`, `RefreshCw` |

### Common Mistakes

| Wrong | Correct |
|-------|---------|
| `Terminal2` | `Terminal` or `TerminalSquare` |
| `Close` | `X` |
| `Checkmark` | `Check` |
| `Error` | `AlertCircle` or `XCircle` |
| `Warning` | `AlertTriangle` |

If unsure, check https://lucide.dev/icons for the exact name.

## External Resources

### Fonts
Do NOT use `@import url()` in CSS - esbuild cannot process external URLs.

**Wrong:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
```

**Correct:** Add to index.html `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet">
```

Or use Tailwind's default font stack (no external fonts needed).

### CDN Assets
Don't import external CSS/JS via `@import`. If needed, add `<link>` or `<script>` tags to index.html.
