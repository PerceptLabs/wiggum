---
name: wiggum-stack
description: Quick reference for @wiggum/stack components - see stack/SKILL.md for full docs
when_to_use: Building UI, looking up component APIs, checking available props
---

# @wiggum/stack Quick Reference

> **Full documentation**: See `@wiggum/stack/SKILL.md` for complete rules and examples.

## Component Cheat Sheet

### Buttons
```tsx
<Button>Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Cards
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>
```

### Forms
```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
  </div>
  <div className="space-y-2">
    <Label htmlFor="bio">Bio</Label>
    <Textarea id="bio" placeholder="Tell us about yourself" />
  </div>
  <div className="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms</Label>
  </div>
  <Button type="submit">Submit</Button>
</div>
```

### Dialogs
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Sheets (Side Panels)
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent side="right"> {/* left, right, top, bottom */}
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>
```

### Tabs
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### Dropdowns
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">Options</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Duplicate</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Select
```tsx
<Select>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Option 1</SelectItem>
    <SelectItem value="opt2">Option 2</SelectItem>
    <SelectItem value="opt3">Option 3</SelectItem>
  </SelectContent>
</Select>
```

### Tooltips
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon">
      <HelpCircle className="h-4 w-4" />
    </Button>
  </TooltipTrigger>
  <TooltipContent>Helpful information</TooltipContent>
</Tooltip>
```

### Alerts
```tsx
<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>Important information here.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

### Badges
```tsx
<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Loading States
```tsx
<Spinner />
<Skeleton className="h-4 w-[200px]" />
<Progress value={66} />
```

### Toast Notifications
```tsx
import { toast } from '@wiggum/stack'

// Usage
toast.success("Changes saved!")
toast.error("Something went wrong")
toast.loading("Processing...")
```

## Hooks

```tsx
import { 
  useDebounce,      // Debounce values
  useDisclosure,    // Open/close state management
  useCopyToClipboard,
  useLocalStorage,
  useMediaQuery,
  useMounted,
  useClickOutside
} from '@wiggum/stack'

// Examples
const debouncedValue = useDebounce(searchTerm, 300)
const { isOpen, onOpen, onClose, onToggle } = useDisclosure()
const [value, setValue] = useLocalStorage('key', 'default')
const isMobile = useMediaQuery('(max-width: 768px)')
```

## Utility: cn()

```tsx
import { cn } from '@wiggum/stack'

// Merge Tailwind classes conditionally
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />
```

## Remember

1. **Import from `@wiggum/stack`** - never create raw HTML elements
2. **Max 200 lines per file** - split into sections/components
3. **Follow react-best-practices** - no waterfalls, optimize bundles
4. **Follow web-design-guidelines** - accessibility matters
