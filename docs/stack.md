# @wiggum/stack

The shared component library for Wiggum.

## What is Stack?

`@wiggum/stack` is a collection of 59 shadcn/ui components packaged as an internal library. It provides a consistent UI vocabulary across the Wiggum monorepo.

## Why Stack Exists

### Anti-Slop

AI models tend to generate inconsistent UI code. By providing a curated component set, we constrain the AI to use known, tested components.

### Shared Vocabulary

When the AI generates code, it uses imports like:

```typescript
import { Button, Dialog, Input } from '@wiggum/stack'
```

This ensures:
- Consistent styling
- Proper accessibility
- Known behavior
- No duplicate implementations

### Single Source

Instead of each app defining its own Button, Dialog, etc., everything comes from one place.

## Usage

### Importing Components

```typescript
import { Button, Card, Input, Dialog } from '@wiggum/stack'
```

### Importing Hooks

```typescript
import { useMediaQuery, useMounted } from '@wiggum/stack'
```

### Importing Utilities

```typescript
import { cn } from '@wiggum/stack'

// Merge class names
<div className={cn('base-class', isActive && 'active-class')} />
```

## Available Components

59 components organized by category:

### Layout
- `Card`, `CardHeader`, `CardContent`, `CardFooter`
- `Separator`
- `ScrollArea`
- `Resizable` (ResizablePanel, ResizableHandle)
- `AspectRatio`

### Forms
- `Button`
- `Input`
- `Textarea`
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Checkbox`
- `RadioGroup`, `RadioGroupItem`
- `Switch`
- `Slider`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormMessage`
- `Label`
- `InputOTP`

### Feedback
- `Alert`, `AlertTitle`, `AlertDescription`
- `AlertDialog`
- `Toast`, `Toaster`, `useToast`
- `Progress`
- `Skeleton`
- `Spinner`

### Overlay
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`
- `Sheet`, `SheetTrigger`, `SheetContent`
- `Drawer`
- `Popover`, `PopoverTrigger`, `PopoverContent`
- `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- `HoverCard`
- `ContextMenu`
- `DropdownMenu`

### Navigation
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `NavigationMenu`
- `Menubar`
- `Breadcrumb`
- `Pagination`
- `Command` (command palette)
- `Sidebar`

### Data Display
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `DataTable` (with sorting, filtering)
- `Badge`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Accordion`
- `Collapsible`
- `Carousel`
- `Chart`

### Date/Time
- `Calendar`
- `DatePicker`

### Other
- `Toggle`, `ToggleGroup`
- `Combobox`

## Hooks

```typescript
import { useMediaQuery, useMounted } from '@wiggum/stack'

// Check screen size
const isMobile = useMediaQuery('(max-width: 768px)')

// Check if component is mounted
const isMounted = useMounted()
```

## Utilities

### cn()

Merge Tailwind classes with proper precedence:

```typescript
import { cn } from '@wiggum/stack'

cn('px-4 py-2', 'px-6') // → 'py-2 px-6'
cn('text-red-500', isError && 'text-red-700')
```

### formatDate(), formatBytes()

Common formatters:

```typescript
import { formatDate, formatBytes } from '@wiggum/stack'

formatDate(new Date()) // → 'Jan 21, 2026'
formatBytes(1024) // → '1 KB'
```

## Design Tokens

Stack uses CSS custom properties for theming:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  /* ... */
}
```

Components reference these tokens, enabling consistent theming.

## How IDE Consumes Stack

In `apps/ide/package.json`:

```json
{
  "dependencies": {
    "@wiggum/stack": "workspace:*"
  }
}
```

The `workspace:*` protocol tells pnpm to use the local package.

## Adding New Components

1. Create component in `packages/stack/src/components/ui/`
2. Export from `packages/stack/src/index.ts`
3. Component is immediately available to all apps

```typescript
// packages/stack/src/components/ui/my-component.tsx
export function MyComponent() { ... }

// packages/stack/src/index.ts
export { MyComponent } from './components/ui/my-component'

// apps/ide/src/...
import { MyComponent } from '@wiggum/stack'
```
